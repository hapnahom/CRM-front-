import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import {
  DashboardSummary,
  ConversionFunnelData,
  LeadSourcesData,
  DashboardQueryParams,
  ConversionFunnelQueryParams,
  LeadSourcesQueryParams,
} from './types';
import {
  buildDashboardQueryString,
  buildConversionFunnelQueryString,
  buildLeadSourcesQueryString,
  validateDashboardQueryParams,
  cleanParams,
} from './utils';

// --- API Service Functions ---

/**
 * Fetches complete dashboard summary for the current tenant.
 */
const getDashboardSummary = async (
  params: DashboardQueryParams = {},
): Promise<DashboardSummary> => {
  try {
    // Validate parameters
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

    // Build query parameters using utility function
    const queryString = buildDashboardQueryString(params);

    const url = `${CRM_URL}/dashboard/summary${queryString ? `?${queryString}` : ''}`;

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
 * Fetches conversion funnel data for the current tenant.
 */
const getConversionFunnel = async (
  params: ConversionFunnelQueryParams = {},
): Promise<ConversionFunnelData> => {
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

    const queryString = buildConversionFunnelQueryString(params);

    const url = `${CRM_URL}/dashboard/conversion-funnel${queryString ? `?${queryString}` : ''}`;

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
 * Fetches lead sources data for the current tenant.
 */
const getLeadSources = async (
  params: LeadSourcesQueryParams = {},
): Promise<LeadSourcesData> => {
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

    const queryString = buildLeadSourcesQueryString(params);

    const url = `${CRM_URL}/dashboard/lead-sources${queryString ? `?${queryString}` : ''}`;

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
 * Hook for fetching complete dashboard summary.
 */
export const useGetDashboardSummary = (params: DashboardQueryParams = {}) => {
  const cleanedParams = cleanParams(params);

  return useQuery<DashboardSummary>(
    ['dashboard', 'summary', cleanedParams],
    () => getDashboardSummary(params),
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
          error?.response?.data?.message || 'Failed to fetch dashboard summary';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for fetching conversion funnel data.
 */
export const useGetConversionFunnel = (
  params: ConversionFunnelQueryParams = {},
) => {
  const cleanedParams = cleanParams(params);

  return useQuery<ConversionFunnelData>(
    ['dashboard', 'conversion-funnel', cleanedParams],
    () => getConversionFunnel(params),
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
          'Failed to fetch conversion funnel data';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Hook for fetching lead sources data.
 */
export const useGetLeadSources = (params: LeadSourcesQueryParams = {}) => {
  const cleanedParams = cleanParams(params);

  return useQuery<LeadSourcesData>(
    ['dashboard', 'lead-sources', cleanedParams],
    () => getLeadSources(params),
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
          error?.response?.data?.message || 'Failed to fetch lead sources data';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
