// Export all types
export * from './types';

// Export main queries (dashboard summary, conversion funnel, lead sources)
export * from './queries';

// Export all utilities
export * from './utils';

// Export subfolder functionality
export * from './kpis';
export * from './pipeline';
export * from './stagnant-deals';
export * from './activities';
export * from './calendar';

// Export reference data queries
export { useGetUsers } from '../leads/users/queries';
export { useGetCompanies } from './companies/queries';
export { useGetDealStages } from './deal-stages/queries';
export { useGetExecutiveDashboard } from './executive/queries';
export { useGetHomeDashboard } from './home/queries';

// Re-export commonly used types for convenience
export type { DashboardSummary } from './types';
export type { ConversionFunnelData, ConversionFunnelPeriod } from './types';
export type { LeadSourcesData, LeadSource } from './types';
export type { DashboardQueryParams } from './types';

// Re-export calendar types for convenience
export type { Calendar, Session, Month } from './calendar/types';
