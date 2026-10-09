import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type { PaginatedVectorsResponse, Vector } from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

const fetchVectors = async (
  searchTerm?: string,
): Promise<PaginatedVectorsResponse> => {
  const headers = await authHeaders();
  const params: Record<string, string | number> = {};
  if (searchTerm) params.searchTerm = searchTerm;

  const response = await crudRequest({
    url: `${CRM_URL}/vectors`,
    method: 'GET',
    headers,
    params,
  });

  const rows = Array.isArray(response?.data) ? response.data : [];
  return {
    ...response,
    data: rows as Vector[],
  };
};

export const useGetVectors = (searchTerm?: string) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<PaginatedVectorsResponse>(
    ['vectors', searchTerm ?? '', tenantId],
    () => fetchVectors(searchTerm),
    {
      keepPreviousData: true,
      staleTime: 60_000,
      enabled: Boolean(tenantId),
    },
  );
};
