import { findRelevantCommits } from '@/components/sales-targeting/TargetOpportunityDetails';
import { snapshotMatchesCurrency } from '@/components/sales-targeting/targetCurrencyUtils';
import { isCompanyDirectTargetTeam } from '@/lib/teamTargetParent';
import type {
  CommercialTeamMember,
  ForecastOpportunityRow,
  ForecastSnapshot,
  ForecastSnapshotLine,
  SalesTargetPlan,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';

export function getInitials(name: string | null | undefined) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function teamHasDepartmentAssignment(team: {
  parentDepartmentId?: string | null;
}): boolean {
  return Boolean(team.parentDepartmentId?.trim());
}

/** Members eligible for person-level quotas (team lead target lives at team level). */
export function membersForPersonTargetDistribution(
  members: CommercialTeamMember[],
  teamLeadId?: string | null,
): CommercialTeamMember[] {
  const leadId = teamLeadId?.trim();
  if (!leadId) return members;
  return members.filter((member) => member.id?.trim() !== leadId);
}

export function companyDirectTeams(salesTeams: SalesTeam[]): SalesTeam[] {
  return salesTeams.filter((team) => isCompanyDirectTargetTeam(team));
}

export function companyDirectTeamIds(salesTeams: SalesTeam[]): Set<string> {
  return new Set(companyDirectTeams(salesTeams).map((team) => team.id));
}

/** Team picker groups: department-scoped teams by dept; company-direct under Company. */
export function buildTargetingTeamGroups(
  salesTeams: SalesTeam[],
): Array<{ label: string; options: { value: string; label: string }[] }> {
  const byDept = new Map<string, { value: string; label: string }[]>();
  for (const team of departmentScopedTeams(salesTeams)) {
    const dept = team.parentDepartmentName?.trim() || 'Other';
    const list = byDept.get(dept) ?? [];
    list.push({ value: team.id, label: team.name });
    byDept.set(dept, list);
  }
  const groups = [...byDept.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, options]) => ({
      label,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    }));
  const direct = companyDirectTeams(salesTeams);
  if (direct.length) {
    groups.unshift({
      label: 'Company',
      options: direct
        .map((team) => ({ value: team.id, label: team.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  }
  return groups;
}

export function opportunityKey(opportunityType: string, opportunityId: string) {
  return `${opportunityType}:${opportunityId}`;
}

/** One row per logical opportunity (deal / lead / custom group). */
export function dedupeForecastRowsByOpportunity(
  rows: ForecastOpportunityRow[],
): ForecastOpportunityRow[] {
  const seen = new Map<string, ForecastOpportunityRow>();
  for (const row of rows) {
    const key = opportunityKey(row.opportunityType, row.opportunityId);
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return [...seen.values()];
}

export function uniqueOpportunityCountFromRows(
  rows: ForecastOpportunityRow[],
): number {
  return dedupeForecastRowsByOpportunity(rows).length;
}

export function sumUniqueOpportunityForecastValue(
  rows: ForecastOpportunityRow[],
): number {
  return (
    Math.round(
      dedupeForecastRowsByOpportunity(rows).reduce(
        (sum, row) => sum + (Number(row.forecastValue) || 0),
        0,
      ) * 100,
    ) / 100
  );
}

export function countUniqueSnapshotOpportunities(
  lines: Array<{ opportunityType: string; opportunityId: string }>,
): number {
  const keys = new Set<string>();
  for (const line of lines) {
    if (!line.opportunityId?.trim()) continue;
    keys.add(opportunityKey(line.opportunityType, line.opportunityId));
  }
  return keys.size;
}

/**
 * TTB department Details: read the department-scoped forecast snapshot
 * (one attributed row per opportunity), written by backend seating.
 */
export function rowsForTtbDepartmentFromDepartmentCommit(input: {
  plan: SalesTargetPlan | null | undefined;
  departmentId: string;
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string;
  currencyCode: string;
}): ForecastOpportunityRow[] {
  const commit =
    input.horizon === 'annual'
      ? findLatestDepartmentAnnualCommit(
          input.plan,
          input.departmentId,
          input.currencyId,
        )
      : input.sessionId
        ? findLatestDepartmentSessionCommit(
            input.plan,
            input.sessionId,
            input.departmentId,
            input.currencyId,
          )
        : undefined;
  return dedupeForecastRowsByOpportunity(
    (commit?.lines ?? []).map((line) =>
      snapshotLineToForecastRow(line, input.currencyCode),
    ),
  );
}

/** @deprecated Use rowsForTtbDepartmentFromDepartmentCommit; dedupes team lines for legacy data. */
export function rowsForTtbDepartmentFromTeamCommits(input: {
  plan: SalesTargetPlan | null | undefined;
  deptTeams: SalesTeam[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string;
  currencyCode: string;
}): ForecastOpportunityRow[] {
  const rows: ForecastOpportunityRow[] = [];
  for (const team of input.deptTeams) {
    const commit =
      input.horizon === 'annual'
        ? findLatestTeamAnnualCommit(input.plan, team.id, input.currencyId)
        : input.sessionId
          ? findLatestTeamSessionCommit(
              input.plan,
              input.sessionId,
              team.id,
              input.currencyId,
            )
          : undefined;
    for (const line of commit?.lines ?? []) {
      rows.push({
        ...snapshotLineToForecastRow(line, input.currencyCode),
        salesTeamId: line.salesTeamId ?? team.id,
      });
    }
  }
  return dedupeForecastRowsByOpportunity(rows);
}

/** TTB team Details / edit pool from the team commit snapshot. */
export function rowsForTtbTeamFromTeamCommit(input: {
  plan: SalesTargetPlan | null | undefined;
  team: SalesTeam;
  companyPoolRows: ForecastOpportunityRow[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string;
  currencyCode: string;
}): ForecastOpportunityRow[] {
  if (isCompanyDirectTargetTeam(input.team)) {
    return filterCompanyPoolRowsForTeam(input.companyPoolRows, input.team);
  }
  const commit =
    input.horizon === 'annual'
      ? findLatestTeamAnnualCommit(input.plan, input.team.id, input.currencyId)
      : input.sessionId
        ? findLatestTeamSessionCommit(
            input.plan,
            input.sessionId,
            input.team.id,
            input.currencyId,
          )
        : undefined;
  return dedupeForecastRowsByOpportunity(
    (commit?.lines ?? []).map((line) => ({
      ...snapshotLineToForecastRow(line, input.currencyCode),
      salesTeamId: line.salesTeamId ?? input.team.id,
    })),
  );
}

export function departmentScopedTeams(salesTeams: SalesTeam[]): SalesTeam[] {
  return salesTeams.filter((team) => !isCompanyDirectTargetTeam(team));
}

export function teamsForDepartment(salesTeams: SalesTeam[], deptName: string) {
  const scoped = departmentScopedTeams(salesTeams);
  return scoped.filter((team) => team.parentDepartmentName === deptName);
}

/** People tab: include company-direct teams that belong to the department. */
export function teamsForDepartmentPeopleTab(
  salesTeams: SalesTeam[],
  deptName: string,
) {
  return salesTeams.filter((team) => team.parentDepartmentName === deptName);
}

/** One row per opportunity this team is credited for, using that team's amount. */
export function rowsForTeam(
  rows: ForecastOpportunityRow[],
  teamId: string,
): ForecastOpportunityRow[] {
  const matched: ForecastOpportunityRow[] = [];
  for (const row of rows) {
    if (row.teamCredits) {
      const credit = row.teamCredits.find(
        (item) => item.salesTeamId === teamId,
      );
      if (!credit || credit.amount <= 0) continue;
      matched.push({
        ...row,
        salesTeamId: teamId,
        forecastValue: credit.amount,
        opportunityValue: credit.amount,
      });
      continue;
    }
    if (row.salesTeamId === teamId) matched.push(row);
  }
  return matched;
}

/**
 * One row per opportunity this department is credited for.
 * The amount is the department credit, not the sum of its teams.
 */
export function rowsForDepartment(
  rows: ForecastOpportunityRow[],
  departmentId: string,
  fallbackTeamIds?: Set<string>,
): ForecastOpportunityRow[] {
  const hasCredits = rows.some((row) => row.departmentCredits);
  if (!hasCredits) {
    if (!fallbackTeamIds) return [];
    return rows.filter(
      (row) =>
        Boolean(row.salesTeamId) &&
        fallbackTeamIds.has(row.salesTeamId as string),
    );
  }
  const matched: ForecastOpportunityRow[] = [];
  for (const row of rows) {
    const credit = row.departmentCredits?.find(
      (item) => item.departmentId === departmentId,
    );
    if (!credit || credit.amount <= 0) continue;
    matched.push({
      ...row,
      forecastValue: credit.amount,
      opportunityValue: credit.amount,
    });
  }
  return matched;
}

/** Company-direct team pool: only this team's opportunities, not the rest of its department. */
export function filterCompanyPoolRowsForTeam(
  companyPoolRows: ForecastOpportunityRow[],
  team: SalesTeam,
): ForecastOpportunityRow[] {
  return rowsForTeam(companyPoolRows, team.id);
}

export function snapshotLineToForecastRow(
  line: ForecastSnapshotLine,
  currency: string,
): ForecastOpportunityRow {
  return {
    opportunityType: line.opportunityType,
    opportunityId: line.opportunityId,
    opportunityName: line.opportunityName,
    customerId: line.customerId,
    customerName: line.customerName,
    ownerId: line.ownerId,
    ownerName: line.ownerName,
    stageId: line.stageId,
    stageName: line.stageName,
    stageCategory: null,
    forecastCategory: null,
    salesTeamId: line.salesTeamId,
    department: line.department,
    opportunityValue: Number(line.opportunityValue) || 0,
    probability: Number(line.probability) || 0,
    forecastValue: Number(line.forecastValue) || 0,
    expectedCloseDate: line.expectedCloseDate,
    currency,
    status: line.opportunityType === 'custom' ? 'custom' : 'open',
    sessionId: line.sessionId ?? null,
  };
}

export function findLatestTeamAnnualCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  teamId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'annual',
    teamId,
    currencyId,
  }).find(
    (snap) =>
      snap.orgUnitId === teamId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

export function findLatestTeamSessionCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  teamId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'session',
    sessionId,
    teamId,
    currencyId,
  }).find(
    (snap) =>
      snap.orgUnitId === teamId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

export function findLatestPersonSessionCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  teamId: string,
  userId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'session',
    sessionId,
    teamId,
    userId,
    currencyId,
  }).find(
    (snap) =>
      snap.orgUnitId === teamId &&
      snap.userId === userId &&
      (snap.scopeLevel === 'person' || Boolean(snap.userId)) &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

export function findLatestCompanyAnnualCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'annual',
    companyOnly: true,
    currencyId,
  }).find(
    (snap) =>
      !snap.orgUnitId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

export function findLatestCompanySessionCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'session',
    sessionId,
    companyOnly: true,
    currencyId,
  }).find(
    (snap) =>
      !snap.orgUnitId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

/** Stable org unit id for a department commit (parent department id). */
export function departmentOrgUnitId(
  deptTeams: SalesTeam[],
  deptName: string,
): string {
  const withParent = deptTeams.find((team) => team.parentDepartmentId?.trim());
  if (withParent?.parentDepartmentId?.trim()) {
    return withParent.parentDepartmentId.trim();
  }
  return `name:${deptName.trim().toLowerCase()}`;
}

export function findLatestDepartmentAnnualCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  departmentId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'annual',
    currencyId,
  }).find(
    (snap) =>
      snap.scopeLevel === 'department' &&
      snap.orgUnitId === departmentId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

export function findLatestDepartmentSessionCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  departmentId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'session',
    sessionId,
    currencyId,
  }).find(
    (snap) =>
      snap.scopeLevel === 'department' &&
      snap.orgUnitId === departmentId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

/** TTB company Details: per-department rollup rows (unique opps per dept). */
export function buildTtbDepartmentRollupRowsByLabel(input: {
  plan: SalesTargetPlan | null | undefined;
  teamGroups: Array<{
    label: string;
    options: { value: string; label: string }[];
  }>;
  salesTeams: SalesTeam[];
  companyPoolRows: ForecastOpportunityRow[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string;
  currencyCode: string;
}): Map<string, ForecastOpportunityRow[]> {
  const map = new Map<string, ForecastOpportunityRow[]>();
  for (const group of input.teamGroups) {
    if (group.label === 'Company') {
      const teamIds = new Set(group.options.map((option) => option.value));
      map.set(
        group.label,
        dedupeForecastRowsByOpportunity(
          input.companyPoolRows.filter(
            (row) => row.salesTeamId && teamIds.has(row.salesTeamId),
          ),
        ),
      );
      continue;
    }
    const deptTeams = teamsForDepartment(input.salesTeams, group.label);
    if (!deptTeams.length) continue;
    map.set(
      group.label,
      rowsForTtbDepartmentFromDepartmentCommit({
        plan: input.plan,
        departmentId: departmentOrgUnitId(deptTeams, group.label),
        horizon: input.horizon,
        sessionId: input.sessionId,
        currencyId: input.currencyId,
        currencyCode: input.currencyCode,
      }),
    );
  }
  return map;
}

export function getCompanySessionTarget(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  sessionId: string,
): number {
  const row = plan?.allocations?.find(
    (a) =>
      a.planCurrencyId === planCurrencyId &&
      a.sessionId === sessionId &&
      a.level === 'company' &&
      !a.orgDepartmentId &&
      !a.userId,
  );
  const fromAlloc = Number(row?.amount ?? 0);
  const currencyId = plan?.currencyTargets?.find(
    (line) => line.id === planCurrencyId,
  )?.currencyId;
  const commit = findLatestCompanySessionCommit(plan, sessionId, currencyId);
  return resolveCompanyAnnualAmount(fromAlloc, commit);
}

export function getTeamSessionTarget(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  sessionId: string,
  teamId: string,
): number {
  const row = plan?.allocations?.find(
    (a) =>
      a.planCurrencyId === planCurrencyId &&
      a.sessionId === sessionId &&
      a.orgDepartmentId === teamId &&
      a.level === 'team' &&
      !a.userId,
  );
  return Number(row?.amount ?? 0);
}

/** Company period pool only — no team-union fallback that mixes other scopes. */
export function buildSessionPoolLines(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  currencyId?: string,
): ForecastSnapshotLine[] {
  const companyCommit = findLatestCompanySessionCommit(
    plan,
    sessionId,
    currencyId,
  );
  return companyCommit?.lines ?? [];
}

/**
 * Opportunity pool for a team's period target (People tab).
 * Uses the last saved team session commit (frozen until team re-saves).
 */
export function buildTeamPeriodPoolLines(
  plan: Parameters<typeof findRelevantCommits>[0],
  sessionId: string,
  teamId: string,
  currencyId?: string,
): ForecastSnapshotLine[] {
  return (
    findLatestTeamSessionCommit(plan, sessionId, teamId, currencyId)?.lines ??
    []
  );
}

export function sessionTargetSourceBadge(
  hasCompanySessionTarget: boolean,
  hasTeamSessionCommits: boolean,
): { label: string; className: string } | null {
  if (!hasCompanySessionTarget && !hasTeamSessionCommits) {
    return { label: 'Not set', className: 'bg-muted text-muted-foreground' };
  }
  if (hasTeamSessionCommits) {
    return { label: 'From forecast', className: 'bg-brand-muted text-brand' };
  }
  return { label: 'Manual', className: 'bg-muted text-muted-foreground' };
}

export function companyTargetSourceBadge(
  commit: ForecastSnapshot | undefined,
  hasTarget: boolean,
  options?: {
    targetSettingMethod?: string | null;
    targetBasis?: 'official' | 'none' | 'top_down' | null;
  },
): { label: string; className: string } | null {
  const method = options?.targetSettingMethod ?? '';
  if (method === 'HYBRID') {
    const basis = options?.targetBasis;
    if (basis === 'official') {
      return {
        label: 'Official',
        className: 'bg-brand-muted text-brand',
      };
    }
    if (hasTarget) {
      return {
        label: 'Strategic',
        className: 'bg-brand-muted text-brand',
      };
    }
    return { label: 'Not set', className: 'bg-muted text-muted-foreground' };
  }
  if (options?.targetBasis) {
    const basis = options?.targetBasis;
    if (basis === 'official') {
      return {
        label: 'Official',
        className: 'bg-brand-muted text-brand',
      };
    }
    if (basis === 'none') {
      return {
        label: 'Proposed only',
        className: 'bg-muted text-muted-foreground',
      };
    }
  }
  // Amount / selection wins over a leftover empty commit row.
  if (!hasTarget) {
    return { label: 'Not set', className: 'bg-muted text-muted-foreground' };
  }
  if (!commit) return null;
  if (
    commit.sourceType === 'forecast' ||
    commit.sourceType === 'edited_forecast'
  ) {
    return {
      label: 'From forecast',
      className: 'bg-brand-muted text-brand',
    };
  }
  if (commit.sourceType === 'manual') {
    return {
      label: 'Manual entry',
      className: 'bg-muted text-muted-foreground',
    };
  }
  return null;
}

/** Sum of forecast values on commit lines (heals display if amount fields are 0). */
export function commitLinesForecastTotal(
  commit: ForecastSnapshot | null | undefined,
): number {
  if (!commit?.lines?.length) return 0;
  const sum = commit.lines.reduce(
    (total, line) => total + (Number(line.forecastValue) || 0),
    0,
  );
  return Math.round(sum * 100) / 100;
}

/**
 * Company annual display amount: prefer the latest company commit, and if
 * `committedAmount` is 0 but lines still have forecast value, use the line sum
 * so the header / editor match "Opportunities used".
 */
export function resolveCompanyAnnualAmount(
  planCurrencyAnnual: number,
  commit: ForecastSnapshot | null | undefined,
): number {
  const fromCurrency =
    Math.round((Number(planCurrencyAnnual) || 0) * 100) / 100;
  if (!commit) return fromCurrency;
  const committed =
    Math.round((Number(commit.committedAmount) || 0) * 100) / 100;
  if (committed > 0) return committed;
  const fromLines = commitLinesForecastTotal(commit);
  if (fromLines > 0) return fromLines;
  return fromCurrency;
}
