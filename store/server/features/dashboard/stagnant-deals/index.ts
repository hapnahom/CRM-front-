// Export stagnant deals functionality
export * from './queries';
export * from './types';
export * from './utils';

// Export stagnant deals export functionality
export * from './exports';

// Re-export stagnant deals related types for convenience
export type {
  StagnantDeal,
  StagnantDealsResponse,
  StagnantDealsStats,
  StagnantDealFilters,
  StagnantDealsQueryParams,
} from './types';
export type {
  ExportStagnantDealsRequest,
  ExportStagnantDealsResponse,
} from './exports';
