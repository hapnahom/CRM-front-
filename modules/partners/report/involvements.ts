import { isLeadsEnabled } from '@/config/salesWorkflow';
import type { OpportunitySolution } from '@/modules/product-catalog/types';
import { DEAL_REGISTRATION_STATUS_OPTIONS } from '@/modules/product-catalog/utils';
import type { Partner } from '../types';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';

export type OpportunitySource = 'lead' | 'deal';

export type PartnerSolutionInvolvement = {
  id: string;
  source: OpportunitySource;
  recordType: 'Deal' | 'Lead';
  opportunityId: string;
  opportunityName: string;
  customerName: string;
  opportunityType: string;
  partnerId: string;
  partnerName: string;
  catalogEntityId: string;
  amount: number;
  currency: string;
  stage: string;
  stageColor: string;
  stageCategory: 'open' | 'won' | 'lost' | 'inactive' | 'other';
  stageOrder: number;
  dealRegistrationStatus: string;
  productFamilyId: string;
  productFamilyName: string;
  sessionId: string | null;
  expectedClose: string | null;
  description: string;
  roleAssignments: Array<{
    roleId: string;
    userId: string;
    isPrimary?: boolean;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null;
  }>;
  solutions: OpportunitySolution[];
  responsibleUserId: string | null;
  responsibleUser: {
    name?: string | null;
    email?: string | null;
    selamnewId?: string | null;
  } | null;
};

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function registrationLabel(status?: string | null): string {
  if (!status) return '';
  const match = DEAL_REGISTRATION_STATUS_OPTIONS.find(
    (opt) => opt.value === status,
  );
  if (match) return match.label;
  return status.replace(/_/g, ' ');
}

function stageCategoryOf(
  stage: { category?: string | null } | null | undefined,
): PartnerSolutionInvolvement['stageCategory'] {
  const category = stage?.category;
  if (
    category === 'open' ||
    category === 'won' ||
    category === 'lost' ||
    category === 'inactive'
  ) {
    return category;
  }
  return 'other';
}

function resolvePartner(
  catalogId: string,
  catalogName: string | null | undefined,
  partnersById: Map<string, Partner>,
  partnersByName: Map<string, Partner>,
): Partner | null {
  if (catalogId && partnersById.has(catalogId)) {
    return partnersById.get(catalogId) ?? null;
  }
  const byName = partnersByName.get(normalizeName(catalogName));
  return byName ?? null;
}

function buildPartnerMaps(partners: Partner[]) {
  const partnersById = new Map(partners.map((p) => [p.id, p]));
  const partnersByName = new Map<string, Partner>();
  for (const partner of partners) {
    const nameKey = normalizeName(partner.name);
    if (nameKey && !partnersByName.has(nameKey)) {
      partnersByName.set(nameKey, partner);
    }
    const legal = normalizeName(
      (partner as { legalName?: string | null }).legalName ?? '',
    );
    if (legal && !partnersByName.has(legal)) {
      partnersByName.set(legal, partner);
    }
  }
  return { partnersById, partnersByName };
}

function isConvertedLead(lead: PipelineLead): boolean {
  return Boolean(lead.convertedDealId || lead.convertedAt);
}

function extractFromOpportunity(params: {
  source: OpportunitySource;
  opportunity: PipelineDeal | PipelineLead;
  partnersById: Map<string, Partner>;
  partnersByName: Map<string, Partner>;
}): PartnerSolutionInvolvement[] {
  const { source, opportunity, partnersById, partnersByName } = params;
  const rows: PartnerSolutionInvolvement[] = [];
  const solutions = opportunity.solutions ?? [];
  const oppCurrency = opportunity.currency || '';

  for (const solution of solutions) {
    const familyId = solution.productFamilyId || '';
    const familyName =
      solution.productFamilyName || solution.familyName || 'Solution';
    const vendors = solution.vendors ?? [];

    for (const vendor of vendors) {
      const partner = resolvePartner(
        vendor.vendorId,
        vendor.vendorName,
        partnersById,
        partnersByName,
      );
      if (!partner) continue;

      const amount = Number(vendor.amount) || 0;
      rows.push({
        id: `${source}:${opportunity.id}:vendor:${vendor.id || vendor.vendorId}`,
        source,
        recordType: source === 'deal' ? 'Deal' : 'Lead',
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        customerName: opportunity.customer?.accountName ?? '',
        opportunityType: opportunity.type?.name?.trim() || '',
        partnerId: partner.id,
        partnerName: partner.name,
        catalogEntityId: vendor.vendorId,
        amount,
        currency: (
          vendor.currency ||
          solution.currency ||
          oppCurrency ||
          ''
        ).toUpperCase(),
        stage: opportunity.stage?.name?.trim() || 'Unstaged',
        stageColor: opportunity.stage?.color || '#94A3B8',
        stageCategory: stageCategoryOf(opportunity.stage),
        stageOrder: opportunity.stage?.order ?? 999,
        dealRegistrationStatus: registrationLabel(vendor.registration?.status),
        productFamilyId: familyId,
        productFamilyName: familyName,
        sessionId: opportunity.sessionId ?? null,
        expectedClose: opportunity.expectedClose ?? null,
        description: opportunity.description ?? '',
        roleAssignments: opportunity.roleAssignments ?? [],
        solutions,
        responsibleUserId: opportunity.responsibleUserId ?? null,
        responsibleUser: opportunity.responsibleUser ?? null,
      });
    }
  }

  return rows;
}

