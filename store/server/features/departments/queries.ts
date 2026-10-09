import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CrmDepartment,
  OrganizationStructureSettings,
  PaginatedDepartments,
} from './types';

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

export const fetchDepartments = async (params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedDepartments> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/departments`,
    method: 'GET',
    headers,
    params: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 100,
      ...(params?.search ? { search: params.search } : {}),
    },
  });
};

/** Fetch every CRM department, following pagination until exhausted. */
export const fetchAllDepartments = async (params?: {
  search?: string;
  pageSize?: number;
}): Promise<PaginatedDepartments> => {
  const pageSize = params?.pageSize ?? 200;
  const first = await fetchDepartments({
    search: params?.search,
    page: 1,
    pageSize,
  });

  const firstData = Array.isArray(first?.data)
    ? first.data
    : Array.isArray(first)
      ? (first as unknown as CrmDepartment[])
      : [];
  const totalPages = Math.max(1, first?.pagination?.totalPages ?? 1);

  if (totalPages <= 1) {
    return {
      data: firstData,
      pagination: first?.pagination ?? {
        total: firstData.length,
        page: 1,
        pageSize,
        totalPages: 1,
      },
    };
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (unused, i) =>
      fetchDepartments({
        search: params?.search,
        page: i + 2,
        pageSize,
      }),
    ),
  );

  const data = [
    ...firstData,
    ...rest.flatMap((page) => (Array.isArray(page?.data) ? page.data : [])),
  ];

  return {
    data,
    pagination: {
      total: first?.pagination?.total ?? data.length,
      page: 1,
      pageSize: data.length,
      totalPages: 1,
    },
  };
};

export const fetchDepartment = async (id: string): Promise<CrmDepartment> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/departments/${id}`,
    method: 'GET',
    headers,
  });
};

export const useGetDepartments = (
  search?: string,
  options?: { enabled?: boolean },
) =>
  useQuery<PaginatedDepartments>(
    ['crm-departments', search ?? ''],
    () => fetchAllDepartments({ search: search || undefined }),
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetDepartment = (id?: string) =>
  useQuery<CrmDepartment>(['crm-department', id], () => fetchDepartment(id!), {
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: retryUnlessUnauthorized,
  });

export const fetchOrganizationStructureSettings =
  async (): Promise<OrganizationStructureSettings> => {
    const headers = await authHeaders();
    return crudRequest({
      url: `${CRM_URL}/departments/organization-settings`,
      method: 'GET',
      headers,
    });
  };

export const useGetOrganizationStructureSettings = (options?: {
  enabled?: boolean;
}) =>
  useQuery<OrganizationStructureSettings>(
    ['crm-organization-structure-settings'],
    fetchOrganizationStructureSettings,
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
