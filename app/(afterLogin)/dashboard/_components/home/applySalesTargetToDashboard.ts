import type { HomeDashboardApiResponse, HomeQuotaYtd } from './types';
import type { HomeDashboardSalesTarget } from '@/hooks/useHomeDashboardSalesTarget';
import {
  formatTargetPercent,
  targetAchievementPercent,
} from '@/lib/target-format';
import { formatMoney } from './utils';

function quotaStatusLabel(percentAchieved: number): string {
  if (percentAchieved >= 110) return 'Exceeded';
  if (percentAchieved >= 100) return 'Ahead';
  if (percentAchieved >= 85) return 'On Track';
  return 'Behind';
}

function buildQuota(
  base: HomeQuotaYtd,
  target: number,
  achieved: number,
  currency: string,
  horizonLabel: 'Annual' | 'Period',
): HomeQuotaYtd {
  const percentAchieved = targetAchievementPercent(achieved, target);

  return {
    ...base,
    target,
    achieved,
    remaining: Math.max(0, target - achieved),
    percentAchieved,
    statusLabel: quotaStatusLabel(percentAchieved),
    subtitle:
      target > 0
        ? `${horizonLabel} · ${formatMoney(achieved, currency)} of ${formatMoney(target, currency)}`
        : `${horizonLabel} · no target set`,
  };
}

/** Overlay sales-target plan values onto dashboard home payload (executive company target). */
export function applySalesTargetToDashboard(
  data: HomeDashboardApiResponse,
  salesTarget: HomeDashboardSalesTarget,
  sessionId?: string,
): HomeDashboardApiResponse {
  const { currency } = data;
  const {
    annualTarget,
    periodTarget,
    activeTarget,
    annualAchieved,
    periodAchieved,
    activeAchieved,
  } = salesTarget;

  const targetLabel =
    activeTarget > 0
      ? `Target: ${formatMoney(activeTarget, currency)}`
      : 'No target set';
  const targetAchievementLabel =
    activeTarget > 0
      ? `${formatTargetPercent(targetAchievementPercent(activeAchieved, activeTarget))} achieved`
      : 'No target set';

  const annualQuota = buildQuota(
    data.quotaAttainment?.annual ?? data.quotaYtd,
    annualTarget,
    annualAchieved,
    currency,
    'Annual',
  );

  const periodQuota =
    sessionId && periodTarget != null && periodAchieved != null
      ? buildQuota(
          data.quotaAttainment?.period ?? annualQuota,
          periodTarget,
          periodAchieved,
          currency,
          'Period',
        )
      : (data.quotaAttainment?.period ?? null);

  const activeQuota = sessionId && periodQuota ? periodQuota : annualQuota;

  return {
    ...data,
    metrics: {
      ...data.metrics,
      forecastValue: activeTarget,
      forecastGrowthLabel: targetAchievementLabel,
      closedRevenueGrowthLabel:
        data.view === 'executive'
          ? data.metrics.closedRevenueGrowthLabel
          : targetLabel,
      quotaAchievement:
        activeTarget > 0
          ? targetAchievementPercent(activeAchieved, activeTarget)
          : 0,
      quotaAchievementLabel: targetLabel,
    },
    quotaYtd: activeQuota,
    quotaAttainment: {
      annual: annualQuota,
      period: periodQuota,
      periodLabel: sessionId
        ? 'Period'
        : (data.quotaAttainment?.periodLabel ?? null),
      defaultMode: sessionId && periodQuota ? 'period' : 'annual',
    },
  };
}
