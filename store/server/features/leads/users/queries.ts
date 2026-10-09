import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  [key: string]: any;
}

const getUsers = async (): Promise<User[]> => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;

  if (!tenantId) {
    throw new Error(
      'Tenant ID not found. Please ensure you are properly authenticated.',
    );
  }

  const headers = {
    tenantId,
    Authorization: `Bearer ${token}`,
  };

  const response = await crudRequest({
    url: `${CRM_URL}/org-emp/users`,
    method: 'GET',
    headers,
    params: { page: 1, size: 1000 },
  });

  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  if (response?.items && Array.isArray(response.items)) {
    return response.items;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
};

export const useGetUsers = () => {
  return useQuery<User[]>(['users'], getUsers, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to fetch users';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
