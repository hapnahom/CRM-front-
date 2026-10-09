import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type {
  OpportunityProductLine,
  OpportunitySolution,
} from '@/modules/product-catalog/types';
import { resolveLineCurrency } from '@/modules/product-catalog/utils';
import { resolveDealAchievementValue } from '@/lib/deals/achievement-value';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';
import {
  dealInactiveLostStageIds,
  filterTotalPipelineCustomFields,
  inactiveLostOnlyCustomFields,
  leadInactiveLostStageIds,
} from './columns';
import {
  dateInRange,
  formatCurrentReportingLabel,
  resolveCurrentQuarterPeriod,
} from './period';
import {
  exportEntityLabel,
  exportFiscalFieldsFromPeriod,
} from './export-naming';
import {
  addMoney,
  average,
  coverageRatio,
  daysBetween,
  EMPTY,
  formatCompactAmount,
  formatDate,
  formatDateTime,
  formatDetailedAmount,
  formatMoneyMap,
  moneyTotal,
  signedDayDelta,
  sumMoney,
  winRate,
} from './format';
import type {
  AttentionRow,
  BuildReportArgs,
  ConcentrationRow,
  CurrencyAchievement,
  MoneyByCurrency,
  NewlyAddedRow,
  OrgUnitRow,
  OutlookDealRow,
  ProductPipelineRow,
  RegistryRow,
  ReportFilters,
  ReportKpi,
  ReportOmission,
  ReportOrgTeam,
  ReportOwnerOrg,
  RiskFlagRow,
  SalesPipelineReportData,
  SalesRepRow,
  StageRow,
  TargetRow,
  TeamRow,
} from './types';
import { formatReportCustomValues } from './custom-fields';
import {
  filterSectionsForScope,
  reportTableVisibility,
} from './report-visibility';
import {
  resolveStageExitConversionMetric,
  resolveValueOverTargetMetric,
  type ResolvedStageExitConversionMetric,
} from '@/modules/pipeline/custom-pipeline-metrics';

const SOON_TO_CLOSE_DAYS = 30;
const PIPELINE_TARGET_MULTIPLIER = 3;

function dealInQualifiedPipeline(
  deal: PipelineDeal,
  stageIdSet: Set<string>,
): boolean {
  return (
    dealOpen(deal) && Boolean(deal.stageId) && stageIdSet.has(deal.stageId)
  );
}

function moneyFromQualifiedPipeline(
  deals: PipelineDeal[],
  stageIds: string[],
): MoneyByCurrency {
  const stageIdSet = new Set(stageIds);
  const money: MoneyByCurrency = {};
  for (const deal of deals) {
    if (dealInQualifiedPipeline(deal, stageIdSet)) {
      addMoney(money, deal.currency, deal.value);
    }
  }
  return money;
}

function pipelineAchievementRates(
  qpv: MoneyByCurrency,
  quarterlyTarget: MoneyByCurrency,
  currencies: string[],
): Record<string, number | null> {
  return Object.fromEntries(
    currencies.map((currency) => {
      const target =
        (quarterlyTarget[currency] ?? 0) * PIPELINE_TARGET_MULTIPLIER;
      const value = qpv[currency] ?? 0;
      if (target <= 0) return [currency, null];
      return [currency, (value / target) * 100];
    }),
  );
}

function qualifiedPipelineByUser(
  deals: PipelineDeal[],
  stageIds: string[],
): Map<string, MoneyByCurrency> {
  const stageIdSet = new Set(stageIds);
  const byUser = new Map<string, MoneyByCurrency>();
  const add = (
    userId: string | null | undefined,
    currency: string,
    value: number,
  ) => {
    if (!userId) return;
    const bucket = byUser.get(userId) ?? {};
    addMoney(bucket, currency, value);
    byUser.set(userId, bucket);
  };

  for (const deal of deals) {
    if (!dealInQualifiedPipeline(deal, stageIdSet)) continue;
    const userIds = recordInvolvedUserIds(deal);
    for (const userId of userIds.length ? userIds : ['unassigned']) {
      add(userId, deal.currency, deal.value);
    }
  }
  return byUser;
}

type StageExitConversionCounts = {
  toSuccess: number;
  toLost: number;
  toAlso: number;
  rate: number;
  detail: string;
};

function countStageExitConversion(
  deals: PipelineDeal[],
  metric: ResolvedStageExitConversionMetric,
  period?: { from: string; to: string } | null,
): StageExitConversionCounts {
  const fromSet = new Set(metric.fromStageIds);
  const successSet = new Set(metric.successStageIds);
  const alsoSet = new Set(metric.alsoStageIds);
  let toSuccess = 0;
  let toLost = 0;
  let toAlso = 0;

  for (const deal of deals) {
    const previousId = deal.previousStageId;
    if (!previousId || !fromSet.has(previousId)) continue;
    if (period && !dateInRange(deal.stageEnteredAt, period.from, period.to)) {
      continue;
    }

    if (successSet.has(deal.stageId)) {
      toSuccess += 1;
      continue;
    }
    if (metric.includeLostCategory && deal.stage?.category === 'lost') {
      toLost += 1;
      continue;
    }
    if (alsoSet.has(deal.stageId)) {
      toAlso += 1;
    }
  }

  const denominator = toSuccess + toLost + toAlso;
  const rate = denominator > 0 ? (toSuccess / denominator) * 100 : 0;
  const detail =
    denominator > 0
      ? `${toSuccess} of ${denominator} exits to target / other exits`
      : 'No completed exits in period';

  return { toSuccess, toLost, toAlso, rate, detail };
}

const PRODUCT_PALETTE = [
  '#0F766E',
  '#B45309',
  '#1D4ED8',
  '#BE123C',
  '#7C3AED',
  '#047857',
  '#C2410C',
  '#0369A1',
  '#A16207',
  '#4B5563',
];

type Named = { id?: string | null; name?: string | null };

type RoleAssignment = {
  roleId: string;
  userId: string;
  roleName?: string;
  isPrimary?: boolean;
};

type AssignmentRoleMeta = {
  id: string;
  isPrimary?: boolean;
  countsTowardTargetAchievement?: boolean;
};

function assignmentRolesById(
  roles: AssignmentRoleMeta[] | undefined,
): Map<string, AssignmentRoleMeta> {
  return new Map((roles ?? []).map((role) => [role.id, role]));
}

function solutionAssigneeUserIds(record: {
  solutions?: OpportunitySolution[];
}): string[] {
  const ids = new Set<string>();
  for (const solution of solutionLines(record)) {
    for (const entry of solution.roleAssignments ?? []) {
      for (const userId of entry.userIds ?? []) {
        if (userId) ids.add(userId);
      }
      for (const user of entry.users ?? []) {
        if (user.id) ids.add(user.id);
      }
    }
  }
  return [...ids];
}

/** Users involved in a record via any entity or solution assignment role. */
function recordInvolvedUserIds(record: {
  responsibleUserId?: string | null;
  roleAssignments?: RoleAssignment[];
  solutions?: OpportunitySolution[];
}): string[] {
  const ids = new Set<string>();
  for (const assignment of record.roleAssignments ?? []) {
    if (assignment.userId) ids.add(assignment.userId);
  }
  for (const userId of solutionAssigneeUserIds(record)) {
    ids.add(userId);
  }
  if (record.responsibleUserId) ids.add(record.responsibleUserId);
  return [...ids];
}

/** Users credited won revenue on roles that count toward target achievement. */
function recordAchievementUserIds(
  record: {
    responsibleUserId?: string | null;
    roleAssignments?: RoleAssignment[];
  },
  rolesById: Map<string, AssignmentRoleMeta>,
): string[] {
  const ids = new Set<string>();
  for (const assignment of record.roleAssignments ?? []) {
    if (!assignment.userId) continue;
    const role = rolesById.get(assignment.roleId);
    if (
      role?.isPrimary ||
      role?.countsTowardTargetAchievement ||
      assignment.isPrimary
    ) {
      ids.add(assignment.userId);
    }
  }
  const primaryRole = [...rolesById.values()].find((role) => role.isPrimary);
  if (primaryRole && record.responsibleUserId) {
    const hasPrimaryAssignment = (record.roleAssignments ?? []).some(
      (assignment) =>
        assignment.userId &&
        (rolesById.get(assignment.roleId)?.isPrimary || assignment.isPrimary),
    );
    if (!hasPrimaryAssignment) {
      ids.add(record.responsibleUserId);
    }
  }
  return [...ids];
}

function resolveTeamLeadIds(
  orgTeams: ReportOrgTeam[] | undefined,
  teamIds: string[],
): Set<string> {
  const leads = new Set<string>();
  const teamFilter = teamIds.length ? new Set(teamIds) : null;
  for (const team of orgTeams ?? []) {
    if (teamFilter && !teamFilter.has(team.id)) continue;
    const leadId = team.teamLeadId?.trim();
    if (leadId) leads.add(leadId);
  }
  return leads;
}

function selectedTeamMemberIds(
  ownerOrgs: ReportOwnerOrg[] | undefined,
  teamIds: string[],
  teamLeadIds: Set<string>,
): Set<string> {
  const members = new Set<string>();
  const teamFilter = new Set(teamIds);
  for (const org of ownerOrgs ?? []) {
    if (!teamFilter.has(org.teamId)) continue;
    if (teamLeadIds.has(org.userId)) continue;
    members.add(org.userId);
  }
  return members;
}

type ProductLineDetail = {
  productFamily: string;
  vendor: string;
  product: string;
  dealRegistration: string;
  registrationNumber: string;
  registrationDate: string | null;
  amount: number;
  currency: string;
};

type CatalogLookups = {
  productNameById: Map<string, string>;
  familyNameById: Map<string, string>;
  familyIdByProductId: Map<string, string>;
  vendorNameById: Map<string, string>;
};

type RegistryFiscalYear = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sessions?: Array<{ id: string }>;
};

type RegistryBuildCtx = {
  lookups: CatalogLookups;
  custom?: BuildReportArgs['source']['customFields'];
  sessions: OrgFiscalSession[];
  fiscalYears: RegistryFiscalYear[];
  /** Same Settings-derived "FY / Q" label for every Total Pipeline row. */
  currentReporting: string;
  userNameById: Map<string, string>;
  stageNameById: Map<string, string>;
  lastActivityAtByDealId?: Map<string, string>;
  lastActivityAtByLeadId?: Map<string, string>;
  assignmentRoles: Array<{
    id: string;
    isPrimary?: boolean;
    usageContext?: 'ENTITY' | 'SOLUTION';
  }>;
};

function registryEngagementFields(
  recordType: RegistryRow['recordType'],
  recordId: string,
  stageEnteredAt?: string | null,
  ctx?: Pick<
    RegistryBuildCtx,
    'lastActivityAtByDealId' | 'lastActivityAtByLeadId'
  >,
): Pick<RegistryRow, 'daysInCurrentStage' | 'lastActivityDate'> {
  const lastActivityDate =
    recordType === 'Deal'
      ? (ctx?.lastActivityAtByDealId?.get(recordId) ?? null)
      : (ctx?.lastActivityAtByLeadId?.get(recordId) ?? null);
  return {
    daysInCurrentStage: daysBetween(stageEnteredAt),
    lastActivityDate,
  };
}

