/**
 * Interface for deals attention data
 */
export interface DealsAttention {
  id: string;
  companyName: string;
  stageName: string;
  daysInStage: number;
  dealValue: number;
  ownerName: string;
  ownerId: string;
  lastActivityDate: string;
  priority: 'high' | 'medium' | 'low';
  timeRange: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for deals attention query parameters
 */
export interface DealsAttentionParams {
  startDate?: string;
  endDate?: string;
  stageId?: string;
  userId?: string;
  teamId?: string;
  priority?: 'high' | 'medium' | 'low';
  minDaysInStage?: number;
  limit?: number;
  offset?: number;
  currencyId?: string;
}

/**
 * Interface for deals attention response
 */
export interface DealsAttentionResponse {
  success: boolean;
  deals: DealsAttention[];
  totalCount: number;
  message?: string;
}

/**
 * Interface for deals attention summary
 */
export interface DealsAttentionSummary {
  totalDeals: number;
  highPriorityDeals: number;
  mediumPriorityDeals: number;
  lowPriorityDeals: number;
  averageDaysInStage: number;
  totalValue: number;
  averageDealValue: number;
}
