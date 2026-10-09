import type { QueryClient } from 'react-query';

/** Refresh KPI cards and sales targeting progress after pipeline stage moves. */
export function invalidateSalesTargetProgressQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['sales-target-progress'] });
  queryClient.invalidateQueries({
    queryKey: ['my-team-sales-target-progress'],
  });
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'home'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'executive'] });
}
