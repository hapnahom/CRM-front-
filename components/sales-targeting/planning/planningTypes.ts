export type PlanningWorkbenchView =
  | 'requests'
  | 'allocate'
  | 'reconcile'
  | 'org';

export type PlanningSubView = 'overview' | PlanningWorkbenchView;

export type PlanningOverviewMode = 'overview' | 'workbench';

export const PLANNING_WORKBENCH_LABELS: Record<
  Exclude<PlanningWorkbenchView, 'org'>,
  string
> = {
  requests: 'Proposals',
  allocate: 'Allocate',
  reconcile: 'Reconcile',
};

export const PLANNING_WORKBENCH_TITLES: Record<PlanningWorkbenchView, string> =
  {
    requests: 'Target proposals',
    allocate: 'Target allocation',
    reconcile: 'Reconciliation',
    org: 'View organization',
  };
