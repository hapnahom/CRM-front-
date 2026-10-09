import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type { CrmTeam, CrmTeamMember, PaginatedTeams } from './types';

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

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }
  return failureCount < 3;
};

export const fetchTeams = async (params?: {
  search?: string;
  departmentId?: string;
  targetParentLevel?: 'company' | 'department';
  page?: number;
  pageSize?: number;
}): Promise<PaginatedTeams> => {
  const headers = await authHeaders();
  const query: Record<string, string | number | boolean> = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 200,
  };
  if (params?.search) query.search = params.search;
  if (params?.departmentId) query.departmentId = params.departmentId;
  if (params?.targetParentLevel !== undefined) {
    query.targetParentLevel = params.targetParentLevel;
  }

  return crudRequest({
    url: `${CRM_URL}/teams`,
    method: 'GET',
    headers,
    params: query,
  });
};

export const fetchTeam = async (id: string): Promise<CrmTeam> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/teams/${id}`,
    method: 'GET',
    headers,
  });
};

export const fetchTeamMembers = async (
  id: string,
): Promise<CrmTeamMember[]> => {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/teams/${id}/members`,
    method: 'GET',
    headers,
  });
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const useGetCrmTeams = (params?: {
  search?: string;
  departmentId?: string;
  targetParentLevel?: 'company' | 'department';
  enabled?: boolean;
}) =>
  useQuery<PaginatedTeams>(
    [
      'crm-teams',
      params?.search ?? '',
      params?.departmentId ?? '',
      params?.targetParentLevel ?? '',
    ],
    () =>
      fetchTeams({
        search: params?.search,
        departmentId: params?.departmentId,
        targetParentLevel: params?.targetParentLevel,
        pageSize: 200,
      }),
    {
      enabled: params?.enabled !== false,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetCrmTeam = (id?: string) =>
  useQuery<CrmTeam>(['crm-team', id], () => fetchTeam(id!), {
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: retryUnlessUnauthorized,
  });

export const useGetCrmTeamMembers = (id?: string) =>
  useQuery<CrmTeamMember[]>(
    ['crm-team-members', id],
    () => fetchTeamMembers(id!),
    {
      enabled: Boolean(id),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
