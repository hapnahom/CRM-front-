import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type { PipelineStage as DealStage } from '@/store/server/features/deals/pipeline/types';
import type { PipelineStage as LeadStage } from '@/store/server/features/leads/pipeline/types';
import type {
  CatalogProduct,
  ProductFamily,
} from '@/modules/product-catalog/types';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';
import type { PipelineListQueryParams } from '@/lib/pipeline/list-query';

export const REPORT_SECTION_IDS = [
  'executive_summary',
  'team_performance',
  'deal_registry',
] as const;

export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number];

export const DEFAULT_REPORT_SECTIONS: ReportSectionId[] = [
  ...REPORT_SECTION_IDS,
];

export const REPORT_SECTION_META: Record<
  ReportSectionId,
  { title: string; description: string }
> = {
  executive_summary: {
    title: 'Executive Dashboard',
    description:
      'KPI summary, target coverage, stage/product charts, and team performance',
  },
  team_performance: {
    title: 'CRM Team Performance',
    description:
      'Department, team, and sales-representative performance (included in Executive Summary)',
  },
  deal_registry: {
    title: 'Total Pipeline',
    get description() {
      return isLeadsEnabled()
        ? 'Combined leads and deals inventory with products and fields'
        : `${dealUiLabel({ plural: true })} inventory with products and fields`;
    },
  },
};

export type ReportPeriodPreset = 'annual' | 'session' | 'custom';

export type ReportFilters = {
  ownerIds: string[];
  teamIds: string[];
  dealStageIds: string[];
  productFamilyIds: string[];
  productIds: string[];
  vectorIds: string[];
  currencies: string[];
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  ownerIds: [],
  teamIds: [],
  dealStageIds: [],
  productFamilyIds: [],
  productIds: [],
  vectorIds: [],
  currencies: [],
};

export type ReportConfig = {
  periodPreset: ReportPeriodPreset;
  customFrom: string | null;
  customTo: string | null;
  filters: ReportFilters;
  sections: ReportSectionId[];
};

export type ResolvedReportPeriod = {
  preset: ReportPeriodPreset;
  label: string;
  from: string;
  to: string;
  sessionId?: string;
  sessionIds?: string[];
  /** When true, records are also filtered by createdAt inside the date range. */
  applyCreatedAtFilter: boolean;
  /** Fiscal calendar year label when known (e.g. "FY2026"). */
  fiscalYear?: string;
  /** Applicable quarter / session name (e.g. "Q2"). */
  quarter?: string;
  /** Week label when the selected period is week-scoped. */
  week?: string;
};

export type MoneyByCurrency = Record<string, number>;

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  context?: string;
};

export type StageRow = {
  id: string;
  label: string;
  group: 'Lead' | 'Deal';
  count: number;
  countByCurrency: MoneyByCurrency;
  value: MoneyByCurrency;
  share: number;
  color: string;
  category?: string;
  averageDaysInStage: number | null;
};

export type TeamRow = {
  id: string;
  name: string;
  department: string;
  leads: number;
  deals: number;
  pipeline: MoneyByCurrency;
  won: MoneyByCurrency;
  lost: MoneyByCurrency;
  winRate: number | null;
  coverage: number | null;
  coverageLabel: string;
};

export type OrgUnitRow = {
  id: string;
  department: string;
  team: string;
  vector: string;
  leads: number;
  deals: number;
  pipeline: MoneyByCurrency;
  target: MoneyByCurrency | null;
  achieved: MoneyByCurrency | null;
  remaining: MoneyByCurrency | null;
  coverage: number | null;
  coverageLabel: string;
};

export type SalesRepRow = {
  id: string;
  name: string;
  team: string;
  department: string;
  leads: number;
  deals: number;
  pipeline: MoneyByCurrency;
  won: MoneyByCurrency;
  lost: MoneyByCurrency;
  winRate: number | null;
  target: MoneyByCurrency | null;
  achieved: MoneyByCurrency | null;
  remaining: MoneyByCurrency | null;
  achievementPct: number | null;
  /** Quarterly revenue target × 3 — pipeline creation goal. */
  pipelineTarget: MoneyByCurrency | null;
  /**
   * Pipeline Achievement % by currency (QPV ÷ pipeline target).
   * null when the custom metric is not configured for the tenant.
   */
  pipelineAchievement: Record<string, number | null> | null;
};