function norm(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function displayName(
  user?: {
    name?: string | null;
    email?: string | null;
    selamnewId?: string | null;
  } | null,
): string {
  return user?.name || user?.email || user?.selamnewId || '';
}

function contactDisplayName(
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
): string {
  return [contact?.firstName, contact?.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function contactFields(
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    role?: string | null;
  } | null,
): {
  contact: string;
  contactPosition: string;
  contactEmail: string;
  contactPhone: string;
} {
  return {
    contact: contactDisplayName(contact),
    contactPosition: (contact?.role ?? '').trim(),
    contactEmail: (contact?.email ?? '').trim(),
    contactPhone: (contact?.phoneNumber ?? '').trim(),
  };
}

function sessionLabelForDate(
  date: string | null | undefined,
  sessions: OrgFiscalSession[],
): string {
  if (!date) return '';
  const key = date.slice(0, 10);
  const match = sessions.find((session) => {
    const start = session.startDate.slice(0, 10);
    const end = session.endDate.slice(0, 10);
    return start <= key && end >= key;
  });
  return (match?.name ?? '').trim();
}

function quarterClosedForDeal(
  deal: PipelineDeal,
  sessions: OrgFiscalSession[],
): string {
  if (!dealWon(deal) && !dealLost(deal)) return '';
  return sessionLabelForDate(closedAt(deal), sessions);
}

function resolveUserName(
  userId: string | null | undefined,
  nameById: Map<string, string>,
): string {
  if (!userId) return '';
  return (nameById.get(userId) ?? '').trim();
}

function formatAssignmentRoleValues(
  assignments: RoleAssignment[] | undefined,
  roles: Array<{ id: string; isPrimary?: boolean }>,
  record: {
    responsibleUserId?: string | null;
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null;
  },
  nameById: Map<string, string>,
): Record<string, string> {
  const byRole = new Map<string, string>();
  for (const assignment of assignments ?? []) {
    if (!assignment.roleId) continue;
    const name = resolveUserName(assignment.userId, nameById);
    if (!name) continue;
    const existing = byRole.get(assignment.roleId);
    byRole.set(assignment.roleId, existing ? `${existing}\n${name}` : name);
  }

  const values: Record<string, string> = {};
  for (const role of roles) {
    let name = byRole.get(role.id) ?? '';
    if (!name && role.isPrimary) {
      name =
        displayName(record.responsibleUser) ||
        resolveUserName(record.responsibleUserId, nameById);
    }
    values[role.id] = name;
  }
  return values;
}

function primaryAe(
  record: {
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null;
    responsibleUserId?: string | null;
  },
  assignments: RoleAssignment[] | undefined,
  nameById: Map<string, string>,
): string {
  const primary = assignments?.find((assignment) => assignment.isPrimary);
  if (primary?.userId) {
    const name = resolveUserName(primary.userId, nameById);
    if (name) return name;
  }
  return (
    displayName(record.responsibleUser) ||
    resolveUserName(record.responsibleUserId, nameById) ||
    'Unassigned'
  );
}

function formatSolutionRoleValues(
  record: { solutions?: OpportunitySolution[] },
  roles: Array<{ id: string; usageContext?: 'ENTITY' | 'SOLUTION' }>,
  nameById: Map<string, string>,
): Record<string, string> {
  const byRole = new Map<string, Set<string>>();
  for (const solution of solutionLines(record)) {
    for (const entry of solution.roleAssignments ?? []) {
      if (!entry.roleId) continue;
      const bucket = byRole.get(entry.roleId) ?? new Set<string>();
      for (const userId of entry.userIds ?? []) {
        const label = resolveUserName(userId, nameById);
        if (label) bucket.add(label);
      }
      for (const user of entry.users ?? []) {
        const label =
          resolveUserName(user.id, nameById) ||
          (user.name ?? '').trim() ||
          (user.selamnewId ?? '').trim();
        if (label) bucket.add(label);
      }
      if (bucket.size) byRole.set(entry.roleId, bucket);
    }
  }

  const values: Record<string, string> = {};
  for (const role of roles) {
    const labels = [...(byRole.get(role.id) ?? [])];
    values[role.id] = labels.join('\n');
  }
  return values;
}

function formatPipelineRoleValues(
  record: {
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null;
    responsibleUserId?: string | null;
    roleAssignments?: RoleAssignment[];
    solutions?: OpportunitySolution[];
  },
  roles: Array<{
    id: string;
    isPrimary?: boolean;
    usageContext?: 'ENTITY' | 'SOLUTION';
  }>,
  nameById: Map<string, string>,
): Record<string, string> {
  const entityRoles = roles.filter((role) => role.usageContext !== 'SOLUTION');
  const solutionRoles = roles.filter(
    (role) => role.usageContext === 'SOLUTION',
  );
  const entityValues = formatAssignmentRoleValues(
    record.roleAssignments,
    entityRoles,
    record,
    nameById,
  );
  const solutionValues = formatSolutionRoleValues(
    record,
    solutionRoles,
    nameById,
  );
  const merged: Record<string, string> = { ...entityValues };
  for (const role of solutionRoles) {
    merged[role.id] = solutionValues[role.id] ?? '';
  }
  return merged;
}

function sessionFiscalLabels(
  sessionId: string | null | undefined,
  sessions: OrgFiscalSession[],
  fiscalYears?: RegistryFiscalYear[],
): { fiscalYear: string; quarter: string } {
  if (!sessionId) return { fiscalYear: '', quarter: '' };
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return { fiscalYear: '', quarter: '' };
  const quarter = (session.name ?? '').trim();

  const matchedYear = fiscalYears?.find(
    (year) =>
      year.id === session.calendarId ||
      year.sessions?.some((item) => item.id === sessionId),
  );
  if (matchedYear?.name?.trim()) {
    return { fiscalYear: matchedYear.name.trim(), quarter };
  }

  // When Settings calendars were provided, never invent a year from dates.
  if (fiscalYears && fiscalYears.length > 0) {
    return { fiscalYear: '', quarter };
  }

  const calendarSessions = sessions.filter(
    (item) => item.calendarId === session.calendarId,
  );
  const yearCandidates = (
    calendarSessions.length ? calendarSessions : [session]
  )
    .map((item) => {
      const date = new Date(item.startDate);
      return Number.isNaN(date.getTime()) ? null : date.getFullYear();
    })
    .filter((year): year is number => year != null);
  if (yearCandidates.length) {
    return {
      fiscalYear: String(Math.min(...yearCandidates)),
      quarter,
    };
  }

  const fromName = session.name?.match(/(20\d{2})/);
  return { fiscalYear: fromName?.[1] ?? '', quarter };
}

function stageCategoryOf(
  stage:
    | {
        category?: string | null;
        isConversion?: boolean;
      }
    | null
    | undefined,
  recordType: 'Deal' | 'Lead',
  opts?: { converted?: boolean; disqualified?: boolean },
): RegistryRow['stageCategory'] {
  if (recordType === 'Lead') {
    if (opts?.disqualified) return 'lost';
    if (opts?.converted || stage?.isConversion) return 'other';
  }
  const category = norm(stage?.category);
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

function stageOrderOf(stage?: { order?: number } | null): number {
  return stage?.order ?? 0;
}

function buildUserNameMap(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  ownerOrgs?: ReportOwnerOrg[],
  extra?: Record<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  const put = (id?: string | null, name?: string | null) => {
    if (!id) return;
    const trimmed = (name ?? '').trim();
    if (!map.has(id)) {
      map.set(id, trimmed);
      return;
    }
    if (trimmed && !map.get(id)) map.set(id, trimmed);
  };

  for (const [id, name] of Object.entries(extra ?? {})) {
    put(id, name);
  }
  for (const record of [...leads, ...deals]) {
    put(record.responsibleUserId, displayName(record.responsibleUser));
    put(record.responsibleUser?.id, displayName(record.responsibleUser));
    for (const observer of record.observers ?? []) {
      put(observer.id, displayName(observer));
    }
    for (const solution of record.solutions ?? []) {
      for (const entry of solution.roleAssignments ?? []) {
        for (const user of entry.users ?? []) {
          put(user.id, user.name || user.selamnewId || '');
        }
        for (const userId of entry.userIds ?? []) {
          put(userId, '');
        }
      }
      for (const userId of solution.assigneeUserIds ?? []) {
        put(userId, '');
      }
    }
  }
  for (const org of ownerOrgs ?? []) {
    put(org.userId, '');
  }
  return map;
}

function buildStageNameById(
  catalog: BuildReportArgs['source']['catalog'],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const stage of [...catalog.dealStages, ...catalog.leadStages]) {
    if (!stage?.id) continue;
    map.set(stage.id, stage.name?.trim() || stage.id);
  }
  return map;
}

function resolvePreviousStageName(
  previousStageId: string | null | undefined,
  stageNameById: Map<string, string>,
): string {
  if (!previousStageId) return EMPTY;
  return stageLabel(stageNameById.get(previousStageId) ?? '');
}

function isInactiveOpportunityDeal(deal: PipelineDeal): boolean {
  return dealInactive(deal) || dealLost(deal);
}

function isInactiveOpportunityLead(lead: PipelineLead): boolean {
  return leadDisqualified(lead);
}

function pipelineRowRank(row: RegistryRow): number {
  const isDeal = row.recordType === 'Deal';
  switch (row.stageCategory) {
    case 'won':
      return isDeal ? 0 : 1;
    case 'open':
      return isDeal ? 2 : 3;
    case 'inactive':
      return isDeal ? 4 : 5;
    case 'lost':
      return isDeal ? 8 : 9;
    default:
      // Converted leads / unknown — after inactive, before lost.
      return isDeal ? 6 : 7;
  }
}

function comparePipelineRows(a: RegistryRow, b: RegistryRow): number {
  const ra = pipelineRowRank(a);
  const rb = pipelineRowRank(b);
  if (ra !== rb) return ra - rb;
  if (a.stageOrder !== b.stageOrder) {
    // Open pipeline rows appear in reverse stage order (latest stage first).
    if (a.stageCategory === 'open' && b.stageCategory === 'open') {
      return b.stageOrder - a.stageOrder;
    }
    return a.stageOrder - b.stageOrder;
  }
  return b.value - a.value;
}

function resolveScopeTeamName(
  source: Pick<BuildReportArgs['source'], 'scopeTeamName' | 'orgTeams'>,
): string | null {
  const direct = source.scopeTeamName?.trim();
  if (direct) return direct;
  const teams = source.orgTeams ?? [];
  if (teams.length === 1) return teams[0]!.name.trim() || null;
  return null;
}

function resolveScopeDepartmentName(
  source: Pick<BuildReportArgs['source'], 'scopeDepartmentName' | 'orgTeams'>,
): string | null {
  const direct = source.scopeDepartmentName?.trim();
  if (direct) return direct;
  const teams = source.orgTeams ?? [];
  const names = [
    ...new Set(
      teams.map((team) => team.departmentName?.trim()).filter(Boolean),
    ),
  ] as string[];
  if (names.length === 1) return names[0]!;
  return null;
}

function reportKindLabelForScope(
  source: Pick<
    BuildReportArgs['source'],
    | 'permissionScopeLevel'
    | 'scopeDepartmentName'
    | 'scopeTeamName'
    | 'orgTeams'
  >,
): string {
  const level = source.permissionScopeLevel;
  if (level === 'personal') return 'My Sales Report';
  if (level === 'team') {
    const name = resolveScopeTeamName(source);
    return name ? `${name} Sales Report` : 'Sales Report';
  }
  if (level === 'department') {
    const name = resolveScopeDepartmentName(source);
    return name ? `${name} Report` : 'Department Report';
  }
  return 'Executive Report';
}

function formatFilterNameList(names: string[]): string {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length <= 3) return clean.join(', ');
  return `${clean.slice(0, 3).join(', ')} (+${clean.length - 3} more)`;
}

/** Professional one-line filter summary for PDF/Excel headers when scope filters are applied. */
function exportFilterSummary(
  filters: ReportFilters,
  scopeLevel: BuildReportArgs['source']['permissionScopeLevel'],
  source: BuildReportArgs['source'],
): string | null {
  if (scopeLevel === 'personal') return null;

  const hasActiveFilter =
    filters.teamIds.length > 0 ||
    filters.ownerIds.length > 0 ||
    filters.dealStageIds.length > 0 ||
    filters.productFamilyIds.length > 0 ||
    filters.productIds.length > 0 ||
    filters.vectorIds.length > 0 ||
    filters.currencies.length > 0;
  if (!hasActiveFilter) return null;

  const parts: string[] = [];
  const pushPart = (label: string, names: string[]) => {
    if (!names.length) return;
    parts.push(`${label}: ${formatFilterNameList(names)}`);
  };

  if (filters.teamIds.length) {
    const byId = new Map(
      (source.orgTeams ?? []).map((team) => [team.id, team.name]),
    );
    pushPart(
      'Teams',
      filters.teamIds.map((id) => byId.get(id) ?? id),
    );
  }

  if (filters.ownerIds.length) {
    pushPart(
      'Owners',
      filters.ownerIds.map((id) => source.userNameById?.[id]?.trim() || id),
    );
  }

  if (filters.dealStageIds.length) {
    const byId = new Map(
      [...source.catalog.dealStages, ...source.catalog.leadStages].map(
        (stage) => [stage.id, stage.name],
      ),
    );
    pushPart(
      'Stages',
      filters.dealStageIds.map((id) => byId.get(id) ?? id),
    );
  }

  if (filters.productFamilyIds.length) {
    const byId = new Map(
      source.catalog.families.map((family) => [family.id, family.name]),
    );
    pushPart(
      'Product families',
      filters.productFamilyIds.map((id) => byId.get(id) ?? id),
    );
  }

  if (filters.productIds.length) {
    const byId = new Map(
      source.catalog.products.map((product) => [product.id, product.name]),
    );
    pushPart(
      'Products',
      filters.productIds.map((id) => byId.get(id) ?? id),
    );
  }

  if (filters.vectorIds.length) {
    const byId = new Map(
      (source.vectors ?? []).map((vector) => [vector.id, vector.name]),
    );
    pushPart(
      'Vectors',
      filters.vectorIds.map((id) => byId.get(id) ?? id),
    );
  }

  if (filters.currencies.length) {
    pushPart('Currencies', filters.currencies);
  }

  return parts.length ? `Filtered by ${parts.join('  ·  ')}` : null;
}

function resolveOrgCounts(source: BuildReportArgs['source']): {
  departments: number;
  teams: number;
  members: number;
} {
  if (source.orgCounts) return source.orgCounts;
  const departments = new Set<string>();
  const teams = new Set<string>();
  const members = new Set<string>();
  for (const team of source.orgTeams ?? []) {
    teams.add(team.id);
    if (team.departmentId) departments.add(team.departmentId);
  }
  for (const org of source.ownerOrgs ?? []) {
    members.add(org.userId);
    if (org.teamId) teams.add(org.teamId);
  }
  return {
    departments: departments.size,
    teams: teams.size,
    members: members.size,
  };
}

function orgCountsLabelForScope(
  level: BuildReportArgs['source']['permissionScopeLevel'],
  counts: { departments: number; teams: number; members: number },
): string {
  if (level === 'company') {
    return `${counts.departments} departments · ${counts.teams} teams · ${counts.members} members`;
  }
  if (level === 'department') {
    return `${counts.teams} teams · ${counts.members} members`;
  }
  if (level === 'team') {
    return `${counts.members} members`;
  }
  return '';
}

function dealWon(deal: PipelineDeal): boolean {
  return deal.stage?.category === 'won';
}

function dealLost(deal: PipelineDeal): boolean {
  return deal.stage?.category === 'lost';
}

function dealInactive(deal: PipelineDeal): boolean {
  return deal.stage?.category === 'inactive';
}

function dealOpen(deal: PipelineDeal): boolean {
  return deal.stage?.category === 'open';
}

function leadConverted(lead: PipelineLead): boolean {
  return Boolean(lead.convertedDealId) || norm(lead.status) === 'converted';
}

function leadDisqualified(lead: PipelineLead): boolean {
  return norm(lead.status) === 'disqualified';
}

function productLines(record: {
  products?: OpportunityProductLine[];
}): OpportunityProductLine[] {
  return Array.isArray(record.products) ? record.products : [];
}

function solutionLines(record: {
  solutions?: OpportunitySolution[];
}): OpportunitySolution[] {
  return Array.isArray(record.solutions) ? record.solutions : [];
}

function buildFamilyIdByProductId(
  products: BuildReportArgs['source']['catalog']['products'],
  vendors: NonNullable<BuildReportArgs['source']['catalog']['vendors']>,
): Map<string, string> {
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const map = new Map<string, string>();
  for (const product of products) {
    for (const vendorId of product.vendorIds ?? []) {
      const familyId = vendorById.get(vendorId)?.productFamilyIds?.[0];
      if (familyId) {
        map.set(product.id, familyId);
        break;
      }
    }
  }
  return map;
}

function buildCatalogLookups(
  catalog: BuildReportArgs['source']['catalog'],
): CatalogLookups {
  return {
    productNameById: new Map(
      catalog.products.map((product) => [product.id, product.name]),
    ),
    familyNameById: new Map(
      catalog.families.map((family) => [family.id, family.name]),
    ),
    familyIdByProductId: buildFamilyIdByProductId(
      catalog.products,
      catalog.vendors ?? [],
    ),
    vendorNameById: new Map(
      Object.entries(catalog.vendorNameById ?? {}).map(([id, name]) => [
        id,
        name,
      ]),
    ),
  };
}

function registrationLabel(status?: string | null): string {
  if (!status) return '';
  const label = status.replace(/_/g, ' ').trim();
  if (!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function solutionHasKnownFamily(solution: OpportunitySolution): boolean {
  return Boolean(
    solution.productFamilyId ||
      solution.familyName?.trim() ||
      solution.productFamilyName?.trim(),
  );
}

function extractProductDetails(
  record: {
    products?: OpportunityProductLine[];
    solutions?: OpportunitySolution[];
    currency?: string;
  },
  lookups: CatalogLookups,
): ProductLineDetail[] {
  const details: ProductLineDetail[] = [];
  const oppCurrency = record.currency || '';

  for (const solution of solutionLines(record)) {
    const family =
      solution.productFamilyName ||
      solution.familyName ||
      lookups.familyNameById.get(solution.productFamilyId) ||
      'Unnamed family';
    const detailsBeforeSolution = details.length;
    const vendors = solution.vendors?.length
      ? solution.vendors
      : [
          {
            id: 'legacy',
            vendorId: '',
            vendorName: '',
            amount: solution.amount,
            currency: solution.currency,
            registration: {
              status: 'not_registered' as const,
              registrationDate: null,
              expirationDate: null,
              registrationNumber: null,
            },
            products: solution.products ?? [],
          },
        ];

    for (const vendor of vendors) {
      const vendorName =
        vendor.vendorName ||
        (vendor.vendorId
          ? lookups.vendorNameById.get(vendor.vendorId)
          : undefined) ||
        (vendor.vendorId ? 'Unknown vendor' : '');
      const reg = registrationLabel(vendor.registration?.status);
      const registrationNumber = (
        vendor.registration?.registrationNumber ?? ''
      ).trim();
      const registrationDate = vendor.registration?.registrationDate ?? null;
      const products = vendor.products?.length
        ? vendor.products
        : (solution.products ?? []);

      if (!products.length) {
        const amount = Number(vendor.amount) || Number(solution.amount) || 0;
        if (!amount && !vendorName && !solutionHasKnownFamily(solution)) {
          continue;
        }
        details.push({
          productFamily: family,
          vendor: vendorName,
          product: '',
          dealRegistration: reg,
          registrationNumber,
          registrationDate,
          amount,
          currency: resolveLineCurrency(
            vendor.currency || solution.currency,
            oppCurrency,
          ),
        });
        continue;
      }

      for (const product of products) {
        const productName =
          product.productName ||
          lookups.productNameById.get(product.productId) ||
          'Unnamed product';
        details.push({
          productFamily: family,
          vendor: vendorName,
          product: productName,
          dealRegistration: reg,
          registrationNumber,
          registrationDate,
          amount: Number(product.amount) || 0,
          currency: resolveLineCurrency(
            product.currency || vendor.currency || solution.currency,
            oppCurrency,
          ),
        });
      }
    }

    // Match pipeline dashboard: family-only solutions (no vendors/products yet) still appear.
    if (
      details.length === detailsBeforeSolution &&
      solutionHasKnownFamily(solution)
    ) {
      details.push({
        productFamily: family,
        vendor: '',
        product: '',
        dealRegistration: '',
        registrationNumber: '',
        registrationDate: null,
        amount: Number(solution.amount) || 0,
        currency: resolveLineCurrency(solution.currency, oppCurrency),
      });
    }
  }

  for (const line of productLines(record)) {
    const familyId = lookups.familyIdByProductId.get(line.productId);
    const family = familyId
      ? lookups.familyNameById.get(familyId) || 'Unnamed family'
      : '';
    const productName =
      line.productName ||
      lookups.productNameById.get(line.productId) ||
      'Unnamed product';
    const vendorName =
      line.vendorName ||
      (line.vendorId
        ? lookups.vendorNameById.get(line.vendorId) || 'Unknown vendor'
        : '');
    details.push({
      productFamily: family,
      vendor: vendorName,
      product: productName,
      dealRegistration: registrationLabel(line.registration?.status),
      registrationNumber: (line.registration?.registrationNumber ?? '').trim(),
      registrationDate: line.registration?.registrationDate ?? null,
      amount: Number(line.amount) || 0,
      currency: oppCurrency,
    });
  }

  return details;
}

function joinUnique(values: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.join('\n');
}

function pairedVendorDrFields(details: ProductLineDetail[]): {
  vendor: string;
  drStatus: string;
} {
  const pairs: Array<{ vendor: string; drStatus: string }> = [];
  const seenVendors = new Set<string>();

  for (const line of details) {
    const vendor = line.vendor.trim();
    if (!vendor || seenVendors.has(vendor)) continue;
    seenVendors.add(vendor);

    const numberOrDate =
      line.registrationNumber.trim() ||
      (line.registrationDate ? formatDate(line.registrationDate) : '');
    const drStatus =
      [line.dealRegistration.trim(), numberOrDate]
        .filter(Boolean)
        .join(' · ') || '—';

    pairs.push({ vendor, drStatus });
  }

  return {
    vendor: pairs.map((pair) => pair.vendor).join('\n'),
    drStatus: pairs.map((pair) => pair.drStatus).join('\n'),
  };
}

function productFieldsFromDetails(details: ProductLineDetail[]): {
  productFamily: string;
  vendor: string;
  product: string;
  dealRegistration: string;
  productValue: string;
} {
  const paired = pairedVendorDrFields(details);
  return {
    productFamily: joinUnique(details.map((line) => line.productFamily)),
    vendor: paired.vendor,
    product: joinUnique(
      details.map((line) =>
        line.amount > 0 && line.product
          ? `${line.product} (${formatDetailedAmount(line.amount, line.currency)})`
          : line.product,
      ),
    ),
    dealRegistration: paired.drStatus,
    productValue: joinUnique(
      details
        .filter((line) => line.amount > 0)
        .map((line) => formatDetailedAmount(line.amount, line.currency)),
    ),
  };
}

function selected(values: string[]): Set<string> | null {
  return values.length ? new Set(values) : null;
}

function recordHasProduct(
  record: {
    products?: OpportunityProductLine[];
    solutions?: OpportunitySolution[];
  },
  productIds: Set<string> | null,
  familyIds: Set<string> | null,
  productFamilyById: Map<string, string>,
): boolean {
  if (!productIds && !familyIds) return true;

  const matchProduct = (productId: string, familyId?: string | null) => {
    if (productIds && !productIds.has(productId)) return false;
    if (familyIds) {
      const resolved = familyId || productFamilyById.get(productId);
      if (!resolved || !familyIds.has(resolved)) return false;
    }
    return true;
  };

  for (const line of productLines(record)) {
    if (matchProduct(line.productId)) return true;
  }
  for (const solution of solutionLines(record)) {
    if (familyIds && familyIds.has(solution.productFamilyId) && !productIds) {
      return true;
    }
    for (const product of solution.products ?? []) {
      if (matchProduct(product.productId, solution.productFamilyId))
        return true;
    }
    for (const vendor of solution.vendors ?? []) {
      for (const product of vendor.products ?? []) {
        if (matchProduct(product.productId, solution.productFamilyId)) {
          return true;
        }
      }
    }
  }
  return false;
}

function ownerTeamIdByUser(
  ownerOrgs: ReportOwnerOrg[] | undefined,
): Map<string, string> {
  const byUser = new Map<string, string>();
  for (const row of ownerOrgs ?? []) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, row.teamId);
  }
  return byUser;
}

function resolveOwnerTeamId(
  ownerId: string | null | undefined,
  fallbackTeamId: string | null | undefined,
  ownerTeamByUser: Map<string, string>,
): string | null | undefined {
  if (ownerId && ownerTeamByUser.has(ownerId)) {
    return ownerTeamByUser.get(ownerId);
  }
  return fallbackTeamId;
}

function filterRecords(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  filters: ReportFilters,
  period: BuildReportArgs['period'],
  productFamilyById: Map<string, string>,
  customerVectorById: Record<string, string | null>,
  ownerOrgs?: ReportOwnerOrg[],
): { leads: PipelineLead[]; deals: PipelineDeal[] } {
  const owners = selected(filters.ownerIds);
  const teams = selected(filters.teamIds);
  const ownerTeamByUser = ownerTeamIdByUser(ownerOrgs);
  const dealStages = selected(filters.dealStageIds);
  const products = selected(filters.productIds);
  const families = selected(filters.productFamilyIds);
  const vectors = selected(filters.vectorIds);
  const currencies = selected(
    filters.currencies.map((code) => code.toUpperCase()),
  );

  const matchesVector = (customerId?: string | null): boolean => {
    if (!vectors) return true;
    if (!customerId) return false;
    const vectorId = customerVectorById[customerId];
    return Boolean(vectorId && vectors.has(vectorId));
  };

  const inPeriod = (createdAt?: string | null) => {
    if (!period.applyCreatedAtFilter) return true;
    return dateInRange(createdAt, period.from, period.to);
  };

  const matchesTeamOrOwner = (record: {
    responsibleUserId?: string | null;
    teamId?: string | null;
    roleAssignments?: PipelineLead['roleAssignments'];
    solutions?: PipelineLead['solutions'];
  }): boolean => {
    // Empty selection = no extra org filter (full permission scope from API).
    if (!owners && !teams) return true;
    const involved = recordInvolvedUserIds(record);
    const ownerMatch = Boolean(
      owners && involved.some((userId) => owners.has(userId)),
    );
    const primaryOwnerId = record.responsibleUserId ?? involved[0] ?? null;
    const ownerTeamId = resolveOwnerTeamId(
      primaryOwnerId,
      record.teamId,
      ownerTeamByUser,
    );
    const teamMatch = Boolean(teams && ownerTeamId && teams.has(ownerTeamId));
    if (owners && teams) return ownerMatch && teamMatch;
    if (owners) return ownerMatch;
    if (teams) return teamMatch;
    return false;
  };

  const scopedLeads = leads.filter((lead) => {
    if (!inPeriod(lead.createdAt)) return false;
    if (!matchesTeamOrOwner(lead)) return false;
    if (!matchesVector(lead.customerId)) return false;
    if (currencies && !currencies.has((lead.currency ?? '').toUpperCase()))
      return false;
    if (!recordHasProduct(lead, products, families, productFamilyById))
      return false;
    return true;
  });

  const scopedDeals = deals.filter((deal) => {
    if (!inPeriod(deal.createdAt)) return false;
    if (!matchesTeamOrOwner(deal)) return false;
    if (dealStages && !dealStages.has(deal.stageId)) return false;
    if (!matchesVector(deal.customerId)) return false;
    if (currencies && !currencies.has((deal.currency ?? '').toUpperCase()))
      return false;
    if (!recordHasProduct(deal, products, families, productFamilyById))
      return false;
    return true;
  });

  return { leads: scopedLeads, deals: scopedDeals };
}

function moneyFromRecords(
  records: Array<{ value: number; currency: string }>,
): MoneyByCurrency {
  const money: MoneyByCurrency = {};
  for (const record of records) addMoney(money, record.currency, record.value);
  return money;
}

function emptyMoney(currencies: string[]): MoneyByCurrency {
  const money: MoneyByCurrency = {};
  for (const code of currencies) money[code] = 0;
  return money;
}

function countByCurrency(
  records: Array<{ currency: string }>,
): MoneyByCurrency {
  const counts: MoneyByCurrency = {};
  for (const record of records) {
    const code = record.currency || 'UNKNOWN';
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

function recordStageColor(stage?: { color?: string | null } | null): string {
  return stage?.color || tokens.color.textSubtle;
}

function stageColor(
  stage: Named & { color?: string | null },
  group: 'Lead' | 'Deal',
  fallbackIndex: number,
): string {
  if (stage.color) return stage.color;
  const palette =
    group === 'Lead'
      ? [
          tokens.color.accentBlue,
          tokens.color.blue,
          tokens.color.purple,
          tokens.color.lightPurple,
        ]
      : [
          tokens.color.brand,
          tokens.color.orange,
          tokens.color.warning,
          tokens.color.success,
          tokens.color.error,
        ];
  return palette[fallbackIndex % palette.length]!;
}

function stageLabel(name?: string | null): string {
  return (name ?? '').trim() || 'Unmapped';
}

function customerName(name?: string | null): string {
  const value = (name ?? '').trim();
  return value || 'Unassigned';
}

function isUnassignedCustomer(name?: string | null): boolean {
  const value = norm(name);
  return !value || value === 'unassigned' || value.startsWith('unassigned');
}

function statusLabel(status?: string | null, open = false): string {
  const value = (status ?? '').trim();
  if (!value) return open ? 'Active' : '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function closedAt(deal: PipelineDeal): string | null {
  return deal.stageEnteredAt || deal.updatedAt || deal.expectedClose || null;
}

function buildStages(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  leadStages: BuildReportArgs['source']['catalog']['leadStages'],
  dealStages: BuildReportArgs['source']['catalog']['dealStages'],
  historyDurationByStageId?: Map<string, number>,
): StageRow[] {
  const rows: StageRow[] = [];

  const pushGroup = (
    group: 'Lead' | 'Deal',
    stages: Array<{
      id: string;
      name: string;
      color?: string | null;
      category?: string;
    }>,
    records: Array<{
      stageId: string;
      value: number;
      currency: string;
      stageEnteredAt?: string;
    }>,
  ) => {
    const ordered = [...stages].sort((a, b) => {
      const ao = (a as { order?: number }).order ?? 0;
      const bo = (b as { order?: number }).order ?? 0;
      return ao - bo;
    });
    const used = new Set<string>();
    ordered.forEach((stage, index) => {
      const bucket = records.filter((record) => record.stageId === stage.id);
      used.add(stage.id);
      const days = bucket
        .map((record) => daysBetween(record.stageEnteredAt))
        .filter((value): value is number => value != null);
      const historyAverage =
        group === 'Deal' ? historyDurationByStageId?.get(stage.id) : undefined;
      rows.push({
        id: stage.id,
        label: stage.name,
        group,
        count: bucket.length,
        countByCurrency: countByCurrency(bucket),
        value: moneyFromRecords(bucket),
        share: 0,
        color: stageColor(stage, group, index),
        category: stage.category,
        averageDaysInStage:
          historyAverage != null ? historyAverage : average(days),
      });
    });
    const unknown = records.filter((record) => !used.has(record.stageId));
    if (unknown.length) {
      rows.push({
        id: `${group.toLowerCase()}-unknown`,
        label: 'Unmapped stage',
        group,
        count: unknown.length,
        countByCurrency: countByCurrency(unknown),
        value: moneyFromRecords(unknown),
        share: 0,
        color: tokens.color.textSubtle,
        averageDaysInStage: null,
      });
    }
  };

  if (isLeadsEnabled()) {
    pushGroup('Lead', leadStages, leads);
  }
  pushGroup('Deal', dealStages, deals);

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? Math.round((row.count / total) * 100) : 0,
  }));
}

