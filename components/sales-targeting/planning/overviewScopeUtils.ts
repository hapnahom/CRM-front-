import type {
  OrgFiscalSession,
  PlanningDashboardView,
  TargetSettingMethod,
} from '@/store/server/features/salesTargeting/types';
import {
  isHybridMethod,
  isRequestWorkflowMethod,
  usesAllocationWorkbench,
} from '@/components/sales-targeting/targetSettingMethod';

export type OverviewWorkflowTone = 'success' | 'warning' | 'danger' | 'muted';

export type OverviewWorkflowStatus = {
  label: string;
  tone: OverviewWorkflowTone;
};

export function sortSessionsByStart(
  sessions: OrgFiscalSession[],
): OrgFiscalSession[] {
  return [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

export function formatOverviewDateRange(
  startDate: string,
  endDate: string,
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate.slice(0, 10)} — ${endDate.slice(0, 10)}`;
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function currencyHasPlanningTarget(
  dashboard: PlanningDashboardView | undefined,
): boolean {
  if (!dashboard) return false;
  const { metrics } = dashboard;
  return (
    metrics.officialTarget != null ||
    metrics.strategicTarget != null ||
    metrics.proposedTarget != null ||
    metrics.reviewedTarget != null
  );
}

export function resolveOverviewWorkflowStatus(
  dashboard: PlanningDashboardView | undefined,
  method?: TargetSettingMethod | string | null,
): OverviewWorkflowStatus {
  if (!dashboard) {
    return { label: '—', tone: 'muted' };
  }

  const { metrics, completionSummary } = dashboard;
  const hybrid = isHybridMethod(method ?? dashboard.targetSettingMethod);
  const usesRequests = isRequestWorkflowMethod(
    method ?? dashboard.targetSettingMethod,
  );
  const usesAllocate = usesAllocationWorkbench(
    method ?? dashboard.targetSettingMethod,
  );

  if (completionSummary.blockedEntities > 0) {
    return {
      label: `${completionSummary.blockedEntities} blocked`,
      tone: 'warning',
    };
  }

  if (completionSummary.teamsPending > 0) {
    const n = completionSummary.teamsPending;
    return {
      label: `${n} team${n === 1 ? '' : 's'} in review`,
      tone: 'warning',
    };
  }

  if (
    hybrid &&
    metrics.gap != null &&
    Math.abs(metrics.gap) > 0.009 &&
    completionSummary.completionPercent < 100
  ) {
    return { label: 'Reconcile gap', tone: 'warning' };
  }

  if (completionSummary.completionPercent >= 100) {
    return { label: 'Complete', tone: 'success' };
  }

  if (
    usesAllocate &&
    metrics.officialTarget == null &&
    metrics.strategicTarget == null
  ) {
    return { label: 'Allocate pending', tone: 'muted' };
  }

  if (
    usesRequests &&
    completionSummary.teamsWithProposal === 0 &&
    metrics.proposedTarget == null
  ) {
    return { label: 'Awaiting proposals', tone: 'muted' };
  }

  if (completionSummary.bottleneckLabel) {
    return { label: completionSummary.bottleneckLabel, tone: 'warning' };
  }

  if (currencyHasPlanningTarget(dashboard)) {
    return {
      label: `${completionSummary.completionPercent}% complete`,
      tone: 'muted',
    };
  }

  return { label: 'Not started', tone: 'muted' };
}
