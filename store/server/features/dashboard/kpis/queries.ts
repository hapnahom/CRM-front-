import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import { KPIData, KPISQueryParams } from './types';
import {
  buildKPIQueryString,
  validateDashboardQueryParams,
  cleanParams,
} from '../utils';

// --- API Service Functions ---

/**
 * Fetches KPIs only for the current tenant.
 */
const getKPIs = async (params: KPISQueryParams = {}): Promise<KPIData> => {
  try {
    const validationErrors = validateDashboardQueryParams(params);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

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

    const queryString = buildKPIQueryString(params);

    const url = `${CRM_URL}/dashboard/kpis${queryString ? `?${queryString}` : ''}`;

    const response = await crudRequest({
      url,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for fetching KPIs only.
 */
export const useGetKPIs = (params: KPISQueryParams = {}) => {
  // Clean params to remove undefined values for consistent query key
  const cleanedParams = cleanParams(params);

  return useQuery<KPIData>(
    ['dashboard', 'kpis', cleanedParams],
    () => getKPIs(params),
    {
      keepPreviousData: true,
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message || 'Failed to fetch KPI data';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
