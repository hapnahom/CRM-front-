import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import { ActivitiesData, ActivitiesQueryParams } from './types';
import {
  buildActivitiesQueryString,
  validateDashboardQueryParams,
  cleanParams,
} from '../utils';

// --- API Service Functions ---

/**
 * Fetches recent activities for the current tenant.
 */
const getActivities = async (
  params: ActivitiesQueryParams = {},
): Promise<ActivitiesData> => {
  try {
    const validationErrors = validateDashboardQueryParams(params);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

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

    const queryString = buildActivitiesQueryString(params);

    const url = `${CRM_URL}/dashboard/activities${queryString ? `?${queryString}` : ''}`;

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

// --- React Query Hooks ---

/**
 * Hook for fetching recent activities.
 */
export const useGetDashboardActivities = (
  params: ActivitiesQueryParams = {},
) => {
  const cleanedParams = cleanParams(params);

  return useQuery<ActivitiesData>(
    ['dashboard', 'activities', cleanedParams],
    () => getActivities(params),
    {
      keepPreviousData: true,
      staleTime: 1 * 60 * 1000, // 1 minute (more dynamic)
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message ||
          'Failed to fetch dashboard activities';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