export type TargetRow = {
  id: string;
  period: string;
  scope: string;
  level: 'company' | 'team' | 'person';
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
  achievementPct: number | null;
  pipeline: MoneyByCurrency;
  coverage: number | null;
  coverageLabel: string;
};

export type AttentionSeverity = 'critical' | 'warning';

export type AttentionRow = {
  id: string;
  name: string;
  owner: string;
  customer: string;
  value: number;
  currency: string;
  stage: string;
  expectedClose: string | null;
  daysOpen: number | null;
  issue: string;
  severity: AttentionSeverity;
};

export type RiskFlagRow = {
  id: string;
  flag: string;
  severity: AttentionSeverity;
  impact: string;
  action: string;
};

export type OutlookDealRow = {
  id: string;
  name: string;
  customer: string;
  owner: string;
  team: string;
  department: string;
  stage: string;
  stageColor: string;
  value: number;
  currency: string;
  date: string | null;
};

export type NewlyAddedRow = {
  id: string;
  name: string;
  customer: string;
  vector: string;
  addedBy: string;
  intakeStage: string;
  stageColor: string;
  value: number;
  currency: string;
  status: string;
};

export type ConcentrationRow = {
  id: string;
  customer: string;
  vector: string;
  activeDeals: number;
  openPipeline: MoneyByCurrency;
  wonRevenue: MoneyByCurrency;
  totalVolume: MoneyByCurrency;
};

export type RegistryRecordType = 'Deal' | 'Lead';

export type RegistryRow = {
  id: string;
  recordType: RegistryRecordType;
  /** Lead type or deal type name (not Lead/Deal kind). */
  type: string;
  name: string;
  customer: string;
  /** Owner / primary assignee display name. */
  owner: string;
  contact: string;
  contactPosition: string;
  contactEmail: string;
  contactPhone: string;
  /** Fiscal quarter when the record was closed (won/lost only). */
  quarterClosed: string;
  /** Assignment role values keyed by role id. */
  roleValues?: Record<string, string>;
  /** Solution role values keyed by solution role id. */
  solutionRoleValues?: Record<string, string>;
  team: string;
  department: string;
  stage: string;
  /** Stage name before moving to inactive/lost (when available). */
  previousStage?: string;
  stageColor: string;
  stageCategory: 'open' | 'won' | 'lost' | 'inactive' | 'other';
  stageOrder: number;
  value: number;
  currency: string;
  fiscalYear: string;
  quarter: string;
  drStatus: string;
  expectedClose: string | null;
  expectedCloseLabel: string;
  /** Newline-joined product family names on the opportunity. */
  productFamily: string;
  /** Newline-joined vendor names. */
  vendor: string;
  /** Newline-joined product names (with amounts when present). */
  product: string;
  /** Newline-joined deal registration statuses. */
  dealRegistration: string;
  /** Newline-joined product line values. */
  productValue: string;
  /** Formatted custom field values keyed by entity field id. */
  customValues?: Record<string, string>;
  /** Calendar days in the current stage (from stageEnteredAt). */
  daysInCurrentStage?: number | null;
  /** ISO timestamp of the most recent activity on this opportunity. */
  lastActivityDate?: string | null;
};

/** Product share of open pipeline for donut charts (one series per currency). */
export type ProductPipelineRow = {
  id: string;
  label: string;
  count: number;
  countByCurrency: MoneyByCurrency;
  value: MoneyByCurrency;
  share: number;
  color: string;
};

export type CurrencyAchievement = {
  currency: string;
  target: number;
  achieved: number;
  remaining: number;
  achievementPct: number | null;
  annualTarget?: number;
  annualAchieved?: number;
  annualRemaining?: number;
  annualAchievementPct?: number | null;
};

export type ReportCompositeSubFieldColumn = {
  key: string;
  label: string;
  fieldType: string;
  options?: Array<{ label: string; value: string }>;
};

