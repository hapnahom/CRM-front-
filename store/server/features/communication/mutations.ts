import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL, appPath } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { communicationAuthHeaders, communicationQueryKeys } from './queries';
import type {
  ConnectEmailAccountResponse,
  CrmEmailMessageDetail,
  CrmEmailSignature,
  SendEmailPayload,
} from './types';
import type { TodoTaskType } from '@/modules/communication/data/mockData';

function invalidateMailbox(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId?: string,
) {
  queryClient.invalidateQueries(communicationQueryKeys.accountsBase);
  if (accountId) {
    queryClient.invalidateQueries(communicationQueryKeys.folders(accountId));
    queryClient.invalidateQueries(['communication-messages', accountId]);
    queryClient.invalidateQueries(['communication-message', accountId]);
    queryClient.invalidateQueries(['communication-calendar-events', accountId]);
  } else {
    queryClient.invalidateQueries(['communication-folders']);
    queryClient.invalidateQueries(['communication-messages']);
    queryClient.invalidateQueries(['communication-message']);
    queryClient.invalidateQueries(['communication-calendar-events']);
  }
}

function invalidateTasksAndCalendar(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries(communicationQueryKeys.tasks);
  queryClient.invalidateQueries(['communication-calendar-events']);
}

/** After send/sync, Graph → CRM lag: refresh list a few times. */
function scheduleMailboxRefetch(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  delaysMs: number[] = [2000, 6000, 14000],
) {
  for (const ms of delaysMs) {
    window.setTimeout(() => invalidateMailbox(queryClient, accountId), ms);
  }
}

export const useConnectEmailAccount = () => {
  return useMutation(
    async (provider: 'microsoft365' | 'gmail' = 'microsoft365') => {
      const headers = await communicationAuthHeaders();
      const successUrl = `${window.location.origin}${appPath('/communication')}`;
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/connect`,
        method: 'POST',
        headers,
        data: {
          provider,
          redirectSuccessUrl: successUrl,
          redirectFailureUrl: successUrl,
        },
      }) as Promise<ConnectEmailAccountResponse>;
    },
  );
};

export const useDisconnectEmailAccount = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (accountId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${accountId}/disconnect`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: (result, accountId) => {
        void result;
        invalidateMailbox(queryClient, accountId);
        invalidateTasksAndCalendar(queryClient);
      },
    },
  );
};

export const useRemoveEmailAccount = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (accountId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${accountId}/remove`,
        method: 'POST',
        headers,
      }) as Promise<{
        removed: boolean;
        accountId: string;
        detachedTaskCount?: number;
      }>;
    },
    {
      onSuccess: (result, accountId) => {
        void result;
        invalidateMailbox(queryClient, accountId);
        invalidateMailbox(queryClient);
        invalidateTasksAndCalendar(queryClient);
      },
    },
  );
};

export const useSetDefaultEmailAccount = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (accountId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${accountId}/default`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: () => invalidateMailbox(queryClient),
    },
  );
};

/** Persist which mailbox is currently selected in the CRM UI (for invite routing). */
export const useSelectEmailAccount = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (accountId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${accountId}/select`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: (result, accountId) => {
        void result;
        queryClient.invalidateQueries(communicationQueryKeys.accountsBase);
        queryClient.invalidateQueries([
          'communication-calendar-events',
          accountId,
        ]);
        queryClient.invalidateQueries(['communication-calendar-events']);
      },
    },
  );
};

export const useTriggerEmailSync = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { accountId: string; mode?: 'full' | 'incremental' }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/sync`,
        method: 'POST',
        headers,
        data: { mode: params.mode || 'incremental' },
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateMailbox(queryClient, vars.accountId);
        scheduleMailboxRefetch(
          queryClient,
          vars.accountId,
          [2000, 6000, 12000],
        );
      },
    },
  );
};

