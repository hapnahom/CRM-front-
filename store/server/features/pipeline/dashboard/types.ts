export type PipelineDashboardCurrency = 'ETB' | 'USD';

export type PipelineDashboardPeriodTotals = {
  daily: number;
  weekly: number;
  monthly: number;
  quarter: number;
};

export type PipelineDashboardHighValueRecord = {
  id: string;
  name: string;
  customer: string;
  value: number;
  currency: PipelineDashboardCurrency | string;
  stage: string;
  owner: string;
  responsibleUserId: string | null;
  solutionCategory: string | null;
};

export type PipelineModuleDashboardResponse = {
  periodTotals: PipelineDashboardPeriodTotals;
  periodValueTotals: PipelineDashboardPeriodTotals;
  currency: PipelineDashboardCurrency;
  highValueRecords: PipelineDashboardHighValueRecord[];
};

export type PipelineModuleDashboardParams = {
  currency?: string;
  teamId?: string;
  departmentId?: string;
  responsibleUserId?: string;
  /** Users who must appear as Responsible or Observer. */
  affectedUserIds?: string[];
  solutionCategory?: string;
  highValueLimit?: number;
  sessionId?: string;
  sessionIds?: string;
};
