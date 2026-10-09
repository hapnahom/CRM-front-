import type {
  LeadQuarter,
  LeadQuarterTarget,
  SalesTeamAllocation,
} from '@/components/sales-targeting/targetingUtils';
import {
  emptyQuarterlyTargets,
  quarterForSessionId,
  sessionIdForQuarter,
} from '@/components/sales-targeting/targetingUtils';
import { formatUserName } from '@/lib/format-user-name';
import {
  formatOrgFiscalYearLabel,
  resolveActiveOrgSessionId,
} from '@/lib/orgFiscalSettings';
import type {
  OrgFiscalSession,
  PlanCurrency,
  PlanProgressSummary,
  SalesTargetAllocation,
  SalesTargetPlan,
  SalesTeam,
} from './types';

export function getCurrencyCode(planCurrency: PlanCurrency): string {
  const name = planCurrency.currency?.name?.trim();
  if (name) return name;
  const description = planCurrency.currency?.description?.trim();
  if (description) return description;
  const raw = planCurrency.currencyId;
  if (/^[0-9a-f-]{36}$/i.test(raw)) return 'Currency';
  return raw;
}

export function getTeamAnnualAllocation(
  plan: SalesTargetPlan,
  planCurrencyId: string,
  teamId: string,
): SalesTargetAllocation | undefined {
  return (plan.allocations ?? []).find(
    (a) =>
      a.planCurrencyId === planCurrencyId &&
      a.orgDepartmentId === teamId &&
      a.sessionId == null,
  );
}

export function getTeamSessionAllocations(
  plan: SalesTargetPlan,
  planCurrencyId: string,
  teamId: string,
): SalesTargetAllocation[] {
  return (plan.allocations ?? []).filter(
    (a) =>
      a.planCurrencyId === planCurrencyId &&
      a.orgDepartmentId === teamId &&
      a.sessionId != null,
  );
}

export function teamAnnualAmount(
  plan: SalesTargetPlan,
  planCurrencyId: string,
  teamId: string,
): number {
  return Number(
    getTeamAnnualAllocation(plan, planCurrencyId, teamId)?.amount ?? 0,
  );
}

export function allocationsToQuarters(
  sessions: OrgFiscalSession[],
  allocations: SalesTargetAllocation[],
): LeadQuarterTarget[] {
  const quarters = emptyQuarterlyTargets();
  for (const allocation of allocations) {
    if (!allocation.sessionId) continue;
    const q = quarterForSessionId(sessions, allocation.sessionId);
    if (!q) continue;
    const row = quarters.find((r) => r.q === q);
    if (row) row.target = Number(allocation.amount);
  }
  return quarters;
}

function prorateAnnualIntoQuarters(
  annual: number,
  sessions: OrgFiscalSession[],
): LeadQuarterTarget[] {
  const quarters = emptyQuarterlyTargets();
  if (annual <= 0 || sessions.length === 0) return quarters;

  const perSession = Math.floor(annual / sessions.length);
  let remainder = annual;
  sessions.forEach((session, index) => {
    const q = quarterForSessionId(sessions, session.id);
    if (!q) return;
    const value = index === sessions.length - 1 ? remainder : perSession;
    remainder -= value;
    const row = quarters.find((r) => r.q === q);
    if (row) row.target = value;
  });
  return quarters;
}

export function buildTeamAllocationsForCurrency(
  plan: SalesTargetPlan,
  planCurrency: PlanCurrency,
  salesTeams: SalesTeam[],
  sessions: OrgFiscalSession[],
): SalesTeamAllocation[] {
  return salesTeams.map((team) => {
    const sessionAllocations = getTeamSessionAllocations(
      plan,
      planCurrency.id,
      team.id,
    );
    const annual = teamAnnualAmount(plan, planCurrency.id, team.id);
    const quarters = prorateAnnualIntoQuarters(annual, sessions);

    for (const allocation of sessionAllocations) {
      if (!allocation.sessionId) continue;
      const q = quarterForSessionId(sessions, allocation.sessionId);
      if (!q) continue;
      const row = quarters.find((r) => r.q === q);
      if (row) row.target = Number(allocation.amount);
    }

    return {
      teamId: team.id,
      teamName: team.name,
      quarters,
    };
  });
}

/** Quarterly target for one team/currency — uses session splits or annual proration (same as Targets UI). */
export function getTeamQuarterTargetAmount(
  plan: SalesTargetPlan,
  planCurrency: PlanCurrency,
  teamId: string,
  sessions: OrgFiscalSession[],
  activeQuarter: LeadQuarter,
): number {
  const [allocation] = buildTeamAllocationsForCurrency(
    plan,
    planCurrency,
    [
      {
        id: teamId,
        name: '',
        parentDepartmentId: '',
        parentDepartmentName: 'Sales',
      },
    ],
    sessions,
  );
  return (
    allocation?.quarters.find((row) => row.q === activeQuarter)?.target ?? 0
  );
}

