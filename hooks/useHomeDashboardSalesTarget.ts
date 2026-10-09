'use client';

import { useMemo } from 'react';
import { pickActiveSalesTargetPlan } from '@/components/sales-targeting/resolveActivePlan';
import {
  findLatestCompanyAnnualCommit,
  getCompanySessionTarget,
  resolveCompanyAnnualAmount,
} from '@/components/sales-targeting/targetingSectionHelpers';
import {
  useGetPlanProgress,
  useGetSalesTargetPlan,
  useGetSalesTargetPlans,
} from '@/store/server/features/salesTargeting/queries';
import type { PlanProgressSummary } from '@/store/server/features/salesTargeting/types';
import { getCurrencyCode } from '@/store/server/features/salesTargeting/mappers';
import { useOrgFiscalSettings } from '@/providers/OrgFiscalSettingsProvider';

function findProgressLine(
  progress: PlanProgressSummary[],
  currencyId?: string,
): PlanProgressSummary | undefined {
  if (!progress.length) return undefined;
  if (!currencyId) return progress[0];
  return progress.find((line) => line.currencyId === currencyId) ?? progress[0];
}

export type HomeDashboardSalesTarget = {
  planId?: string;
  annualTarget: number;
  periodTarget: number | null;
  activeTarget: number;
  annualAchieved: number;
  periodAchieved: number | null;
  activeAchieved: number;
  ready: boolean;
};

type UseHomeDashboardSalesTargetArgs = {
  calendarId?: string;
  sessionId?: string;
  currencyCode?: string;
  enabled?: boolean;
};

/**
 * Read company target the same way as Sales Targeting (plan API + commit helpers).
 * Achieved amounts come from the sales-targets progress API.
 */
export function useHomeDashboardSalesTarget({
  calendarId,
  sessionId,
  currencyCode,
  enabled = true,
}: UseHomeDashboardSalesTargetArgs): HomeDashboardSalesTarget {
  const { fiscalCalendar: activeFiscalYear, isLoading: fyLoading } =
    useOrgFiscalSettings();
  const resolvedCalendarId = calendarId ?? activeFiscalYear?.id;

  const { data: plans = [], isLoading: plansLoading } = useGetSalesTargetPlans(
    resolvedCalendarId,
    enabled && Boolean(resolvedCalendarId),
    { includeArchived: true },
  );

  const planSummary = useMemo(
    () =>
      resolvedCalendarId
        ? pickActiveSalesTargetPlan(plans, resolvedCalendarId)
        : null,
    [plans, resolvedCalendarId],
  );

  const { data: plan, isLoading: planLoading } = useGetSalesTargetPlan(
    enabled ? planSummary?.id : undefined,
  );

  const currencyLine = useMemo(() => {
    if (!plan?.currencyTargets?.length) return null;
    const code = currencyCode?.toUpperCase();
    if (code) {
      const matched = plan.currencyTargets.find(
        (line) => getCurrencyCode(line).toUpperCase() === code,
      );
      if (matched) return matched;
    }
    return plan.currencyTargets[0] ?? null;
  }, [plan, currencyCode]);

  const annualTarget = useMemo(() => {
    if (!plan || !currencyLine) return 0;
    return resolveCompanyAnnualAmount(
      Number(currencyLine.annualAmount ?? 0),
      findLatestCompanyAnnualCommit(plan, currencyLine.currencyId),
    );
  }, [plan, currencyLine]);

  const periodTarget = useMemo(() => {
    if (!plan || !currencyLine || !sessionId) return null;
    return getCompanySessionTarget(plan, currencyLine.id, sessionId);
  }, [plan, currencyLine, sessionId]);

  const progressCurrencyId = currencyLine?.currencyId;

  const { data: annualProgress = [] } = useGetPlanProgress(
    plan?.id,
    progressCurrencyId ? { currencyId: progressCurrencyId } : undefined,
    enabled && Boolean(plan?.id),
  );

  const { data: periodProgress = [] } = useGetPlanProgress(
    plan?.id,
    sessionId && progressCurrencyId
      ? { sessionId, currencyId: progressCurrencyId }
      : undefined,
    enabled && Boolean(plan?.id) && Boolean(sessionId),
  );

  const annualProgressLine = findProgressLine(
    annualProgress,
    progressCurrencyId,
  );
  const periodProgressLine = findProgressLine(
    periodProgress,
    progressCurrencyId,
  );

  const annualAchieved = annualProgressLine?.companyAchievedAmount ?? 0;
  const periodAchieved = sessionId
    ? (periodProgressLine?.companyAchievedAmount ?? 0)
    : null;

  const activeTarget = sessionId ? (periodTarget ?? 0) : annualTarget;
  const activeAchieved = sessionId ? (periodAchieved ?? 0) : annualAchieved;

  const loading = fyLoading || plansLoading || planLoading;
  const ready = !loading && (Boolean(plan) || plans.length === 0);

  return {
    planId: plan?.id,
    annualTarget,
    periodTarget,
    activeTarget,
    annualAchieved,
    periodAchieved,
    activeAchieved,
    ready,
  };
}