function orgLookup(orgTeams: ReportOrgTeam[] | undefined) {
  const byTeam = new Map(orgTeams?.map((team) => [team.id, team]) ?? []);
  return (teamId?: string | null, fallbackName?: string | null) => {
    const team = teamId ? byTeam.get(teamId) : undefined;
    return {
      teamId: teamId || 'unassigned',
      teamName: team?.name || fallbackName || 'Unassigned',
      department: team?.departmentName || 'Unassigned',
    };
  };
}

function ownerOrgLookup(
  orgTeams: ReportOrgTeam[] | undefined,
  ownerOrgs: ReportOwnerOrg[] | undefined,
) {
  const byTeam = orgLookup(orgTeams);
  const byUser = new Map<string, ReportOwnerOrg[]>();
  for (const row of ownerOrgs ?? []) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  return (
    userId?: string | null,
    teamId?: string | null,
    fallbackName?: string | null,
  ) => {
    const memberships = userId ? byUser.get(userId) : undefined;
    if (memberships?.length) {
      const matched = teamId
        ? memberships.find((row) => row.teamId === teamId)
        : undefined;
      const chosen = matched ?? memberships[0]!;
      return {
        teamId: chosen.teamId,
        teamName: chosen.teamName,
        department: chosen.departmentName,
      };
    }
    return byTeam(teamId, fallbackName);
  };
}

