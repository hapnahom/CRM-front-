import { CRM_URL } from '@/utils/constants';
import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';

const getAuthMe = async (token: string) => {
  if (!token || token.length === 0) {
    token = await getCurrentToken();
  }

  return crudRequest({
    url: `${CRM_URL}/auth/me`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const useGetAuthMe = () => {
  return {
    refetch: async (token: string) => {
      try {
        const data = await getAuthMe(token);
        return { data, isError: false as const };
      } catch (error) {
        return { data: null, isError: true as const, error };
      }
    },
  };
};

export const useGetTenant = (tenantId?: string) => {
  return useQuery<any>(
    ['tenant', tenantId],
    async () => {
      if (!tenantId) {
        throw new Error('Missing tenant ID');
      }
      return crudRequest({
        url: `${CRM_URL}/tenant/clients/${tenantId}`,
        method: 'GET',
      });
    },
    {
      enabled: Boolean(tenantId),
    },
  );
};
