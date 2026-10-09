import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { Activity, ActivityResponse, ActivityQueryParams } from './types';
import { buildActivityQueryString } from './utils';

// --- API Service Functions ---

/**
 * Fetches all activities with pagination and filters for the current tenant.
 */
const getActivities = async (
  params: ActivityQueryParams = {},
): Promise<ActivityResponse> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    // Build query parameters using utility function
    const queryString = buildActivityQueryString(params);

    const url = `${CRM_URL}/activities/leads${queryString ? `?${queryString}` : ''}`;

    const response = await crudRequest({
      url,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a single activity by ID for the current tenant.
 */
const getActivityById = async (id: string): Promise<Activity> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/activities/${id}`,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for fetching all activities with pagination and filters.
 */
export const useGetActivities = (params: ActivityQueryParams = {}) => {
  return useQuery<ActivityResponse>(
    ['activities', params],
    () => getActivities(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      // eslint-disable-next-line
      onError: (error: any) => {
        // Error handling will be done in components using handleNetworkError
      },
    },
  );
};

/**
 * Hook for fetching a single activity by ID.
 */
export const useGetActivityById = (id: string) => {
  return useQuery<Activity>(['activity', id], () => getActivityById(id), {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!id, // Only run query if ID exists
    // eslint-disable-next-line
    onError: (error: any) => {
      // Error handling will be done in components using handleNetworkError
    },
  });
};