export type ReportCustomFieldColumn = {
  id: string;
  label: string;
  fieldType: string;
  entityType: 'LEAD' | 'DEAL';
  /** Deal stage this field is configured on (DEAL / BOTH fields). */
  dealStageId?: string | null;
  /** Lead stage this field is configured on (LEAD / BOTH fields). */
  leadStageId?: string | null;
  /** Report column group name (settings.reportColumnGroup). */
  reportColumnGroup?: string | null;
  /** @deprecated Use reportColumnGroup as the column header. */
  reportColumnLabel?: string | null;
  /** Also show this open/won-stage field in the Inactive Opportunities table. */
  showInInactiveReport?: boolean;
  options?: Array<{ label: string; value: string }>;
  subFields?: ReportCompositeSubFieldColumn[];
};

export type ReportOmission = {
  id: string;
  reason: string;
};

export type ReportSummary = {
  totalPipeline: MoneyByCurrency;
  openPipeline: MoneyByCurrency;
  openDeals: number;
  wonRevenue: MoneyByCurrency;
  lostValue: MoneyByCurrency;
  /** @deprecated Prefer winRateByCurrency — no single rate across mixed currencies. */
  winRate: number | null;
  winRateByCurrency: Record<string, number | null>;
  winRateDetail: string;
  totalLeads: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  soonToCloseCount: number;
  newlyAddedCount: number;
  churnRate: number | null;
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
  achievementPct: number | null;
  /** Per-currency achievement for multi-currency pie/ring charts. */
  achievementByCurrency: CurrencyAchievement[];
  /**
   * Qualified pipeline value (active deals in configured stage set), by currency.
   * Empty when custom Pipeline Achievement metric is not configured.
   */
  qualifiedPipelineValue: MoneyByCurrency;
  /**
   * Pipeline Achievement % = QPV ÷ (3× quarterly target), by currency.
   * null entry / missing config → treat as not configured.
   */
  pipelineAchievementByCurrency: Record<string, number | null>;
  /** True when an enabled value_over_pipeline_target metric with stage IDs is configured. */
  pipelineAchievementConfigured: boolean;
  /** Display name of the configured Pipeline Achievement metric (if any). */
  pipelineAchievementMetricName: string | null;
  /**
   * Stage-exit conversion rate (e.g. SD Conversion Rate), as a percentage.
   * null when the metric is not configured or denominator is 0.
   */
  sdConversionRate: number | null;
  /**
   * Stage-exit conversion rate by deal currency (ETB / USD), same formula as
   * sdConversionRate scoped to deals in that currency.
   */
  sdConversionRateByCurrency: Record<string, number | null>;
  /** True when an enabled stage_exit_conversion metric is fully configured. */
  sdConversionConfigured: boolean;
  /** Display name of the configured exit-conversion metric (if any). */
  sdConversionMetricName: string | null;
  /** Detail like "12 of 40 Shape exits to Proposal / Lost / Dropped". */
  sdConversionDetail: string | null;
  /** Stagnant open deals per tenant-configured threshold. */
  stagnationConfigured: boolean;
  stagnationThresholdDays: number | null;
  stagnantDealCount: number | null;
  /** Average days from sales cycle start to end stage set. */
  salesCycleConfigured: boolean;
  salesCycleAverageDays: number | null;
  salesCycleCompletedCycles: number;
  salesCycleDetail: string | null;
  coverage: number | null;
  coverageLabel: string;
};

export type DropAnalysisRow = {
  reason?: string | null;
  stageId: string;
  stageName: string;
  count: number;
};