export const useSendEmail = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { accountId: string; payload: SendEmailPayload }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/send`,
        method: 'POST',
        headers,
        data: params.payload,
      });
    },
    {
      onSuccess: async (result, vars) => {
        void result;
        // Backend already pulled recent Sent with full bodies before returning.
        invalidateMailbox(queryClient, vars.accountId);
        scheduleMailboxRefetch(
          queryClient,
          vars.accountId,
          [1500, 5000, 12000],
        );
      },
    },
  );
};

export const useReconnectEmailAccount = () => {
  return useMutation(async (accountId: string) => {
    const headers = await communicationAuthHeaders();
    const successUrl = `${window.location.origin}${appPath('/communication')}`;
    return crudRequest({
      url: `${CRM_URL}/communication/accounts/${accountId}/reconnect`,
      method: 'POST',
      headers,
      data: {
        redirectSuccessUrl: successUrl,
        redirectFailureUrl: successUrl,
      },
    }) as Promise<ConnectEmailAccountResponse>;
  });
};

export const useUpdateMailboxMessage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      accountId: string;
      messageId: string;
      isRead?: boolean;
      isStarred?: boolean;
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/messages/${params.messageId}`,
        method: 'PATCH',
        headers,
        data: {
          ...(typeof params.isRead === 'boolean'
            ? { isRead: params.isRead }
            : {}),
          ...(typeof params.isStarred === 'boolean'
            ? { isStarred: params.isStarred }
            : {}),
        },
      });
    },
    {
      onSuccess: (unusedResult, vars) => {
        void unusedResult;
        queryClient.setQueriesData<CrmEmailMessageDetail | undefined>(
          communicationQueryKeys.message(vars.accountId, vars.messageId),
          (old) =>
            old
              ? {
                  ...old,
                  ...(typeof vars.isRead === 'boolean'
                    ? { isRead: vars.isRead }
                    : {}),
                  ...(typeof vars.isStarred === 'boolean'
                    ? { isStarred: vars.isStarred }
                    : {}),
                }
              : old,
        );
        queryClient.invalidateQueries([
          'communication-messages',
          vars.accountId,
        ]);
      },
    },
  );
};

export const useMoveMailboxMessage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      accountId: string;
      messageId: string;
      action?: 'archive';
      folderId?: string;
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/messages/${params.messageId}/move`,
        method: 'POST',
        headers,
        data: {
          ...(params.action ? { action: params.action } : {}),
          ...(params.folderId ? { folderId: params.folderId } : {}),
        },
      });
    },
    {
      onSuccess: (unusedResult, vars) => {
        void unusedResult;
        invalidateMailbox(queryClient, vars.accountId);
      },
    },
  );
};

export const useDeleteMailboxMessage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { accountId: string; messageId: string }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/messages/${params.messageId}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: (unusedResult, vars) => {
        void unusedResult;
        invalidateMailbox(queryClient, vars.accountId);
      },
    },
  );
};

export const useCreateCommunicationTask = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (body: {
      title: string;
      description?: string;
      taskType?: TodoTaskType;
      priority?: 'low' | 'medium' | 'high';
      dueAt?: string;
      dueIsAllDay?: boolean;
      timeZone?: string;
      tags?: string[];
      connectedAccountId?: string;
      leadId?: string;
      dealId?: string;
      customerId?: string;
      contactId?: string;
      assigneeUserIds?: string[];
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/tasks`,
        method: 'POST',
        headers,
        data: body,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
        queryClient.invalidateQueries(['communication-calendar-events']);
      },
    },
  );
};

export const useToggleCommunicationTask = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (taskId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/tasks/${taskId}/toggle`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
        queryClient.invalidateQueries(['communication-calendar-events']);
      },
    },
  );
};

export const useDeleteCommunicationTask = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (taskId: string) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/tasks/${taskId}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
        queryClient.invalidateQueries(['communication-calendar-events']);
      },
    },
  );
};

export const useUpdateCommunicationTask = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      taskId: string;
      body: {
        title?: string;
        description?: string | null;
        taskType?: TodoTaskType;
        priority?: 'low' | 'medium' | 'high';
        dueAt?: string | null;
        dueIsAllDay?: boolean;
        timeZone?: string | null;
        status?: 'open' | 'completed';
        assigneeUserIds?: string[];
        connectedAccountId?: string | null;
        leadId?: string | null;
        dealId?: string | null;
        customerId?: string | null;
        contactId?: string | null;
      };
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/tasks/${params.taskId}`,
        method: 'PATCH',
        headers,
        data: params.body,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
        queryClient.invalidateQueries(['communication-calendar-events']);
      },
    },
  );
};

