import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { formatUserName } from '@/lib/format-user-name';
import {
  PlatformUser,
  PlatformUsersResponse,
  UserStats,
  UserFilters,
  RoleOption,
  TeamOption,
  ExternalUser,
  RoleDetail,
  RoleSummary,
} from './types';

// ─── Shared auth headers ──────────────────────────────────────────────────────
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

// ─── GET /users ───────────────────────────────────────────────────────────────
const fetchPlatformUsers = async (
  filters: UserFilters = {},
): Promise<PlatformUsersResponse> => {
  const safeFilters = filters ?? {};
  const headers = await authHeaders();
  const params: Record<string, string | number> = {
    page: safeFilters.page ?? 1,
    pageSize: safeFilters.pageSize ?? 20,
  };
  if (safeFilters.search) params.search = safeFilters.search;
  if (safeFilters.status) params.status = safeFilters.status;
  if (safeFilters.roleId) params.roleId = safeFilters.roleId;
  if (safeFilters.teamId) params.teamId = safeFilters.teamId;

  const raw = await crudRequest({
    url: `${CRM_URL}/users`,
    method: 'GET',
    headers,
    params,
  });
  return unwrapPlatformUsersResponse(raw, safeFilters);
};

function unwrapPlatformUsersResponse(
  raw: unknown,
  filters: UserFilters,
): PlatformUsersResponse {
  const empty: PlatformUsersResponse = {
    data: [],
    pagination: {
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 0,
    },
  };

  let current: unknown = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return {
        data: current as PlatformUser[],
        pagination: {
          total: current.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? current.length,
          totalPages: 1,
        },
      };
    }
    if (!current || typeof current !== 'object') return empty;
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return {
        data: obj.data as PlatformUser[],
        pagination: {
          total: Number(
            (obj.pagination as { total?: number } | undefined)?.total ??
              obj.data.length,
          ),
          page: Number(
            (obj.pagination as { page?: number } | undefined)?.page ??
              filters.page ??
              1,
          ),
          pageSize: Number(
            (obj.pagination as { pageSize?: number } | undefined)?.pageSize ??
              filters.pageSize ??
              obj.data.length,
          ),
          totalPages: Number(
            (obj.pagination as { totalPages?: number } | undefined)
              ?.totalPages ?? 1,
          ),
        },
      };
    }
    if ('data' in obj) {
      current = obj.data;
      continue;
    }
    return empty;
  }
  return empty;
}

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as any)?.response?.status;
  if (status === 401 || status === 403) return false;
  return failureCount < 3;
};

export const useGetPlatformUsers = (
  filters: UserFilters = {},
  options?: { enabled?: boolean },
) =>
  useQuery<PlatformUsersResponse>(
    ['platform-users', filters ?? {}],
    () => fetchPlatformUsers(filters ?? {}),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      cacheTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: retryUnlessUnauthorized,
    },
  );

// ─── GET /users/stats ─────────────────────────────────────────────────────────
const fetchUserStats = async (): Promise<UserStats> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/users/stats`,
    method: 'GET',
    headers,
  });
};

export const useGetUserStats = () =>
  useQuery<UserStats>(['user-stats'], fetchUserStats, {
    staleTime: 30_000,
  });

// ─── GET /roles (for selectors) ───────────────────────────────────────────────
const fetchRoles = async (): Promise<RoleOption[]> => {
  const headers = await authHeaders();
  const res = await crudRequest({
    url: `${CRM_URL}/roles`,
    method: 'GET',
    headers,
    params: { pageSize: 200 },
  });
  // roles API returns { data: [...], pagination: {...} }
  return (res?.data ?? res ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
  }));
};

export const useGetRoleOptions = () =>
  useQuery<RoleOption[]>(['role-options'], fetchRoles, { staleTime: 60_000 });

const fetchRoleSummaries = async (): Promise<RoleSummary[]> => {
  const headers = await authHeaders();
  const res = await crudRequest({
    url: `${CRM_URL}/roles`,
    method: 'GET',
    headers,
    params: { pageSize: 200 },
  });
  return res?.data ?? [];
};

export const useGetRoleSummaries = () =>
  useQuery<RoleSummary[]>(['user-management-roles'], fetchRoleSummaries, {
    staleTime: 30_000,
    retry: retryUnlessUnauthorized,
  });

const fetchRoleDetail = async (id: string): Promise<RoleDetail> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/roles/${id}`,
    method: 'GET',
    headers,
  });
};

export const useGetRoleDetail = (id: string | null) =>
  useQuery<RoleDetail>(
    ['user-management-role', id],
    () => fetchRoleDetail(id as string),
    {
      enabled: Boolean(id),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

// ─── GET /teams (for selectors + filter) ─────────────────────────────────────
const fetchTeams = async (): Promise<TeamOption[]> => {
  const headers = await authHeaders();
  const res = await crudRequest({
    url: `${CRM_URL}/teams`,
    method: 'GET',
    headers,
    params: { pageSize: 200 },
  });
  return (res?.data ?? res ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
  }));
};

export const useGetTeamOptions = () =>
  useQuery<TeamOption[]>(['team-options'], fetchTeams, { staleTime: 60_000 });

// ─── GET /invitations/external-users ─────────────────────────────────────────
const fetchExternalUsers = async (): Promise<ExternalUser[]> => {
  const headers = await authHeaders();
  const res = await crudRequest({
    url: `${CRM_URL}/invitations/external-users`,
    method: 'GET',
    headers,
  });
  // Normalise whatever the proxy returns to an array
  const raw = res;
  const arr: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
        ? raw.items
        : [];
  return arr.map((u: any) => ({
    ...u,
    id: u.id ?? u.selamnewId ?? u._id,
    name: formatUserName(u, 'Unknown'),
    email: u.email ?? '',
  }));
};

export const useGetExternalUsers = () =>
  useQuery<ExternalUser[]>(['external-users'], fetchExternalUsers, {
    staleTime: 60_000,
    retry: 1,
  });

// ─── Export helper (blob download) ───────────────────────────────────────────
export const downloadUsersExport = async (
  filters: Omit<UserFilters, 'page' | 'pageSize'>,
): Promise<void> => {
  const headers = await authHeaders();
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.roleId) params.roleId = filters.roleId;
  if (filters.teamId) params.teamId = filters.teamId;

  const res = await crudRequest({
    url: `${CRM_URL}/users/export`,
    method: 'GET',
    headers: {
      ...headers,
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    params,
    responseType: 'blob',
  });

  const blob = new Blob([res], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