export function listTeamsWithQuarterTargets(
  plan: SalesTargetPlan,
  salesTeams: SalesTeam[],
  sessions: OrgFiscalSession[],
  activeQuarter: LeadQuarter,
  progress: PlanProgressSummary[] = [],
): { teamId: string; teamName: string }[] {
  const teamNames = new Map<string, string>();
  for (const team of salesTeams) {
    teamNames.set(team.id, team.name);
  }
  for (const summary of progress) {
    for (const team of summary.teams) {
      if (!teamNames.has(team.teamId)) {
        teamNames.set(team.teamId, team.teamName);
      }
    }
  }

  const candidateIds = salesTeams.length
    ? salesTeams.map((team) => team.id)
    : [...teamNames.keys()];

  const qualifying: { teamId: string; teamName: string }[] = [];
  for (const teamId of candidateIds) {
    const hasTarget = plan.currencyTargets.some(
      (line) =>
        getTeamQuarterTargetAmount(
          plan,
          line,
          teamId,
          sessions,
          activeQuarter,
        ) > 0,
    );
    const hasAchieved = progress.some((summary) =>
      summary.teams.some(
        (team) => team.teamId === teamId && team.achievedAmount > 0,
      ),
    );
    if (hasTarget || hasAchieved) {
      qualifying.push({
        teamId,
        teamName: teamNames.get(teamId) ?? 'Team',
      });
    }
  }

  return qualifying.sort((left, right) =>
    left.teamName.localeCompare(right.teamName),
  );
}

export function quartersToSessionAllocations(
  sessions: OrgFiscalSession[],
  planCurrencyId: string,
  quarters: LeadQuarterTarget[],
): { planCurrencyId: string; sessionId: string; amount: number }[] {
  const items: { planCurrencyId: string; sessionId: string; amount: number }[] =
    [];
  for (const q of quarters) {
    const sessionId = sessionIdForQuarter(sessions, q.q);
    if (!sessionId) continue;
    items.push({
      planCurrencyId,
      sessionId,
      amount: q.target,
    });
  }
  return items;
}

export function getDistributedTeamAnnualTotal(
  plan: SalesTargetPlan,
  planCurrencyId: string,
  salesTeams: SalesTeam[],
): number {
  return salesTeams.reduce(
    (sum, team) => sum + teamAnnualAmount(plan, planCurrencyId, team.id),
    0,
  );
}

export function memberDisplayName(member: {
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  email?: string;
}): string {
  return formatUserName(member, member.email ?? 'Unknown');
}

export function fiscalYearLabel(
  calendar?:
    | { name?: string; startDate?: string; endDate?: string }
    | null
    | string,
): string {
  if (!calendar || typeof calendar === 'string') {
    return `FY ${new Date().getFullYear()}`;
  }
  const label = formatOrgFiscalYearLabel(
    calendar.startDate || calendar.endDate ? calendar : null,
  );
  return label === 'FY' ? `FY ${new Date().getFullYear()}` : label;
}

export function isPlanLocked(plan?: SalesTargetPlan | null): boolean {
  return plan?.status === 'locked' || plan?.status === 'archived';
}

export function isPlanEditable(plan?: SalesTargetPlan | null): boolean {
  if (!plan) return true;
  return plan.status !== 'locked' && plan.status !== 'archived';
}

export interface PlanCurrencyRemovalImpact {
  currencyCode: string;
  isPersisted: boolean;
  companyAnnualTarget: number;
  teamAnnualAllocationCount: number;
  sessionAllocationCount: number;
  hasConfiguredTargets: boolean;
}

export function getPlanCurrencyRemovalImpact(
  plan: SalesTargetPlan | null | undefined,
  planCurrencyId: string,
  currencyCode: string,
): PlanCurrencyRemovalImpact {
  if (!plan) {
    return {
      currencyCode,
      isPersisted: false,
      companyAnnualTarget: 0,
      teamAnnualAllocationCount: 0,
      sessionAllocationCount: 0,
      hasConfiguredTargets: false,
    };
  }

  const currencyTarget = plan.currencyTargets.find(
    (entry) => entry.id === planCurrencyId,
  );
  const companyAnnualTarget = Number(currencyTarget?.annualAmount ?? 0);
  const allocations = (plan.allocations ?? []).filter(
    (allocation) => allocation.planCurrencyId === planCurrencyId,
  );
  const teamAnnualAllocationCount = allocations.filter(
    (allocation) => allocation.sessionId == null,
  ).length;
  const sessionAllocationCount = allocations.filter(
    (allocation) => allocation.sessionId != null,
  ).length;
  const hasConfiguredTargets =
    companyAnnualTarget > 0 ||
    teamAnnualAllocationCount > 0 ||
    sessionAllocationCount > 0;

  return {
    currencyCode,
    isPersisted: true,
    companyAnnualTarget,
    teamAnnualAllocationCount,
    sessionAllocationCount,
    hasConfiguredTargets,
  };
}

export function getActiveQuarterFromSessions(
  sessions: OrgFiscalSession[],
  calendar?: { id: string; name: string; startDate: string; endDate: string },
): LeadQuarter {
  if (!sessions.length) return 1;
  const sessionId = resolveActiveOrgSessionId(
    calendar
      ? { ...calendar, sessions, isActive: true }
      : { id: '', name: '', startDate: '', endDate: '', sessions },
  );
  if (sessionId) {
    const quarter = quarterForSessionId(sessions, sessionId);
    if (quarter) return quarter;
  }
  return 1;
}
