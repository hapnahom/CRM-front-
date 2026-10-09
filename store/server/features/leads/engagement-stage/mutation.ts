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
export interface CreateEngagementStageInput {
  name: string;
  description?: string;
  level: number;
  colorCode: string;
}

export interface UpdateEngagementStageInput {
  name?: string;
  description?: string;
  level?: number;
  colorCode?: string;
}

export interface EngagementStageResponse {
  id: string;
  name: string;
  description?: string;
  level: number;
  colorCode: string;
  order?: number;
  isActive?: boolean;
  tenantId: string;
  [key: string]: any;
}

// --- API Service Functions ---

/**
 * Creates a new engagement stage.
 */
const createEngagementStage = async (
  data: CreateEngagementStageInput,
): Promise<EngagementStageResponse> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID dynamically inside the function
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
      url: `${CRM_URL}/engagement-stage`,
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
 * Updates an existing engagement stage.
 */
const updateEngagementStage = async (
  engagementStageId: string,
  data: UpdateEngagementStageInput,
): Promise<EngagementStageResponse> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID dynamically inside the function
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
      url: `${CRM_URL}/engagement-stage/${engagementStageId}`,
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
 * Deletes an engagement stage.
 */
const deleteEngagementStage = async (
  engagementStageId: string,
): Promise<void> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID dynamically inside the function
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
      url: `${CRM_URL}/engagement-stage/${engagementStageId}`,
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for creating an engagement stage.
 */
export const useCreateEngagementStage = () => {
  const queryClient = useQueryClient();
  return useMutation(createEngagementStage, {
    onSuccess: () => {
      // Invalidate and refetch the engagement stages query
      queryClient.invalidateQueries(['engagementStages']);
      queryClient.refetchQueries(['engagementStages']);
      NotificationMessage.success({
        message: 'Successfully Created',
        description: 'Engagement stage created successfully',
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
 * Hook for updating an engagement stage.
 */
export const useUpdateEngagementStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({
      engagementStageId,
      data,
    }: {
      engagementStageId: string;
      data: UpdateEngagementStageInput;
    }) => updateEngagementStage(engagementStageId, data),
    {
      onSuccess: () => {
        // Invalidate and refetch the engagement stages query
        queryClient.invalidateQueries(['engagementStages']);
        queryClient.refetchQueries(['engagementStages']);
        NotificationMessage.success({
          message: 'Successfully Updated',
          description: 'Engagement stage updated successfully',
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
 * Hook for deleting an engagement stage.
 */
export const useDeleteEngagementStage = () => {
  const queryClient = useQueryClient();
  return useMutation(deleteEngagementStage, {
    onSuccess: () => {
      // Invalidate and refetch the engagement stages query
      queryClient.invalidateQueries(['engagementStages']);
      queryClient.refetchQueries(['engagementStages']);
      NotificationMessage.success({
        message: 'Successfully Deleted',
        description: 'Engagement stage deleted successfully',
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
