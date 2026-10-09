import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Configuration ---
// Remove hardcoded BASE_URL and use imported one

// --- Interfaces ---
export interface ActivityType {
  activityTypeId: string;
  name: string;
  description: string;
  activityIcon: string;
  isLead: boolean;
  isDeal: boolean;
  tenantId: string;
  [key: string]: any;
}

// --- API Service Functions ---

/**
 * Fetches all activity types for the current tenant.
 */
const getActivityTypes = async (): Promise<ActivityType[]> => {
  try {
    const token = await getCurrentToken();

    // 🚨 FIXED: Get tenant ID dynamically inside the function
    const tenantId = useAuthenticationStore.getState().tenantId;

    // Validate that tenant ID exists
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
      url: `${CRM_URL}/activity-types?page=1&size=1000`, // Request large page size to get all activity types
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a single activity type by ID for the current tenant.
 */
const getActivityTypeById = async (id: string): Promise<ActivityType> => {
  try {
    const token = await getCurrentToken();

    // 🚨 FIXED: Get tenant ID dynamically inside the function
    const tenantId = useAuthenticationStore.getState().tenantId;

    // Validate that tenant ID exists
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
      url: `${CRM_URL}/activity-types/${id}`,
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
 * Hook for fetching all activity types.
 */
export const useGetActivityTypes = () => {
  return useQuery<ActivityType[]>(['activityTypes'], getActivityTypes, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to fetch activity types';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

/**
 * Hook for fetching a single activity type by ID.
 */
export const useGetActivityTypeById = (id: string) => {
  return useQuery<ActivityType>(
    ['activityType', id],
    () => getActivityTypeById(id),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      enabled: !!id, // Only run query if ID exists
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.message || 'Failed to fetch activity type';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
