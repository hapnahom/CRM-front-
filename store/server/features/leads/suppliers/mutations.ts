import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Supplier } from './queries';

// --- Interfaces ---
export interface CreateSupplierInput {
  name: string;
  description?: string;
  phone: string;
  email: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  logo?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  logo?: string;
}

// --- Create Supplier Mutation ---
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: CreateSupplierInput): Promise<Supplier> => {
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
          url: `${CRM_URL}/suppliers`,
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
      queryClient.invalidateQueries(['suppliers']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Supplier created successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to create supplier';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Update Supplier Mutation ---
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSupplierInput;
    }): Promise<Supplier> => {
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
          url: `${CRM_URL}/suppliers/${id}`,
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
      queryClient.invalidateQueries(['suppliers']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Supplier updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update supplier';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Supplier Mutation ---
export const useDeleteSupplier = () => {
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
          url: `${CRM_URL}/suppliers/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Supplier deleted successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete supplier';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
