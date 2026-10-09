import { isCompanyDirectTargetTeam } from '@/lib/teamTargetParent';
import {
  resolveCompanyAnnualAmount,
  findLatestCompanyAnnualCommit,
  findLatestDepartmentAnnualCommit,
  findLatestDepartmentSessionCommit,
  findLatestTeamAnnualCommit,
  findLatestTeamSessionCommit,
  getCompanySessionTarget,
} from '@/components/sales-targeting/targetingSectionHelpers';
import { resolveTargetCurrencyId } from '@/components/sales-targeting/targetCurrencyUtils';
import type {
  SalesTargetPlan,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';

export type TargetSettingLevel = 'department' | 'team' | 'person';

export type TargetSettingGuardInput = {
  plan: SalesTargetPlan | null | undefined;
  planCurrencyId: string;
  currencyId: string;
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  orgUnitId?: string;
  userId?: string;
  level: TargetSettingLevel;
  salesTeams: SalesTeam[];
  departmentNameById?: Map<string, string>;
  teamNameById?: Map<string, string>;
  /** Display label for messages, e.g. ETB or USD. */
  currencyLabel?: string;
};

function normalizeGuardInput(
  input: TargetSettingGuardInput,
): TargetSettingGuardInput {
  const currencyId = resolveTargetCurrencyId(
    input.plan,
    input.planCurrencyId,
    input.currencyId,
  );
  return { ...input, currencyId };
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function commitAmount(
  committedAmount: number | undefined,
  lines?: Array<{ forecastValue?: number | null }>,
): number {
  const committed = roundAmount(Number(committedAmount) || 0);
  if (committed > 0) return committed;
  const lineSum = (lines ?? []).reduce(
    (sum, line) => sum + (Number(line.forecastValue) || 0),
    0,
  );
  return roundAmount(lineSum);
}

export function hasCompanyAnnualTarget(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  currencyId: string,
  planCurrencyAnnual?: number,
): boolean {
  if (!plan) return false;
  const resolvedCurrencyId = resolveTargetCurrencyId(
    plan,
    planCurrencyId,
    currencyId,
  );
  const lineAnnual =
    planCurrencyAnnual ??
    Number(
      plan.currencyTargets?.find((line) => line.id === planCurrencyId)
        ?.annualAmount ?? 0,
    );
  if (!resolvedCurrencyId) {
    return roundAmount(lineAnnual) > 0;
  }
  return (
    resolveCompanyAnnualAmount(
      lineAnnual,
      findLatestCompanyAnnualCommit(plan, resolvedCurrencyId),
    ) > 0
  );
}

export function hasCompanySessionTarget(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  sessionId: string,
): boolean {
  if (!plan) return false;
  return getCompanySessionTarget(plan, planCurrencyId, sessionId) > 0;
}

export function hasDepartmentAnnualTarget(
  plan: SalesTargetPlan | null | undefined,
  departmentId: string,
  currencyId: string,
): boolean {
  if (!plan) return false;
  const commit = findLatestDepartmentAnnualCommit(
    plan,
    departmentId,
    currencyId,
  );
  return commitAmount(commit?.committedAmount, commit?.lines) > 0;
}

export function hasDepartmentSessionTarget(
  plan: SalesTargetPlan | null | undefined,
  departmentId: string,
  sessionId: string,
  currencyId: string,
): boolean {
  if (!plan) return false;
  const commit = findLatestDepartmentSessionCommit(
    plan,
    sessionId,
    departmentId,
    currencyId,
  );
  return commitAmount(commit?.committedAmount, commit?.lines) > 0;
}

export function hasTeamAnnualTarget(
  plan: SalesTargetPlan | null | undefined,
  teamId: string,
  currencyId: string,
  planCurrencyId: string,
): boolean {
  if (!plan) return false;
  const fromAllocation = roundAmount(
    Number(
      plan.allocations?.find(
        (row) =>
          row.planCurrencyId === planCurrencyId &&
          row.orgDepartmentId === teamId &&
          row.level === 'team' &&
          !row.sessionId &&
          !row.userId,
      )?.amount ?? 0,
    ),
  );
  if (fromAllocation > 0) return true;
  const resolvedCurrencyId = resolveTargetCurrencyId(
    plan,
    planCurrencyId,
    currencyId,
  );
  if (!resolvedCurrencyId) return false;
  const commit = findLatestTeamAnnualCommit(plan, teamId, resolvedCurrencyId);
  return commitAmount(commit?.committedAmount, commit?.lines) > 0;
}

export function hasTeamSessionTarget(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  teamId: string,
  sessionId: string,
  currencyId: string,
): boolean {
  if (!plan) return false;
  const fromAllocation = roundAmount(
    Number(
      plan.allocations?.find(
        (row) =>
          row.planCurrencyId === planCurrencyId &&
          row.sessionId === sessionId &&
          row.orgDepartmentId === teamId &&
          row.level === 'team' &&
          !row.userId,
      )?.amount ?? 0,
    ),
  );
  if (fromAllocation > 0) return true;
  const resolvedCurrencyId = resolveTargetCurrencyId(
    plan,
    planCurrencyId,
    currencyId,
  );
  if (!resolvedCurrencyId) return false;
  const commit = findLatestTeamSessionCommit(
    plan,
    sessionId,
    teamId,
    resolvedCurrencyId,
  );
  return commitAmount(commit?.committedAmount, commit?.lines) > 0;
}

/** Returns a user-facing reason when target entry should be blocked, or null when allowed. */
export function getTargetBlockReason(
  input: TargetSettingGuardInput,
): string | null {
  input = normalizeGuardInput(input);
  if (!input.plan) return 'No target plan is available yet';

  if (input.level === 'department') {
    if (!input.orgUnitId) return 'Department is required';
    if (input.horizon === 'annual') {
      if (
        !hasCompanyAnnualTarget(
          input.plan,
          input.planCurrencyId,
          input.currencyId,
        )
      ) {
        return 'Set the company annual target before setting a department target';
      }
    } else if (!input.sessionId) {
      return 'Select a period first';
    } else if (
      !hasCompanySessionTarget(
        input.plan,
        input.planCurrencyId,
        input.sessionId,
      )
    ) {
      return 'Set the company period target before setting a department target';
    }
    return null;
  }

  if (input.level === 'team') {
    if (!input.orgUnitId) return 'Team is required';
    const team = input.salesTeams.find((row) => row.id === input.orgUnitId);
    const departmentId = team?.parentDepartmentId?.trim();
    if (!departmentId) {
      return 'Assign this team to a department before setting a team target';
    }

    const companyDirect = team ? isCompanyDirectTargetTeam(team) : false;

    if (input.horizon === 'annual') {
      if (
        !hasCompanyAnnualTarget(
          input.plan,
          input.planCurrencyId,
          input.currencyId,
        )
      ) {
        return 'Set the company annual target before setting a team target';
      }
      if (
        !companyDirect &&
        !hasDepartmentAnnualTarget(input.plan, departmentId, input.currencyId)
      ) {
        return `Set the department annual target for ${team?.parentDepartmentName?.trim() || 'this department'} before setting a team target`;
      }
    } else if (!input.sessionId) {
      return 'Select a period first';
    } else {
      if (
        !hasCompanySessionTarget(
          input.plan,
          input.planCurrencyId,
          input.sessionId,
        )
      ) {
        return 'Set the company period target before setting a team target';
      }
      if (
        !companyDirect &&
        !hasDepartmentSessionTarget(
          input.plan,
          departmentId,
          input.sessionId,
          input.currencyId,
        )
      ) {
        return `Set the department period target for ${team?.parentDepartmentName?.trim() || 'this department'} before setting a team target`;
      }
    }
    return null;
  }

  if (input.level === 'person') {
    if (!input.orgUnitId || !input.userId) return 'Person is required';
    if (!input.sessionId) return 'Select a period first';
    if (
      !hasCompanySessionTarget(
        input.plan,
        input.planCurrencyId,
        input.sessionId,
      )
    ) {
      return 'Set the company period target before setting a person target';
    }
    const team = input.salesTeams.find((row) => row.id === input.orgUnitId);
    const departmentId = team?.parentDepartmentId?.trim();
    if (
      departmentId &&
      team &&
      !isCompanyDirectTargetTeam(team) &&
      !hasDepartmentSessionTarget(
        input.plan,
        departmentId,
        input.sessionId,
        input.currencyId,
      )
    ) {
      return `Set the department period target for ${team?.parentDepartmentName?.trim() || 'this department'} before setting a person target`;
    }
    if (
      !hasTeamSessionTarget(
        input.plan,
        input.planCurrencyId,
        input.orgUnitId,
        input.sessionId,
        input.currencyId,
      )
    ) {
      return `Set the team period target for ${team?.name?.trim() || 'this team'} before setting a person target`;
    }
    return null;
  }

  return null;
}

/** @deprecated Use getTargetBlockReason */
export const getManualTargetBlockReason = getTargetBlockReason;

export function buildDepartmentNameById(
  salesTeams: SalesTeam[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of salesTeams) {
    const id = team.parentDepartmentId?.trim();
    const name = team.parentDepartmentName?.trim();
    if (id && name) map.set(id, name);
  }
  return map;
}

export function buildTeamNameById(
  salesTeams: SalesTeam[],
): Map<string, string> {
  return new Map(salesTeams.map((team) => [team.id, team.name.trim()]));
}
