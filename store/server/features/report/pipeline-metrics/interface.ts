/**
 * Interface for pipeline metrics data
 */
export interface PipelineMetrics {
  id: string;
  name: string;
  totalLeads: number;
  totalDeals: number;
  conversionRate: number;
  averageDealValue: number;
  totalRevenue: number;
  stageBreakdown: StageBreakdown[];
  timeRange: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for stage breakdown in pipeline metrics
 */
export interface StageBreakdown {
  stageId: string;
  stageName: string;
  leadCount: number;
  dealCount: number;
  conversionRate: number;
  averageValue: number;
  totalValue: number;
}

/**
 * Interface for pipeline metrics query parameters
 */
export interface Breakdown {
  currency: string;
  value: number;
  currencyId: string;
}
export interface PipelineMetricsParams {
  startDate?: string;
  endDate?: string;
  pipelineId?: string;
  userId?: string;
  teamId?: string;
  breakdown?: Breakdown[];
  currencyId?: string;
}

/**
 * Interface for pipeline metrics response
 */
export interface PipelineMetricsResponse {
  success: boolean;
  totalPipelineValue: {
    currency: string;
    value: number;
    changePercent: number;
    changeValue: number;
    changeType: string;
    breakdown: Breakdown[];
  };
  activeDeals: {
    count: number;
    changeFromLastPeriod: number;
  };
  totalActiveDeals: number;
  conversionRate: {
    rate: number;
    changePercent: number;
  };
  avgDealAge: {
    days: number;
    changePercent: number;
  };
  message?: string;
}
