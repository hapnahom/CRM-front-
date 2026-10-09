import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Role } from './queries';

// --- Interfaces ---
export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

// --- Create Role Mutation ---
export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: CreateRoleInput): Promise<Role> => {
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
          url: `${CRM_URL}/roles`,
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
      queryClient.invalidateQueries(['roles']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Role created successfully',
      });
    },
    onMutate: async (newRole) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['roles']);

      // Snapshot the previous value
      const previousRoles = queryClient.getQueryData<Role[]>(['roles']);

      // Optimistically update to the new value
      if (previousRoles) {
        const optimisticRole = {
          id: 'temp-' + Date.now(),
          name: newRole.name,
          description: newRole.description || '',
          tenantId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData(['roles'], [...previousRoles, optimisticRole]);
      }

      // Return a context object with the snapshotted value
      return { previousRoles };
    },
    onError: (error: any, newRole, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles'], context.previousRoles);
      }

      // Handle error notifications
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to create role';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['roles']);
    },
  });
};

// --- Update Role Mutation ---
export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoleInput;
    }): Promise<Role> => {
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
          url: `${CRM_URL}/roles/${id}`,
          method: 'PUT',
          headers,
          data,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Role updated successfully',
      });
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['roles']);

      // Snapshot the previous value
      const previousRoles = queryClient.getQueryData<Role[]>(['roles']);

      // Optimistically update to the new value
      if (previousRoles) {
        const updatedRoles = previousRoles.map((role) =>
          role.id === id ? { ...role, ...data, updatedAt: new Date() } : role,
        );
        queryClient.setQueryData(['roles'], updatedRoles);
      }

      // Return a context object with the snapshotted value
      return { previousRoles };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles'], context.previousRoles);
      }

      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      let errorMessage =
        error?.response?.data?.message || 'Failed to update role';

      // Handle specific constraint violation error
      if (
        error?.response?.data?.message?.includes(
          'duplicate key value violates unique constraint',
        ) ||
        error?.response?.data?.message?.includes(
          'IDX_078ede97be459ad1cea370e406',
        )
      ) {
        errorMessage =
          'A role with this name already exists. Please choose a different name.';
      }

      NotificationMessage.error({
        message: 'Update Failed',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['roles']);
    },
  });
};

// --- Delete Role Mutation ---
export const useDeleteRole = () => {
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
          url: `${CRM_URL}/roles/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Role deleted successfully',
      });
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['roles']);

      // Snapshot the previous value
      const previousRoles = queryClient.getQueryData<Role[]>(['roles']);

      // Optimistically remove from the list
      if (previousRoles) {
        const updatedRoles = previousRoles.filter((role) => role.id !== id);
        queryClient.setQueryData(['roles'], updatedRoles);
      }

      // Return a context object with the snapshotted value
      return { previousRoles };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles'], context.previousRoles);
      }

      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete role';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['roles']);
    },
  });
};