export type ReportMeta = {
  title: string;
  companyName: string;
  logoUrl: string | null;
  periodLabel: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  filterLabels: string[];
  /** One-line filter summary for PDF/Excel headers when scoped filters are active. */
  filterSummary: string | null;
  scopeLabel: string;
  /** Backend-resolved max access: company | department | team | personal. */
  permissionScopeLevel: 'company' | 'department' | 'team' | 'personal' | null;
  currencyLabel: string;
  primaryCurrency: string;
  currencies: string[];
  selectedSections: ReportSectionId[];
  recordCount: number;
  sectionCount: number;
  dealCustomFields: ReportCustomFieldColumn[];
  leadCustomFields: ReportCustomFieldColumn[];
  /** Custom fields configured on inactive/lost deal stages. */
  inactiveLostDealCustomFields: ReportCustomFieldColumn[];
  /** Custom fields configured on inactive/lost lead stages. */
  inactiveLostLeadCustomFields: ReportCustomFieldColumn[];
  /** Deal stage ids with category inactive or lost — for Total Pipeline column filtering. */
  dealInactiveLostStageIds: string[];
  /** Lead stage ids with category lost — for Total Pipeline column filtering. */
  leadInactiveLostStageIds: string[];
  /** Tenant assignment roles for Total Pipeline dynamic columns. */
  assignmentRoles: import('./columns').ReportAssignmentRoleColumn[];
  /** Column ids included in PDF/Excel exports. */
  selectedColumnIds: string[];
  /** e.g. "Executive Report", "Sales Report", "Alpha Sales Report", "My Sales Report" */
  reportKindLabel: string;
  /**
   * Export entity scope for filenames/headers:
   * Executive | Department | Team | My Report
   */
  exportEntityLabel: string;
  /** Fiscal year used for export naming/header (matches generated period). */
  exportFiscalYear: string;
  /** Fiscal quarter / session used for export naming/header. */
  exportQuarter: string;
  /** Week label when the selected period includes a week. */
  exportWeek: string;
  /** Team ids explicitly selected in report filters (empty = no team filter). */
  appliedTeamIds: string[];
  /** e.g. "3 departments · 12 teams · 48 members" */
  orgCountsLabel: string;
  pipelineRowColorMode?: 'full' | 'indicator';
  departmentCount?: number;
  teamCount?: number;
  memberCount?: number;
};

export type OpportunityOutlook = {
  soonToClose: OutlookDealRow[];
  closedWon: OutlookDealRow[];
  newlyAdded: NewlyAddedRow[];
};

export type SalesPipelineReportData = {
  meta: ReportMeta;
  summary: ReportSummary;
  stages: StageRow[];
  /** Open pipeline value grouped by product (for product donuts). */
  productPipeline: ProductPipelineRow[];
  orgUnits: OrgUnitRow[];
  teams: TeamRow[];
  salesReps: SalesRepRow[];
  targets: TargetRow[];
  outlook: OpportunityOutlook;
  concentration: ConcentrationRow[];
  /** Combined deals + leads for the Total Pipeline sheet. */
  pipelineRegistry: RegistryRow[];
  /** Inactive deals, lost deals, and disqualified leads. */
  inactiveOpportunitiesRegistry: RegistryRow[];
  registry: RegistryRow[];
  leadRegistry: RegistryRow[];
  /** Closed-won deals shaped like registry rows (same columns as Total Pipeline deals). */
  closedWonRegistry: RegistryRow[];
  riskFlags: RiskFlagRow[];
  observations: string[];
  attention: AttentionRow[];
  dropAnalysis: DropAnalysisRow[];
  omissions: ReportOmission[];
};

export type ReportCatalog = {
  leadStages: LeadStage[];
  dealStages: DealStage[];
  products: CatalogProduct[];
  families: ProductFamily[];
  /** Optional full vendors for product↔family resolution via productFamilyIds. */
  vendors?: Array<{ id: string; productFamilyIds?: string[] }>;
  /** Optional vendor id → name for product line labels. */
  vendorNameById?: Record<string, string>;
  wonByProductId: Record<string, number>;
};

export type ReportOrgTeam = {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  teamLeadId?: string | null;
  teamLeadName?: string | null;
};

export type ReportOwnerOrg = {
  userId: string;
  teamId: string;
  teamName: string;
  departmentName: string;
};

export type ReportVector = {
  id: string;
  name: string;
};

