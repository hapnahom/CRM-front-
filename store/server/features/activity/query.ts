import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  ACTIVITIES_URL,
  activitiesQueryKey,
  authHeaders,
  buildActivityQueryParams,
  customerActivitiesUrl,
  entityActivitiesUrl,
  retryUnlessUnauthorized,
} from './api';
import type {
  Activity,
  ActivityEntityType,
  ActivityQueryParams,
  PaginatedActivities,
} from './types';

function resolveEntityScope(
  params: ActivityQueryParams,
): { entityType: ActivityEntityType; entityId: string } | null {
  if (params.leadId) {
    return { entityType: 'LEAD', entityId: params.leadId };
  }
  if (params.dealId) {
    return { entityType: 'DEAL', entityId: params.dealId };
  }
  if (
    params.entityType === 'lead' &&
    (params as { entityId?: string }).entityId
  ) {
    return {
      entityType: 'LEAD',
      entityId: (params as { entityId: string }).entityId,
    };
  }
  if (
    params.entityType === 'deal' &&
    (params as { entityId?: string }).entityId
  ) {
    return {
      entityType: 'DEAL',
      entityId: (params as { entityId: string }).entityId,
    };
  }
  return null;
}

async function fetchActivities(
  params: ActivityQueryParams = {},
): Promise<PaginatedActivities> {
  const headers = await authHeaders();
  const scope = resolveEntityScope(params);
  const url = scope
    ? entityActivitiesUrl(scope.entityType, scope.entityId)
    : ACTIVITIES_URL;

  const response = await crudRequest({
    url,
    method: 'GET',
    headers,
    params: buildActivityQueryParams(params),
  });

  return (
    (response as PaginatedActivities) ?? {
      data: [],
      pagination: {
        totalItems: 0,
        currentPage: params.page ?? 1,
        itemsPerPage: params.pageSize ?? 20,
        totalPages: 1,
      },
    }
  );
}

async function fetchActivityById(id: string): Promise<Activity> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${ACTIVITIES_URL}/${id}`,
    method: 'GET',
    headers,
  });
}

async function fetchCustomerActivities(
  customerId: string,
  params: ActivityQueryParams = {},
): Promise<PaginatedActivities> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: customerActivitiesUrl(customerId),
    method: 'GET',
    headers,
    params: buildActivityQueryParams(params),
  });
  return (
    (response as PaginatedActivities) ?? {
      data: [],
      pagination: {
        totalItems: 0,
        currentPage: params.page ?? 1,
        itemsPerPage: params.pageSize ?? 20,
        totalPages: 1,
      },
    }
  );
}

export function useGetActivities(params: ActivityQueryParams = {}) {
  const scope = resolveEntityScope(params);
  const scopeKey = scope ? `${scope.entityType}:${scope.entityId}` : 'global';

  return useQuery({
    queryKey: activitiesQueryKey(scopeKey, params),
    queryFn: () => fetchActivities(params),
    keepPreviousData: true,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });
}

export function useGetActivityById(id: string) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => fetchActivityById(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });
}

export function useEntityActivities(
  entityType: ActivityEntityType,
  entityId: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: activitiesQueryKey(`${entityType}:${entityId}`, {
      page,
      pageSize,
    }),
    queryFn: async (): Promise<PaginatedActivities> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: entityActivitiesUrl(entityType, entityId),
        method: 'GET',
        headers,
        params: { page, pageSize, sortOrder: 'desc' },
      });
      return (
        (response as PaginatedActivities) ?? {
          data: [],
          pagination: {
            totalItems: 0,
            currentPage: page,
            itemsPerPage: pageSize,
            totalPages: 1,
          },
        }
      );
    },
    enabled: Boolean(entityId),
    keepPreviousData: true,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });
}

export function useCustomerActivities(
  customerId: string,
  params: ActivityQueryParams = {},
) {
  return useQuery({
    queryKey: activitiesQueryKey(`customer:${customerId}`, params),
    queryFn: () => fetchCustomerActivities(customerId, params),
    enabled: Boolean(customerId),
    keepPreviousData: true,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });
}
