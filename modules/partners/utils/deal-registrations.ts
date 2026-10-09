import type { DealRegistration, Partner } from '../types';
import type { OpportunitySolution } from '@/modules/product-catalog/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import { DEAL_REGISTRATION_STATUS_OPTIONS } from '@/modules/product-catalog/utils';

export type OpportunitySource = 'lead' | 'deal';

type OpportunityLike = {
  id: string;
  name: string;
  customer?: { accountName?: string | null } | null;
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  expectedClose?: string | null;
  responsibleUser?: { name?: string | null } | null;
  description?: string | null;
  solutions?: OpportunitySolution[];
  convertedDealId?: string | null;
  convertedAt?: string | null;
};

function contactName(contact: OpportunityLike['contact']): string {
  if (!contact) return '';
  const name = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || contact.email || '';
}

function labelForStatus(status: string): string {
  const match = DEAL_REGISTRATION_STATUS_OPTIONS.find(
    (opt) => opt.value === status,
  );
  return match?.label ?? status;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
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

/**
 * Resolve a solution vendor line to a PRM partner.
 * Prefer vendorId (post-migration partner UUID); fall back to name for
 * leftover legacy catalog_vendor ids that were merged into a different partner.
 */
function resolvePartner(
  vendorId: string,
  vendorName: string | null | undefined,
  partnersById: Map<string, Partner>,
  partnersByName: Map<string, Partner>,
): Partner | null {
  if (vendorId && partnersById.has(vendorId)) {
    return partnersById.get(vendorId) ?? null;
  }
  return partnersByName.get(normalizeName(vendorName)) ?? null;
}

function normalizeRegistrationStatus(
  status: string | null | undefined,
): string {
  return (status ?? 'not_registered')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * True when the vendor has an intentional deal registration.
 *
 * Sources:
 * - UI: solution partner with Deal Registration fields (status other than the
 *   blank default Not Registered / Not Required)
 * - Excel migration: DR Status column mapped onto solution vendors as
 *   pending / approved / active / rejected / declined / expired (and
 *   not_required / not_registered for "no DR" rows)
 *
 * Blank Not Registered / Not Required without a number or date are excluded.
 */
export function isRegisteredVendor(
  registration:
    | {
        status?: string | null;
        registrationNumber?: string | null;
        registrationDate?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!registration) return false;
  const status = normalizeRegistrationStatus(registration.status);
  if (status === 'not_registered' || status === 'not_required') {
    return Boolean(
      registration.registrationNumber?.trim() || registration.registrationDate,
    );
  }
  return true;
}

/**
 * Partner value on a solution line — `vendor.amount` only.
 * Never fall back to product, solution, or deal totals.
 */
function vendorPartnerValue(
  vendor: OpportunitySolution['vendors'][number],
): number {
  const amount = Number(vendor.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function productLabel(
  solution: OpportunitySolution,
  vendor: OpportunitySolution['vendors'][number],
): string {
  const family =
    solution.productFamilyName || solution.familyName || 'Solution';
  const productNames = vendor.products
    .map((p) => p.productName)
    .filter((name): name is string => Boolean(name?.trim()));
  if (productNames.length === 0) return family;
  if (productNames.length === 1) return `${family} · ${productNames[0]}`;
  return `${family} · ${productNames[0]} +${productNames.length - 1}`;
}

function mapVendorRegistration(params: {
  source: OpportunitySource;
  opportunity: OpportunityLike;
  solution: OpportunitySolution;
  vendor: OpportunitySolution['vendors'][number];
  partnersById: Map<string, Partner>;
  partnersByName: Map<string, Partner>;
}): DealRegistration | null {
  const {
    source,
    opportunity,
    solution,
    vendor,
    partnersById,
    partnersByName,
  } = params;

  // Only intentional deal registrations (skip blank Not Registered / Not Required).
  // Matches UI-authored DRs and Excel-migrated DR Status rows on solution vendors.
  if (!isRegisteredVendor(vendor.registration)) return null;

  const partner = resolvePartner(
    vendor.vendorId,
    vendor.vendorName,
    partnersById,
    partnersByName,
  );
  if (!partner) return null;

  const registration = vendor.registration ?? {
    status: 'not_registered',
    registrationDate: null,
    expirationDate: null,
    registrationNumber: null,
  };
  const status = labelForStatus(registration.status ?? 'not_registered');

  return {
    id: `${source}:${opportunity.id}:vendor:${vendor.id}`,
    registrationNumber:
      registration.registrationNumber?.trim() ||
      `DR-${opportunity.id.slice(0, 8).toUpperCase()}`,
    partnerId: partner.id,
    partnerName: partner.name || vendor.vendorName || 'Unknown partner',
    partnerRoleIds: partner.roleIds ?? [],
    customerName: opportunity.customer?.accountName ?? '',
    customerContact: contactName(opportunity.contact),
    opportunityName: opportunity.name,
    productOrSolution: productLabel(solution, vendor),
    productFamilyId: solution.productFamilyId,
    productFamilyName:
      solution.productFamilyName || solution.familyName || undefined,
    vendor: partner.name || vendor.vendorName || 'Unknown vendor',
    estimatedDealValue: vendorPartnerValue(vendor),
    expectedCloseDate:
      registration.expirationDate || opportunity.expectedClose || '',
    registrationDate: registration.registrationDate || '',
    status,
    assignedReviewer: opportunity.responsibleUser?.name ?? '',
    opportunityDescription: opportunity.description ?? '',
    competition: '',
    supportingDocuments: [],
    crmDealId: opportunity.id,
    reviewHistory: [],
  };
}

function extractFromOpportunity(
  source: OpportunitySource,
  opportunity: OpportunityLike,
  partnersById: Map<string, Partner>,
  partnersByName: Map<string, Partner>,
): DealRegistration[] {
  // Avoid double-counting once a lead is converted (registration is copied to the deal).
  if (
    source === 'lead' &&
    (opportunity.convertedDealId || opportunity.convertedAt)
  ) {
    return [];
  }

  const regs: DealRegistration[] = [];
  for (const solution of opportunity.solutions ?? []) {
    for (const vendor of solution.vendors ?? []) {
      const mapped = mapVendorRegistration({
        source,
        opportunity,
        solution,
        vendor,
        partnersById,
        partnersByName,
      });
      if (mapped) regs.push(mapped);
    }
  }
  return regs;
}

export function extractDealRegistrations(params: {
  leads: PipelineLead[];
  deals: PipelineDeal[];
  partners: Partner[];
}): DealRegistration[] {
  const { partnersById, partnersByName } = buildPartnerMaps(params.partners);
  const fromLeads = params.leads.flatMap((lead) =>
    extractFromOpportunity('lead', lead, partnersById, partnersByName),
  );
  const fromDeals = params.deals.flatMap((deal) =>
    extractFromOpportunity('deal', deal, partnersById, partnersByName),
  );

  return [...fromLeads, ...fromDeals].sort((a, b) => {
    const da = a.registrationDate || '';
    const db = b.registrationDate || '';
    return db.localeCompare(da);
  });
}

export function formatDealMoney(value: number) {
  const abs = Math.abs(Number.isFinite(value) ? value : 0);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000)
    return `$${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000)
    return `$${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${sign}${(abs / 1_000).toFixed(0)}K`;
  return `$${sign}${abs.toLocaleString()}`;
}

export function registrationStatusStyle(status: string): string {
  const normalized = status.toLowerCase();
  if (
    normalized.includes('approved') ||
    normalized.includes('converted') ||
    normalized.includes('qualified')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized.includes('pending') || normalized.includes('review')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (normalized.includes('reject')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (normalized.includes('expir')) {
    return 'bg-orange-50 text-orange-800 border-orange-200';
  }
  return 'bg-surface-elevated text-muted-foreground border-border';
}

export function isPendingRegistrationStatus(status: string): boolean {
  const normalized = normalizeRegistrationStatus(status);
  return normalized === 'pending' || normalized.includes('under_review');
}

export function isApprovedRegistrationStatus(status: string): boolean {
  const normalized = normalizeRegistrationStatus(status);
  return (
    normalized === 'approved' ||
    normalized === 'active' ||
    normalized.includes('converted') ||
    normalized.includes('qualified')
  );
}

export function opportunityHref(reg: DealRegistration): string | null {
  if (!reg.crmDealId) return null;
  if (reg.id.startsWith('lead:')) return `/leads/${reg.crmDealId}`;
  if (reg.id.startsWith('deal:')) return `/deals/${reg.crmDealId}`;
  return null;
}

/** Sum registration values per partner (as vendor on the registration). */
export function partnerPipelineFromRegistrations(
  registrations: DealRegistration[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const reg of registrations) {
    if (!reg.partnerId) continue;
    map.set(
      reg.partnerId,
      (map.get(reg.partnerId) ?? 0) + (reg.estimatedDealValue || 0),
    );
  }
  return map;
}

export function enrichPartnersWithRegistrationPipeline(
  partners: Partner[],
  registrations: DealRegistration[],
): Partner[] {
  const pipelineByPartner = partnerPipelineFromRegistrations(registrations);
  return partners.map((partner) => {
    const pipelineValue = pipelineByPartner.get(partner.id) ?? 0;
    return {
      ...partner,
      pipelineValue,
      scorecard: {
        ...partner.scorecard,
        pipeline: pipelineValue,
        dealRegistrationsCount: registrations.filter(
          (r) => r.partnerId === partner.id,
        ).length,
      },
    };
  });
}
