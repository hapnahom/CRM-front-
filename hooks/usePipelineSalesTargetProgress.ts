'use client';

import { useMemo } from 'react';
import { canViewCompanyTargets } from '@/utils/dataScope';
import {
  fiscalYearLabel,
  getActiveQuarterFromSessions,
  getTeamQuarterTargetAmount,
  listTeamsWithQuarterTargets,
} from '@/store/server/features/salesTargeting/mappers';
import {
  useGetFiscalSessions,
  useGetMyTeamPlanProgress,
  useGetMyTeamSalesTargetPlan,
  useGetPlanProgress,
  useGetSalesTargetPlan,
  useGetSalesTargetPlans,
  useGetSalesTargetingSettings,
  useGetSalesTeams,
} from '@/store/server/features/salesTargeting/queries';
import type {
  OrgFiscalSession,
  PlanProgressSummary,
  SalesTargetPlan,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';
import {
  computeLeadTargetPct,
  sessionIdForQuarter,
  type LeadQuarter,
} from '@/components/sales-targeting/targetingUtils';
import { useGetTenantCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { useOrgFiscalSettings } from '@/providers/OrgFiscalSettingsProvider';

export type PipelineKpiCurrencyRow = {
  currency: string;
  target: number;
  achieved: number;
  pct: number;
  remaining: number;
};

export type PipelineKpiTeamTile = {
  teamId: string;
  teamName: string;
  rows: PipelineKpiCurrencyRow[];
  overallPct: number;
};

export type PipelineSalesTargetKpi = {
  q: LeadQuarter;
  fiscalYear: string;
  overall: PipelineKpiTeamTile;
  teams: PipelineKpiTeamTile[];
};

function sortCurrencyRows(rows: PipelineKpiCurrencyRow[]) {
  return [...rows].sort((a, b) => {
    if (a.currency === 'ETB') return -1;
    if (b.currency === 'ETB') return 1;
    return a.currency.localeCompare(b.currency);
  });
}

function overallPctFromRows(rows: PipelineKpiCurrencyRow[]) {
  const totalTarget = rows.reduce((sum, row) => sum + row.target, 0);
  const totalAchieved = rows.reduce((sum, row) => sum + row.achieved, 0);
  return computeLeadTargetPct(totalAchieved, totalTarget);
}

function currencyCodeById(
  currencyId: string,
  currencyById: Map<string, { name?: string; description?: string }>,
): string {
  const currency = currencyById.get(currencyId);
  const name = currency?.name?.trim();
  if (name) return name;
  const description = currency?.description?.trim();
  if (description) return description;
  return currencyId;
}

function mergeProgressWithPlanCurrencies(
  progress: PlanProgressSummary[],
  plan: SalesTargetPlan | null | undefined,
): PlanProgressSummary[] {
  if (!plan?.currencyTargets?.length) return progress;

  const byCurrencyId = new Map(progress.map((row) => [row.currencyId, row]));
  for (const line of plan.currencyTargets) {
    if (!byCurrencyId.has(line.currencyId)) {
      byCurrencyId.set(line.currencyId, {
        planId: plan.id,
        calendarId: plan.calendarId,
        sessionId: null,
        currencyId: line.currencyId,
        companyTargetAmount: 0,
        companyAchievedAmount: 0,
        companyProgressPercent: 0,
        targetBasis:
          plan.targetSettingMethod === 'BOTTOM_TO_TOP' ||
          plan.targetSettingMethod === 'HYBRID'
            ? 'none'
            : 'top_down',
        teams: [],
      });
    }
  }
  return [...byCurrencyId.values()];
}

function resolveTeamQuarterTarget(
  summary: PlanProgressSummary,
  teamId: string,
  plan: SalesTargetPlan | null | undefined,
  sessions: OrgFiscalSession[],
  activeQuarter: LeadQuarter,
): number {
  const teamProgress = summary.teams.find((team) => team.teamId === teamId);
  if ((teamProgress?.targetAmount ?? 0) > 0) {
    return teamProgress!.targetAmount;
  }

  const planCurrency = plan?.currencyTargets.find(
    (line) => line.currencyId === summary.currencyId,
  );
  if (!plan || !planCurrency || !sessions.length) return 0;

  return getTeamQuarterTargetAmount(
    plan,
    planCurrency,
    teamId,
    sessions,
    activeQuarter,
  );
}

function buildTeamCurrencyRows(
  progress: PlanProgressSummary[],
  currencyById: Map<string, { name?: string; description?: string }>,
  teamId: string,
  plan: SalesTargetPlan | null | undefined,
  sessions: OrgFiscalSession[],
  activeQuarter: LeadQuarter,
): PipelineKpiCurrencyRow[] {
  const merged = mergeProgressWithPlanCurrencies(progress, plan);
  const currencyIds = plan?.currencyTargets?.length
    ? plan.currencyTargets.map((line) => line.currencyId)
    : merged.map((summary) => summary.currencyId);

  const uniqueCurrencyIds = [...new Set(currencyIds)];

  return sortCurrencyRows(
    uniqueCurrencyIds.map((currencyId) => {
      const summary = merged.find((row) => row.currencyId === currencyId);
      const summaryFallback: PlanProgressSummary = summary ?? {
        planId: plan?.id ?? '',
        calendarId: plan?.calendarId ?? '',
        sessionId: null,
        currencyId,
        companyTargetAmount: 0,
        companyAchievedAmount: 0,
        companyProgressPercent: 0,
        teams: [],
      };
      const target = resolveTeamQuarterTarget(
        summaryFallback,
        teamId,
        plan,
        sessions,
        activeQuarter,
      );
      const teamProgress = summary?.teams.find(
        (team) => team.teamId === teamId,
      );
      const achieved = teamProgress?.achievedAmount ?? 0;
      const pct = computeLeadTargetPct(achieved, target);

      return {
        currency: currencyCodeById(currencyId, currencyById),
        target,
        achieved,
        pct,
        remaining: Math.max(0, target - achieved),
      };
    }),
  );
}

function buildCompanyCurrencyRows(
  progress: PlanProgressSummary[],
  currencyById: Map<string, { name?: string; description?: string }>,
  plan: SalesTargetPlan | null | undefined,
): PipelineKpiCurrencyRow[] {
  const merged = mergeProgressWithPlanCurrencies(progress, plan);
  const currencyIds = plan?.currencyTargets?.length
    ? plan.currencyTargets.map((line) => line.currencyId)
    : merged.map((summary) => summary.currencyId);

  const uniqueCurrencyIds = [...new Set(currencyIds)];

  return sortCurrencyRows(
    uniqueCurrencyIds.map((currencyId) => {
      const summary = merged.find((row) => row.currencyId === currencyId);
      const target = summary?.companyTargetAmount ?? 0;
      // Company = won deal values once — never sum of team/product amounts.
      const achieved = summary?.companyAchievedAmount ?? 0;
      return {
        currency: currencyCodeById(currencyId, currencyById),
        target,
        achieved,
        pct: computeLeadTargetPct(achieved, target),
        remaining: Math.max(0, target - achieved),
      };
    }),
  );
}

function extractTeamsFromProgress(
  progress: PlanProgressSummary[],
): { teamId: string; teamName: string }[] {
  const teamMap = new Map<string, string>();
  for (const summary of progress) {
    for (const team of summary.teams) {
      if (!teamMap.has(team.teamId)) {
        teamMap.set(team.teamId, team.teamName);
      }
    }
  }
  return [...teamMap.entries()]
    .map(([teamId, teamName]) => ({ teamId, teamName }))
    .sort((left, right) => left.teamName.localeCompare(right.teamName));
}

function buildKpiFromProgress(
  progress: PlanProgressSummary[],
  currencyById: Map<string, { name?: string; description?: string }>,
  activeQuarter: LeadQuarter,
  fiscalYear: string,
  isCompanyScope: boolean,
  plan: SalesTargetPlan | null | undefined,
  sessions: OrgFiscalSession[],
  salesTeams: SalesTeam[],
): PipelineSalesTargetKpi | null {
  if (isCompanyScope) {
    if (!plan || !sessions.length) return null;

    const teamsInScope = listTeamsWithQuarterTargets(
      plan,
      salesTeams,
      sessions,
      activeQuarter,
      progress,
    );
    const teams = teamsInScope
      .map((team) => {
        const rows = buildTeamCurrencyRows(
          progress,
          currencyById,
          team.teamId,
          plan,
          sessions,
          activeQuarter,
        );
        if (!rows.length) return null;
        return {
          teamId: team.teamId,
          teamName: team.teamName,
          rows,
          overallPct: overallPctFromRows(rows),
        };
      })
      .filter((team): team is PipelineKpiTeamTile => team != null);

    const overallRows = buildCompanyCurrencyRows(progress, currencyById, plan);
    if (!overallRows.length) return null;

    const overall: PipelineKpiTeamTile = {
      teamId: 'overall',
      teamName: 'Overall',
      rows: overallRows,
      overallPct: overallPctFromRows(overallRows),
    };

    return {
      q: activeQuarter,
      fiscalYear,
      overall,
      teams,
    };
  }

  const myTeam = extractTeamsFromProgress(progress)[0];
  if (!myTeam) return null;

  const rows = buildTeamCurrencyRows(
    progress,
    currencyById,
    myTeam.teamId,
    plan,
    sessions,
    activeQuarter,
  );
  if (!rows.length) return null;

  return {
    q: activeQuarter,
    fiscalYear,
    overall: {
      teamId: myTeam.teamId,
      teamName: myTeam.teamName,
      rows,
      overallPct: overallPctFromRows(rows),
    },
    teams: [],
  };
}

export function usePipelineSalesTargetProgress(options?: {
  enabled?: boolean;
}) {
  const hookEnabled = options?.enabled !== false;
  const canViewCompany = canViewCompanyTargets();
  const isCompanyScope = canViewCompany;

  const {
    fiscalCalendar,
    isLoading: fyLoading,
    activeSessionId: settingsSessionId,
  } = useOrgFiscalSettings();
  const { data: plans = [], isLoading: plansLoading } = useGetSalesTargetPlans(
    fiscalCalendar?.id,
    isCompanyScope && hookEnabled,
  );
  const {
    data: myTeamContext,
    isLoading: myTeamPlanLoading,
    isError: myTeamPlanError,
  } = useGetMyTeamSalesTargetPlan(!isCompanyScope && hookEnabled);
  const { isLoading: settingsLoading } =
    useGetSalesTargetingSettings(hookEnabled);
  const { data: salesTeams = [] } = useGetSalesTeams(
    isCompanyScope && hookEnabled,
  );
  const { data: tenantCurrencies = [] } = useGetTenantCurrencies({
    enabled: hookEnabled,
  });

  const activePlanSummary = useMemo(() => {
    if (!isCompanyScope) {
      return myTeamContext?.plan
        ? {
            id: myTeamContext.plan.id,
            calendarId: myTeamContext.plan.calendarId,
          }
        : null;
    }
    if (!fiscalCalendar) return null;
    return plans.find((plan) => plan.calendarId === fiscalCalendar.id) ?? null;
  }, [isCompanyScope, myTeamContext?.plan, plans, fiscalCalendar]);

  const planId = activePlanSummary?.id;

  const { data: plan, isLoading: planLoading } = useGetSalesTargetPlan(
    hookEnabled ? planId : undefined,
  );
  const calendarId = activePlanSummary?.calendarId ?? fiscalCalendar?.id;

  const { data: sessions = [], isLoading: sessionsLoading } =
    useGetFiscalSessions(hookEnabled ? calendarId : undefined);

  const activeQuarter = useMemo(
    () => getActiveQuarterFromSessions(sessions, fiscalCalendar ?? undefined),
    [sessions, fiscalCalendar],
  );

  const activeSessionId = useMemo(() => {
    if (
      settingsSessionId &&
      sessions.some((session) => session.id === settingsSessionId)
    ) {
      return settingsSessionId;
    }
    return sessionIdForQuarter(sessions, activeQuarter);
  }, [sessions, activeQuarter, settingsSessionId]);

  const progressParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId } : undefined),
    [activeSessionId],
  );

  const {
    data: companyProgress = [],
    isLoading: companyProgressLoading,
    isError: companyProgressError,
  } = useGetPlanProgress(
    planId,
    progressParams,
    hookEnabled &&
      isCompanyScope &&
      Boolean(planId) &&
      Boolean(activeSessionId),
  );

  const {
    data: myTeamProgress = [],
    isLoading: myTeamProgressLoading,
    isError: myTeamProgressError,
  } = useGetMyTeamPlanProgress(
    planId,
    progressParams,
    hookEnabled &&
      !isCompanyScope &&
      Boolean(planId) &&
      Boolean(activeSessionId),
  );

  const progress = isCompanyScope ? companyProgress : myTeamProgress;
  const progressError = isCompanyScope
    ? companyProgressError
    : myTeamProgressError;

  const currencyById = useMemo(() => {
    const map = new Map<string, { name?: string; description?: string }>();
    for (const tenantCurrency of tenantCurrencies) {
      if (tenantCurrency.currency) {
        map.set(tenantCurrency.currencyId, tenantCurrency.currency);
      }
    }
    return map;
  }, [tenantCurrencies]);

  const kpi = useMemo(() => {
    if (!activeSessionId || !sessions.length) return null;

    const activePlan = plan ?? myTeamContext?.plan ?? null;
    if (isCompanyScope && !activePlan) return null;

    return buildKpiFromProgress(
      progress,
      currencyById,
      activeQuarter,
      fiscalYearLabel(fiscalCalendar),
      isCompanyScope,
      activePlan,
      sessions,
      salesTeams,
    );
  }, [
    progress,
    currencyById,
    activeQuarter,
    fiscalCalendar,
    isCompanyScope,
    activeSessionId,
    plan,
    myTeamContext?.plan,
    sessions,
    salesTeams,
  ]);

  const isLoading =
    hookEnabled &&
    (fyLoading ||
      settingsLoading ||
      sessionsLoading ||
      (planId ? planLoading : false) ||
      (isCompanyScope
        ? plansLoading || companyProgressLoading
        : myTeamPlanLoading || myTeamProgressLoading));

  const hasPlan = Boolean(planId);
  const isConfigured = Boolean(kpi);

  return {
    kpi,
    isLoading,
    isConfigured,
    hasPlan,
    isCompanyScope,
    progressError: progressError || myTeamPlanError,
  };
}
