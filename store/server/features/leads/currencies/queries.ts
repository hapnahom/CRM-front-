import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  getEnabledCurrencies,
  type Currency,
} from '@/store/server/features/tenant-management/tenant-currencies/queries';

export type { Currency };

/**
 * Hook for fetching org-enabled currencies for leads.
 */
export const useGetCurrencies = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<Currency[]>(['currencies', tenantId], getEnabledCurrencies, {
    enabled: Boolean(tenantId),
    keepPreviousData: true,
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to fetch currencies';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
