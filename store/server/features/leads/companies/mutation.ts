import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Company } from './queries';

// --- Configuration ---
// Remove hardcoded BASE_URL and use imported one

// --- Interfaces ---
export interface CreateCompanyInput {
  name: string;
  email: string;
  phone: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
  logo?: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
  logo?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// --- API Service Function ---

/**
 * Creates a new company.
 */
const createCompany = async (data: CreateCompanyInput): Promise<Company> => {
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
      url: `${CRM_URL}/companies`,
      method: 'POST',
      data: data,
      headers,
      // skipEncryption: true, // Disable encryption for this request
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hook ---

/**
 * Hook for creating a company.
 */
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation(createCompany, {
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      NotificationMessage.success({
        message: 'Successfully Created',
        description: 'Company created successfully',
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

// --- Update Company Mutation ---
export interface UpdateCompanyInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
  logo?: string;
}

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCompanyInput;
    }): Promise<Company> => {
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
          url: `${CRM_URL}/companies/${id}`,
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
      queryClient.invalidateQueries(['companies']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Company updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update company';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Company Mutation ---
export const useDeleteCompany = () => {
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
          url: `${CRM_URL}/companies/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Company deleted successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to delete company';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
