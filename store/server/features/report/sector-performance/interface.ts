/**
 * Interface for sector performance data
 */
export interface SectorPerformance {
  id: string;
  sectorName: string;
  totalDeals: number;
  actualValue: number;
  targetValue: number;
  achievementRate: number;
  averageDealValue: number;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for sector performance query parameters
 */
export interface SectorPerformanceParams {
  startDate?: string;
  endDate?: string;
  sectorId?: string;
  userId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
  currencyId?: string;
}

/**
 * Interface for sector performance response
 */
export interface SectorPerformanceResponse {
  success: boolean;
  sectors: SectorPerformance[];
  totalCount: number;
  message?: string;
}

/**
 * Interface for sector performance summary
 */
export interface SectorPerformanceSummary {
  totalSectors: number;
  totalDeals: number;
  totalActualValue: number;
  totalTargetValue: number;
  overallAchievementRate: number;
  topPerformingSector: string;
  averageDealValue: number;
}
