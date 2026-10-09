// Re-export all queries from modular structure

// Explicitly export commonly used functions for better TypeScript resolution
export {
  useLeadsWithNamesQuery,
  useLeadsQuery,
  useGetLeadDetail,
  useGetLeads,
} from './queries/leadQueries';
export {
  useEngagementStagesQuery,
  useCompaniesQuery,
  useCampaignsQuery,
  useSourcesQuery,
  useSolutionsQuery,
  useSectorsQuery,
  useCurrenciesQuery,
  useRolesQuery,
} from './queries/referenceQueries';
export {
  useLeadDocumentsQuery,
  useLeadDocumentQuery,
} from './queries/documentQueries';
export { useEstimatedBudgetQuery } from './queries/budgetQueries';
export { useGetUsers } from './queries/userQueries';
