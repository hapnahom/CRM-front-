import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  NotificationType,
  NotificationPreferencesResponse,
} from './interface';

export const notificationQueryKeys = {
  all: (userId: string) => ['notifications', userId] as const,
  preferences: (userId: string) =>
    ['notification-preferences', userId] as const,
};

async function notificationHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export async function fetchNotifications(): Promise<NotificationType[]> {
  const headers = await notificationHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/notifications`,
    method: 'GET',
    headers,
  });
  return Array.isArray(response) ? response : [];
}

export function useGetNotifications(userId: string | undefined) {
  return useQuery(notificationQueryKeys.all(userId ?? ''), fetchNotifications, {
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const headers = await notificationHeaders();
  return crudRequest({
    url: `${CRM_URL}/notifications/preferences`,
    method: 'GET',
    headers,
  });
}

export function useGetNotificationPreferences(userId: string | undefined) {
  return useQuery(
    notificationQueryKeys.preferences(userId ?? ''),
    fetchNotificationPreferences,
    { enabled: Boolean(userId) },
  );
}
