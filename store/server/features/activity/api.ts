import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { ActivityEntityType, ActivityQueryParams } from './types';

export const ACTIVITIES_URL = `${CRM_URL}/activities`;

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export { retryUnlessUnauthorized } from '@/utils/retryUnlessUnauthorized';

export function activitiesQueryKey(
  scope: string,
  params?: ActivityQueryParams,
) {
  return ['activities', scope, params ?? {}] as const;
}

export function entityActivitiesUrl(
  entityType: ActivityEntityType,
  entityId: string,
): string {
  return `${ACTIVITIES_URL}/entities/${entityType}/${entityId}`;
}

export function customerActivitiesUrl(customerId: string): string {
  return `${ACTIVITIES_URL}/customers/${customerId}`;
}

export function buildActivityQueryParams(
  params: ActivityQueryParams = {},
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page != null) query.page = params.page;
  if (params.pageSize != null) query.pageSize = params.pageSize;
  else if ((params as { size?: number }).size != null) {
    query.pageSize = (params as { size?: number }).size!;
  }
  if (params.kind) query.kind = params.kind;
  if (params.origin) query.origin = params.origin;
  if (params.actorId) query.actorId = params.actorId;
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  if (params.sourceType) query.sourceType = params.sourceType;
  if (params.sourceId) query.sourceId = params.sourceId;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}
