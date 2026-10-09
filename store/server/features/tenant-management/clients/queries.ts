import { requestHeader } from '@/helpers/requestHeader';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { useQuery } from 'react-query';
import { Tenant } from '@/types/tenant-management';

const getClientById = async (id: string) => {
  const requestHeaders = await requestHeader();
  return await crudRequest({
    url: `${CRM_URL}/tenant/clients/${id}`,
    method: 'GET',
    headers: requestHeaders,
  });
};

export const useGetClientById = (id: string, isEnabled: boolean = true) => {
  return useQuery<Tenant>(['client', id], () => getClientById(id), {
    enabled: isEnabled && !!id,
    // Tenant proxy often 400s on preview; navbar already falls back to host label.
    retry: (failureCount, err) => {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status != null && status >= 400 && status < 500) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
    onError: () => {
      // Swallow — missing company name/logo is non-fatal for the shell.
    },
  });
};
