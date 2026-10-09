import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Interfaces ---
export interface Currency {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantCurrency {
  id: string;
  currencyId: string;
  isActive: boolean;
  tenantId: string;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

// --- API Service Function ---

/**
 * Fetches tenant currencies for the current tenant.
 */
export const getTenantCurrencies = async (): Promise<TenantCurrency[]> => {
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
      url: `${CRM_URL}/tenant-currency`,
      method: 'GET',
      headers,
    });

    return Array.isArray(response) ? response : [];
  } catch (error) {
    throw error;
  }
};

export function toEnabledCurrencies(
  tenantCurrencies: TenantCurrency[],
): Currency[] {
  return tenantCurrencies
    .map((entry) => entry.currency)
    .filter((currency): currency is Currency => Boolean(currency));
}

/**
 * Fetches org-enabled currencies (mapped from tenant_currencies).
 */
export const getEnabledCurrencies = async (): Promise<Currency[]> => {
  const tenantCurrencies = await getTenantCurrencies();
  return toEnabledCurrencies(tenantCurrencies);
};

// --- React Query Hook ---

/**
 * Hook for fetching tenant currencies.
 */
export const useGetTenantCurrencies = (options?: { enabled?: boolean }) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;
  return useQuery<TenantCurrency[]>(
    ['tenantCurrencies', tenantId],
    getTenantCurrencies,
    {
      enabled: hookEnabled && Boolean(tenantId),
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message || 'Failed to fetch tenant currencies';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for fetching org-enabled currencies across deals, leads, and sales targeting.
 */
export const useGetEnabledCurrencies = (options?: { enabled?: boolean }) => {
  const query = useGetTenantCurrencies(options);
  // Stabilize reference so consumers' useEffects don't loop on every render.
  const data = useMemo(
    () => toEnabledCurrencies(query.data ?? []),
    [query.data],
  );

  return {
    ...query,
    data,
  };
};

/**
 * Get the default currency for the current tenant.
 */
export const useGetDefaultCurrency = (options?: { enabled?: boolean }) => {
  const { data: tenantCurrencies = [], isLoading } =
    useGetTenantCurrencies(options);

  // Find the active currency (default)
  const defaultCurrency = tenantCurrencies.find((tc) => tc.isActive);

  return {
    data: defaultCurrency?.currency || null,
    isLoading,
  };
};
