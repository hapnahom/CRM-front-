import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { Activity, ActivityResponse, ActivityQueryParams } from './types';
import { buildActivityQueryString } from './utils';

// --- API Service Functions ---

/**
 * Fetches all deal activities with pagination and filters for the current tenant.
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

    const url = `${CRM_URL}/activities/deals${queryString ? `?${queryString}` : ''}`;

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

/**
 * Fetches all deal activity types for the current tenant.
 */
const getDealActivitiesTypes = async () => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!token || !tenantId) {
      throw new Error('Authentication token or tenant ID not available');
    }

    if (!CRM_URL) {
      throw new Error('CRM_URL is not configured');
    }

    return await crudRequest({
      url: `${CRM_URL}/deal-activity-types`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for fetching all deal activities with pagination and filters.
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

/**
 * Hook for fetching deal activity types.
 */
export const useGetDealActivitiesTypes = () => {
  return useQuery<any>('deal-activity-types', getDealActivitiesTypes, {
    keepPreviousData: true,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Legacy hooks for backward compatibility
export const useGetDealActivities = () => {
  return useGetActivities({});
};

export const useFilterDealActivities = (
  dealId: string,
  priority: string,
  activityDate: string | any,
  activityTypeId: string,
) => {
  const filters: ActivityQueryParams = {};

  if (dealId) filters.dealId = dealId;
  if (priority) filters.priority = priority as 'low' | 'medium' | 'high';
  if (activityDate) {
    // Handle dayjs object
    if (
      activityDate &&
      typeof activityDate === 'object' &&
      activityDate.format
    ) {
      filters.startDate = new Date(activityDate.format('YYYY-MM-DD'));
    } else if (typeof activityDate === 'string') {
      filters.startDate = new Date(activityDate);
    }
  }
  if (activityTypeId) filters.activityTypeId = activityTypeId;

  return useGetActivities(filters);
};
