import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import {
  StagnantDeal,
  StagnantDealsResponse,
  StagnantDealsStats,
  StagnantDealsQueryParams,
} from './types';
import {
  buildStagnantDealsQueryString,
  validateStagnantDealsQueryParams,
} from '../utils';

// --- API Service Functions ---

/**
 * Fetches stagnant deals with pagination for the current tenant.
 */
const getStagnantDeals = async (
  params: StagnantDealsQueryParams = {},
): Promise<StagnantDealsResponse> => {
  try {
    const validationErrors = validateStagnantDealsQueryParams(params);
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

    const queryString = buildStagnantDealsQueryString(params);

    const url = `${CRM_URL}/dashboard/stagnant-deals${queryString ? `?${queryString}` : ''}`;

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

/**
 * Fetches a single stagnant deal by ID.
 */
const getStagnantDealById = async (dealId: string): Promise<StagnantDeal> => {
  try {
    if (!dealId) {
      throw new Error('Deal ID is required');
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

    const response = await crudRequest({
      url: `${CRM_URL}/dashboard/stagnant-deals/${dealId}`,
      method: 'GET',
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches stagnant deals statistics.
 */
const getStagnantDealsStats = async (): Promise<StagnantDealsStats> => {
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
      url: `${CRM_URL}/dashboard/stagnant-deals/stats/summary`,
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
 * Hook for fetching stagnant deals with pagination.
 */
export const useGetStagnantDeals = (params: StagnantDealsQueryParams = {}) => {
  return useQuery<StagnantDealsResponse>(
    ['dashboard', 'stagnant-deals', params],
    () => getStagnantDeals(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message || 'Failed to fetch stagnant deals';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for fetching a single stagnant deal by ID.
 */
export const useGetStagnantDealById = (dealId: string) => {
  return useQuery<StagnantDeal>(
    ['dashboard', 'stagnant-deal', dealId],
    () => getStagnantDealById(dealId),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      enabled: !!dealId, // Only run query if ID exists
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message ||
          'Failed to fetch stagnant deal details';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for fetching stagnant deals statistics.
 */
export const useGetStagnantDealsStats = () => {
  return useQuery<StagnantDealsStats>(
    ['dashboard', 'stagnant-deals-stats'],
    getStagnantDealsStats,
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
          error?.response?.data?.message ||
          'Failed to fetch stagnant deals statistics';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
