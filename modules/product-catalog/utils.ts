import type {
  CatalogProduct,
  CatalogStatus,
  DealRegistrationStatus,
  ImplementationPartner,
  OpportunityProductLine,
  OpportunityProductRegistration,
  OpportunitySolution,
  OpportunitySolutionProduct,
  OpportunitySolutionVendor,
  ProductFamily,
  ProductPeriodId,
  ProductQuarterAmounts,
  ProductQuarterKey,
  ProductTarget,
  Vendor,
} from '@/modules/product-catalog/types';
import { formatMoney as formatPipelineMoney } from '@/modules/leads/components/leads-pipeline-utils';
import { roundTarget, targetAchievementPercent } from '@/lib/target-format';

export function catalogErrorMessage(
  error: unknown,
  fallback: string,
): string | null {
  const err = error as {
    response?: { status?: number; data?: { message?: string | string[] } };
    message?: string;
  };
  // Missing permission — callers should not toast; feature should be hidden.
  if (err?.response?.status === 403) {
    return null;
  }
  const message = err?.response?.data?.message;
  if (Array.isArray(message) && message.length) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return err?.message || fallback;
}

export function formatCatalogDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCatalogMoney(amount: number, currency = 'USD') {
  return formatPipelineMoney(amount, currency);
}

export function computeProductShare(
  amount: number,
  opportunityValue: number | null | undefined,
): number | null {
  if (
    opportunityValue == null ||
    !Number.isFinite(opportunityValue) ||
    opportunityValue === 0
  ) {
    return null;
  }
  if (!Number.isFinite(amount)) return null;
  return (amount / opportunityValue) * 100;
}

