import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  CustomField,
  CustomFieldType,
  CustomFieldAssociation,
} from './queries';

// --- Interfaces ---
export interface CreateCustomFieldInput {
  name: string;
  type: CustomFieldType;
  fieldValues: any[]; // Required - always an array (empty for non-dropdown fields)
  isRequired?: boolean;
  association?: CustomFieldAssociation; // Field association enum
  description?: string; // Optional field description
}

export interface UpdateCustomFieldInput {
  name?: string;
  type?: CustomFieldType;
  fieldValues: any[]; // Required - always an array (empty for non-dropdown fields)
  isRequired?: boolean;
  association?: CustomFieldAssociation; // Field association enum
  description?: string; // Optional field description
}

// --- Create Custom Field Mutation ---
export const useCreateCustomField = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: CreateCustomFieldInput): Promise<CustomField> => {
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
          url: `${CRM_URL}/custom-fields`,
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
      queryClient.invalidateQueries(['customFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Custom field created successfully',
      });
    },
    onMutate: async (newField) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['customFields']);

      // Snapshot the previous value
      const previousFields = queryClient.getQueryData<CustomField[]>([
        'customFields',
      ]);

      // Optimistically update to the new value
      if (previousFields) {
        const optimisticField = {
          id: 'temp-' + Date.now(),
          name: newField.name,
          type: newField.type,
          fieldValues: newField.fieldValues || [],
          isRequired: newField.isRequired || false,
          tenantId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData(
          ['customFields'],
          [...previousFields, optimisticField],
        );
      }

      // Return a context object with the snapshotted value
      return { previousFields };
    },
    onError: (error: any, newField, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFields) {
        queryClient.setQueryData(['customFields'], context.previousFields);
      }

      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to create custom field';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['customFields']);
    },
  });
};

// --- Update Custom Field Mutation ---
export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCustomFieldInput;
    }): Promise<CustomField> => {
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
          url: `${CRM_URL}/custom-fields/${id}`,
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
      queryClient.invalidateQueries(['customFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Custom field updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update custom field';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Custom Field Mutation ---
export const useDeleteCustomField = () => {
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
          url: `${CRM_URL}/custom-fields/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Custom field deleted successfully',
      });
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['customFields']);

      // Snapshot the previous value
      const previousFields = queryClient.getQueryData<CustomField[]>([
        'customFields',
      ]);

      // Optimistically remove from the list
      if (previousFields) {
        const updatedFields = previousFields.filter((field) => field.id !== id);
        queryClient.setQueryData(['customFields'], updatedFields);
      }

      // Return a context object with the snapshotted value
      return { previousFields };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFields) {
        queryClient.setQueryData(['customFields'], context.previousFields);
      }

      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete custom field';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['customFields']);
    },
  });
};