type ResolveOrg = ReturnType<typeof ownerOrgLookup>;

function recordOrg(
  record: {
    responsibleUserId?: string | null;
    teamId?: string | null;
    team?: { name?: string | null } | null;
  },
  resolveOrg: ResolveOrg,
) {
  return resolveOrg(record.responsibleUserId, record.teamId, record.team?.name);
}

function vectorLookup(
  vectors: BuildReportArgs['source']['vectors'],
  customerVectorById: Record<string, string | null>,
) {
  const names = new Map(vectors?.map((vector) => [vector.id, vector.name]));
  return (customerId?: string | null) => {
    if (!customerId) return 'Unassigned';
    const vectorId = customerVectorById[customerId];
    if (!vectorId) return 'Unassigned';
    return names.get(vectorId) || 'Unassigned';
  };
}

function teamCoverage(
  teamId: string,
  targets: TargetRow[],
): { coverage: number | null; coverageLabel: string } {
  const row = targets.find(
    (target) => target.level === 'team' && target.id === teamId,
  );
  if (!row) return { coverage: null, coverageLabel: '' };
  return {
    coverage: row.coverage,
    coverageLabel: row.coverageLabel,
  };
}

function buildOrgUnits(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  resolveOrg: ResolveOrg,
  resolveVector: ReturnType<typeof vectorLookup>,
  targets: TargetRow[],
): OrgUnitRow[] {
  const map = new Map<
    string,
    OrgUnitRow & { pipeline: MoneyByCurrency; teamId: string }
  >();
  const ensure = (
    org: ReturnType<ResolveOrg>,
    vector: string,
  ): OrgUnitRow & { pipeline: MoneyByCurrency; teamId: string } => {
    const key = `${org.department}|${org.teamId}|${vector}`;
    const existing = map.get(key);
    if (existing) return existing;
    const row = {
      id: key,
      department: org.department,
      team: org.teamName,
      vector,
      leads: 0,
      deals: 0,
      pipeline: {},
      target: null,
      achieved: null,
      remaining: null,
      coverage: null,
      coverageLabel: '',
      teamId: org.teamId,
    } satisfies OrgUnitRow & { teamId: string };
    map.set(key, row);
    return row;
  };

  for (const lead of leads) {
    const org = recordOrg(lead, resolveOrg);
    const row = ensure(org, resolveVector(lead.customerId));
    row.leads += 1;
    if (!leadConverted(lead) && !leadDisqualified(lead)) {
      addMoney(row.pipeline, lead.currency, lead.value);
    }
  }
  for (const deal of deals) {
    const org = recordOrg(deal, resolveOrg);
    const row = ensure(org, resolveVector(deal.customerId));
    row.deals += 1;
    if (dealOpen(deal)) addMoney(row.pipeline, deal.currency, deal.value);
  }
  return [...map.values()]
    .map((row) => {
      const coverage = teamCoverage(row.teamId, targets);
      const teamTarget = targets.find(
        (target) => target.level === 'team' && target.id === row.teamId,
      );
      return {
        id: row.id,
        department: row.department,
        team: row.team,
        vector: row.vector,
        leads: row.leads,
        deals: row.deals,
        pipeline: row.pipeline,
        target: teamTarget?.target ?? null,
        achieved: teamTarget?.achieved ?? null,
        remaining: teamTarget?.remaining ?? null,
        coverage: coverage.coverage,
        coverageLabel: coverage.coverageLabel,
      };
    })
    .sort(
      (a, b) =>
        a.department.localeCompare(b.department) ||
        a.team.localeCompare(b.team) ||
        a.vector.localeCompare(b.vector),
    );
}

function buildTeams(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  resolveOrg: ResolveOrg,
  targets: TargetRow[],
): TeamRow[] {
  const map = new Map<string, TeamRow>();
  const ensure = (id: string, name: string, department: string) => {
    const existing = map.get(id);
    if (existing) return existing;
    const row: TeamRow = {
      id,
      name,
      department,
      leads: 0,
      deals: 0,
      pipeline: {},
      won: {},
      lost: {},
      winRate: null,
      coverage: null,
      coverageLabel: '',
    };
    map.set(id, row);
    return row;
  };

  for (const lead of leads) {
    const org = recordOrg(lead, resolveOrg);
    ensure(org.teamId, org.teamName, org.department).leads += 1;
  }
  for (const deal of deals) {
    const org = recordOrg(deal, resolveOrg);
    const row = ensure(org.teamId, org.teamName, org.department);
    row.deals += 1;
    if (dealOpen(deal)) addMoney(row.pipeline, deal.currency, deal.value);
    if (dealWon(deal))
      addMoney(row.won, deal.currency, resolveDealAchievementValue(deal));
    if (dealLost(deal)) addMoney(row.lost, deal.currency, deal.value);
  }
  return [...map.values()].map((row) => {
    const coverage = teamCoverage(row.id, targets);
    const teamDeals = deals.filter((deal) => {
      const org = recordOrg(deal, resolveOrg);
      return org.teamId === row.id;
    });
    return {
      ...row,
      winRate: winRate(
        teamDeals.filter(dealWon).length,
        teamDeals.filter(dealLost).length,
      ),
      coverage: coverage.coverage,
      coverageLabel: coverage.coverageLabel,
    };
  });
}

function teamTargetMoneyByTeamId(
  teams: NonNullable<BuildReportArgs['source']['targets']>['teams'] | undefined,
): Map<string, MoneyByCurrency> {
  const map = new Map<string, MoneyByCurrency>();
  for (const team of teams ?? []) {
    const bucket = map.get(team.id) ?? {};
    addMoney(bucket, team.currency, team.target);
    map.set(team.id, bucket);
  }
  return map;
}

function applyTeamLeadTargets(
  rows: Map<string, SalesRepRow>,
  orgTeams: ReportOrgTeam[] | undefined,
  teamTargets:
    | NonNullable<BuildReportArgs['source']['targets']>['teams']
    | undefined,
) {
  const targetByTeamId = teamTargetMoneyByTeamId(teamTargets);
  for (const orgTeam of orgTeams ?? []) {
    const leadId = orgTeam.teamLeadId?.trim();
    if (!leadId) continue;
    const row = rows.get(leadId);
    if (!row) continue;

    const teamTarget = targetByTeamId.get(orgTeam.id);
    if (!teamTarget || moneyTotal(teamTarget) <= 0) continue;

    row.target = { ...teamTarget };
    row.team = orgTeam.name;
    row.department = orgTeam.departmentName;
    if (orgTeam.teamLeadName?.trim()) {
      row.name = orgTeam.teamLeadName.trim();
    }
  }
}

function buildSalesReps(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  resolveOrg: ResolveOrg,
  people:
    | NonNullable<BuildReportArgs['source']['targets']>['people']
    | undefined,
  orgTeams: ReportOrgTeam[] | undefined,
  teamTargets:
    | NonNullable<BuildReportArgs['source']['targets']>['teams']
    | undefined,
  options?: {
    teamIds?: string[];
    ownerOrgs?: ReportOwnerOrg[];
    userNameById?: Record<string, string>;
    assignmentRoles?: AssignmentRoleMeta[];
    /** Stage IDs for qualified pipeline value; null/undefined = metric not configured. */
    qpvStageIds?: string[] | null;
  },
): SalesRepRow[] {
  const teamFilterActive = Boolean(options?.teamIds?.length);
  const teamLeadIds = teamFilterActive
    ? resolveTeamLeadIds(orgTeams, options?.teamIds ?? [])
    : new Set<string>();
  const teamMemberIdSet = teamFilterActive
    ? selectedTeamMemberIds(
        options?.ownerOrgs,
        options?.teamIds ?? [],
        teamLeadIds,
      )
    : null;
  const rolesById = assignmentRolesById(options?.assignmentRoles);
  const map = new Map<string, SalesRepRow>();
  const ensure = (
    id: string,
    name: string,
    team: string,
    department: string,
  ) => {
    const existing = map.get(id);
    if (existing) return existing;
    const row: SalesRepRow = {
      id,
      name,
      team,
      department,
      leads: 0,
      deals: 0,
      pipeline: {},
      won: {},
      lost: {},
      winRate: null,
      target: null,
      achieved: null,
      remaining: null,
      achievementPct: null,
      pipelineTarget: null,
      pipelineAchievement: null,
    };
    map.set(id, row);
    return row;
  };

  if (teamFilterActive && teamMemberIdSet) {
    for (const org of options?.ownerOrgs ?? []) {
      if (!teamMemberIdSet.has(org.userId)) continue;
      ensure(
        org.userId,
        options?.userNameById?.[org.userId]?.trim() || org.userId,
        org.teamName,
        org.departmentName,
      );
    }
  }

  for (const lead of leads) {
    const org = recordOrg(lead, resolveOrg);
    const involvedIds = recordInvolvedUserIds(lead);
    const ids = teamFilterActive
      ? involvedIds.filter((id) => teamMemberIdSet?.has(id))
      : involvedIds;
    for (const userId of ids.length ? ids : ['unassigned']) {
      const row = ensure(
        userId,
        userId === 'unassigned'
          ? 'Unassigned'
          : options?.userNameById?.[userId]?.trim() ||
              displayName(lead.responsibleUser) ||
              userId,
        org.teamName,
        org.department,
      );
      row.leads += 1;
      if (!leadConverted(lead) && !leadDisqualified(lead)) {
        addMoney(row.pipeline, lead.currency, lead.value);
      }
    }
  }

  for (const deal of deals) {
    const org = recordOrg(deal, resolveOrg);
    const involvedIds = recordInvolvedUserIds(deal);
    const pipelineIds = teamFilterActive
      ? involvedIds.filter((id) => teamMemberIdSet?.has(id))
      : involvedIds;
    for (const userId of pipelineIds.length ? pipelineIds : ['unassigned']) {
      const row = ensure(
        userId,
        userId === 'unassigned'
          ? 'Unassigned'
          : options?.userNameById?.[userId]?.trim() ||
              displayName(deal.responsibleUser) ||
              userId,
        org.teamName,
        org.department,
      );
      row.deals += 1;
      if (dealOpen(deal)) addMoney(row.pipeline, deal.currency, deal.value);
    }

    const achievementIds = recordAchievementUserIds(deal, rolesById);
    const wonIds = teamFilterActive
      ? achievementIds.filter((id) => teamMemberIdSet?.has(id))
      : achievementIds;
    for (const userId of wonIds) {
      const row = ensure(
        userId,
        options?.userNameById?.[userId]?.trim() ||
          displayName(deal.responsibleUser) ||
          userId,
        org.teamName,
        org.department,
      );
      if (dealWon(deal)) {
        addMoney(row.won, deal.currency, resolveDealAchievementValue(deal));
      }
      if (dealLost(deal)) addMoney(row.lost, deal.currency, deal.value);
    }
  }

  for (const person of people ?? []) {
    if (teamFilterActive && teamLeadIds.has(person.id)) continue;
    const org = resolveOrg(person.id, null, person.team);
    const row = ensure(person.id, person.name, org.teamName, org.department);
    row.target = row.target ?? {};
    row.achieved = row.achieved ?? {};
    addMoney(row.target, person.currency, person.target);
    addMoney(row.achieved, person.currency, person.achieved);
  }

  if (!teamFilterActive) {
    applyTeamLeadTargets(map, orgTeams, teamTargets);
  }

  const qpvStageIds = options?.qpvStageIds ?? null;
  const qpvByUser =
    qpvStageIds && qpvStageIds.length > 0
      ? qualifiedPipelineByUser(deals, qpvStageIds)
      : null;

  let rows = [...map.values()].map((row) => {
    const wonCount = deals.filter((deal) => {
      if (!dealWon(deal)) return false;
      const credited = recordAchievementUserIds(deal, rolesById);
      return credited.includes(row.id);
    }).length;
    const lostCount = deals.filter((deal) => {
      if (!dealLost(deal)) return false;
      const credited = recordAchievementUserIds(deal, rolesById);
      return credited.includes(row.id);
    }).length;
    const targetTotal = row.target ? moneyTotal(row.target) : 0;
    const achievedTotal = row.achieved
      ? moneyTotal(row.achieved)
      : moneyTotal(row.won);
    const remaining: MoneyByCurrency | null = row.target
      ? Object.fromEntries(
          Object.entries(row.target).map(([code, amount]) => [
            code,
            Math.max(0, amount - (row.achieved?.[code] ?? row.won[code] ?? 0)),
          ]),
        )
      : null;
    const pipelineTarget =
      row.target && targetTotal > 0
        ? scaleMoneyMap(row.target, PIPELINE_TARGET_MULTIPLIER)
        : null;
    const pipelineAchievement =
      qpvByUser == null
        ? null
        : pipelineAchievementRates(
            qpvByUser.get(row.id) ?? {},
            row.target ?? {},
            ['ETB', 'USD'],
          );
    return {
      ...row,
      winRate: winRate(wonCount, lostCount),
      remaining,
      achievementPct:
        row.target && targetTotal > 0
          ? (achievedTotal / targetTotal) * 100
          : null,
      pipelineTarget,
      pipelineAchievement,
    };
  });

  if (teamFilterActive && teamMemberIdSet) {
    rows = rows.filter(
      (row) => row.id !== 'unassigned' && teamMemberIdSet.has(row.id),
    );
  }

  return rows;
}

