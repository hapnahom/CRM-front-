import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import { PipelineData, PipelineQueryParams } from './types';
import {
  buildPipelineQueryString,
  validateDashboardQueryParams,
  cleanParams,
} from '../utils';

// --- API Service Functions ---

/**
 * Fetches pipeline data for the current tenant.
 */
const getPipeline = async (
  params: PipelineQueryParams = {},
): Promise<PipelineData> => {
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

    const queryString = buildPipelineQueryString(params);

    const url = `${CRM_URL}/dashboard/pipeline${queryString ? `?${queryString}` : ''}`;

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
 * Hook for fetching pipeline data.
 */
export const useGetPipeline = (params: PipelineQueryParams = {}) => {
  const cleanedParams = cleanParams(params);

  return useQuery<PipelineData>(
    ['dashboard', 'pipeline', cleanedParams],
    () => getPipeline(params),
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
          error?.response?.data?.message || 'Failed to fetch pipeline data';
        NotificationMessage.error({
          message: 'Error',
          description: errorMessage,
        });
      },
    },
  );
};
