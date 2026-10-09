import { useMutation, useQueryClient } from 'react-query';
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
export interface CreateActivityTypeInput {
  name: string;
  description: string;
  activityIcon: string;
  isLead: boolean;
  isDeal: boolean;
}

export interface ActivityTypeResponse {
  activityTypeId: string;
  name: string;
  description: string;
  activityIcon: string;
  isLead: boolean;
  isDeal: boolean;
  [key: string]: any;
}

export interface UpdateActivityTypeInput {
  name?: string;
  description?: string;
  activityIcon?: string;
  isLead?: boolean;
  isDeal?: boolean;
}

// --- API Service Functions ---

/**
 * Creates a new activity type.
 */
const createActivityType = async (
  data: CreateActivityTypeInput,
): Promise<ActivityTypeResponse> => {
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
      url: `${CRM_URL}/activity-types`,
      method: 'POST',
      data: data,
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates an existing activity type.
 */
const updateActivityType = async (
  id: string,
  data: UpdateActivityTypeInput,
): Promise<ActivityTypeResponse> => {
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
      method: 'PATCH',
      data: data,
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes an activity type.
 */
const deleteActivityType = async (id: string): Promise<void> => {
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

    await crudRequest({
      url: `${CRM_URL}/activity-types/${id}`,
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for creating an activity type.
 */
export const useCreateActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(createActivityType, {
    onSuccess: () => {
      queryClient.invalidateQueries(['activityTypes']);
      NotificationMessage.success({
        message: 'Successfully Created',
        description: 'Activity type created successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Something went wrong';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

/**
 * Hook for updating an activity type.
 */
export const useUpdateActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: UpdateActivityTypeInput }) =>
      updateActivityType(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['activityTypes']);
        queryClient.invalidateQueries(['activityType', variables.id]);
        NotificationMessage.success({
          message: 'Successfully Updated',
          description: 'Activity type updated successfully',
        });
      },
      onError: (error: any) => {
        const errorMessage =
          error?.response?.data?.message || 'Something went wrong';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for deleting an activity type.
 */
export const useDeleteActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(deleteActivityType, {
    onSuccess: (data, id) => {
      queryClient.invalidateQueries(['activityTypes']);
      queryClient.invalidateQueries(['activityType', id]);
      NotificationMessage.success({
        message: 'Successfully Deleted',
        description: 'Activity type deleted successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Something went wrong';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