function soonToClose(
  deals: PipelineDeal[],
  resolveOrg: ResolveOrg,
): OutlookDealRow[] {
  return deals
    .filter((deal) => {
      if (!dealOpen(deal)) return false;
      const delta = signedDayDelta(deal.expectedClose);
      return delta != null && delta >= 0 && delta <= SOON_TO_CLOSE_DAYS;
    })
    .sort((a, b) => {
      const da = signedDayDelta(a.expectedClose) ?? 999;
      const db = signedDayDelta(b.expectedClose) ?? 999;
      return da - db || b.value - a.value;
    })
    .map((deal) => {
      const org = recordOrg(deal, resolveOrg);
      return {
        id: deal.id,
        name: deal.name,
        customer: customerName(deal.customer?.accountName),
        owner: displayName(deal.responsibleUser) || 'Unassigned',
        team: org.teamName,
        department: org.department,
        stage: stageLabel(deal.stage?.name),
        stageColor: recordStageColor(deal.stage),
        value: deal.value,
        currency: deal.currency,
        date: deal.expectedClose ?? null,
      };
    });
}

function closedWonInPeriod(
  deals: PipelineDeal[],
  period: BuildReportArgs['period'],
  resolveOrg: ResolveOrg,
): OutlookDealRow[] {
  const won = deals.filter(dealWon);
  const inPeriod = won.filter((deal) =>
    dateInRange(closedAt(deal), period.from, period.to),
  );
  const rows = (inPeriod.length ? inPeriod : won).sort((a, b) => {
    const da = closedAt(a) ?? '';
    const db = closedAt(b) ?? '';
    return db.localeCompare(da);
  });
  return rows.map((deal) => {
    const org = recordOrg(deal, resolveOrg);
    return {
      id: deal.id,
      name: deal.name,
      customer: customerName(deal.customer?.accountName),
      owner: displayName(deal.responsibleUser) || 'Unassigned',
      team: org.teamName,
      department: org.department,
      stage: stageLabel(deal.stage?.name),
      stageColor: recordStageColor(deal.stage),
      value: deal.value,
      currency: deal.currency,
      date: closedAt(deal),
    };
  });
}

function scaleMoneyMap(
  money: MoneyByCurrency,
  multiplier: number,
): MoneyByCurrency {
  return Object.fromEntries(
    Object.entries(money).map(([code, amount]) => [code, amount * multiplier]),
  );
}

function newlyAdded(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  range: { from: string; to: string },
  resolveVector: ReturnType<typeof vectorLookup>,
): NewlyAddedRow[] {
  const dealRows = deals
    .filter(
      (deal) =>
        dateInRange(deal.createdAt, range.from, range.to) && dealOpen(deal),
    )
    .map((deal) => ({
      id: deal.id,
      name: deal.name,
      customer: customerName(deal.customer?.accountName),
      vector: resolveVector(deal.customerId),
      addedBy: displayName(deal.responsibleUser) || 'Unassigned',
      intakeStage: stageLabel(deal.stage?.name),
      stageColor: recordStageColor(deal.stage),
      value: deal.value,
      currency: deal.currency,
      status: statusLabel(deal.status, dealOpen(deal)),
      sort: deal.createdAt ?? '',
    }));
  const convertedDealIds = new Set(
    leads.map((lead) => lead.convertedDealId).filter(Boolean),
  );
  const leadRows = leads
    .filter(
      (lead) =>
        dateInRange(lead.createdAt, range.from, range.to) &&
        !leadConverted(lead) &&
        !leadDisqualified(lead) &&
        (!lead.convertedDealId || !convertedDealIds.has(lead.convertedDealId)),
    )
    .map((lead) => ({
      id: lead.id,
      name: lead.name,
      customer: customerName(lead.customer?.accountName),
      vector: resolveVector(lead.customerId),
      addedBy: displayName(lead.responsibleUser) || 'Unassigned',
      intakeStage: stageLabel(lead.stage?.name),
      stageColor: recordStageColor(lead.stage),
      value: lead.value,
      currency: lead.currency,
      status: statusLabel(lead.status, true),
      sort: lead.createdAt ?? '',
    }));
  return [...dealRows, ...leadRows]
    .sort((a, b) => b.sort.localeCompare(a.sort))
    .map((row) => ({
      id: row.id,
      name: row.name,
      customer: row.customer,
      vector: row.vector,
      addedBy: row.addedBy,
      intakeStage: row.intakeStage,
      stageColor: row.stageColor,
      value: row.value,
      currency: row.currency,
      status: row.status,
    }));
}

function buildConcentration(
  deals: PipelineDeal[],
  resolveVector: ReturnType<typeof vectorLookup>,
): ConcentrationRow[] {
  const map = new Map<string, ConcentrationRow>();
  for (const deal of deals) {
    const id = deal.customerId || 'unassigned';
    const existing = map.get(id);
    const row =
      existing ??
      ({
        id,
        customer: customerName(deal.customer?.accountName),
        vector: resolveVector(deal.customerId),
        activeDeals: 0,
        openPipeline: {},
        wonRevenue: {},
        totalVolume: {},
      } satisfies ConcentrationRow);
    if (dealOpen(deal)) {
      row.activeDeals += 1;
      addMoney(row.openPipeline, deal.currency, deal.value);
    }
    if (dealWon(deal))
      addMoney(
        row.wonRevenue,
        deal.currency,
        resolveDealAchievementValue(deal),
      );
    addMoney(row.totalVolume, deal.currency, deal.value);
    map.set(id, row);
  }
  return [...map.values()].sort(
    (a, b) =>
      (a.vector || '').localeCompare(b.vector || '') ||
      moneyTotal(b.totalVolume) - moneyTotal(a.totalVolume),
  );
}

function expectedCloseLabel(deal: PipelineDeal): string {
  if (dealWon(deal) || dealLost(deal)) {
    return formatDate(closedAt(deal));
  }
  if (!deal.expectedClose) return 'Missing';
  const delta = signedDayDelta(deal.expectedClose);
  if (delta != null && delta < 0) return 'Overdue';
  return formatDate(deal.expectedClose);
}

function leadExpectedCloseLabel(lead: PipelineLead): string {
  if (leadConverted(lead) || leadDisqualified(lead)) {
    return formatDate(lead.convertedAt || lead.updatedAt);
  }
  if (!lead.expectedClose) return 'Missing';
  const delta = signedDayDelta(lead.expectedClose);
  if (delta != null && delta < 0) return 'Overdue';
  return formatDate(lead.expectedClose);
}

function buildRegistry(
  deals: PipelineDeal[],
  resolveOrg: ResolveOrg,
  ctx: RegistryBuildCtx,
): RegistryRow[] {
  const columns = ctx.custom?.dealColumns ?? [];
  return [...deals]
    .sort((a, b) => b.value - a.value)
    .map((deal) => {
      const org = recordOrg(deal, resolveOrg);
      const details = extractProductDetails(deal, ctx.lookups);
      const products = productFieldsFromDetails(details);
      const assignments = deal.roleAssignments;
      const owner = primaryAe(deal, assignments, ctx.userNameById);
      const fiscal = sessionFiscalLabels(
        deal.sessionId,
        ctx.sessions,
        ctx.fiscalYears,
      );
      const stageCategory = stageCategoryOf(deal.stage, 'Deal');
      return {
        id: deal.id,
        recordType: 'Deal' as const,
        type: deal.type?.name?.trim() || EMPTY,
        name: deal.name,
        customer: customerName(deal.customer?.accountName),
        owner,
        ...contactFields(deal.contact),
        roleValues: formatPipelineRoleValues(
          { ...deal, roleAssignments: assignments },
          ctx.assignmentRoles,
          ctx.userNameById,
        ),
        team: org.teamName,
        department: org.department,
        stage: stageLabel(deal.stage?.name),
        previousStage: resolvePreviousStageName(
          deal.previousStageId,
          ctx.stageNameById,
        ),
        stageColor: recordStageColor(deal.stage),
        stageCategory,
        stageOrder: stageOrderOf(deal.stage),
        value: deal.value,
        currency: deal.currency,
        fiscalYear: fiscal.fiscalYear,
        quarter: fiscal.quarter,
        quarterClosed: ctx.currentReporting,
        drStatus: products.dealRegistration,
        expectedClose: deal.expectedClose ?? null,
        expectedCloseLabel: expectedCloseLabel(deal),
        ...products,
        customValues: formatReportCustomValues(
          columns,
          ctx.custom?.dealValuesById?.get(deal.id),
          ctx.custom?.directory ?? {},
        ),
        ...registryEngagementFields('Deal', deal.id, deal.stageEnteredAt, ctx),
      };
    });
}

function buildLeadRegistry(
  leads: PipelineLead[],
  resolveOrg: ResolveOrg,
  ctx: RegistryBuildCtx,
): RegistryRow[] {
  const columns = ctx.custom?.leadColumns ?? [];
  return [...leads]
    .sort((a, b) => b.value - a.value)
    .map((lead) => {
      const org = recordOrg(lead, resolveOrg);
      const details = extractProductDetails(lead, ctx.lookups);
      const products = productFieldsFromDetails(details);
      const assignments = lead.roleAssignments;
      const owner = primaryAe(lead, assignments, ctx.userNameById);
      const fiscal = sessionFiscalLabels(
        lead.sessionId,
        ctx.sessions,
        ctx.fiscalYears,
      );
      const stageCategory = stageCategoryOf(lead.stage, 'Lead', {
        converted: leadConverted(lead),
        disqualified: leadDisqualified(lead),
      });
      return {
        id: lead.id,
        recordType: 'Lead' as const,
        type: lead.type?.name?.trim() || EMPTY,
        name: lead.name,
        customer: customerName(lead.customer?.accountName),
        owner,
        ...contactFields(lead.contact),
        roleValues: formatPipelineRoleValues(
          { ...lead, roleAssignments: assignments },
          ctx.assignmentRoles,
          ctx.userNameById,
        ),
        team: org.teamName,
        department: org.department,
        stage: stageLabel(lead.stage?.name),
        previousStage: resolvePreviousStageName(
          lead.previousStageId,
          ctx.stageNameById,
        ),
        stageColor: recordStageColor(lead.stage),
        stageCategory,
        stageOrder: stageOrderOf(lead.stage),
        value: lead.value,
        currency: lead.currency,
        fiscalYear: fiscal.fiscalYear,
        quarter: fiscal.quarter,
        quarterClosed: ctx.currentReporting,
        drStatus: products.dealRegistration,
        expectedClose: lead.expectedClose ?? null,
        expectedCloseLabel: leadExpectedCloseLabel(lead),
        ...products,
        customValues: formatReportCustomValues(
          columns,
          ctx.custom?.leadValuesById?.get(lead.id),
          ctx.custom?.directory ?? {},
        ),
        ...registryEngagementFields('Lead', lead.id, lead.stageEnteredAt, ctx),
      };
    });
}

function buildClosedWonRegistry(
  deals: PipelineDeal[],
  period: BuildReportArgs['period'],
  resolveOrg: ResolveOrg,
  ctx: RegistryBuildCtx,
): RegistryRow[] {
  const won = deals.filter(dealWon);
  const inPeriod = won.filter((deal) =>
    dateInRange(closedAt(deal), period.from, period.to),
  );
  const rows = (inPeriod.length ? inPeriod : won).sort((a, b) => {
    const da = closedAt(a) ?? '';
    const db = closedAt(b) ?? '';
    return db.localeCompare(da);
  });
  const columns = ctx.custom?.dealColumns ?? [];
  return rows.map((deal) => {
    const org = recordOrg(deal, resolveOrg);
    const details = extractProductDetails(deal, ctx.lookups);
    const products = productFieldsFromDetails(details);
    const assignments = deal.roleAssignments;
    const owner = primaryAe(deal, assignments, ctx.userNameById);
    const fiscal = sessionFiscalLabels(
      deal.sessionId,
      ctx.sessions,
      ctx.fiscalYears,
    );
    return {
      id: deal.id,
      recordType: 'Deal' as const,
      type: deal.type?.name?.trim() || EMPTY,
      name: deal.name,
      customer: customerName(deal.customer?.accountName),
      owner,
      ...contactFields(deal.contact),
      roleValues: formatPipelineRoleValues(
        { ...deal, roleAssignments: assignments },
        ctx.assignmentRoles,
        ctx.userNameById,
      ),
      team: org.teamName,
      department: org.department,
      stage: stageLabel(deal.stage?.name),
      stageColor: recordStageColor(deal.stage),
      stageCategory: 'won' as const,
      stageOrder: stageOrderOf(deal.stage),
      value: deal.value,
      currency: deal.currency,
      fiscalYear: fiscal.fiscalYear,
      quarter: fiscal.quarter,
      quarterClosed: quarterClosedForDeal(deal, ctx.sessions),
      drStatus: products.dealRegistration,
      expectedClose: closedAt(deal),
      expectedCloseLabel: formatDate(closedAt(deal)),
      ...products,
      customValues: formatReportCustomValues(
        columns,
        ctx.custom?.dealValuesById?.get(deal.id),
        ctx.custom?.directory ?? {},
      ),
      ...registryEngagementFields('Deal', deal.id, deal.stageEnteredAt, ctx),
    };
  });
}

