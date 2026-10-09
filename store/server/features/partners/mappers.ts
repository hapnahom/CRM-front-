import type {
  Partner,
  PartnerActivity,
  PartnerContact,
  HealthBreakdown,
  PerformanceScorecard,
} from '@/modules/partners/types';
import type {
  PartnerActivityApi,
  PartnerApi,
  PartnerContactApi,
  PartnerPartnershipTypeApi,
  PartnerRoleApi,
  PartnerTierApi,
} from './types';

export function emptyHealth(): HealthBreakdown {
  return {
    score: 0,
    status: 'Watch',
    commercialScore: 0,
    engagementScore: 0,
    capabilityScore: 0,
    relationshipScore: 0,
    commercialFactors: [],
    engagementFactors: [],
    capabilityFactors: [],
    relationshipFactors: [],
    recommendedActions: [],
  };
}

export function emptyScorecard(): PerformanceScorecard {
  return {
    overallScore: 0,
    classification: 'Average',
    revenue: 0,
    revenueTarget: 0,
    pipeline: 0,
    pipelineTarget: 0,
    closedDealsCount: 0,
    winRate: 0,
    dealRegistrationsCount: 0,
    conversionRate: 0,
    targetAchievement: 0,
    activeCertificationsCount: 0,
    trainingCompletionRate: 0,
    customerEngagementScore: 0,
    activityLevelScore: 0,
    weights: {
      revenue: 0,
      pipeline: 0,
      winRate: 0,
      dealRegistration: 0,
      certification: 0,
      targetAchievement: 0,
      engagement: 0,
    },
  };
}

function mapContact(raw: PartnerApi['primaryContact']): PartnerContact {
  return {
    id: 'primary',
    name: raw?.name ?? '',
    position: raw?.position ?? '',
    email: raw?.email ?? '',
    phone: raw?.phone ?? '',
    role: 'Primary',
    isPrimary: true,
  };
}

const CONTACT_ROLES: PartnerContact['role'][] = [
  'Primary',
  'Technical',
  'Commercial',
  'Executive',
  'Operations',
];

const ACTIVITY_TYPES: PartnerActivity['type'][] = [
  'Meeting',
  'Call',
  'Email',
  'QBR',
  'Deal Reg',
  'Cert',
  'Note',
];

function mapContacts(api: PartnerApi): PartnerContact[] {
  const rows = api.contacts ?? [];
  if (!rows.length) {
    return api.primaryContact ? [mapContact(api.primaryContact)] : [];
  }
  return rows.map((row, index) => {
    const isPrimary = Boolean(row.isPrimary || row.role === 'Primary');
    const role = CONTACT_ROLES.includes(row.role as PartnerContact['role'])
      ? (row.role as PartnerContact['role'])
      : 'Commercial';
    return {
      id: row.id || `contact-${index}`,
      name: row.name ?? '',
      position: row.position ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      role: isPrimary ? 'Primary' : role,
      isPrimary,
    };
  });
}

function mapActivities(api: PartnerApi): PartnerActivity[] {
  return (api.activities ?? [])
    .filter((row) => Boolean(row?.id))
    .map((row) => ({
      id: row.id,
      type: ACTIVITY_TYPES.includes(row.type as PartnerActivity['type'])
        ? (row.type as PartnerActivity['type'])
        : 'Note',
      title: row.title ?? '',
      description: row.description ?? '',
      actor: row.actor ?? '',
      timestamp: row.timestamp ?? '',
    }));
}

function deriveEngagementDates(activities: PartnerActivity[]) {
  const today = new Date().toISOString().slice(0, 10);
  let lastEngagementDate = '';
  let nextQBRDate = '';
  for (const activity of activities) {
    const day = activity.timestamp.slice(0, 10);
    if (!day) continue;
    if (day <= today && day > lastEngagementDate) lastEngagementDate = day;
    if (
      activity.type === 'QBR' &&
      day >= today &&
      (!nextQBRDate || day < nextQBRDate)
    ) {
      nextQBRDate = day;
    }
  }
  return { lastEngagementDate, nextQBRDate };
}

export function partnerContactsToApi(
  contacts: PartnerContact[],
): PartnerContactApi[] {
  return contacts.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    email: c.email,
    phone: c.phone,
    role: c.role,
    isPrimary: Boolean(c.isPrimary),
  }));
}

export function partnerActivitiesToApi(
  activities: PartnerActivity[],
): PartnerActivityApi[] {
  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    actor: a.actor,
    timestamp: a.timestamp,
  }));
}

