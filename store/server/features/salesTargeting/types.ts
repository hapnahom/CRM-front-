export type SalesTargetPlanStatus =
  | 'draft'
  | 'published'
  | 'locked'
  | 'archived';
export type SalesTargetLevel = 'company' | 'department' | 'team' | 'person';
export type SalesTargetSourceType = 'forecast' | 'edited_forecast' | 'manual';
export type SalesTargetOpportunityType = 'deal' | 'lead' | 'custom';
export type SalesTargetForecastHorizon = 'annual' | 'session';
export type SalesTargetForecastStageCategory =
  | 'pipeline'
  | 'best_case'
  | 'commit'
  | 'closed';

export type TargetSettingMethod = 'TOP_TO_BOTTOM' | 'BOTTOM_TO_TOP' | 'HYBRID';

export type SalesTargetRequestStatus =
  | 'DRAFT'
  | 'PENDING_TEAM'
  | 'TEAM_APPROVED'
  | 'TEAM_REJECTED'
  | 'PENDING_DEPARTMENT'
  | 'DEPARTMENT_APPROVED'
  | 'DEPARTMENT_REJECTED'
  | 'PENDING_COMPANY'
  | 'COMPANY_APPROVED'
  | 'COMPANY_REJECTED'
  | 'PENDING_RECONCILIATION'
  | 'RECONCILED'
  | 'OFFICIAL';

export type SalesTargetRevisionSource =
  | 'MEMBER_SUBMISSION'
  | 'DEPARTMENT_SUBMISSION'
  | 'TEAM_SUBMISSION'
  | 'TEAM_MODIFICATION'
  | 'DEPARTMENT_MODIFICATION'
  | 'COMPANY_MODIFICATION'
  | 'TEAM_RESUBMISSION'
  | 'RECONCILIATION';

export type SalesTargetReviewLevel = 'TEAM' | 'DEPARTMENT' | 'COMPANY';
export type SalesTargetReviewDecision =
  | 'APPROVED'
  | 'REJECTED'
  | 'MODIFIED'
  | 'RETURNED';

export interface TargetRequestAllowedActions {
  reviewLevel: SalesTargetReviewLevel;
  allowedDecisions: SalesTargetReviewDecision[];
  mayModifyContent: boolean;
  advancesWorkflow: boolean;
}

export interface TargetRequestAllowedActionsResponse {
  requestId: string;
  actions: TargetRequestAllowedActions | null;
  currentStatus: SalesTargetRequestStatus;
  currentReviewLevel: SalesTargetReviewLevel | null;
  currentStepOrder: number | null;
}

export type TargetPrerequisiteEntityType = 'department' | 'team';

export type TargetPrerequisiteCompletion =
  | 'department_target'
  | 'all_team_targets'
  | 'each_team_target';

export type TargetPrerequisiteLevel = 'annual' | 'session' | 'both';

/** Cross-entity target sequencing rule (org-structure department or team IDs). */
export interface TargetPrerequisite {
  blockedType: TargetPrerequisiteEntityType;
  blockedId: string;
  requiredType: TargetPrerequisiteEntityType;
  requiredIds: string[];
  requiredCompletion: TargetPrerequisiteCompletion;
  level: TargetPrerequisiteLevel;
}

