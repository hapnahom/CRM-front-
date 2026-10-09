import { useQuery } from 'react-query';
import {
  SectorPerformanceParams,
  SectorPerformanceResponse,
} from './interface';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/**
 * Function to fetch sector performance by sending a GET request to the API
 * @param params Optional query parameters for filtering sector performance
 * @returns The response data from the API
 */
const getSectorPerformance = async (
  params?: SectorPerformanceParams,
): Promise<SectorPerformanceResponse> => {
  const queryParams = new URLSearchParams();
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.sectorId) queryParams.append('sectorId', params.sectorId);
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.teamId) queryParams.append('teamId', params.teamId);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.currencyId) queryParams.append('currencyId', params.currencyId);

  const url = `${CRM_URL}/reports/sector-performance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

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
 * Custom hook to fetch sector performance using useQuery from react-query.
 *
 * @param params Optional query parameters for filtering sector performance
 * @param options Optional react-query options
 * @returns The query object for fetching sector performance.
 *
 * @description
 * This hook uses `useQuery` to fetch sector performance from the API. It returns
 * the query object containing the sector performance data and any loading or error states.
 * The query key includes the parameters to ensure proper caching and refetching.
 */
export const useGetSectorPerformance = (
  params?: SectorPerformanceParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  },
) => {
  const queryKey = ['sector-performance', params];

  return useQuery<SectorPerformanceResponse>(
    queryKey,
    () => getSectorPerformance(params),
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