export function mapPartnerRole(role: PartnerRoleApi) {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description ?? '',
    isSystem: role.isSystem,
    isActive: role.isActive,
    isPrimary: role.isPrimary ?? false,
    displayOrder: role.displayOrder,
    useInSolutions: role.useInSolutions ?? false,
    solutionOrder: role.solutionOrder ?? 0,
    solutionPlacement: role.solutionPlacement ?? 'after_product',
    solutionRequired: role.solutionRequired ?? false,
    solutionCardinality: role.solutionCardinality ?? 'one',
    filterByProductLink: role.filterByProductLink ?? true,
    solutionFieldSet: role.solutionFieldSet ?? 'none',
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export function mapPartnerTier(tier: PartnerTierApi) {
  return {
    id: tier.id,
    name: tier.name,
    code: tier.code,
    description: tier.description ?? '',
    color: tier.color,
    borderColor: tier.borderColor,
    isSystem: tier.isSystem,
    isActive: tier.isActive,
    isPrimary: tier.isPrimary ?? false,
    displayOrder: tier.displayOrder,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  };
}

export function mapPartnerPartnershipType(type: PartnerPartnershipTypeApi) {
  return mapPartnerTier(type);
}

function resolvePartnerTier(api: PartnerApi): {
  tierId: string;
  tier: string;
  tierColor: string | null;
  tierBorderColor: string | null;
} {
  if (api.tier && typeof api.tier === 'object') {
    return {
      tierId: api.tier.id,
      tier: api.tier.name,
      tierColor: api.tier.color,
      tierBorderColor: api.tier.borderColor,
    };
  }
  const name = typeof api.tier === 'string' ? api.tier : '';
  return {
    tierId: '',
    tier: name,
    tierColor: null,
    tierBorderColor: null,
  };
}

function resolvePartnerPartnershipType(api: PartnerApi): {
  partnershipTypeId: string;
  partnershipType: string;
  partnershipTypeColor: string | null;
  partnershipTypeBorderColor: string | null;
} {
  const value = api.partnershipType;
  if (value && typeof value === 'object') {
    return {
      partnershipTypeId: value.id,
      partnershipType: value.name,
      partnershipTypeColor: value.color,
      partnershipTypeBorderColor: value.borderColor,
    };
  }
  const name = typeof value === 'string' ? value : '';
  return {
    partnershipTypeId: '',
    partnershipType: name,
    partnershipTypeColor: null,
    partnershipTypeBorderColor: null,
  };
}

export function mapPartner(api: PartnerApi): Partner {
  const roleIds = (api.roles ?? []).map((r) => r.id);
  const contacts = mapContacts(api);
  const primaryContact =
    contacts.find((c) => c.isPrimary) ?? mapContact(api.primaryContact);
  const activities = mapActivities(api);
  const { lastEngagementDate, nextQBRDate } = deriveEngagementDates(activities);
  const tier = resolvePartnerTier(api);
  const partnershipType = resolvePartnerPartnershipType(api);

  return {
    id: api.id,
    name: api.name,
    legalName: api.legalName ?? api.name,
    roleIds,
    tierId: tier.tierId,
    tier: tier.tier,
    tierColor: tier.tierColor,
    tierBorderColor: tier.tierBorderColor,
    partnershipTypeId: partnershipType.partnershipTypeId,
    partnershipType: partnershipType.partnershipType,
    partnershipTypeColor: partnershipType.partnershipTypeColor,
    partnershipTypeBorderColor: partnershipType.partnershipTypeBorderColor,
    status: api.status,
    primaryContact,
    contacts,
    accountManager: api.accountManager ?? '',
    partnershipStartDate: api.partnershipStartDate ?? '',
    productsAndSolutions: api.productsAndSolutions ?? [],
    pipelineValue: 0,
    revenue: 0,
    performanceScore: 0,
    health: emptyHealth(),
    scorecard: {
      ...emptyScorecard(),
      revenueTarget: api.annualTarget ?? 0,
    },
    lastEngagementDate,
    nextQBRDate,
    geographicCoverage: api.geographicCoverage ?? [],
    industryExpertise: api.industryExpertise ?? [],
    website: api.website ?? '',
    address: api.address ?? '',
    registrationNumber: api.registrationNumber ?? '',
    agreementStatus: 'Active',
    agreementExpiry: '',
    documents: [],
    activities,
    certifications: [],
    deals: [],
    qbrs: [],
    annualTarget: api.annualTarget ?? undefined,
    currencyTargets: (api.currencyTargets ?? []).map((row) => ({
      id: row.id,
      currencyId: row.currencyId,
      currency: row.currency,
      annualAmount: Number(row.annualAmount ?? 0),
      sessionTargets: (row.sessionTargets ?? []).map((session) => ({
        sessionId: session.sessionId,
        amount: Number(session.amount ?? 0),
      })),
    })),
    targetAccountsFocus: api.targetAccountsFocus ?? undefined,
    solutionFocus: api.solutionFocus ?? undefined,
    fieldGroups: api.fieldGroups,
  };
}

export function mapPartnerListItem(api: PartnerApi): Partner {
  return mapPartner(api);
}

export function partnerToCreatePayload(
  partial: Partial<Partner> & {
    roleIds: string[];
    tierId?: string;
    fieldValues?: { entityFieldId: string; value: unknown }[];
  },
): import('./types').CreatePartnerPayload {
  return {
    name: partial.name ?? '',
    legalName: partial.legalName,
    roleIds: partial.roleIds,
    tierId: partial.tierId || undefined,
    partnershipTypeId: partial.partnershipTypeId || undefined,
    status: partial.status,
    primaryContact: partial.primaryContact
      ? {
          name: partial.primaryContact.name,
          email: partial.primaryContact.email,
          phone: partial.primaryContact.phone,
          position: partial.primaryContact.position,
        }
      : undefined,
    accountManager: partial.accountManager,
    partnershipStartDate: partial.partnershipStartDate || undefined,
    website: partial.website,
    address: partial.address,
    registrationNumber: partial.registrationNumber,
    annualTarget: partial.annualTarget,
    currencyTargets: partial.currencyTargets?.map((row) => ({
      currencyId: row.currencyId,
      annualAmount: row.annualAmount,
      sessionTargets: row.sessionTargets?.map((session) => ({
        sessionId: session.sessionId,
        amount: session.amount,
      })),
    })),
    targetAccountsFocus: partial.targetAccountsFocus,
    solutionFocus: partial.solutionFocus,
    productsAndSolutions: partial.productsAndSolutions,
    geographicCoverage: partial.geographicCoverage,
    industryExpertise: partial.industryExpertise,
    fieldValues: partial.fieldValues,
  };
}
