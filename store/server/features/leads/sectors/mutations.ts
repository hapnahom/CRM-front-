import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Sector } from './queries';

// --- Interfaces ---
export interface CreateSectorInput {
  name: string;
  description: string;
}

export interface UpdateSectorInput {
  name?: string;
  description?: string;
}

// --- Create Sector Mutation ---
export const useCreateSector = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: CreateSectorInput): Promise<Sector> => {
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
          url: `${CRM_URL}/sectors`,
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
      queryClient.invalidateQueries(['sectors']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Sector created successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to create sector';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Update Sector Mutation ---
export const useUpdateSector = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSectorInput;
    }): Promise<Sector> => {
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
          url: `${CRM_URL}/sectors/${id}`,
          method: 'PUT', // Backend uses PUT for sectors
          headers,
          data,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sectors']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Sector updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update sector';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Sector Mutation ---
export const useDeleteSector = () => {
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
          url: `${CRM_URL}/sectors/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sectors']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Sector deleted successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete sector';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
