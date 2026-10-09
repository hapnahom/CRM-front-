import { useQuery } from 'react-query';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';

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

  if (response?.items && Array.isArray(response.items)) {
    return response.items;
  }
  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
};

export const useGetUsers = () => {
  return useQuery<User[]>(['users'], getUsers, {
    keepPreviousData: true,
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
    cacheTime: 0,
    onError: () => {},
  });
};