export function formatProductShare(share: number | null) {
  if (share == null || !Number.isFinite(share)) return '—';
  const rounded = Math.round(share * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export function computeProductsTotal(lines: OpportunityProductLine[]) {
  return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

export function computeValueDifference(
  productsTotal: number,
  opportunityValue: number,
) {
  return productsTotal - opportunityValue;
}

export function formatSignedMoney(amount: number, currency = 'USD') {
  const abs = formatCatalogMoney(Math.abs(amount), currency);
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `-${abs}`;
  return abs;
}

export function newCatalogId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function statusLabel(status: CatalogStatus) {
  return status === 'active' ? 'Active' : 'Inactive';
}

export function toggleStatus(status: CatalogStatus): CatalogStatus {
  return status === 'active' ? 'inactive' : 'active';
}

export function familyPartnerIds(family: ProductFamily): string[] {
  return [
    ...new Set((family.familyPartners ?? []).map((link) => link.partnerId)),
  ];
}

export function productsLinkedToFamily(
  family: ProductFamily,
  products: CatalogProduct[],
): CatalogProduct[] {
  const partnerIds = new Set(familyPartnerIds(family));
  if (!partnerIds.size) return [];
  return products
    .filter(
      (product) =>
        product.status === 'active' &&
        (product.productPartners ?? []).some((link) =>
          partnerIds.has(link.partnerId),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function productPartnerIdsForRole(
  product: CatalogProduct,
  roleCodeOrCodes: string | string[],
): string[] {
  const codes = new Set(
    Array.isArray(roleCodeOrCodes) ? roleCodeOrCodes : [roleCodeOrCodes],
  );
  return (product.productPartners ?? [])
    .filter((link) => !!link.partnerRoleCode && codes.has(link.partnerRoleCode))
    .map((link) => link.partnerId);
}

export function familyPartnerIdsForRole(
  family: ProductFamily | undefined,
  roleCodeOrCodes: string | string[],
): string[] {
  const codes = new Set(
    Array.isArray(roleCodeOrCodes) ? roleCodeOrCodes : [roleCodeOrCodes],
  );
  return (family?.familyPartners ?? [])
    .filter((link) => !!link.partnerRoleCode && codes.has(link.partnerRoleCode))
    .map((link) => link.partnerId);
}

export function solutionPartnerLineMatchesRoleCode(
  partnerLine: OpportunitySolutionVendor,
  roleCode: string,
  family: ProductFamily | undefined,
): boolean {
  return familyPartnerIdsForRole(family, roleCode).includes(
    partnerLine.vendorId,
  );
}

/** @deprecated Use solutionPartnerLineMatchesRoleCode */
export const solutionVendorMatchesRoleCode = solutionPartnerLineMatchesRoleCode;

/** Group before-product partner lines by configured partner role id. */
export function groupSolutionPartnersByBeforeProductRoles(
  partnerLines: OpportunitySolutionVendor[],
  roles: Array<{ id: string; code: string }>,
  family: ProductFamily | undefined,
): Map<string, OpportunitySolutionVendor[]> {
  const grouped = new Map<string, OpportunitySolutionVendor[]>(
    roles.map((role) => [role.id, []]),
  );
  if (!roles.length) return grouped;

  const unassigned: OpportunitySolutionVendor[] = [];
  for (const line of partnerLines) {
    if (line.partnerRoleId && grouped.has(line.partnerRoleId)) {
      grouped.get(line.partnerRoleId)?.push(line);
      continue;
    }
    const match = roles.find((role) =>
      solutionPartnerLineMatchesRoleCode(line, role.code, family),
    );
    if (match) {
      grouped.get(match.id)?.push(line);
    } else {
      unassigned.push(line);
    }
  }

  if (unassigned.length) {
    const fallbackRoleId = roles[0]?.id;
    if (fallbackRoleId) {
      grouped.get(fallbackRoleId)?.push(...unassigned);
    }
  }

  return grouped;
}

/** @deprecated Use groupSolutionPartnersByBeforeProductRoles */
export const groupSolutionVendorsByBeforeProductRoles =
  groupSolutionPartnersByBeforeProductRoles;

export function familyPartnerLinkCount(family: ProductFamily): number {
  return (family.familyPartners ?? []).length;
}

export function productsForPartnerId(
  partnerId: string,
  products: CatalogProduct[],
) {
  return products.filter((p) =>
    (p.productPartners ?? []).some((link) => link.partnerId === partnerId),
  );
}

/** @deprecated Use productsForPartnerId — kept for pipeline call sites. */
export function productsForVendor(
  vendorId: string,
  products: CatalogProduct[],
) {
  return productsForPartnerId(vendorId, products);
}

/** @deprecated Use productsForPartnerId — kept for pipeline call sites. */
export function productsForPartner(
  partnerId: string,
  products: CatalogProduct[],
) {
  return productsForPartnerId(partnerId, products);
}

export function resolveFamilyForProduct(
  product: CatalogProduct | undefined,
  families: ProductFamily[],
): ProductFamily | undefined {
  if (!product) return undefined;
  return families.find(
    (family) => productsLinkedToFamily(family, [product]).length > 0,
  );
}

export function resolveFamily(
  families: ProductFamily[],
  familyId: string,
): ProductFamily | undefined {
  return families.find((f) => f.id === familyId);
}

export function resolveVendor(
  vendors: Vendor[],
  vendorId: string,
): Vendor | undefined {
  return vendors.find((v) => v.id === vendorId);
}

export function resolveProduct(
  products: CatalogProduct[],
  productId: string,
): CatalogProduct | undefined {
  return products.find((p) => p.id === productId);
}

export function resolvePartner(
  partners: ImplementationPartner[],
  partnerId: string,
): ImplementationPartner | undefined {
  return partners.find((p) => p.id === partnerId);
}

export function filterBySearch<
  T extends { name: string; description?: string },
>(items: T[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q),
  );
}

export const DEAL_REGISTRATION_STATUS_OPTIONS: {
  value: DealRegistrationStatus;
  label: string;
}[] = [
  { value: 'not_required', label: 'Not Required' },
  { value: 'not_registered', label: 'Not Registered' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
];

export function defaultProductRegistration(): OpportunityProductRegistration {
  return {
    status: 'not_registered',
    registrationDate: null,
    expirationDate: null,
    registrationNumber: null,
  };
}

export function createEmptyOpportunityProductLine(
  productId: string,
): OpportunityProductLine {
  return {
    id: newCatalogId('opl'),
    productId,
    vendorId: null,
    implementationPartnerId: null,
    amount: 0,
    registration: defaultProductRegistration(),
  };
}

export function createEmptySolution(
  productFamilyId: string,
  currency = '',
): OpportunitySolution {
  return {
    id: newCatalogId('sol'),
    productFamilyId,
    amount: 0,
    currency,
    roleAssignments: [],
    assigneeUserIds: [],
    assigneeContributions: [],
    vendors: [],
    products: [],
  };
}

export function createEmptySolutionVendor(
  vendorId: string,
  partnerRoleId: string,
  currency = '',
): OpportunitySolutionVendor {
  return {
    id: newCatalogId('sov'),
    partnerRoleId,
    vendorId,
    amount: 0,
    currency,
    registration: defaultProductRegistration(),
    products: [],
  };
}

export function createEmptySolutionProduct(
  productId: string,
  currency = '',
): OpportunitySolutionProduct {
  return {
    id: newCatalogId('sop'),
    productId,
    implementationPartnerId: null,
    amount: 0,
    currency,
  };
}

/** Partners linked to the product family via familyPartners join rows. */
export function vendorsForProductFamily(
  family: ProductFamily,
  vendors: Vendor[],
): Vendor[] {
  const partnerIds = new Set(familyPartnerIds(family));
  return vendors
    .filter((v) => v.status === 'active' && partnerIds.has(v.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active products linked to a partner (solution vendor line). */
export function productsForSolutionVendor(
  partnerId: string,
  products: CatalogProduct[],
): CatalogProduct[] {
  return productsForPartnerId(partnerId, products)
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function allSolutionProductIds(
  solutions: OpportunitySolution[],
): string[] {
  const ids: string[] = [];
  for (const solution of solutions) {
    for (const product of solution.products) ids.push(product.productId);
    for (const vendor of solution.vendors) {
      for (const product of vendor.products) ids.push(product.productId);
    }
  }
  return ids;
}

export function resolveLineCurrency(
  lineCurrency: string | null | undefined,
  opportunityCurrency = 'USD',
): string {
  const code = (lineCurrency ?? '').trim();
  return code || opportunityCurrency || 'USD';
}

/**
 * Sum solution amounts that share the opportunity currency
 * (blank line currency counts as opportunity currency).
 */
export function computeSolutionsTotal(
  solutions: OpportunitySolution[],
  opportunityCurrency = '',
): number {
  const opp = opportunityCurrency.trim().toUpperCase();
  return solutions.reduce((sum, s) => {
    const lineCur = (s.currency ?? '').trim().toUpperCase();
    if (opp && lineCur && lineCur !== opp) return sum;
    return sum + (Number(s.amount) || 0);
  }, 0);
}

export function isProductDetailsComplete(
  line: OpportunityProductLine,
): boolean {
  return Boolean(
    line.vendorId && line.implementationPartnerId && line.amount > 0,
  );
}

export function registrationFieldsEnabled(
  status: DealRegistrationStatus,
): boolean {
  return (
    status === 'pending' ||
    status === 'approved' ||
    status === 'rejected' ||
    status === 'expired'
  );
}

export function isRegistrationComplete(line: OpportunityProductLine): boolean {
  const { status, registrationDate, expirationDate, registrationNumber } =
    line.registration;
  if (status === 'not_required') return true;
  if (status === 'not_registered') return false;
  if (!registrationDate) return false;
  if (status === 'approved') {
    return Boolean(expirationDate && registrationNumber?.trim());
  }
  return true;
}

export function isRegistrationExpiredAttention(
  line: OpportunityProductLine,
): boolean {
  const { status, expirationDate } = line.registration;
  if (status !== 'approved' || !expirationDate) return false;
  const exp = new Date(expirationDate);
  if (Number.isNaN(exp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return exp < today;
}

export type ProductLineCompletionState =
  | 'not_configured'
  | 'incomplete'
  | 'complete';

export function getProductLineCompletionState(
  line: OpportunityProductLine,
): ProductLineCompletionState {
  const hasAnyDetail =
    Boolean(line.vendorId) ||
    Boolean(line.implementationPartnerId) ||
    line.amount > 0 ||
    line.registration.status !== 'not_registered' ||
    Boolean(line.registration.registrationDate) ||
    Boolean(line.registration.registrationNumber);

  const detailsOk = isProductDetailsComplete(line);
  const registrationOk = isRegistrationComplete(line);

  if (!hasAnyDetail) return 'not_configured';
  if (detailsOk && registrationOk) return 'complete';
  return 'incomplete';
}

export function countMissingProductDetails(
  line: OpportunityProductLine,
): number {
  let missing = 0;
  if (!line.vendorId) missing += 1;
  if (!line.implementationPartnerId) missing += 1;
  if (!(line.amount > 0)) missing += 1;
  return missing;
}

export const PRODUCT_QUARTER_KEYS: ProductQuarterKey[] = [
  'q1',
  'q2',
  'q3',
  'q4',
];

export const PRODUCT_QUARTER_LABELS: Record<ProductQuarterKey, string> = {
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
};

export function emptyQuarterAmounts(): ProductQuarterAmounts {
  return { q1: 0, q2: 0, q3: 0, q4: 0 };
}

export function emptyProductTarget(): ProductTarget {
  return { annualAmount: 0, quarters: emptyQuarterAmounts() };
}

export function hasConfiguredProductTarget(
  target: ProductTarget | null | undefined,
): target is ProductTarget {
  return Boolean(target && target.annualAmount > 0);
}

/** Equal split of the annual target; remainder goes to Q4 so the four quarters always sum to annual. */
export function splitAnnualAcrossQuarters(
  annualAmount: number,
): ProductQuarterAmounts {
  const annual = Math.max(0, roundTarget(annualAmount));
  const base = roundTarget(annual / 4);
  const remainder = annual - base * 4;
  return {
    q1: base,
    q2: base,
    q3: base,
    q4: base + remainder,
  };
}

export function productTargetFromAnnual(
  annualAmount: number,
): ProductTarget | null {
  const annual = Math.max(0, roundTarget(annualAmount));
  if (annual <= 0) return null;
  return { annualAmount: annual, quarters: splitAnnualAcrossQuarters(annual) };
}

export function quartersTotal(quarters: ProductQuarterAmounts): number {
  return quarters.q1 + quarters.q2 + quarters.q3 + quarters.q4;
}

export function productTargetBalance(target: ProductTarget): {
  total: number;
  delta: number;
  matches: boolean;
} {
  const total = quartersTotal(target.quarters);
  const delta = total - target.annualAmount;
  return { total, delta, matches: Math.abs(delta) < 0.5 };
}

export function targetAmountForPeriod(
  target: ProductTarget,
  period: ProductPeriodId,
): number {
  if (period === 'annual') return target.annualAmount;
  return target.quarters[period];
}

export function achievementPercent(achieved: number, target: number): number {
  return targetAchievementPercent(achieved, target);
}

export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return roundTarget(n);
}

/** Split `total` into `parts` equal amounts (2dp). Remainder cents go to the last part. */
export function equalSplitAmounts(total: number, parts: number): number[] {
  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  if (parts <= 0) return [];
  const safeTotal = Math.max(0, Number(total) || 0);
  if (parts === 1) return [round(safeTotal)];
  const base = Math.floor((safeTotal * 100) / parts) / 100;
  const amounts = Array.from({ length: parts }, () => base);
  const allocated = round(base * parts);
  const remainder = round(safeTotal - allocated);
  amounts[parts - 1] = round(base + remainder);
  return amounts;
}

/** Redistribute `total` equally across items, returning new amount list in same order. */
export function redistributeEqualAmounts(
  total: number,
  count: number,
): number[] {
  return equalSplitAmounts(total, count);
}
