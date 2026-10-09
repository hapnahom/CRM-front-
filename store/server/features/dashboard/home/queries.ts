import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import type {
  HomeDashboardApiResponse,
  HomeDashboardQueryParams,
} from '@/app/(afterLogin)/dashboard/_components/home/types';

function cleanParams(params: HomeDashboardQueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== 'all',
    ),
  );
}

function buildQueryString(params: HomeDashboardQueryParams) {
  const cleaned = cleanParams(params);
  const search = new URLSearchParams();
  Object.entries(cleaned).forEach(([key, value]) => {
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function getHomeDashboard(
  params: HomeDashboardQueryParams = {},
): Promise<HomeDashboardApiResponse> {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;

  if (!tenantId) {
    throw new Error(
      'Tenant ID not found. Please ensure you are properly authenticated.',
    );
  }

  const response = await crudRequest({
    url: `${CRM_URL}/dashboard/home${buildQueryString(params)}`,
    method: 'GET',
    headers: {
      tenantId,
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

export function useGetHomeDashboard(
  params: HomeDashboardQueryParams = {},
  enabled = true,
) {
  const cleanedParams = cleanParams(params);

  return useQuery<HomeDashboardApiResponse>(
    ['dashboard', 'home', cleanedParams],
    () => getHomeDashboard(params),
    {
      enabled,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        NotificationMessage.error({
          message: 'Error',
          description:
            error?.response?.data?.message || 'Failed to load home dashboard',
        });
      },
    },
  );
}
