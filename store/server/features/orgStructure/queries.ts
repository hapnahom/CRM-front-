import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type { OrgDepartmentNode } from './types';

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

/** CRM-owned department + team tree from local DB (not org-emp). */
const fetchDepartmentTree = async (): Promise<OrgDepartmentNode> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/org-structure/departments`,
    method: 'GET',
    headers,
  });
};

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }
  return failureCount < 3;
};

export const useGetOrgDepartmentTree = () =>
  useQuery<OrgDepartmentNode>(
    ['org-structure-departments'],
    fetchDepartmentTree,
    {
      staleTime: 60_000,
      retry: retryUnlessUnauthorized,
    },
  );