/**
 * Flatten deal/lead solutions into one row per catalog-vendor involvement
 * that resolves to a PRM partner.
 */
export function extractPartnerSolutionInvolvements(input: {
  partners: Partner[];
  deals: PipelineDeal[];
  leads: PipelineLead[];
}): PartnerSolutionInvolvement[] {
  const { partnersById, partnersByName } = buildPartnerMaps(input.partners);
  const rows: PartnerSolutionInvolvement[] = [];

  for (const deal of input.deals) {
    rows.push(
      ...extractFromOpportunity({
        source: 'deal',
        opportunity: deal,
        partnersById,
        partnersByName,
      }),
    );
  }

  if (isLeadsEnabled()) {
    for (const lead of input.leads) {
      if (isConvertedLead(lead)) continue;
      rows.push(
        ...extractFromOpportunity({
          source: 'lead',
          opportunity: lead,
          partnersById,
          partnersByName,
        }),
      );
    }
  }

  return rows;
}

export type PartnerOriginatedOpportunity = {
  id: string;
  recordType: 'Deal' | 'Lead';
  opportunityId: string;
  partnerId: string;
  partnerName: string;
  clientName: string;
  solutionArea: string;
  estimatedValue: number;
  currency: string;
  stage: string;
  stageColor: string;
  description: string;
  sessionId: string | null;
};

function solutionAreaLabel(opportunity: PipelineDeal | PipelineLead): string {
  const families = new Set<string>();
  for (const solution of opportunity.solutions ?? []) {
    const name = solution.productFamilyName || solution.familyName || '';
    if (name.trim()) families.add(name.trim());
  }
  if (families.size) return [...families].join(', ');
  return '';
}

/**
 * Opportunities where a PRM partner is the opportunity originator.
 * When leads are disabled, only deals are returned.
 */
export function extractPartnerOriginatedOpportunities(input: {
  partners: Partner[];
  deals: PipelineDeal[];
  leads: PipelineLead[];
}): PartnerOriginatedOpportunity[] {
  const partnersById = new Map(input.partners.map((p) => [p.id, p]));
  const rows: PartnerOriginatedOpportunity[] = [];

  const ingest = (
    source: OpportunitySource,
    opportunity: PipelineDeal | PipelineLead,
  ) => {
    if (opportunity.originatorType !== 'PARTNER') return;
    const partnerId = opportunity.originatorPartnerId;
    if (!partnerId) return;
    const partner =
      partnersById.get(partnerId) ||
      (opportunity.originatorPartner
        ? ({
            id: opportunity.originatorPartner.id,
            name: opportunity.originatorPartner.name,
          } as Partner)
        : null);
    if (!partner) return;

    rows.push({
      id: `${source}:${opportunity.id}:originator:${partnerId}`,
      recordType: source === 'deal' ? 'Deal' : 'Lead',
      opportunityId: opportunity.id,
      partnerId: partner.id,
      partnerName: partner.name || opportunity.originatorPartner?.name || '',
      clientName: opportunity.customer?.accountName ?? '',
      solutionArea: solutionAreaLabel(opportunity),
      estimatedValue:
        Number(
          ('exactValue' in opportunity ? opportunity.exactValue : null) ??
            opportunity.value,
        ) || 0,
      currency: (opportunity.currency || '').toUpperCase(),
      stage: opportunity.stage?.name?.trim() || 'Unstaged',
      stageColor: opportunity.stage?.color || '#94A3B8',
      description: opportunity.description ?? '',
      sessionId: opportunity.sessionId ?? null,
    });
  };

  for (const deal of input.deals) ingest('deal', deal);
  if (isLeadsEnabled()) {
    for (const lead of input.leads) {
      if (isConvertedLead(lead)) continue;
      ingest('lead', lead);
    }
  }

  return rows;
}
