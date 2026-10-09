import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Solution } from './queries';

// --- Interfaces ---
export interface CreateSolutionInput {
  name: string;
  description?: string;
}

export interface UpdateSolutionInput {
  name?: string;
  description?: string;
}

// --- Create Solution Mutation ---
export const useCreateSolution = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: CreateSolutionInput): Promise<Solution> => {
      try {
        const token = await getCurrentToken();

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
          url: `${CRM_URL}/solution`,
          method: 'POST',
          headers,
          data,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solutions']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Solution created successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to create solution';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Update Solution Mutation ---
export const useUpdateSolution = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSolutionInput;
    }): Promise<Solution> => {
      try {
        const token = await getCurrentToken();

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
          url: `${CRM_URL}/solution/${id}`,
          method: 'PATCH',
          headers,
          data,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solutions']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Solution updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update solution';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Solution Mutation ---
export const useDeleteSolution = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      try {
        const token = await getCurrentToken();

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
          url: `${CRM_URL}/solution/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solutions']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Solution deleted successfully',
      });
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['solutions']);

      // Snapshot the previous value
      const previousSolutions = queryClient.getQueryData<Solution[]>([
        'solutions',
      ]);

      // Optimistically remove from the list
      if (previousSolutions) {
        const updatedSolutions = previousSolutions.filter(
          (solution) => solution.id !== id,
        );
        queryClient.setQueryData(['solutions'], updatedSolutions);
      }

      // Return a context object with the snapshotted value
      return { previousSolutions };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSolutions) {
        queryClient.setQueryData(['solutions'], context.previousSolutions);
      }

      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete solution';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['solutions']);
    },
  });
};
