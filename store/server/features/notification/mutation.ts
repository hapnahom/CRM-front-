import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  NotificationEventId,
  NotificationPreferenceItem,
} from '@/lib/notifications/types';
import { notificationQueryKeys } from './queries';

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

export function useUpdateNotificationStatus() {
  const queryClient = useQueryClient();
  const userId = useAuthenticationStore((s) => s.userId);

  return useMutation(
    async (notificationId: string) => {
      const headers = await notificationHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/${notificationId}/read`,
        method: 'PATCH',
        headers,
      });
    },
    {
      onSuccess: () => {
        if (userId) {
          queryClient.invalidateQueries(notificationQueryKeys.all(userId));
        }
      },
    },
  );
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const userId = useAuthenticationStore((s) => s.userId);

  return useMutation(
    async () => {
      const headers = await notificationHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/read-all`,
        method: 'PATCH',
        headers,
      });
    },
    {
      onSuccess: () => {
        if (userId) {
          queryClient.invalidateQueries(notificationQueryKeys.all(userId));
        }
      },
    },
  );
}

export function useClearReadNotifications() {
  const queryClient = useQueryClient();
  const userId = useAuthenticationStore((s) => s.userId);

  return useMutation(
    async () => {
      const headers = await notificationHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/read`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => {
        if (userId) {
          queryClient.invalidateQueries(notificationQueryKeys.all(userId));
        }
      },
    },
  );
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  const userId = useAuthenticationStore((s) => s.userId);

  return useMutation(
    async (
      preferences: Record<NotificationEventId, NotificationPreferenceItem>,
    ) => {
      const headers = await notificationHeaders();
      return crudRequest({
        url: `${CRM_URL}/notifications/preferences`,
        method: 'PUT',
        headers,
        data: { preferences },
      });
    },
    {
      onSuccess: () => {
        if (userId) {
          queryClient.invalidateQueries(
            notificationQueryKeys.preferences(userId),
          );
        }
      },
    },
  );
}
