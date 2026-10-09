import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  CreateActivityRequest,
  UpdateActivityRequest,
  SingleActivityResponse,
} from './types';
import { validateActivityData, validateActivityUpdateData } from './utils';

// --- API Service Functions ---

/**
 * Creates a new activity for the current tenant.
 */
const createActivity = async (
  data: CreateActivityRequest,
): Promise<SingleActivityResponse> => {
  try {
    // Validate data before sending to API
    const validationErrors = validateActivityData(data);
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

    const response = await crudRequest({
      url: `${CRM_URL}/activities`,
      method: 'POST',
      headers,
      data: data,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates an existing activity for the current tenant.
 */
const updateActivity = async (
  data: UpdateActivityRequest,
): Promise<SingleActivityResponse> => {
  try {
    // Validate only the fields being updated
    const validationErrors = validateActivityUpdateData(data);
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

    const { id, ...updateData } = data;

    const response = await crudRequest({
      url: `${CRM_URL}/activities/${id}`,
      method: 'PATCH',
      headers,
      data: updateData,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Soft deletes an activity for the current tenant.
 */
const deleteActivity = async (id: string): Promise<{ message: string }> => {
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
      method: 'DELETE',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for creating a new activity.
 */
export const useCreateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation<SingleActivityResponse, Error, CreateActivityRequest>(
    createActivity,
    {
      onSuccess: (data, variables) => {
        handleSuccessMessage('POST', 'Activity created successfully');

        // Invalidate and refetch activities list
        queryClient.invalidateQueries(['activities']);

        // If we have dealId, invalidate related queries
        if (variables.dealId) {
          queryClient.invalidateQueries([
            'activities',
            { dealId: variables.dealId },
          ]);
        }
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
    },
  );
};

/**
 * Hook for updating an existing activity.
 */
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation<SingleActivityResponse, Error, UpdateActivityRequest>(
    updateActivity,
    {
      onSuccess: (data, variables) => {
        handleSuccessMessage('PATCH', 'Activity updated successfully');

        // Invalidate and refetch activities list
        queryClient.invalidateQueries(['activities']);

        // Invalidate the specific activity
        queryClient.invalidateQueries(['activity', variables.id]);

        // If we have dealId, invalidate related queries
        if (variables.dealId) {
          queryClient.invalidateQueries([
            'activities',
            { dealId: variables.dealId },
          ]);
        }
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
    },
  );
};

/**
 * Hook for deleting an activity.
 */
export const useDeleteActivity = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>(deleteActivity, {
    onSuccess: (data, id) => {
      handleSuccessMessage('DELETE', 'Activity deleted successfully');

      // Invalidate and refetch activities list
      queryClient.invalidateQueries(['activities']);

      // Remove the deleted activity from cache
      queryClient.removeQueries(['activity', id]);
    },
    // eslint-disable-next-line
    onError: (error) => {
      // Error handling is already done in the service function
    },
  });
};

// Legacy hooks for backward compatibility
export const useCreateDealActivity = () => {
  const mutation = useCreateActivity();
  return {
    ...mutation,
    mutate: (params: { data: CreateActivityRequest }) =>
      mutation.mutate(params.data),
    mutateAsync: (params: { data: CreateActivityRequest }) =>
      mutation.mutateAsync(params.data),
  };
};

export const useUpdateDealActivity = () => {
  const mutation = useUpdateActivity();
  return {
    ...mutation,
    mutate: (params: { id: string; data: Partial<CreateActivityRequest> }) =>
      mutation.mutate({ id: params.id, ...params.data }),
    mutateAsync: (params: {
      id: string;
      data: Partial<CreateActivityRequest>;
    }) => mutation.mutateAsync({ id: params.id, ...params.data }),
  };
};
