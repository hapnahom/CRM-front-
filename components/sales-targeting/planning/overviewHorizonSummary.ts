import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import {
  isHybridMethod,
  isRequestWorkflowMethod,
} from '@/components/sales-targeting/targetSettingMethod';
import {
  resolveOverviewWorkflowStatus,
  type OverviewWorkflowStatus,
} from '@/components/sales-targeting/planning/overviewScopeUtils';
import type {
  PlanningDashboardView,
  TargetPlanningHierarchyNode,
  TargetSettingMethod,
} from '@/store/server/features/salesTargeting/types';

export type OverviewStatTone = 'default' | 'success' | 'warning' | 'danger';

export type OverviewStat = {
  key: string;
  label: string;
  value: string;
  hint?: string | null;
  tone?: OverviewStatTone;
};

export type OverviewProgress = {
  label: string;
  percent: number;
  caption: string;
};

export type HorizonSummary = {
  primary: { label: string; value: string; hint?: string | null };
  stats: OverviewStat[];
  progress: OverviewProgress | null;
  status: OverviewWorkflowStatus;
};

/** One-line explanation of how the active method plans targets. */
export function describeTargetSettingMethod(
  method?: TargetSettingMethod | string | null,
): string {
  switch (method) {
    case 'BOTTOM_TO_TOP':
      return 'Teams and members propose targets that roll up through department and company approval.';
    case 'HYBRID':
      return 'Leadership sets a strategic target, teams propose bottom-up, and the gap is reconciled.';
    case 'TOP_TO_BOTTOM':
    default:
      return 'Leadership sets the company target and it is distributed down to departments and teams.';
  }
}

function money(value: number | null | undefined, currencyCode: string) {
  if (value == null) return '—';
  return formatCompactMoney(value, currencyCode);
}

