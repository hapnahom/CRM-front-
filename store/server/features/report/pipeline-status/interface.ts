/**
 * Interface for pipeline status data
 */
export interface PipelineStatus {
  id: string;
  stageName: string;
  totalDeals: number;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for pipeline status query parameters
 */
export interface PipelineStatusParams {
  startDate?: string;
  endDate?: string;
  pipelineId?: string;
  userId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
  currencyId?: string;
}

/**
 * Interface for pipeline status response
 */
export interface PipelineStatusResponse {
  success: boolean;
  stages: PipelineStatus[];
  totalCount: number;
  message?: string;
}

/**
 * Interface for pipeline status summary
 */
export interface PipelineStatusSummary {
  totalStages: number;
  totalDeals: number;
  totalValue: number;
  averageDealValue: number;
  topPerformingStage: string;
  conversionRate: number;
}
