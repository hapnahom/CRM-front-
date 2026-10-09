/**
 * Interface for lead source performance data
 */
export interface LeadSourcePerformance {
  id: string;
  sourceName: string;
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for lead source performance query parameters
 */
export interface LeadSourcePerformanceParams {
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  userId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
  currencyId?: string;
}

/**
 * Interface for lead source performance response
 */
export interface LeadSourcePerformanceResponse {
  success: boolean;
  sources: LeadSourcePerformance[];
  totalCount: number;
  message?: string;
}

/**
 * Interface for lead source performance summary
 */
export interface LeadSourcePerformanceSummary {
  totalSources: number;
  totalLeads: number;
  totalConversions: number;
  overallConversionRate: number;
  topPerformingSource: string;
  averageValuePerLead: number;
}
