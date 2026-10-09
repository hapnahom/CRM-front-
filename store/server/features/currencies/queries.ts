import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import type { CrmCurrency } from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchCrmCurrencies(): Promise<CrmCurrency[]> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/currencies`,
    method: 'GET',
    headers,
  });

  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
}

export const useGetCrmCurrencies = (enabled = true) => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<CrmCurrency[]>(
    ['crm-currencies', tenantId],
    fetchCrmCurrencies,
    {
      enabled: enabled && Boolean(tenantId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );
};
