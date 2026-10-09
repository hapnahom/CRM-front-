import type { PermissionModuleDef } from '@/data/userManagementData';
import { PERMISSION_MODULES } from '@/data/userManagementData';

/**
 * Frontend sales workflow. The API keeps serving both leads and deals.
 * Unified (default): hide leads and show deals as opportunities.
 * Classic: show leads and deals, including conversion.
 */
export type SalesWorkflowMode = 'unified' | 'classic';

export const SALES_WORKFLOW_COOKIE = 'crm-sales-workflow';
const SALES_WORKFLOW_STORAGE_KEY = 'crm-sales-workflow-by-tenant';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

let serverRenderMode: SalesWorkflowMode = 'unified';

export function parseSalesWorkflowMode(
  value: string | null | undefined,
): SalesWorkflowMode {
  return value === 'classic' ? 'classic' : 'unified';
}

/** Called while rendering a request so server output matches the browser cookie. */
export function setRequestSalesWorkflowMode(mode: SalesWorkflowMode) {
  serverRenderMode = mode;
}

function readCookieMode(): SalesWorkflowMode {
  if (typeof document === 'undefined') return 'unified';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SALES_WORKFLOW_COOKIE}=([^;]*)`),
  );
  return parseSalesWorkflowMode(match ? decodeURIComponent(match[1]) : null);
}

export function getSalesWorkflowMode(): SalesWorkflowMode {
  if (typeof window === 'undefined') return serverRenderMode;
  return readCookieMode();
}

export function isLeadsEnabled(): boolean {
  return getSalesWorkflowMode() === 'classic';
}

export function readTenantSalesWorkflowMode(
  tenantId: string,
): SalesWorkflowMode {
  if (typeof window === 'undefined' || !tenantId) return 'unified';
  try {
    const raw = window.localStorage.getItem(SALES_WORKFLOW_STORAGE_KEY);
    if (!raw) return 'unified';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed[tenantId];
    return parseSalesWorkflowMode(typeof value === 'string' ? value : null);
  } catch {
    return 'unified';
  }
}

function writeWorkflowCookie(mode: SalesWorkflowMode) {
  document.cookie = `${SALES_WORKFLOW_COOKIE}=${mode}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function saveTenantSalesWorkflowMode(
  tenantId: string,
  mode: SalesWorkflowMode,
) {
  const current = readStoredWorkflowMap();
  if (tenantId) current[tenantId] = mode;
  window.localStorage.setItem(
    SALES_WORKFLOW_STORAGE_KEY,
    JSON.stringify(current),
  );
  writeWorkflowCookie(mode);
}

