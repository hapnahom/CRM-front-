import { useMutation, useQuery, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  NotificationItemDto,
  NotificationPreferencesResponse,
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

export const fetchNotifications = async (params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationItemDto[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/notifications`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchUnreadNotificationCount = async (): Promise<number> => {
  const headers = await authHeaders();
  const res = await crudRequest<number>({
    url: `${CRM_URL}/notifications/unread-count`,
    method: 'GET',
    headers,
  });
  return Number(res) || 0;
};

export const fetchNotificationPreferences =
  async (): Promise<NotificationPreferencesResponse> => {
    const headers = await authHeaders();
    return crudRequest({
      url: `${CRM_URL}/notifications/preferences`,
      method: 'GET',
      headers,
    });
  };

export function useGetNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}) {
  return useQuery(
    ['notifications', params?.unreadOnly, params?.limit],
    () => fetchNotifications(params),
    { refetchInterval: 30_000 },
  );
}

export function useGetUnreadNotificationCount() {
  return useQuery(
    ['notifications-unread-count'],
    fetchUnreadNotificationCount,
    {
      refetchInterval: 30_000,
    },
  );
}

export function useGetNotificationPreferences() {
  return useQuery(['notification-preferences'], fetchNotificationPreferences);
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation(
    async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/${id}/read`,
        method: 'PATCH',
        headers,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['notifications']);
        qc.invalidateQueries(['notifications-unread-count']);
      },
    },
  );
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation(
    async () => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/read-all`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['notifications']);
        qc.invalidateQueries(['notifications-unread-count']);
      },
    },
  );
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation(
    async (payload: {
      globalInAppEnabled?: boolean;
      globalEmailEnabled?: boolean;
      eventPreferences?: Record<string, { inApp: boolean; email: boolean }>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/preferences`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['notification-preferences']);
      },
    },
  );
}