function percentOf(part: number | null | undefined, whole: number | null) {
  if (part == null || whole == null || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Sum of target amounts already allocated to the company's direct children. */
export function sumAllocatedTargets(
  root: TargetPlanningHierarchyNode | undefined | null,
): number | null {
  if (!root) return null;
  return root.children
    .filter((child) => child.scopeLevel !== 'person')
    .reduce((sum, child) => sum + Number(child.officialTarget ?? 0), 0);
}

function resolveAllocationStatus(
  target: number | null,
  allocated: number | null,
): OverviewWorkflowStatus {
  if (target == null) return { label: 'Target not set', tone: 'muted' };
  if (allocated == null) return { label: 'Target set', tone: 'muted' };
  const tolerance = Math.max(1, target * 0.001);
  const remaining = target - allocated;
  if (allocated <= 0) {
    return { label: 'Awaiting allocation', tone: 'warning' };
  }
  if (remaining > tolerance) {
    return { label: 'Partially allocated', tone: 'warning' };
  }
  if (remaining < -tolerance) {
    return { label: 'Over-allocated', tone: 'danger' };
  }
  return { label: 'Fully allocated', tone: 'success' };
}

export function buildHorizonSummary({
  method,
  dashboard,
  root,
  currencyCode,
}: {
  method?: TargetSettingMethod | string | null;
  dashboard: PlanningDashboardView;
  root?: TargetPlanningHierarchyNode | null;
  currencyCode: string;
}): HorizonSummary {
  const { metrics, completionSummary: completion } = dashboard;
  const resolved = method ?? dashboard.targetSettingMethod;

  if (isHybridMethod(resolved)) {
    const gap = metrics.gap;
    const aligned = gap != null && Math.abs(gap) <= 0.009;
    const coverage = metrics.coverage;
    return {
      primary: {
        label: 'Strategic target',
        value: money(metrics.strategicTarget, currencyCode),
        hint: 'Set by leadership',
      },
      stats: [
        {
          key: 'bottom-up',
          label: 'Bottom-up',
          value: money(metrics.proposedTarget, currencyCode),
          hint:
            coverage != null
              ? `${Math.round(coverage)}% of strategic`
              : `${completion.teamsWithProposal}/${completion.totalTeams} teams proposed`,
        },
        {
          key: 'gap',
          label: 'Gap to strategic',
          value: gap != null ? money(gap, currencyCode) : '—',
          hint:
            gap == null ? null : aligned ? 'Aligned' : 'Needs reconciliation',
          tone: gap == null ? 'default' : aligned ? 'success' : 'warning',
        },
        {
          key: 'official',
          label: 'Official target',
          value: money(metrics.officialTarget, currencyCode),
          hint: metrics.officialTarget == null ? 'After reconciliation' : null,
        },
        {
          key: 'forecast',
          label: 'Forecast',
          value: money(metrics.currentForecast, currencyCode),
          hint: null,
        },
      ],
      progress: {
        label: 'Bottom-up coverage',
        percent: clampPercent(coverage ?? 0),
        caption:
          completion.totalTeams > 0
            ? `${completion.teamsApproved}/${completion.totalTeams} teams approved`
            : 'No teams in scope',
      },
      status: resolveOverviewWorkflowStatus(dashboard, resolved),
    };
  }

  if (isRequestWorkflowMethod(resolved)) {
    return {
      primary: {
        label: 'Bottom-up total',
        value: money(metrics.proposedTarget, currencyCode),
        hint: `${completion.teamsWithProposal}/${completion.totalTeams} teams proposed`,
      },
      stats: [
        {
          key: 'official',
          label: 'Official target',
          value: money(metrics.officialTarget, currencyCode),
          hint: metrics.officialTarget == null ? 'Set on finalization' : null,
        },
        {
          key: 'forecast',
          label: 'Forecast',
          value: money(metrics.currentForecast, currencyCode),
          hint: null,
        },
        {
          key: 'teams',
          label: 'Teams approved',
          value: `${completion.teamsApproved}/${completion.totalTeams}`,
          hint:
            completion.teamsPending > 0
              ? `${completion.teamsPending} in review`
              : null,
        },
        {
          key: 'members',
          label: 'Member proposals',
          value: `${completion.membersWithProposal}/${completion.membersTotal}`,
          hint:
            completion.membersPending > 0
              ? `${completion.membersPending} awaiting team lead`
              : null,
        },
      ],
      progress: {
        label: 'Planning progress',
        percent: clampPercent(completion.completionPercent),
        caption: completion.bottleneckLabel ?? 'On track',
      },
      status: resolveOverviewWorkflowStatus(dashboard, resolved),
    };
  }

  // Top to Bottom: a company target distributed downward.
  const target = metrics.officialTarget ?? metrics.strategicTarget;
  const allocated = sumAllocatedTargets(root);
  const unallocated =
    target != null && allocated != null ? target - allocated : null;
  const forecastPct = percentOf(metrics.currentForecast, target);
  const wonPct = percentOf(metrics.actualWon, target);
  const allocatedPct = percentOf(allocated, target);

  const stats: OverviewStat[] = [
    {
      key: 'forecast',
      label: 'Forecast',
      value: money(metrics.currentForecast, currencyCode),
      hint: forecastPct != null ? `${forecastPct}% of target` : null,
    },
    {
      key: 'won',
      label: 'Won to date',
      value: money(metrics.actualWon, currencyCode),
      hint: wonPct != null ? `${wonPct}% of target` : null,
    },
  ];
  if (allocated != null) {
    stats.push(
      {
        key: 'allocated',
        label: 'Allocated',
        value: money(allocated, currencyCode),
        hint: allocatedPct != null ? `${allocatedPct}% of target` : null,
      },
      {
        key: 'unallocated',
        label: 'Unallocated',
        value: money(unallocated, currencyCode),
        hint: null,
        tone:
          unallocated == null
            ? 'default'
            : Math.abs(unallocated) <= Math.max(1, (target ?? 0) * 0.001)
              ? 'success'
              : unallocated > 0
                ? 'warning'
                : 'danger',
      },
    );
  }

  return {
    primary: {
      label: 'Company target',
      value: money(target, currencyCode),
      hint: 'Distributed to departments and teams',
    },
    stats,
    progress:
      target != null && allocated != null
        ? {
            label: 'Allocation progress',
            percent: clampPercent(allocatedPct ?? 0),
            caption: `${money(allocated, currencyCode)} of ${money(target, currencyCode)} allocated`,
          }
        : null,
    status: resolveAllocationStatus(target, allocated),
  };
}