export type CalendarEventWritePayload = {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  timeZone?: string | null;
  isAllDay?: boolean;
  category?: string;
  attendees?: Array<{ email: string; name?: string | null }>;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
};

function invalidateCalendar(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId?: string,
) {
  if (accountId) {
    queryClient.invalidateQueries(['communication-calendar-events', accountId]);
  } else {
    queryClient.invalidateQueries(['communication-calendar-events']);
  }
}

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { accountId: string; body: CalendarEventWritePayload }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/calendar/events`,
        method: 'POST',
        headers,
        data: params.body,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateCalendar(queryClient, vars.accountId);
      },
    },
  );
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      accountId: string;
      eventId: string;
      body: Partial<CalendarEventWritePayload>;
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/calendar/events/${params.eventId}`,
        method: 'PATCH',
        headers,
        data: params.body,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateCalendar(queryClient, vars.accountId);
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
      },
    },
  );
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { accountId: string; eventId: string }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/accounts/${params.accountId}/calendar/events/${params.eventId}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateCalendar(queryClient, vars.accountId);
        // Event delete may unlink a CRM task — refresh todos.
        queryClient.invalidateQueries(communicationQueryKeys.tasks);
      },
    },
  );
};

function invalidateSignatures(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId?: string | null,
) {
  queryClient.invalidateQueries(['communication-signatures']);
  if (accountId) {
    queryClient.invalidateQueries(
      communicationQueryKeys.providerSignature(accountId),
    );
  }
}

export const useCreateEmailSignature = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (body: {
      name: string;
      bodyHtml?: string;
      bodyText?: string;
      accountId?: string | null;
      isDefault?: boolean;
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures`,
        method: 'POST',
        headers,
        data: body,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateSignatures(queryClient, vars.accountId);
      },
    },
  );
};

export const useUpdateEmailSignature = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      id: string;
      patch: {
        name?: string;
        bodyHtml?: string;
        bodyText?: string;
        accountId?: string | null;
        isDefault?: boolean;
        isActive?: boolean;
      };
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures/${params.id}`,
        method: 'PATCH',
        headers,
        data: params.patch,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateSignatures(queryClient, vars.patch.accountId);
      },
    },
  );
};

export const useDeleteEmailSignature = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { id: string; accountId?: string | null }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures/${params.id}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateSignatures(queryClient, vars.accountId);
      },
    },
  );
};

export const useImportGmailSignature = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: string | { accountId: string; sync?: boolean }) => {
      const accountId = typeof params === 'string' ? params : params.accountId;
      const sync = typeof params === 'string' ? undefined : params.sync;
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures/import-from-gmail`,
        method: 'POST',
        headers,
        data: { accountId, ...(sync ? { sync: true } : {}) },
      }) as Promise<{
        imported: boolean;
        reason: string;
        signature: CrmEmailSignature | null;
      }>;
    },
    {
      onSuccess: (result, params) => {
        void result;
        const accountId =
          typeof params === 'string' ? params : params.accountId;
        invalidateSignatures(queryClient, accountId);
      },
    },
  );
};

export const usePushSignatureToGmail = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: { signatureId: string; accountId?: string | null }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures/${params.signatureId}/push-to-gmail`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateSignatures(queryClient, vars.accountId);
      },
    },
  );
};

export const useSetSignatureDefaults = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (params: {
      accountId: string;
      newSignatureId?: string | null;
      replySignatureId?: string | null;
      omitSignatureSeparator?: boolean;
    }) => {
      const headers = await communicationAuthHeaders();
      return crudRequest({
        url: `${CRM_URL}/communication/signatures/defaults`,
        method: 'POST',
        headers,
        data: params,
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateSignatures(queryClient, vars.accountId);
      },
    },
  );
};
