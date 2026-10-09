import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { TenantCurrency } from './queries';
import { invalidateCurrencyCaches } from '@/store/server/features/currencies/mutations';

// --- Interfaces ---
export interface CreateTenantCurrencyInput {
  currencyId: string;
  isActive?: boolean;
}

export interface UpdateTenantCurrencyInput {
  currencyId?: string;
  isActive?: boolean;
}

// --- Create Tenant Currency Mutation ---
export const useCreateTenantCurrency = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (
      data: CreateTenantCurrencyInput,
    ): Promise<TenantCurrency> => {
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
          url: `${CRM_URL}/tenant-currency`,
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
      invalidateCurrencyCaches(queryClient);
      NotificationMessage.success({
        message: 'Success',
        description: 'Currency added successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to add currency';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Update Tenant Currency Mutation ---
export const useUpdateTenantCurrency = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTenantCurrencyInput;
    }): Promise<TenantCurrency> => {
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
          url: `${CRM_URL}/tenant-currency/${id}`,
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
      invalidateCurrencyCaches(queryClient);
      NotificationMessage.success({
        message: 'Success',
        description: 'Currency updated successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to update currency';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Set Default Currency Mutation ---
export const useSetDefaultCurrency = () => {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (currencyId: string): Promise<void> => {
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

        // First, get all tenant currencies to find which ones to update
        const tenantCurrencies = await crudRequest({
          url: `${CRM_URL}/tenant-currency`,
          method: 'GET',
          headers,
        });

        const tenantCurrenciesArray = Array.isArray(tenantCurrencies)
          ? tenantCurrencies
          : [];

        // Set all currencies to inactive first
        for (const tc of tenantCurrenciesArray) {
          if (tc.isActive) {
            await crudRequest({
              url: `${CRM_URL}/tenant-currency/${tc.id}`,
              method: 'PATCH',
              headers,
              data: { isActive: false },
            });
          }
        }

        // Find the currency to set as default
        const targetCurrency = tenantCurrenciesArray.find(
          (tc) => tc.currencyId === currencyId,
        );

        if (targetCurrency) {
          // Set the selected currency as active
          await crudRequest({
            url: `${CRM_URL}/tenant-currency/${targetCurrency.id}`,
            method: 'PATCH',
            headers,
            data: { isActive: true },
          });
        } else {
          // If currency doesn't exist in tenant currencies, create it as active
          await crudRequest({
            url: `${CRM_URL}/tenant-currency`,
            method: 'POST',
            headers,
            data: { currencyId, isActive: true },
          });
        }
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCurrencyCaches(queryClient);
      NotificationMessage.success({
        message: 'Success',
        description: 'Default currency set successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to set default currency';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

// --- Delete Tenant Currency Mutation ---
export const useDeleteTenantCurrency = () => {
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
          url: `${CRM_URL}/tenant-currency/${id}`,
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      invalidateCurrencyCaches(queryClient);
      NotificationMessage.success({
        message: 'Success',
        description: 'Currency removed successfully',
      });
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to remove currency';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
