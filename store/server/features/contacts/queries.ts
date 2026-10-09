import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { mapContactsToCatalog } from './mapContacts';
import type { ContactResponse, ContactsCatalog } from './types';

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }
  return failureCount < 3;
};

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

const fetchContactsCatalog = async (): Promise<ContactsCatalog> => {
  const headers = await authHeaders();

  const response = await crudRequest({
    url: `${CRM_URL}/contacts`,
    method: 'GET',
    headers,
  });

  const apiContacts = Array.isArray(response)
    ? (response as ContactResponse[])
    : [];

  return mapContactsToCatalog(apiContacts);
};

/** Contacts tab: GET /contacts mapped to catalog shape. */
export const useGetContactsCatalog = (options?: { enabled?: boolean }) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled =
    Boolean(tenantId) &&
    (options?.enabled === undefined ? true : options.enabled);

  return useQuery<ContactsCatalog>(
    ['contacts-catalog', tenantId],
    fetchContactsCatalog,
    {
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      cacheTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: retryUnlessUnauthorized,
      enabled,
    },
  );
};

/** GET /contacts/unassigned — for linking existing contacts on customer detail. */
export function useGetUnassignedContacts(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery<ContactResponse[]>(
    ['contacts', 'unassigned', tenantId],
    async () => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/contacts/unassigned`,
        method: 'GET',
        headers,
      });
    },
    {
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
      enabled:
        Boolean(tenantId) &&
        (options?.enabled === undefined || options.enabled),
    },
  );
}
