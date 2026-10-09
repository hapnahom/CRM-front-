import { useQuery } from 'react-query';
import { PipelineMetricsParams, PipelineMetricsResponse } from './interface';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/**
 * Function to fetch pipeline metrics by sending a GET request to the API
 * @param params Optional query parameters for filtering pipeline metrics
 * @returns The response data from the API
 */

const getPipelineMetrics = async (
  params?: PipelineMetricsParams,
): Promise<PipelineMetricsResponse> => {
  const queryParams = new URLSearchParams();
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.pipelineId) queryParams.append('pipelineId', params.pipelineId);
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.teamId) queryParams.append('teamId', params.teamId);
  if (params?.currencyId) queryParams.append('currencyId', params.currencyId);

  const url = `${CRM_URL}/reports/pipeline-metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return crudRequest({
    url,
    method: 'GET',
    headers: {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Custom hook to fetch pipeline metrics using useQuery from react-query.
 *
 * @param params Optional query parameters for filtering pipeline metrics
 * @param options Optional react-query options
 * @returns The query object for fetching pipeline metrics.
 *
 * @description
 * This hook uses `useQuery` to fetch pipeline metrics from the API. It returns
 * the query object containing the pipeline metrics data and any loading or error states.
 * The query key includes the parameters to ensure proper caching and refetching.
 */
export const useGetPipelineMetrics = (
  params?: PipelineMetricsParams,
  options?: {
    enabled?: boolean;
  },
) => {
  const queryKey = ['pipeline-metrics', params];

  return useQuery<PipelineMetricsResponse>(
    queryKey,
    () => getPipelineMetrics(params),
    {
      enabled: options?.enabled ?? true,
      keepPreviousData: true,
      refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
      refetchOnMount: true, // Always refetch when component mounts
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    },
  );
};