function readStoredWorkflowMap(): Record<string, SalesWorkflowMode> {
  try {
    const raw = window.localStorage.getItem(SALES_WORKFLOW_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: Record<string, SalesWorkflowMode> = {};
    for (const [tenantId, value] of Object.entries(parsed)) {
      if (value === 'classic' || value === 'unified') map[tenantId] = value;
    }
    return map;
  } catch {
    return {};
  }
}

/** Keeps the cookie aligned with this organization's saved choice. */
export function syncSalesWorkflowCookie(tenantId: string): boolean {
  const stored = readTenantSalesWorkflowMode(tenantId);
  if (stored === readCookieMode()) return false;
  writeWorkflowCookie(stored);
  return true;
}

/** User-facing label for deals when leads are hidden (unified opportunities mode). */
export function dealUiLabel(options?: {
  plural?: boolean;
  lowercase?: boolean;
}): string {
  const plural = options?.plural ?? false;
  const label = isLeadsEnabled()
    ? plural
      ? 'Deals'
      : 'Deal'
    : plural
      ? 'Opportunities'
      : 'Opportunity';

  return options?.lowercase ? label.toLowerCase() : label;
}

const LEADS_PERMISSION_MODULES = new Set(['Leads', 'Lead Fields']);

export function getVisiblePermissionModules(): PermissionModuleDef[] {
  if (isLeadsEnabled()) {
    return PERMISSION_MODULES;
  }
  return PERMISSION_MODULES.filter(
    (entry) => !LEADS_PERMISSION_MODULES.has(entry.module),
  );
}

export function permissionModuleDisplayName(module: string): string {
  if (isLeadsEnabled()) {
    return module;
  }
  if (module === 'Deals') return 'Opportunities';
  if (module === 'Deal Fields') return 'Opportunity Fields';
  return module;
}

export function filterLeadPipelineRecords<T extends { kind?: string }>(
  records: T[],
): T[] {
  if (isLeadsEnabled()) {
    return records;
  }
  return records.filter((record) => record.kind !== 'lead');
}

export function filterLeadPipelineStages<T extends { group?: string }>(
  stages: T[],
): T[] {
  if (isLeadsEnabled()) {
    return stages;
  }
  return stages.filter((stage) => stage.group !== 'Lead');
}

export function leadDealSettingsSectionLabel(): string {
  return isLeadsEnabled() ? 'Leads & Deals' : 'Opportunities';
}

export function appliesToScopeLabel(
  appliesTo: 'LEAD' | 'DEAL' | 'BOTH',
): string {
  if (isLeadsEnabled()) {
    return (
      {
        LEAD: 'Leads only',
        DEAL: 'Deals only',
        BOTH: 'Leads & deals',
      } as const
    )[appliesTo];
  }
  if (appliesTo === 'DEAL') {
    return `${dealUiLabel({ plural: true })} only`;
  }
  return dealUiLabel({ plural: true });
}

export function appliesToScopeOptions(): Array<{
  value: 'LEAD' | 'DEAL' | 'BOTH';
  label: string;
}> {
  if (isLeadsEnabled()) {
    return [
      { value: 'BOTH', label: 'Leads & deals' },
      { value: 'LEAD', label: 'Leads only' },
      { value: 'DEAL', label: 'Deals only' },
    ];
  }
  return [{ value: 'DEAL', label: `${dealUiLabel({ plural: true })} only` }];
}

/** User-facing record label in the custom field configuration modal. */
export function customFieldRecordLabel(options?: {
  plural?: boolean;
  lowercase?: boolean;
}): string {
  const plural = options?.plural ?? false;
  const label = plural ? 'Opportunities' : 'Opportunity';
  return options?.lowercase ? label.toLowerCase() : label;
}

/** Applies-to options shown in the custom field configuration modal. */
export function customFieldAppliesToOptions(): Array<{
  value: 'LEAD' | 'DEAL' | 'BOTH';
  label: string;
}> {
  if (isLeadsEnabled()) {
    return [
      { value: 'BOTH', label: 'All opportunities' },
      { value: 'LEAD', label: 'Intake opportunities only' },
      { value: 'DEAL', label: 'Pipeline opportunities only' },
    ];
  }
  return [
    {
      value: 'DEAL',
      label: `${customFieldRecordLabel({ plural: true })} only`,
    },
  ];
}

/** Stage picker label in the custom field configuration modal. */
export function customFieldStageLabel(variant: 'intake' | 'pipeline'): string {
  if (!isLeadsEnabled()) {
    return `${customFieldRecordLabel()} stage`;
  }
  return variant === 'intake'
    ? `${customFieldRecordLabel()} stage (intake)`
    : `${customFieldRecordLabel()} stage (pipeline)`;
}

export function customFieldStagePlaceholder(
  variant: 'intake' | 'pipeline',
): string {
  if (!isLeadsEnabled()) {
    return `Select ${customFieldRecordLabel({ lowercase: true })} stage…`;
  }
  return variant === 'intake'
    ? 'Select intake stage…'
    : 'Select pipeline stage…';
}

export function entityTypeBadgeLabel(entityType: 'LEAD' | 'DEAL'): string {
  if (entityType === 'LEAD') {
    return isLeadsEnabled() ? 'Lead' : '';
  }
  return dealUiLabel();
}

export function opportunityNameColumnLabel(): string {
  return isLeadsEnabled() ? 'Deal name' : 'Name';
}

export function closedWonSectionTitle(): string {
  return isLeadsEnabled() ? 'Closed Won Deals' : 'Closed Won Opportunities';
}

export function lostPipelineSectionTitle(): string {
  return isLeadsEnabled() ? 'Lost Leads & Deals' : 'Lost Opportunities';
}

export function masterPipelineSheetTitle(): string {
  return isLeadsEnabled()
    ? 'Master Pipeline · Opportunities & Leads'
    : 'Master Pipeline · Opportunities';
}

/**
 * UI-facing lead/deal usage count fragments.
 * When leads are off, only deal counts are shown (as opportunities).
 * Leftover lead-only links still display as "0 opportunities"; backend unlinks both.
 */
export function formatLeadDealUsageParts(
  leadCount: number,
  dealCount: number,
): string[] {
  const parts: string[] = [];
  if (isLeadsEnabled() && leadCount > 0) {
    parts.push(`${leadCount} lead${leadCount === 1 ? '' : 's'}`);
  }
  if (dealCount > 0) {
    parts.push(
      `${dealCount} ${dealUiLabel({ lowercase: true })}${dealCount === 1 ? '' : 's'}`,
    );
  } else if (!isLeadsEnabled() && leadCount > 0) {
    parts.push(`0 ${dealUiLabel({ plural: true, lowercase: true })}`);
  }
  return parts;
}

export function formatEntityUsageParts(leads: number, deals: number): string {
  const parts = formatLeadDealUsageParts(leads, deals);
  if (parts.length === 0) return '';
  return `Used by ${parts.join(' and ')}`;
}

/** e.g. "leads and deals" vs "opportunities" for intact/reassign copy. */
export function leadDealRecordsPhrase(): string {
  return isLeadsEnabled()
    ? 'leads and deals'
    : dealUiLabel({ plural: true, lowercase: true });
}

export function notificationsCategoryLabel(): string {
  return isLeadsEnabled() ? 'Leads & Deals' : dealUiLabel({ plural: true });
}

export function defaultLeadDealSettingsTab(): 'leads' | 'deals' {
  return isLeadsEnabled() ? 'leads' : 'deals';
}

export function resolveLeadDealSettingsTab(
  section: string | null | undefined,
):
  | 'leads'
  | 'deals'
  | 'types'
  | 'custom-fields'
  | 'roles'
  | 'reports'
  | 'workflow' {
  if (section === 'deals') return 'deals';
  if (section === 'types') return 'types';
  if (section === 'custom-fields') return 'custom-fields';
  if (section === 'roles' || section === 'solution-roles') return 'roles';
  if (section === 'reports') return 'reports';
  if (section === 'workflow') return 'workflow';
  if (section === 'leads' && isLeadsEnabled()) return 'leads';
  return defaultLeadDealSettingsTab();
}

export function customFieldsModuleDescription(): string {
  return isLeadsEnabled()
    ? 'Shared custom fields for leads and deals. Choose whether each field applies to leads, deals, or both, and bind it to the relevant pipeline stage(s).'
    : `Shared custom fields for ${dealUiLabel({ plural: true, lowercase: true })}. Bind each field to the relevant pipeline stage.`;
}

export function forecastEntitySourceOptions(): Array<{
  value: 'leads' | 'deals' | 'both';
  label: string;
}> {
  if (isLeadsEnabled()) {
    return [
      { value: 'both', label: 'Both Leads & Deals' },
      { value: 'deals', label: 'Deals Only' },
      { value: 'leads', label: 'Leads Only' },
    ];
  }
  return [{ value: 'deals', label: `${dealUiLabel({ plural: true })} Only` }];
}

/**
 * User-facing label for a pipeline record kind (deal/lead).
 * When leads are hidden, both map to Opportunity (Lead wording is never shown).
 */
export function pipelineRecordKindLabel(
  kind: 'deal' | 'lead',
  options?: { plural?: boolean; lowercase?: boolean },
): string {
  if (kind === 'lead' && isLeadsEnabled()) {
    const label = options?.plural ? 'Leads' : 'Lead';
    return options?.lowercase ? label.toLowerCase() : label;
  }
  return dealUiLabel(options);
}

/** User-facing noun for DEAL/LEAD entity types (approvals, badges, copy). */
export function pipelineEntityNoun(
  entityType: 'DEAL' | 'LEAD',
  options?: { plural?: boolean; lowercase?: boolean },
): string {
  return pipelineRecordKindLabel(
    entityType === 'LEAD' ? 'lead' : 'deal',
    options,
  );
}

/**
 * Rewrite stored/API pipeline copy for display when leads are hidden.
 * Preserves Title Case vs lowercase (e.g. "Deal won" → "Opportunity won").
 * Leaves non-pipeline product terms alone (Deal Registration, Team Lead, etc.).
 */
export function pipelineDisplayText(text: string): string {
  if (isLeadsEnabled() || !text) return text;

  const singular = dealUiLabel();
  const plural = dealUiLabel({ plural: true });
  const singularLower = singular.toLowerCase();
  const pluralLower = plural.toLowerCase();

  const protectedPhrases = [
    'Deal Registration',
    'Deal Registrations',
    'deal registration',
    'deal registrations',
    'Deal Reg',
    'deal reg',
    'Team Lead',
    'team lead',
    'Lead Generation',
    'lead generation',
    'Leads generated',
    'leads generated',
  ];
  const placeholders = protectedPhrases.map(
    (phrase, index) => `\u0000PROTECTED_${index}\u0000`,
  );
  let result = text;
  protectedPhrases.forEach((phrase, index) => {
    result = result.split(phrase).join(placeholders[index]!);
  });

  result = result
    .replace(/lead or deal opportunity/gi, singularLower)
    .replace(/leads or deals/gi, pluralLower)
    .replace(/lead or deal/gi, singularLower)
    .replace(/lead \/ deal/gi, singularLower)
    .replace(/\bdeal opportunity\b/gi, singularLower)
    .replace(/\bDeals\b/g, plural)
    .replace(/\bdeals\b/g, pluralLower)
    .replace(/\bDeal\b/g, singular)
    .replace(/\bdeal\b/g, singularLower)
    .replace(/\bLeads\b/g, plural)
    .replace(/\bleads\b/g, pluralLower)
    .replace(/\bLead\b/g, singular)
    .replace(/\blead\b/g, singularLower);

  protectedPhrases.forEach((phrase, index) => {
    result = result.split(placeholders[index]!).join(phrase);
  });

  return result;
}

/** Rewrites user-facing notification copy for unified opportunities mode. */
export function notificationDisplayLabel(label: string): string {
  if (isLeadsEnabled()) return label;

  const exact: Record<string, string> = {
    Leads: dealUiLabel({ plural: true }),
    'Deals & Opportunities': dealUiLabel({ plural: true }),
    'Lead / Deal Assigned to You': `${dealUiLabel()} Assigned to You`,
    'Added to Lead / Deal Team': `Added to ${dealUiLabel()} Team`,
    'Lead Converted to Deal / Deal Closed as Won': `${dealUiLabel()} Closed as Won`,
    'New Lead / Deal Created': `New ${dealUiLabel()} Created`,
    'Lead / Deal Unassigned or Reassigned': `${dealUiLabel()} Unassigned or Reassigned`,
    'Inbound Email from Lead / Customer': 'Inbound Email from Customer',
    'Deal Assigned to You': `${dealUiLabel()} Assigned to You`,
    'Added to Deal Team': `Added to ${dealUiLabel()} Team`,
    'Deal Stage Advanced': `${dealUiLabel()} Stage Advanced`,
    'Deal Closed as Won': `${dealUiLabel()} Closed as Won`,
    'Deal Closed as Lost': `${dealUiLabel()} Closed as Lost`,
    'Deal Value / Amount Changed': `${dealUiLabel()} Value / Amount Changed`,
    'Deal Expected Close Date Overdue': `${dealUiLabel()} Expected Close Date Overdue`,
    'New Deal Created': `New ${dealUiLabel()} Created`,
  };

  return exact[label] ?? pipelineDisplayText(label);
}

export function notificationDisplayDescription(description: string): string {
  return pipelineDisplayText(description);
}

export function alignedOpportunitiesFootnote(count: number): string {
  return `${count} aligned ${dealUiLabel({ plural: count !== 1, lowercase: true })}`;
}

export function alignedOpportunitiesColumnLabel(): string {
  return `Aligned ${dealUiLabel({ plural: true, lowercase: true })}`;
}

export function pipelineStagesSettingsTabLabel(): string {
  return isLeadsEnabled() ? 'Deals' : 'Pipeline stages';
}

export type OpportunityTypeCategory = 'SD' | 'BID';

const OPPORTUNITY_TYPE_CATEGORY_META: Record<
  OpportunityTypeCategory,
  { label: string; description: string }
> = {
  SD: {
    label: 'SD',
    description: 'Solution Design',
  },
  BID: {
    label: 'BID',
    description: 'Bid opportunities',
  },
};

export function opportunityTypeCategoryOptions(): Array<{
  value: OpportunityTypeCategory;
  label: string;
}> {
  return (
    Object.keys(OPPORTUNITY_TYPE_CATEGORY_META) as OpportunityTypeCategory[]
  ).map((value) => ({
    value,
    label: `${OPPORTUNITY_TYPE_CATEGORY_META[value].label} — ${OPPORTUNITY_TYPE_CATEGORY_META[value].description}`,
  }));
}

export function opportunityTypeCategoryLabel(
  category: OpportunityTypeCategory,
): string {
  return OPPORTUNITY_TYPE_CATEGORY_META[category]?.label ?? category;
}

export function opportunityTypeCategoryDescription(
  category: OpportunityTypeCategory,
): string {
  return OPPORTUNITY_TYPE_CATEGORY_META[category]?.description ?? category;
}

export function opportunityTypeCategories(): OpportunityTypeCategory[] {
  return ['SD', 'BID'];
}

/** e.g. "Lead and Deal lines" vs "Opportunity lines" for product catalog copy. */
export function productCatalogLinesPhrase(): string {
  return isLeadsEnabled()
    ? 'Lead and Deal lines'
    : `${dealUiLabel({ plural: true })} lines`;
}

export function productCatalogVendorsDescription(): string {
  return isLeadsEnabled()
    ? 'Available vendors for Lead and Deal product lines.'
    : `Available vendors for ${dealUiLabel({ plural: true, lowercase: true })} product lines.`;
}

/** Compact "X Deals · Y Leads" style counts for performance cards. */
export function pipelineEntityCountLabel(
  dealsCount: number,
  leadsCount = 0,
): string {
  const dealPart = `${dealsCount} ${dealUiLabel({ plural: dealsCount !== 1 })}`;
  if (!isLeadsEnabled()) return dealPart;
  return `${dealPart} · ${leadsCount} Lead${leadsCount === 1 ? '' : 's'}`;
}

export function conversionFunnelChartTitle(): string {
  return isLeadsEnabled()
    ? 'Lead to Deal Conversion Funnel'
    : 'Opportunity Conversion Funnel';
}

export function pipelineChartTitle(isDealsPipeline: boolean): string {
  if (!isLeadsEnabled()) {
    return `${dealUiLabel({ plural: true })} Pipeline`;
  }
  return isDealsPipeline ? 'Deals Pipeline' : 'Leads Pipeline';
}

export function reportDealStageLabel(): string {
  return isLeadsEnabled() ? 'Deal Stage' : `${dealUiLabel()} Stage`;
}

export function reportDealStatusLabel(): string {
  return isLeadsEnabled() ? 'Deal Status' : `${dealUiLabel()} Status`;
}

export function reportDealNameLabel(): string {
  return isLeadsEnabled() ? 'Deal Name' : `${dealUiLabel()} Name`;
}

export function reportDealValueLabel(): string {
  return isLeadsEnabled() ? 'Deal Value' : `${dealUiLabel()} Value`;
}

export function reportDealCountLabel(): string {
  return isLeadsEnabled() ? 'Deal Count' : `${dealUiLabel()} Count`;
}

export function reportOpenDealsLabel(): string {
  return isLeadsEnabled()
    ? 'Open Deals'
    : `Open ${dealUiLabel({ plural: true })}`;
}

export function resolveWorkflowEntityScopeLabel(
  entityScope: 'LEAD' | 'DEAL' | 'TARGET' | 'ANY' | string,
): string {
  if (entityScope === 'LEAD') {
    return isLeadsEnabled() ? 'Leads only' : '';
  }
  if (entityScope === 'DEAL') {
    return isLeadsEnabled()
      ? 'Deals only'
      : `${dealUiLabel({ plural: true })} only`;
  }
  if (entityScope === 'TARGET') return 'Targets only';
  if (entityScope === 'ANY') {
    return isLeadsEnabled() ? 'Leads & deals' : dealUiLabel({ plural: true });
  }
  return String(entityScope);
}