export type ReportTargetInput = {
  periodLabel: string;
  company: Array<{
    currency: string;
    target: number;
    achieved: number;
  }>;
  teams: Array<{
    id: string;
    name: string;
    currency: string;
    target: number;
    achieved: number;
  }>;
  people: Array<{
    id: string;
    name: string;
    team: string;
    currency: string;
    target: number;
    achieved: number;
  }>;
  annual?: Array<{
    currency: string;
    target: number;
    achieved: number;
    remaining?: number;
  }>;
  /** Annual target/achievement per team (for filtered team reports). */
  annualTeams?: Array<{
    id: string;
    name: string;
    currency: string;
    target: number;
    achieved: number;
    remaining?: number;
  }>;
};

export type ReportSourcePayload = {
  leads: PipelineLead[];
  deals: PipelineDeal[];
  catalog: ReportCatalog;
  targets: ReportTargetInput | null;
  companyName: string;
  logoUrl: string | null;
  sessions: OrgFiscalSession[];
  /**
   * Fiscal calendars from Settings — used for FY labels and Current Reporting.
   * Prefer calendar `name` over deriving a year from session dates.
   */
  fiscalYears?: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
    sessions: OrgFiscalSession[];
  }>;
  /** customerId → vectorId for vector-based report filtering */
  customerVectorById?: Record<string, string | null>;
  orgTeams?: ReportOrgTeam[];
  ownerOrgs?: ReportOwnerOrg[];
  vectors?: ReportVector[];
  /** Optional userId → display name (e.g. from org directory). */
  userNameById?: Record<string, string>;
  /** Precomputed org counts for meta labels; otherwise derived from orgTeams/ownerOrgs. */
  orgCounts?: { departments: number; teams: number; members: number };
  /** How stage color is applied on pipeline registry rows. */
  pipelineRowColorMode?: 'full' | 'indicator';
  /** Active assignment roles for Total Pipeline columns. */
  assignmentRoles?: import('./columns').ReportAssignmentRoleColumn[];
  /** Permission scope resolved by the backend (company / department / team / personal). */
  permissionScopeLabel?: string;
  permissionScopeLevel?: 'company' | 'department' | 'team' | 'personal';
  /**
   * Optional custom pipeline metrics (stage sets + KPI defs) from deal pipeline settings.
   * Used for Pipeline Achievement % and similar tenant-configured KPIs.
   */
  customPipelineMetrics?:
    | import('@/modules/pipeline/custom-pipeline-metrics').CustomPipelineMetricsConfig
    | null;
  /** Org unit names for scoped report titles (department manager / team lead). */
  scopeDepartmentName?: string | null;
  scopeTeamName?: string | null;
  scopeTeamId?: string | null;
  scopeDepartmentId?: string | null;
  /** Backend-resolved team ids for the report scope (used to resolve titles). */
  allowedTeamIds?: string[];
  /** Display name of the report viewer — used as SCOPE for personal access. */
  reportViewerName?: string | null;
  customFields?: {
    dealColumns: ReportCustomFieldColumn[];
    leadColumns: ReportCustomFieldColumn[];
    inactiveLostDealColumns: ReportCustomFieldColumn[];
    inactiveLostLeadColumns: ReportCustomFieldColumn[];
    dealValuesById: Map<string, Record<string, unknown>>;
    leadValuesById: Map<string, Record<string, unknown>>;
    directory: import('@/lib/pipeline/format-custom-field-value').CustomFieldDirectory;
  };
  /** dealId → ISO timestamp of most recent activity. */
  lastActivityAtByDealId?: Record<string, string>;
  /** leadId → ISO timestamp of most recent activity. */
  lastActivityAtByLeadId?: Record<string, string>;
  /** History-backed stage analytics from POST /pipeline/analytics/stage-metrics. */
  stageAnalytics?:
    | import('@/store/server/features/pipeline/stage-analytics/queries').PipelineStageAnalytics
    | null;
};

export type BuildReportArgs = {
  source: ReportSourcePayload;
  period: ResolvedReportPeriod;
  filters: ReportFilters;
  sections: ReportSectionId[];
  selectedColumnIds?: string[];
};

/** Isolated integration point for a future report aggregation API. */
export type PipelineReportApiParams = PipelineListQueryParams;