function buildProductPipeline(
  leads: PipelineLead[],
  deals: PipelineDeal[],
  lookups: CatalogLookups,
): ProductPipelineRow[] {
  const openDeals = deals.filter(dealOpen);
  const openLeads = leads.filter(
    (lead) => !leadConverted(lead) && !leadDisqualified(lead),
  );
  const map = new Map<
    string,
    {
      id: string;
      label: string;
      count: number;
      countByCurrency: MoneyByCurrency;
      value: MoneyByCurrency;
    }
  >();

  const ingest = (record: {
    products?: OpportunityProductLine[];
    solutions?: OpportunitySolution[];
    currency?: string;
    value?: number;
  }) => {
    const details = extractProductDetails(record, lookups);
    const fallbackCurrency = record.currency || 'UNKNOWN';
    const fallbackValue = Number(record.value) || 0;

    if (!details.length) {
      if (fallbackValue <= 0) return;
      const id = '__unassigned__';
      const existing = map.get(id) ?? {
        id,
        label: 'No product assigned',
        count: 0,
        countByCurrency: {},
        value: {},
      };
      existing.count += 1;
      addMoney(existing.countByCurrency, fallbackCurrency, 1);
      addMoney(existing.value, fallbackCurrency, fallbackValue);
      map.set(id, existing);
      return;
    }

    for (const line of details) {
      const label = line.product || line.productFamily || 'Unnamed product';
      const id = label.toLowerCase();
      const existing = map.get(id) ?? {
        id,
        label,
        count: 0,
        countByCurrency: {},
        value: {},
      };
      existing.count += 1;
      addMoney(existing.countByCurrency, line.currency || fallbackCurrency, 1);
      const amount = line.amount > 0 ? line.amount : 0;
      if (amount > 0) {
        addMoney(existing.value, line.currency || fallbackCurrency, amount);
      }
      map.set(id, existing);
    }
  };

  for (const deal of openDeals) ingest(deal);
  for (const lead of openLeads) ingest(lead);

  const rows = [...map.values()]
    .filter((row) => moneyTotal(row.value) > 0 || row.count > 0)
    .sort((a, b) => moneyTotal(b.value) - moneyTotal(a.value));
  const total = rows.reduce((sum, row) => sum + moneyTotal(row.value), 0);
  return rows.map((row, index) => ({
    ...row,
    share: total > 0 ? Math.round((moneyTotal(row.value) / total) * 100) : 0,
    color: PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]!,
  }));
}

function achievementByCurrency(
  target: MoneyByCurrency,
  achieved: MoneyByCurrency,
  annual?: Array<{
    currency: string;
    target: number;
    achieved: number;
    remaining?: number;
  }>,
): CurrencyAchievement[] {
  const annualByCurrency = new Map(
    (annual ?? []).map((row) => [row.currency.toUpperCase(), row]),
  );
  const currencies = [
    ...new Set([
      ...Object.keys(target),
      ...Object.keys(achieved),
      ...(annual ?? []).map((row) => row.currency),
    ]),
  ].sort();
  return currencies
    .map((currency) => {
      const targetAmount = target[currency] ?? 0;
      const achievedAmount = achieved[currency] ?? 0;
      const annualRow = annualByCurrency.get(currency.toUpperCase());
      const row: CurrencyAchievement = {
        currency,
        target: targetAmount,
        achieved: achievedAmount,
        remaining: Math.max(0, targetAmount - achievedAmount),
        achievementPct:
          targetAmount > 0 ? (achievedAmount / targetAmount) * 100 : null,
      };
      if (annualRow) {
        row.annualTarget = annualRow.target;
        row.annualAchieved = annualRow.achieved;
        row.annualRemaining =
          annualRow.remaining ??
          Math.max(0, annualRow.target - annualRow.achieved);
        row.annualAchievementPct =
          annualRow.target > 0
            ? (annualRow.achieved / annualRow.target) * 100
            : null;
      }
      return row;
    })
    .filter(
      (row) =>
        row.target > 0 ||
        row.achieved > 0 ||
        (row.annualTarget ?? 0) > 0 ||
        (row.annualAchieved ?? 0) > 0,
    );
}

function impactText(
  deals: Array<{ value: number; currency: string; owner: string }>,
): string {
  if (!deals.length) return 'None';
  const preview = deals.slice(0, 3).map((deal) => {
    const amount = formatCompactAmount(deal.value, deal.currency);
    const owner = deal.owner.split(' ')[0] || deal.owner;
    return `${amount} (${owner})`;
  });
  const extra = deals.length > 3 ? `, +${deals.length - 3} more` : '';
  return `${preview.join(', ')}${extra}`;
}

function buildAttention(
  deals: PipelineDeal[],
  stagnation?: {
    configured: boolean;
    thresholdDays?: number | null;
  } | null,
): AttentionRow[] {
  const stagnationThreshold =
    stagnation?.configured && stagnation.thresholdDays != null
      ? stagnation.thresholdDays
      : null;
  const rows: AttentionRow[] = [];
  for (const deal of deals.filter(dealOpen)) {
    const issues: Array<{ severity: AttentionRow['severity']; text: string }> =
      [];
    const daysInStage = daysBetween(deal.stageEnteredAt);
    const delta = signedDayDelta(deal.expectedClose);
    if (delta != null && delta < 0) {
      issues.push({
        severity: 'critical',
        text: 'Expected close date passed',
      });
    } else if (delta == null) {
      issues.push({ severity: 'warning', text: 'Missing expected close date' });
    }
    if (
      stagnationThreshold != null &&
      daysInStage != null &&
      daysInStage >= stagnationThreshold
    ) {
      issues.push({
        severity: 'critical',
        text: `Stuck in stage for ${daysInStage} days (threshold ${stagnationThreshold}d)`,
      });
    }
    if (!deal.responsibleUserId) {
      issues.push({ severity: 'warning', text: 'Missing owner' });
    }
    if (isUnassignedCustomer(deal.customer?.accountName)) {
      issues.push({
        severity: 'warning',
        text: 'Missing customer information',
      });
    }
    if (!issues.length) continue;
    rows.push({
      id: deal.id,
      name: deal.name,
      owner: displayName(deal.responsibleUser) || 'Unassigned',
      customer: customerName(deal.customer?.accountName),
      value: deal.value,
      currency: deal.currency,
      stage: stageLabel(deal.stage?.name),
      expectedClose: deal.expectedClose ?? null,
      daysOpen: daysBetween(deal.createdAt),
      issue: issues.map((issue) => issue.text).join('; '),
      severity: issues.some((issue) => issue.severity === 'critical')
        ? 'critical'
        : 'warning',
    });
  }
  return rows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.value - a.value;
  });
}

function buildRisk(
  deals: PipelineDeal[],
  attention: AttentionRow[],
): { flags: RiskFlagRow[]; observations: string[] } {
  const open = deals.filter(dealOpen);
  const missingDates = open.filter((deal) => !deal.expectedClose);
  const unassigned = open.filter((deal) =>
    isUnassignedCustomer(deal.customer?.accountName),
  );
  const overdue = open.filter((deal) => {
    const delta = signedDayDelta(deal.expectedClose);
    return delta != null && delta < 0;
  });

  const withOwner = (
    deal: PipelineDeal,
  ): { value: number; currency: string; owner: string } => ({
    value: deal.value,
    currency: deal.currency,
    owner: displayName(deal.responsibleUser) || 'Unassigned',
  });

  const flags: RiskFlagRow[] = [];
  if (missingDates.length) {
    flags.push({
      id: 'missing-close-dates',
      flag: 'Missing Close Dates',
      severity: 'critical',
      impact: impactText(missingDates.map(withOwner)),
      action: 'Assign realistic closing target dates.',
    });
  }
  if (unassigned.length) {
    flags.push({
      id: 'unassigned-customers',
      flag: 'Unassigned Customers',
      severity: 'warning',
      impact: `${unassigned.length} opportunit${unassigned.length === 1 ? 'y' : 'ies'} (${formatMoneyMap(moneyFromRecords(unassigned), true)}) without linked accounts`,
      action: 'Enforce account linking before Stage Gate.',
    });
  }
  if (overdue.length) {
    flags.push({
      id: 'overdue-milestones',
      flag: 'Overdue Milestones',
      severity: 'critical',
      impact: overdue
        .slice(0, 3)
        .map(
          (deal) =>
            `${deal.name} (${displayName(deal.responsibleUser) || 'Unassigned'})`,
        )
        .join('; '),
      action: 'Update milestone or archive test record.',
    });
  }

  const observations: string[] = [];
  if (missingDates.length) {
    observations.push(
      'Missing close dates are marked critical and affect open opportunities that still need a closing target.',
    );
  }
  if (unassigned.length) {
    observations.push(
      'Unassigned customer/account relationships are flagged as a warning and should be enforced before Stage Gate progression.',
    );
  }
  if (overdue.length) {
    observations.push(
      'Overdue expected-close dates require a milestone update or archival of stale records.',
    );
  }
  const critical = attention.filter(
    (row) => row.severity === 'critical',
  ).length;
  if (!flags.length && !critical) {
    observations.push(
      'No critical data-hygiene flags were detected for the selected scope.',
    );
  }
  return { flags, observations };
}

function buildTargets(
  input: BuildReportArgs['source']['targets'],
  openPipeline: MoneyByCurrency,
  periodLabel: string,
  deals: PipelineDeal[],
): TargetRow[] {
  if (!input) return [];
  const rows: TargetRow[] = [];
  const companyByCurrency = new Map<
    string,
    { target: number; achieved: number }
  >();
  for (const row of input.company ?? []) {
    const current = companyByCurrency.get(row.currency) ?? {
      target: 0,
      achieved: 0,
    };
    current.target += row.target;
    current.achieved += row.achieved;
    companyByCurrency.set(row.currency, current);
  }
  if (companyByCurrency.size) {
    const target: MoneyByCurrency = {};
    const achieved: MoneyByCurrency = {};
    const remaining: MoneyByCurrency = {};
    for (const [code, values] of companyByCurrency) {
      target[code] = values.target;
      achieved[code] = values.achieved;
      remaining[code] = Math.max(0, values.target - values.achieved);
    }
    const remainingTotal = moneyTotal(remaining);
    const coverage = coverageRatio(moneyTotal(openPipeline), remainingTotal);
    rows.push({
      id: 'company',
      period: input.periodLabel || periodLabel,
      scope: 'Company',
      level: 'company',
      target,
      achieved,
      remaining,
      achievementPct:
        moneyTotal(target) > 0
          ? (moneyTotal(achieved) / moneyTotal(target)) * 100
          : null,
      pipeline: openPipeline,
      coverage: coverage.value,
      coverageLabel: coverage.label,
    });
  }
  const teams = new Map<string, TargetRow>();
  for (const team of input.teams ?? []) {
    const existing =
      teams.get(team.id) ??
      ({
        id: team.id,
        period: input.periodLabel || periodLabel,
        scope: team.name,
        level: 'team' as const,
        target: {},
        achieved: {},
        remaining: {},
        achievementPct: null,
        pipeline: {},
        coverage: null,
        coverageLabel: '',
      } satisfies TargetRow);
    addMoney(existing.target, team.currency, team.target);
    addMoney(existing.achieved, team.currency, team.achieved);
    addMoney(
      existing.remaining,
      team.currency,
      Math.max(0, team.target - team.achieved),
    );
    teams.set(team.id, existing);
  }
  for (const row of teams.values()) {
    const teamPipeline = moneyFromRecords(
      deals.filter((deal) => deal.teamId === row.id && dealOpen(deal)),
    );
    const coverage = coverageRatio(
      moneyTotal(teamPipeline),
      moneyTotal(row.remaining),
    );
    rows.push({
      ...row,
      achievementPct:
        moneyTotal(row.target) > 0
          ? (moneyTotal(row.achieved) / moneyTotal(row.target)) * 100
          : null,
      pipeline: teamPipeline,
      coverage: coverage.value,
      coverageLabel: coverage.label,
    });
  }
  return rows;
}

function filterLabels(
  filters: ReportFilters,
  scopeLevel?: BuildReportArgs['source']['permissionScopeLevel'],
): string[] {
  if (scopeLevel === 'personal') {
    return ['Owners only — teams cannot be filtered'];
  }

  const labels: string[] = [];
  const push = (label: string, ids: string[]) => {
    if (ids.length) labels.push(`${label} (${ids.length})`);
  };
  push('Team', filters.teamIds);
  push('Owner', filters.ownerIds);
  push(`${dealUiLabel()} Stage`, filters.dealStageIds);
  push('Product Family', filters.productFamilyIds);
  push('Product', filters.productIds);
  push('Vector', filters.vectorIds);
  push('Currency', filters.currencies);
  if (labels.length) return labels;

  if (scopeLevel === 'company') return ['All teams'];
  if (scopeLevel === 'department') return ['All teams in my department'];
  if (scopeLevel === 'team') return ['My team'];
  return ['All records'];
}

function resolveScopeLabel(source: BuildReportArgs['source']): string {
  if (source.permissionScopeLevel === 'personal') {
    return source.reportViewerName?.trim() || 'My records';
  }
  if (source.permissionScopeLevel === 'team') return 'Team';
  if (source.permissionScopeLevel === 'department') return 'Department';
  if (source.permissionScopeLevel === 'company') return 'Company';
  return source.permissionScopeLabel ?? 'Report';
}