export interface SalesTargetingSettings {
  id: string;
  tenantId: string;
  /** Multi-method inclusion (stage/value/date/manual). Enabled methods combine with OR. */
  forecastInclusionConfig?: ForecastInclusionConfig | null;
  forecastStageCategories?: Record<string, string> | null;
  targetPrerequisites?: TargetPrerequisite[] | null;
  /** Default for newly created plans only. */
  targetSettingMethod?: TargetSettingMethod;
  /** When true, Approvals UI + assigned workflows apply (team + person/my targets). */
  enableApprovalWorkflows?: boolean;
  teamTargetApprovalWorkflowId?: string | null;
  personTargetApprovalWorkflowId?: string | null;
  /** Readable without view-teams — used for bottom-up / hybrid proposal eligibility. */
  mainDepartmentId?: string | null;
  mainDepartmentName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ForecastOpportunitySource = 'leads' | 'deals' | 'both';

export interface ForecastInclusionConfig {
  stage: {
    enabled: boolean;
    includeLeads: boolean;
    includeDeals: boolean;
    leadStageIds: string[];
    dealStageIds: string[];
  };
  value: {
    enabled: boolean;
    thresholdsByCurrency: Record<
      string,
      { minValue: number; maxValue: number | null }
    >;
    source: ForecastOpportunitySource;
  };
  date: {
    enabled: boolean;
    periodMode: 'fiscal' | 'custom';
    calendarId: string | null;
    sessionId: string | null;
    customStartDate: string | null;
    customEndDate: string | null;
    /** Match horizon against createdAt or expectedClose. */
    dateField: 'createdAt' | 'expectedClose';
    source: ForecastOpportunitySource;
    includeOverdue: boolean;
    excludeWithoutCloseDate: boolean;
  };
  manual: {
    enabled: boolean;
  };
}

export interface CustomForecast {
  id: string;
  tenantId: string;
  planId: string;
  currencyId: string;
  /** Logical custom shared by multi-team rows */
  groupId?: string;
  sessionId: string | null;
  opportunityName: string;
  forecastValue: number;
  salesTeamId: string;
  department: string | null;
  ownerName: string | null;
  notes: string | null;
  periodLabel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkingForecastStatus = 'generated' | 'locked';

export interface WorkingForecast {
  id: string;
  tenantId: string;
  planId: string;
  currencyId: string | null;
  horizon: SalesTargetForecastHorizon;
  sessionId: string | null;
  /** `company` | `dept:{id}` | `team:{id}` | `person:{id}` */
  scopeKey?: string;
  departmentId?: string | null;
  salesTeamId?: string | null;
  salespersonId?: string | null;
  periodKey: string;
  periodLabel: string;
  dateRangeLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: WorkingForecastStatus;
  totalPipelineValue: number;
  totalForecastValue: number;
  expectedRevenue: number;
  opportunityCount: number;
  methodBreakdown: {
    stage: number;
    value: number;
    date: number;
    manual: number;
  } | null;
  lines: Array<Record<string, unknown>> | null;
  generatedAt: string | null;
  generatedBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
}

export interface PlanCurrency {
  id: string;
  planId: string;
  currencyId: string;
  annualAmount: number;
  currency?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface SalesTargetAllocation {
  id: string;
  planId: string;
  planCurrencyId: string;
  level: SalesTargetLevel;
  sessionId: string | null;
  orgDepartmentId: string | null;
  parentOrgDepartmentId?: string | null;
  userId?: string | null;
  amount: number;
}

export interface ForecastSnapshotLine {
  id: string;
  opportunityType: SalesTargetOpportunityType;
  opportunityId: string;
  opportunityName: string;
  customerId: string | null;
  customerName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  stageId: string | null;
  stageName: string | null;
  salesTeamId: string | null;
  department: string | null;
  opportunityValue: number;
  forecastValue: number;
  /** Computed stage weight (0–100) used for this commit — display only */
  probability: number;
  expectedCloseDate: string | null;
  isOverridden: boolean;
  originalForecastValue: number | null;
  originalProbability: number | null;
  sessionId?: string | null;
}

export interface ForecastSnapshot {
  id: string;
  planId: string;
  horizon: SalesTargetForecastHorizon;
  sessionId: string | null;
  scopeLevel: SalesTargetLevel;
  orgUnitId: string | null;
  userId?: string | null;
  sourceType: SalesTargetSourceType;
  currencyId: string | null;
  totalPipelineValue: number;
  totalForecastValue: number;
  opportunityCount: number;
  committedAmount: number;
  committedAt: string | null;
  committedBy?: string | null;
  createdAt: string;
  createdBy?: string | null;
  lines?: ForecastSnapshotLine[];
}

/** @deprecated Prefer forecastSnapshots[]; kept for transitional UI reads */
export type ForecastSnapshotLegacy = ForecastSnapshot & {
  totalExpectedRevenue?: number;
};

export interface SalesTargetPlan {
  id: string;
  tenantId: string;
  calendarId: string;
  name: string;
  description: string | null;
  level: SalesTargetLevel;
  orgUnitId: string | null;
  /** @deprecated Removed from plan table; source lives on forecast snapshots */
  sourceType?: SalesTargetSourceType;
  /** Immutable workflow method snapped at plan creation. */
  targetSettingMethod?: TargetSettingMethod;
  status: SalesTargetPlanStatus;
  currencyTargets: PlanCurrency[];
  allocations: SalesTargetAllocation[];
  forecastSnapshots?: ForecastSnapshot[];
  /** @deprecated Use forecastSnapshots */
  forecastSnapshot?: ForecastSnapshot | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface SalesTargetRequestOpportunity {
  id: string;
  revisionId: string;
  opportunityType: SalesTargetOpportunityType;
  opportunityId: string;
  opportunityName: string | null;
  opportunityValue: number;
  forecastValue: number;
  allocatedAmount: number;
  probability: number | null;
  expectedCloseDate: string | null;
  ownerId: string | null;
  teamId: string | null;
  departmentId: string | null;
  createdAt: string;
}

export interface SalesTargetRequestRevision {
  id: string;
  requestId: string;
  revisionNumber: number;
  amount: number;
  description: string | null;
  revisionSource: SalesTargetRevisionSource;
  revisionReason: string | null;
  forecastSnapshotAmount?: number | null;
  createdBy?: string | null;
  createdAt: string;
  opportunities?: SalesTargetRequestOpportunity[];
}

export interface SalesTargetReview {
  id: string;
  requestId: string;
  revisionId: string;
  reviewLevel: SalesTargetReviewLevel;
  reviewerId: string;
  decision: SalesTargetReviewDecision;
  comment: string | null;
  createdAt: string;
}

export interface SalesTargetRequest {
  id: string;
  tenantId: string;
  planId: string;
  currencyId: string;
  targetLevel: SalesTargetLevel;
  orgUnitId: string | null;
  teamId: string | null;
  userId: string | null;
  horizon: SalesTargetForecastHorizon;
  sessionId: string | null;
  status: SalesTargetRequestStatus;
  currentRevisionId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  metadata?: Record<string, unknown> | null;
  revisions?: SalesTargetRequestRevision[];
  reviews?: SalesTargetReview[];
  createdAt: string;
  updatedAt: string;
}

export interface OrgFiscalSession {
  id: string;
  name: string;
  description?: string | null;
  calendarId: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface OrgFiscalCalendar {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  sessions?: OrgFiscalSession[];
}

export type TeamTargetParentLevel = 'company' | 'department';

export interface SalesTeam {
  id: string;
  name: string;
  parentDepartmentId: string;
  parentDepartmentName: string;
  /** Sales-target reporting line. Defaults to department when omitted. */
  targetParentLevel?: TeamTargetParentLevel;
  /** Team lead owns the team-level target; excluded from person distribution. */
  teamLeadId?: string | null;
}

export interface MyTeamSalesTargetPlan {
  salesTeamId: string;
  salesTeamName: string;
  plan: SalesTargetPlan | null;
  /** Teams this user may see. Null means company-wide. */
  scopeTeamIds?: string[] | null;
}

export interface CommercialTeamMember {
  id?: string | null;
  selamnewId?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  email?: string;
}

export interface TeamProgressNode {
  teamId: string;
  teamName: string;
  parentDepartmentId: string;
  parentDepartmentName: string;
  sessionId: string | null;
  currencyId: string;
  targetAmount: number;
  achievedAmount: number;
  progressPercent: number;
  leadCount: number;
}

export interface DepartmentProgressNode {
  departmentId: string;
  departmentName: string;
  sessionId: string | null;
  currencyId: string;
  targetAmount: number;
  achievedAmount: number;
  progressPercent: number;
  dealCount: number;
}

export interface PlanProgressSummary {
  planId: string;
  calendarId: string;
  sessionId: string | null;
  currencyId: string;
  companyTargetAmount: number;
  companyAchievedAmount: number;
  companyProgressPercent: number;
  /** Last committed forecast total for this horizon (if any) */
  committedForecastAmount?: number | null;
  remainingTargetAmount?: number;
  /** How the company target denominator was resolved (B2T/Hybrid vs TTB). */
  targetBasis?: 'official' | 'none' | 'top_down';
  teams: TeamProgressNode[];
  departments?: DepartmentProgressNode[];
}

export interface PersonProgressNode {
  planId: string;
  currencyId: string;
  sessionId: string | null;
  teamId: string;
  userId: string;
  targetAmount: number;
  achievedAmount: number;
  progressPercent: number;
  dealCount: number;
}

export interface ForecastCategoryTotals {
  pipeline: number;
  best_case: number;
  commit: number;
  closed: number;
}

export interface ForecastOpportunityRow {
  opportunityType: SalesTargetOpportunityType;
  opportunityId: string;
  opportunityName: string;
  customerId: string | null;
  customerName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  stageId: string | null;
  stageName: string | null;
  stageCategory: string | null;
  forecastCategory?: SalesTargetForecastStageCategory | string | null;
  salesTeamId: string | null;
  department: string | null;
  opportunityValue: number;
  /** Computed stage weight (0–100) — display only; not lead/deal CRM probability */
  probability: number;
  forecastValue: number;
  expectedCloseDate: string | null;
  /** ISO date (YYYY-MM-DD) — used by date-method matching on createdAt */
  createdAt?: string | null;
  currency: string;
  status: string;
  sessionId?: string | null;
  /** B2T department rollup: submitting team label */
  proposalTeamLabel?: string | null;
  /** B2T department rollup: target request approval step */
  proposalApprovalLabel?: string | null;
  proposalRequestId?: string | null;
  solutions?: Array<{
    solutionId: string;
    name: string;
    amount: number;
    assigneeNames?: string[];
  }>;
  creditedOwners?: Array<{ userId: string; name: string }>;
  /** Per-team amount after achievement-style dedupe. */
  teamCredits?: Array<{ salesTeamId: string; amount: number }>;
  /** Per-department amount after achievement-style dedupe. */
  departmentCredits?: Array<{ departmentId: string; amount: number }>;
}

export interface ForecastRollupNode {
  level: 'company' | 'department' | 'team' | 'person';
  id: string;
  name: string;
  parentId: string | null;
  pipelineValue: number;
  forecastValue: number;
  opportunityCount: number;
  categories?: ForecastCategoryTotals;
}

export interface ForecastSummary {
  totalPipelineValue: number;
  totalForecastValue: number;
  expectedRevenue: number;
  forecastAccuracy: number | null;
  totalOpportunities: number;
  categories?: ForecastCategoryTotals;
  horizon: SalesTargetForecastHorizon;
  sessionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ForecastResponse {
  summary: ForecastSummary;
  rollups: ForecastRollupNode[];
  rows: ForecastOpportunityRow[];
}

export interface ForecastQueryParams {
  horizon?: SalesTargetForecastHorizon;
  sessionId?: string;
  periodStart?: string;
  periodEnd?: string;
  department?: string;
  departmentId?: string;
  salesTeamId?: string;
  salespersonId?: string;
  stageId?: string;
  opportunityType?: SalesTargetOpportunityType;
  customerId?: string;
  currency?: string;
  search?: string;
  calendarId?: string;
  /** Deprecated/no-op: session horizon always includes annual customs in-period */
  includePlanCustoms?: boolean;
  /**
   * When true, skip saved inclusion OR filters (settings draft preview).
   * Currency / team filters still apply.
   */
  skipInclusion?: boolean;
}

export interface CreateSalesTargetPlanDto {
  calendarId: string;
  currencyTargets: { currencyId: string; annualAmount: number }[];
  name?: string;
  description?: string;
  level?: Exclude<SalesTargetLevel, 'person'>;
  orgUnitId?: string | null;
}

export interface CreatePlanFromForecastDto {
  calendarId: string;
  name: string;
  description?: string;
  level: Exclude<SalesTargetLevel, 'person'>;
  orgUnitId?: string | null;
  currencyId: string;
  sourceType: 'forecast' | 'edited_forecast';
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  targetValue?: number;
  periodStart?: string;
  periodEnd?: string;
  department?: string;
  salesTeamId?: string;
  salespersonId?: string;
  stageId?: string;
  opportunityType?: SalesTargetOpportunityType;
  customerId?: string;
  horizon?: SalesTargetForecastHorizon;
  sessionId?: string;
}

export interface CommitSessionFromForecastDto {
  planCurrencyId: string;
  orgDepartmentId: string;
  sourceType: 'forecast' | 'edited_forecast';
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  targetValue?: number;
  department?: string;
  salespersonId?: string;
  stageId?: string;
  opportunityType?: SalesTargetOpportunityType;
  customerId?: string;
}

export interface CommitSessionManualDto {
  planCurrencyId: string;
  orgDepartmentId: string;
  targetValue: number;
}

export interface CommitPersonSessionDto {
  planCurrencyId: string;
  orgDepartmentId: string;
  userId: string;
  sourceType: 'forecast' | 'edited_forecast';
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  targetValue?: number;
}

export interface CommitCompanyAnnualDto {
  planCurrencyId: string;
  sourceType: SalesTargetSourceType;
  targetValue?: number;
  /** True when re-seating existing downstream TTB allocations */
  confirmReseat?: boolean;
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  /** New or updated custom forecast lines included in this company commit */
  customOpportunities?: Array<{
    id?: string;
    groupId?: string;
    opportunityName: string;
    forecastValue: number;
    salesTeamId: string;
    assignees?: Array<{ userId: string; amount: number }>;
    solutions?: Array<{
      productFamilyId: string;
      amount: number;
      teamIds: string[];
      memberIds: string[];
    }>;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  department?: string;
  opportunityType?: SalesTargetOpportunityType;
}

/** Same shape as annual; sessionId is taken from the route. */
export type CommitCompanySessionDto = CommitCompanyAnnualDto;

export interface CommitTeamAnnualDto {
  planCurrencyId: string;
  orgDepartmentId: string;
  sourceType: SalesTargetSourceType;
  targetValue?: number;
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  opportunityType?: SalesTargetOpportunityType;
}

/** Department selection = edit pool for teams; does not overwrite team saves. */
export interface CommitDepartmentAnnualDto {
  planCurrencyId: string;
  orgUnitId: string;
  sourceType: SalesTargetSourceType;
  targetValue?: number;
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
  opportunityType?: SalesTargetOpportunityType;
}

export type CommitDepartmentSessionDto = CommitDepartmentAnnualDto;

export interface CreateManualPlanDto {
  calendarId: string;
  name: string;
  description?: string;
  level: Exclude<SalesTargetLevel, 'person'>;
  orgUnitId?: string | null;
  currencyId: string;
  targetValue: number;
}

export interface TeamAnnualAllocationItem {
  planCurrencyId: string;
  orgDepartmentId: string;
  amount: number;
}

export interface TeamSessionAllocationItem {
  planCurrencyId: string;
  sessionId: string;
  amount: number;
}

export interface PlanSessionAllocationItem {
  planCurrencyId: string;
  sessionId: string;
  amount: number;
}

export interface PersonAllocationItem {
  planCurrencyId: string;
  sessionId: string;
  orgDepartmentId: string;
  userId: string;
  amount: number;
}

export interface AllocationUpdateItem {
  id: string;
  amount: number;
}

export interface PlanCurrencyUpdateItem {
  id: string;
  annualAmount: number;
}

export interface TargetReconciliationTeamRow {
  requestId: string;
  teamId: string | null;
  teamName: string;
  departmentId: string | null;
  departmentName: string | null;
  companyDirect?: boolean;
  status: string;
  amount: number;
  currentRevisionId?: string | null;
  opportunities?: unknown[];
}

export interface TargetReconciliationAuditRow {
  id: string;
  action: string;
  actorId: string;
  comment?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface TargetReconciliationOpportunityRow {
  requestId: string;
  teamId: string | null;
  teamName: string;
  departmentId: string | null;
  departmentName: string | null;
  opportunityType: string;
  opportunityId: string;
  opportunityName?: string | null;
  opportunityValue?: number;
  forecastValue?: number;
  allocatedAmount: number;
  probability?: number | null;
  expectedCloseDate?: string | null;
  ownerId?: string | null;
}

export interface TargetReconciliationView {
  planId: string;
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  /** Independent company strategic amount (initial / authoritative for gap). */
  initialCompanyStrategicTarget?: number;
  strategicTarget: number;
  originalStrategicTarget?: number;
  bottomUpTarget: number;
  reconciledTeamTotal?: number;
  gap: number;
  remainingGap?: number;
  uncoveredAmount: number;
  overageAmount: number;
  opportunityCoverage?: number;
  opportunityCoverageAmount?: number;
  opportunityCoveragePercent?: number;
  selectedOpportunities?: TargetReconciliationOpportunityRow[];
  canMarkReconciled?: boolean;
  markReconciledBlockers?: string[];
  finalOfficialCompanyTarget?: number | null;
  reconciliationStatus: string;
  audits?: TargetReconciliationAuditRow[];
  concepts?: Record<string, string>;
  departments: Array<{
    departmentId: string;
    departmentName: string;
    bottomUp: number;
    teams: TargetReconciliationTeamRow[];
  }>;
  teams: TargetReconciliationTeamRow[];
  bottomUpTeams?: TargetReconciliationTeamRow[];
  pendingBottomUpTeams?: TargetReconciliationTeamRow[];
  companyDirectTeams?: TargetReconciliationTeamRow[];
}

export interface TargetReconciliationAdjustmentRow {
  id: string;
  reconciliationId: string;
  scopeLevel: string;
  orgUnitId: string | null;
  teamId: string | null;
  userId: string | null;
  requestId: string | null;
  previousAmount: number | null;
  newAmount: number | null;
  amountDelta: number;
  reason: string | null;
  createdAt?: string;
}

export interface TargetReconciliationMatrixRow {
  scopeLevel: SalesTargetLevel;
  scopeId: string;
  scopeName: string;
  requestId?: string;
  status?: string;
  proposedTarget: number | null;
  reviewedTarget: number | null;
  officialTarget: number | null;
  gap: number | null;
  adjustment?: TargetReconciliationAdjustmentRow | null;
  children?: TargetReconciliationMatrixRow[];
}

export interface TargetReconciliationMatrixView
  extends TargetReconciliationView {
  matrix: {
    company: {
      strategicTarget: number;
      bottomUpTarget: number;
      reconciledTeamTotal?: number;
      gap: number;
      remainingGap?: number;
    };
    rows: TargetReconciliationMatrixRow[];
  };
  adjustments: TargetReconciliationAdjustmentRow[];
}

export interface TargetPlanningMetrics {
  scopeLevel: SalesTargetLevel | 'company';
  scopeId: string | null;
  scopeName: string;
  parentScopeId: string | null;
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  strategicTarget: number | null;
  proposedTarget: number | null;
  originalProposal: number | null;
  reviewedTarget: number | null;
  officialTarget: number | null;
  currentForecast: number | null;
  forecastAtProposal: number | null;
  actualWon: number;
  gap: number | null;
  coverage: number | null;
  requestId: string | null;
  requestStatus: SalesTargetRequestStatus | null;
  eligibleActions: string[];
}

export type SalesTargetPlanningPhase =
  | 'NOT_STARTED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RECONCILIATION'
  | 'FINALIZING'
  | 'FINALIZED'
  | 'LOCKED';

export interface PlanningCompletionSummary {
  totalTeams: number;
  teamsWithProposal: number;
  teamsApproved: number;
  teamsPending: number;
  departmentsTotal: number;
  departmentsSubmitted: number;
  membersTotal: number;
  membersWithProposal: number;
  membersPending: number;
  blockedEntities: number;
  completionPercent: number;
  bottleneckLabel: string | null;
}

export interface PlanningDashboardView {
  planId: string;
  planName: string;
  calendarId: string;
  targetSettingMethod: TargetSettingMethod;
  planStatus: string;
  planningPhase: SalesTargetPlanningPhase;
  allowedPhaseTransitions: SalesTargetPlanningPhase[];
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  metrics: TargetPlanningMetrics;
  completionSummary: PlanningCompletionSummary;
}

export interface PlanningPhaseView {
  planningPhase: SalesTargetPlanningPhase;
  allowedTransitions: SalesTargetPlanningPhase[];
}

export interface TargetPlanningHierarchyNode extends TargetPlanningMetrics {
  children: TargetPlanningHierarchyNode[];
}

export interface PlanningHierarchyView {
  planId: string;
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  root: TargetPlanningHierarchyNode;
}

export interface PlanningEligibilityEntity {
  entityType: 'department' | 'team';
  entityId: string;
  entityName: string;
  eligible: boolean;
  blockedReason: string | null;
  allowedActions: string[];
}

export interface PlanningEligibilityView {
  planId: string;
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  entities: PlanningEligibilityEntity[];
}

export interface TargetRequestHistoryEvent {
  eventType: 'revision' | 'review' | 'submission';
  occurredAt: string;
  actorId: string | null;
  revisionNumber: number | null;
  amount: number | null;
  previousAmount: number | null;
  amountDelta: number | null;
  revisionSource: string | null;
  revisionReason: string | null;
  forecastSnapshotAmount: number | null;
  reviewLevel: string | null;
  decision: string | null;
  comment: string | null;
  revisionId: string | null;
}

export interface TargetRequestHistoryView {
  requestId: string;
  planId: string;
  teamId: string | null;
  teamName: string | null;
  currentStatus: SalesTargetRequestStatus;
  currentRevisionId: string | null;
  currentAmount: number | null;
  originalAmount: number | null;
  forecastAtSubmission: number | null;
  timeline: TargetRequestHistoryEvent[];
}

export interface AllocationSuggestionLine {
  childScopeLevel: SalesTargetLevel;
  childOrgUnitId: string | null;
  userId: string | null;
  label: string;
  forecastValue: number;
  suggestedAmount: number;
  scaledAmount: number;
  opportunityCount: number;
}

export interface AllocationSuggestionView {
  planId: string;
  currencyId: string;
  horizon: string;
  sessionId: string | null;
  scopeLevel: SalesTargetLevel;
  orgUnitId: string | null;
  scopeName: string;
  requiredAmount: number;
  suggestedTotal: number;
  scaleFactor: number;
  lines: AllocationSuggestionLine[];
  isBalanced: boolean;
}

/** Prefer annual snapshot, else first snapshot on the plan */
export function getPrimaryForecastSnapshot(
  plan?: SalesTargetPlan | null,
): ForecastSnapshot | null {
  const snaps = plan?.forecastSnapshots;
  if (snaps?.length) {
    const annual = snaps.find((s) => s.horizon === 'annual' || !s.horizon);
    return annual ?? snaps[0] ?? null;
  }
  return plan?.forecastSnapshot ?? null;
}