/** Prefix table titles so they match the permission scope of the data. */
export function scopedSectionTitle(
  base: string,
  scopeLevel:
    | BuildReportArgs['source']['permissionScopeLevel']
    | null
    | undefined,
  scopeLabel?: string,
): string {
  if (scopeLevel === 'personal') {
    const who = scopeLabel?.trim() || 'My';
    return `${who} — ${base}`;
  }
  if (scopeLevel === 'team') return `Team — ${base}`;
  if (scopeLevel === 'department') return `Department — ${base}`;
  if (scopeLevel === 'company') return `Company — ${base}`;
  return base;
}

type EffectiveTargetScope = {
  level: 'company' | 'team' | 'person';
  teamIds: string[];
  ownerIds: string[];
};

/** Map report org filters to the target/achievement scope shown in charts and exports. */
function resolveEffectiveTargetScope(
  filters: ReportFilters,
  permissionLevel: BuildReportArgs['source']['permissionScopeLevel'],
): EffectiveTargetScope {
  // Team filter wins over owner selection. Selecting a team in the tree also
  // selects all members as owners, but charts/KPIs should still show that
  // team's aggregate target — not an empty person rollup.
  if (filters.teamIds.length > 0) {
    return {
      level: 'team',
      teamIds: filters.teamIds,
      ownerIds: [],
    };
  }
  if (filters.ownerIds.length > 0) {
    return {
      level: 'person',
      teamIds: [],
      ownerIds: filters.ownerIds,
    };
  }
  if (permissionLevel === 'personal') {
    return { level: 'person', teamIds: [], ownerIds: [] };
  }
  if (permissionLevel === 'team' || permissionLevel === 'department') {
    return { level: 'team', teamIds: [], ownerIds: [] };
  }
  return { level: 'company', teamIds: [], ownerIds: [] };
}

function sumTargetRowsMoney(
  rows: TargetRow[],
  empty: MoneyByCurrency,
): {
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
} {
  const target = { ...empty };
  const achieved = { ...empty };
  for (const row of rows) {
    for (const [code, amount] of Object.entries(row.target)) {
      addMoney(target, code, amount);
    }
    for (const [code, amount] of Object.entries(row.achieved)) {
      addMoney(achieved, code, amount);
    }
  }
  const remaining = Object.fromEntries(
    Object.entries(target).map(([code, amount]) => [
      code,
      Math.max(0, amount - (achieved[code] ?? 0)),
    ]),
  );
  return { target, achieved, remaining };
}

function sumCurrencyLineMoney<
  T extends { currency: string; target: number; achieved: number },
>(
  rows: T[],
  empty: MoneyByCurrency,
): {
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
} {
  const target = { ...empty };
  const achieved = { ...empty };
  for (const row of rows) {
    addMoney(target, row.currency, row.target);
    addMoney(achieved, row.currency, row.achieved);
  }
  const remaining = Object.fromEntries(
    Object.entries(target).map(([code, amount]) => [
      code,
      Math.max(0, amount - (achieved[code] ?? 0)),
    ]),
  );
  return { target, achieved, remaining };
}

function sumPeopleTargetMoney(
  people: NonNullable<BuildReportArgs['source']['targets']>['people'],
  ownerIds: string[],
  empty: MoneyByCurrency,
): {
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
} {
  const filtered = ownerIds.length
    ? people.filter((person) => ownerIds.includes(person.id))
    : people;
  return sumCurrencyLineMoney(filtered, empty);
}

function sumTeamInputMoney(
  teams: NonNullable<BuildReportArgs['source']['targets']>['teams'],
  teamIds: string[],
  empty: MoneyByCurrency,
): {
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
} {
  const filtered = teamIds.length
    ? teams.filter((team) => teamIds.includes(team.id))
    : teams;
  return sumCurrencyLineMoney(filtered, empty);
}

function aggregateAnnualByCurrency(
  rows: Array<{
    currency: string;
    target: number;
    achieved: number;
    remaining?: number;
  }>,
): Array<{
  currency: string;
  target: number;
  achieved: number;
  remaining: number;
}> {
  const byCurrency = new Map<string, { target: number; achieved: number }>();
  for (const row of rows) {
    const current = byCurrency.get(row.currency) ?? { target: 0, achieved: 0 };
    current.target += row.target;
    current.achieved += row.achieved;
    byCurrency.set(row.currency, current);
  }
  return [...byCurrency.entries()].map(([currency, values]) => ({
    currency,
    target: values.target,
    achieved: values.achieved,
    remaining: Math.max(0, values.target - values.achieved),
  }));
}

function resolveScopedAnnualTargets(
  input: BuildReportArgs['source']['targets'],
  scope: EffectiveTargetScope,
):
  | Array<{
      currency: string;
      target: number;
      achieved: number;
      remaining?: number;
    }>
  | undefined {
  if (!input) return undefined;

  if (scope.level === 'company') {
    return input.annual;
  }

  if (scope.level === 'team' && input.annualTeams?.length) {
    const rows = scope.teamIds.length
      ? input.annualTeams.filter((team) => scope.teamIds.includes(team.id))
      : input.annualTeams;
    const aggregated = aggregateAnnualByCurrency(rows);
    return aggregated.length ? aggregated : undefined;
  }

  return undefined;
}

function resolveScopedTargetMoney(
  targets: TargetRow[],
  source: BuildReportArgs['source'],
  wonRevenue: MoneyByCurrency,
  currencies: string[],
  filters: ReportFilters,
): {
  target: MoneyByCurrency;
  achieved: MoneyByCurrency;
  remaining: MoneyByCurrency;
} {
  const empty = emptyMoney(currencies);
  const scope = resolveEffectiveTargetScope(
    filters,
    source.permissionScopeLevel,
  );
  const companyTarget = targets.find((row) => row.level === 'company');
  const teamTargets = targets.filter((row) => row.level === 'team');
  const personTargets = targets.filter((row) => row.level === 'person');

  if (scope.level === 'person') {
    if (personTargets.length) {
      const rows = scope.ownerIds.length
        ? personTargets.filter((row) => scope.ownerIds.includes(row.id))
        : personTargets;
      if (rows.length) return sumTargetRowsMoney(rows, empty);
    }
    if (source.targets?.people?.length) {
      return sumPeopleTargetMoney(source.targets.people, scope.ownerIds, empty);
    }
  }

  if (scope.level === 'team') {
    if (teamTargets.length) {
      const rows = scope.teamIds.length
        ? teamTargets.filter((row) => scope.teamIds.includes(row.id))
        : teamTargets;
      if (rows.length) return sumTargetRowsMoney(rows, empty);
    }
    if (source.targets?.teams?.length) {
      return sumTeamInputMoney(source.targets.teams, scope.teamIds, empty);
    }
  }

  if (scope.level === 'company' && companyTarget) {
    return {
      target: companyTarget.target,
      achieved: companyTarget.achieved,
      remaining: companyTarget.remaining,
    };
  }

  if (scope.level === 'company' && source.targets?.company?.length) {
    return sumCurrencyLineMoney(source.targets.company, empty);
  }

  return {
    target: empty,
    achieved: wonRevenue,
    remaining: empty,
  };
}

export function countActiveFilters(filters: ReportFilters): number {
  return [filters.teamIds, filters.ownerIds].filter((value) => value.length > 0)
    .length;
}

/** Deal ids included in the report after filters and period scoping. */
export function listScopedReportDealIds(args: BuildReportArgs): string[] {
  const productFamilyById = new Map(
    args.source.catalog.products.map((product) => [
      product.id,
      product.familyId ?? '',
    ]),
  );
  const scoped = filterRecords(
    args.source.leads,
    args.source.deals,
    args.filters,
    args.period,
    productFamilyById,
    args.source.customerVectorById ?? {},
    args.source.ownerOrgs,
  );
  return scoped.deals.map((deal) => deal.id);
}

export function buildPipelineReport(
  args: BuildReportArgs,
): SalesPipelineReportData {
  const { source, period, filters, selectedColumnIds } = args;
  const sections = filterSectionsForScope(
    args.sections,
    source.permissionScopeLevel,
  );
  const visibility = reportTableVisibility(source.permissionScopeLevel);
  const productFamilyById = buildFamilyIdByProductId(
    source.catalog.products,
    source.catalog.vendors ?? [],
  );
  const customerVectorById = source.customerVectorById ?? {};
  const scoped = filterRecords(
    source.leads,
    source.deals,
    filters,
    period,
    productFamilyById,
    customerVectorById,
    source.ownerOrgs,
  );
  const reportLeads = isLeadsEnabled() ? scoped.leads : [];
  const omissions: ReportOmission[] = [];
  const openDeals = scoped.deals.filter(dealOpen);
  const wonDeals = scoped.deals.filter(dealWon);
  const lostDeals = scoped.deals.filter(dealLost);
  const openPipeline = moneyFromRecords(openDeals);
  const wonRevenue = moneyFromRecords(wonDeals);
  const lostValue = moneyFromRecords(lostDeals);
  const quarterPeriod = resolveCurrentQuarterPeriod(source.sessions ?? []);
  const qpvMetric = resolveValueOverTargetMetric(source.customPipelineMetrics);
  const qpvStageIds = qpvMetric?.stageIds ?? null;
  const qualifiedPipelineValue = qpvStageIds
    ? moneyFromQualifiedPipeline(scoped.deals, qpvStageIds)
    : {};
  const sdMetric = resolveStageExitConversionMetric(
    source.customPipelineMetrics,
  );
  const historyDurationByStageId = source.stageAnalytics?.stageDurationAverages
    ? new Map(
        source.stageAnalytics.stageDurationAverages.map((row) => [
          row.stageId,
          row.averageDays,
        ]),
      )
    : undefined;

  const stageAnalyticsLoaded = source.stageAnalytics != null;
  const historyConversions = source.stageAnalytics?.stageExitConversions ?? [];
  const historyConversion =
    historyConversions.find(
      (row) => row.configured && row.metricName === sdMetric?.metricName,
    ) ??
    historyConversions.find((row) => row.configured) ??
    historyConversions[0] ??
    null;
  const sdConversion =
    historyConversion?.configured === true
      ? {
          toSuccess: historyConversion.toSuccess,
          toLost: historyConversion.toLost,
          toAlso: historyConversion.toAlso,
          rate: historyConversion.rate ?? 0,
          detail: historyConversion.detail,
        }
      : stageAnalyticsLoaded
        ? null
        : sdMetric
          ? countStageExitConversion(scoped.deals, sdMetric, {
              from: period.from,
              to: period.to,
            })
          : null;
  const stagnationAnalytics = source.stageAnalytics?.stagnation;
  const salesCycleAnalytics = source.stageAnalytics?.salesCycleDuration;
  const dropAnalysisRows = source.stageAnalytics?.dropAnalysis ?? [];
  const totalPipeline = sumMoney(
    moneyFromRecords(scoped.deals),
    moneyFromRecords(reportLeads),
  );
  const currencies = [
    ...new Set(
      [...reportLeads, ...scoped.deals]
        .map((record) => record.currency)
        .filter(Boolean),
    ),
  ];
  const primary = currencies[0] || filters.currencies[0] || '';
  const winRateCurrencies = [...new Set(['ETB', 'USD', ...currencies])];
  const winRateByCurrency = Object.fromEntries(
    winRateCurrencies.map((currency) => {
      const won = wonRevenue[currency] ?? 0;
      const lost = lostValue[currency] ?? 0;
      return [currency, winRate(won, lost)];
    }),
  ) as Record<string, number | null>;
  const sdConversionRateByCurrency = Object.fromEntries(
    winRateCurrencies.map((currency) => {
      if (
        historyConversion?.configured === true &&
        historyConversion.rateByCurrency != null
      ) {
        return [currency, historyConversion.rateByCurrency[currency] ?? 0];
      }
      if (!sdMetric) {
        return [currency, 0];
      }
      const counted = countStageExitConversion(
        scoped.deals.filter(
          (deal) => (deal.currency || '').toUpperCase() === currency,
        ),
        sdMetric,
        { from: period.from, to: period.to },
      );
      return [currency, counted.rate ?? 0];
    }),
  ) as Record<string, number | null>;

  const targets = buildTargets(
    source.targets,
    openPipeline,
    period.label,
    scoped.deals,
  );
  const targetScope = resolveEffectiveTargetScope(
    filters,
    source.permissionScopeLevel,
  );
  const scopedTarget = resolveScopedTargetMoney(
    targets,
    source,
    wonRevenue,
    currencies.length ? currencies : [primary],
    filters,
  );
  const targetMoney = scopedTarget.target;
  const achievedMoney = scopedTarget.achieved;
  const remainingMoney = scopedTarget.remaining;
  const coverage = coverageRatio(
    moneyTotal(openPipeline),
    moneyTotal(remainingMoney),
  );
  const achievementPct =
    moneyTotal(targetMoney) > 0
      ? (moneyTotal(achievedMoney) / moneyTotal(targetMoney)) * 100
      : null;
  const achievementCurrencyRows = achievementByCurrency(
    targetMoney,
    achievedMoney,
    resolveScopedAnnualTargets(source.targets, targetScope),
  );
  const pipelineAchievementCurrencies = [
    ...new Set(['ETB', 'USD', ...currencies]),
  ];
  const pipelineAchievementByCurrency = qpvMetric
    ? pipelineAchievementRates(
        qualifiedPipelineValue,
        targetMoney,
        pipelineAchievementCurrencies,
      )
    : Object.fromEntries(
        pipelineAchievementCurrencies.map((currency) => [currency, null]),
      );

  const resolveOrg = ownerOrgLookup(source.orgTeams, source.ownerOrgs);
  const resolveVector = vectorLookup(source.vectors, customerVectorById);
  const catalogLookups = buildCatalogLookups(source.catalog);
  const userNameById = buildUserNameMap(
    reportLeads,
    scoped.deals,
    source.ownerOrgs,
    source.userNameById,
  );
  const stageNameById = buildStageNameById(source.catalog);
  const reportDealInactiveLostStageIds = dealInactiveLostStageIds(
    source.catalog.dealStages,
  );
  const reportLeadInactiveLostStageIds = leadInactiveLostStageIds(
    source.catalog.leadStages,
  );
  const totalPipelineCustom = filterTotalPipelineCustomFields({
    dealCustomFields: source.customFields?.dealColumns,
    leadCustomFields: source.customFields?.leadColumns,
    inactiveLostDealCustomFields: source.customFields?.inactiveLostDealColumns,
    inactiveLostLeadCustomFields: source.customFields?.inactiveLostLeadColumns,
    dealInactiveLostStageIds: reportDealInactiveLostStageIds,
    leadInactiveLostStageIds: reportLeadInactiveLostStageIds,
  });
  const inactiveOpportunityCustom = inactiveLostOnlyCustomFields({
    inactiveLostDealCustomFields: source.customFields?.inactiveLostDealColumns,
    inactiveLostLeadCustomFields: source.customFields?.inactiveLostLeadColumns,
    dealInactiveLostStageIds: reportDealInactiveLostStageIds,
    leadInactiveLostStageIds: reportLeadInactiveLostStageIds,
    dealCustomFields: source.customFields?.dealColumns,
    leadCustomFields: source.customFields?.leadColumns,
  });
  const registryCtx: RegistryBuildCtx = {
    lookups: catalogLookups,
    custom: source.customFields
      ? {
          ...source.customFields,
          dealColumns: totalPipelineCustom.dealCustomFields,
          leadColumns: totalPipelineCustom.leadCustomFields,
        }
      : undefined,
    sessions: source.sessions ?? [],
    fiscalYears: source.fiscalYears ?? [],
    currentReporting: formatCurrentReportingLabel(
      source.sessions ?? [],
      source.fiscalYears ?? [],
    ),
    userNameById,
    stageNameById,
    lastActivityAtByDealId: new Map(
      Object.entries(source.lastActivityAtByDealId ?? {}),
    ),
    lastActivityAtByLeadId: new Map(
      Object.entries(source.lastActivityAtByLeadId ?? {}),
    ),
    assignmentRoles: (source.assignmentRoles ?? []).map((role) => ({
      id: role.id,
      isPrimary: role.isPrimary,
      usageContext: role.usageContext,
    })),
  };
  const orgCounts = resolveOrgCounts(source);
  const outlookSoon = soonToClose(scoped.deals, resolveOrg);
  const outlookWon = closedWonInPeriod(scoped.deals, period, resolveOrg);
  const outlookNew = newlyAdded(
    reportLeads,
    scoped.deals,
    quarterPeriod,
    resolveVector,
  );
  const attention = buildAttention(scoped.deals, stagnationAnalytics);
  const risk = buildRisk(scoped.deals, attention);
  if (wonDeals.length && lostDeals.length === 0) {
    risk.observations.push(
      `The report shows ${wonDeals.length} closed-won ${dealUiLabel({ plural: wonDeals.length !== 1, lowercase: true })} and zero dropped/lost ${dealUiLabel({ plural: true, lowercase: true })} for the current period.`,
    );
  }
  if (dropAnalysisRows.length) {
    const topDrop = [...dropAnalysisRows].sort((a, b) => b.count - a.count)[0];
    if (topDrop) {
      const reason = topDrop.reason?.trim() || 'No reason captured';
      risk.observations.push(
        `Drop analysis: ${topDrop.count} exit${topDrop.count === 1 ? '' : 's'} to ${topDrop.stageName} (${reason}).`,
      );
    }
  }
  if (
    stagnationAnalytics?.configured &&
    stagnationAnalytics.thresholdDays != null
  ) {
    risk.observations.push(
      `${stagnationAnalytics.stuckDealCount} open ${dealUiLabel({ plural: stagnationAnalytics.stuckDealCount !== 1, lowercase: true })} stagnant for ${stagnationAnalytics.thresholdDays}+ days in the current scope.`,
    );
  }
  if (
    salesCycleAnalytics?.configured &&
    salesCycleAnalytics.averageDays != null
  ) {
    risk.observations.push(
      `Average sales cycle: ${Math.round(salesCycleAnalytics.averageDays)} days (${salesCycleAnalytics.completedCycles} completed cycle${salesCycleAnalytics.completedCycles === 1 ? '' : 's'}).`,
    );
  }
  const closed = wonDeals.length + lostDeals.length;
  const labels = filterLabels(filters, source.permissionScopeLevel);
  const filterSummary = exportFilterSummary(
    filters,
    source.permissionScopeLevel,
    source,
  );

  if (!scoped.deals.some((deal) => dealWon(deal) && closedAt(deal))) {
    omissions.push({
      id: 'close-date',
      reason: `Won close dates use the date the ${dealUiLabel({ lowercase: true })} entered the won stage when a dedicated close date is not stored.`,
    });
  }

  const registry = buildRegistry(scoped.deals, resolveOrg, registryCtx);
  const leadRegistry = isLeadsEnabled()
    ? buildLeadRegistry(reportLeads, resolveOrg, registryCtx)
    : [];
  const closedWonRegistry = buildClosedWonRegistry(
    scoped.deals,
    period,
    resolveOrg,
    registryCtx,
  );
  const pipelineRegistry = isLeadsEnabled()
    ? [...registry, ...leadRegistry].sort(comparePipelineRows)
    : [...registry].sort(comparePipelineRows);
  const inactiveDeals = scoped.deals.filter(isInactiveOpportunityDeal);
  const inactiveLeads = isLeadsEnabled()
    ? reportLeads.filter(isInactiveOpportunityLead)
    : [];
  const inactiveRegistryCtx: RegistryBuildCtx = {
    ...registryCtx,
    custom: source.customFields
      ? {
          ...source.customFields,
          dealColumns: inactiveOpportunityCustom.dealCustomFields,
          leadColumns: inactiveOpportunityCustom.leadCustomFields,
        }
      : undefined,
  };
  const inactiveOpportunitiesRegistry = [
    ...buildRegistry(inactiveDeals, resolveOrg, inactiveRegistryCtx),
    ...(isLeadsEnabled()
      ? buildLeadRegistry(inactiveLeads, resolveOrg, inactiveRegistryCtx)
      : []),
  ].sort(comparePipelineRows);

  return {
    meta: {
      title: 'Sales Pipeline Report',
      companyName: source.companyName,
      logoUrl: source.logoUrl,
      periodLabel: period.label,
      periodFrom: period.from,
      periodTo: period.to,
      generatedAt: formatDateTime(new Date().toISOString()),
      filterLabels: labels,
      filterSummary,
      scopeLabel: resolveScopeLabel(source),
      permissionScopeLevel: source.permissionScopeLevel ?? null,
      currencyLabel:
        filters.currencies.length === 1
          ? filters.currencies[0]!
          : currencies.length === 1
            ? currencies[0]!
            : 'All currencies',
      primaryCurrency: primary,
      currencies: currencies.length ? currencies : [primary],
      selectedSections: sections,
      recordCount: reportLeads.length + scoped.deals.length,
      sectionCount: sections.length,
      dealCustomFields: source.customFields?.dealColumns ?? [],
      leadCustomFields: isLeadsEnabled()
        ? (source.customFields?.leadColumns ?? [])
        : [],
      inactiveLostDealCustomFields:
        source.customFields?.inactiveLostDealColumns ?? [],
      inactiveLostLeadCustomFields: isLeadsEnabled()
        ? (source.customFields?.inactiveLostLeadColumns ?? [])
        : [],
      dealInactiveLostStageIds: reportDealInactiveLostStageIds,
      leadInactiveLostStageIds: reportLeadInactiveLostStageIds,
      assignmentRoles: source.assignmentRoles ?? [],
      selectedColumnIds: selectedColumnIds ?? [],
      reportKindLabel: reportKindLabelForScope(source),
      exportEntityLabel: exportEntityLabel(source.permissionScopeLevel),
      ...exportFiscalFieldsFromPeriod(period),
      orgCountsLabel: orgCountsLabelForScope(
        source.permissionScopeLevel,
        orgCounts,
      ),
      pipelineRowColorMode: source.pipelineRowColorMode,
      appliedTeamIds: filters.teamIds,
      departmentCount: orgCounts.departments,
      teamCount: orgCounts.teams,
      memberCount: orgCounts.members,
    },
    summary: {
      totalPipeline,
      openPipeline,
      openDeals: openDeals.length,
      wonRevenue,
      lostValue,
      winRate: null,
      winRateByCurrency,
      winRateDetail: winRateCurrencies
        .map((currency) => {
          const rate = winRateByCurrency[currency];
          return rate == null
            ? `${currency} —`
            : `${currency} ${Math.round(rate)}%`;
        })
        .join(' · '),
      totalLeads: reportLeads.length,
      totalDeals: scoped.deals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      soonToCloseCount: outlookSoon.length,
      newlyAddedCount: outlookNew.length,
      churnRate: closed > 0 ? (lostDeals.length / closed) * 100 : 0,
      target: targetMoney,
      achieved: achievedMoney,
      remaining: remainingMoney,
      achievementPct,
      achievementByCurrency: achievementCurrencyRows,
      qualifiedPipelineValue,
      pipelineAchievementByCurrency,
      pipelineAchievementConfigured: Boolean(qpvMetric),
      pipelineAchievementMetricName: qpvMetric?.metricName ?? null,
      sdConversionRate: sdConversion != null ? (sdConversion.rate ?? 0) : null,
      sdConversionRateByCurrency,
      sdConversionConfigured:
        historyConversion?.configured === true ||
        (!stageAnalyticsLoaded && Boolean(sdMetric)),
      sdConversionMetricName:
        historyConversion?.metricName ?? sdMetric?.metricName ?? null,
      sdConversionDetail: sdConversion?.detail ?? null,
      stagnationConfigured: stagnationAnalytics?.configured === true,
      stagnationThresholdDays: stagnationAnalytics?.thresholdDays ?? null,
      stagnantDealCount: stagnationAnalytics?.configured
        ? stagnationAnalytics.stuckDealCount
        : null,
      salesCycleConfigured: salesCycleAnalytics?.configured === true,
      salesCycleAverageDays: salesCycleAnalytics?.averageDays ?? null,
      salesCycleCompletedCycles: salesCycleAnalytics?.completedCycles ?? 0,
      salesCycleDetail: salesCycleAnalytics?.detail ?? null,
      coverage: coverage.value,
      coverageLabel: coverage.label,
    },
    stages: buildStages(
      reportLeads,
      scoped.deals,
      source.catalog.leadStages,
      source.catalog.dealStages,
      historyDurationByStageId,
    ),
    productPipeline: buildProductPipeline(
      reportLeads,
      scoped.deals,
      catalogLookups,
    ),
    orgUnits: visibility.orgTeams
      ? buildOrgUnits(
          reportLeads,
          scoped.deals,
          resolveOrg,
          resolveVector,
          targets,
        )
      : [],
    teams: visibility.orgTeams
      ? buildTeams(reportLeads, scoped.deals, resolveOrg, targets)
      : [],
    salesReps: visibility.salesReps
      ? buildSalesReps(
          reportLeads,
          scoped.deals,
          resolveOrg,
          source.targets?.people,
          source.orgTeams,
          source.targets?.teams,
          {
            teamIds: filters.teamIds,
            ownerOrgs: source.ownerOrgs,
            userNameById: source.userNameById,
            assignmentRoles: (source.assignmentRoles ?? []).map((role) => ({
              id: role.id,
              isPrimary: role.isPrimary,
              countsTowardTargetAchievement: role.countsTowardTargetAchievement,
            })),
            qpvStageIds,
          },
        )
      : [],
    targets,
    outlook: {
      soonToClose: outlookSoon,
      closedWon: visibility.closedWon ? outlookWon : [],
      newlyAdded: outlookNew,
    },
    concentration: visibility.concentration
      ? buildConcentration(scoped.deals, resolveVector)
      : [],
    pipelineRegistry: visibility.totalPipeline ? pipelineRegistry : [],
    inactiveOpportunitiesRegistry: visibility.inactiveOpportunities
      ? inactiveOpportunitiesRegistry
      : [],
    registry: visibility.totalPipeline ? registry : [],
    leadRegistry: visibility.totalPipeline ? leadRegistry : [],
    closedWonRegistry: visibility.closedWon ? closedWonRegistry : [],
    riskFlags: risk.flags,
    observations: risk.observations,
    attention,
    dropAnalysis: dropAnalysisRows,
    omissions,
  };
}

export function compactKpis(report: SalesPipelineReportData): ReportKpi[] {
  const { summary } = report;
  const dealWord = (count: number) =>
    dealUiLabel({ plural: count !== 1, lowercase: true });
  return [
    {
      id: 'pipeline',
      label: 'Total Pipeline',
      value: `${summary.totalDeals} ${dealWord(summary.totalDeals)}`,
      context: formatMoneyMap(summary.totalPipeline, true),
    },
    {
      id: 'won',
      label: 'Closed Won',
      value: formatMoneyMap(summary.wonRevenue, true),
      context: `${summary.wonDeals} ${dealWord(summary.wonDeals)} · ${[
        'ETB',
        'USD',
      ]
        .map((currency) => {
          const rate = summary.winRateByCurrency[currency];
          return rate == null
            ? `${currency} —`
            : `${currency} ${Math.round(rate)}%`;
        })
        .join(' · ')}`,
    },
    {
      id: 'soon',
      label: 'Soon to Close',
      value: `${summary.soonToCloseCount} ${dealWord(summary.soonToCloseCount)}`,
      context: 'Target < 30 days',
    },
    {
      id: 'new',
      label: 'Newly Added',
      value: `${summary.newlyAddedCount} record${summary.newlyAddedCount === 1 ? '' : 's'}`,
      context: 'Created in period',
    },
    {
      id: 'lost',
      label: 'Dropped / Lost',
      value: `${summary.lostDeals} ${dealWord(summary.lostDeals)}`,
      context: `${summary.churnRate == null ? '—' : `${Math.round(summary.churnRate)}% churn rate`}`,
    },
    {
      id: 'coverage',
      label: 'Quota Coverage',
      value:
        summary.coverageLabel ||
        (summary.coverage == null ? '—' : `${summary.coverage.toFixed(1)}x`),
      context: `Target: ${formatMoneyMap(summary.target, true)}`,
    },
  ];
}
