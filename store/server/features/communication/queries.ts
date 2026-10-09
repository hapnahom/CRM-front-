import { useQuery } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CrmEmailAccount,
  CrmEmailFolder,
  CrmEmailMessageDetail,
  CrmConversationMessages,
  CrmPaginatedMessages,
  CrmCalendarEvent,
  CrmCommunicationTask,
  CrmCommunicationSettings,
  ProviderEmailSignature,
  CrmEmailSignature,
} from './types';

export async function communicationAuthHeaders(): Promise<
  Record<string, string>
> {
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

export const communicationQueryKeys = {
  accountsBase: ['communication-accounts'] as const,
  accounts: (userId?: string | null) =>
    ['communication-accounts', userId || ''] as const,
  folders: (accountId: string) => ['communication-folders', accountId] as const,
  messages: (
    accountId: string,
    folderId: string,
    q: string,
    isStarred?: boolean,
  ) =>
    [
      'communication-messages',
      accountId,
      folderId,
      q,
      isStarred ? 'starred' : '',
    ] as const,
  message: (accountId: string, messageId: string) =>
    ['communication-message', accountId, messageId] as const,
  conversation: (accountId: string, conversationId: string) =>
    ['communication-conversation', accountId, conversationId] as const,
  people: (accountId: string, q: string) =>
    ['communication-people', accountId, q] as const,
  providerSignature: (accountId: string) =>
    ['communication-provider-signature', accountId] as const,
  signatures: (accountId?: string) =>
    ['communication-signatures', accountId || 'all'] as const,
  calendarEvents: (accountId: string, from: string, to: string) =>
    ['communication-calendar-events', accountId, from, to] as const,
  tasks: ['communication-tasks'] as const,
  settings: ['communication-settings'] as const,
};

export async function fetchCommunicationSettings(): Promise<CrmCommunicationSettings> {
  const headers = await communicationAuthHeaders();
  return crudRequest({
    url: `${CRM_URL}/communication/settings`,
    method: 'GET',
    headers,
  }) as Promise<CrmCommunicationSettings>;
}

export async function fetchEmailAccounts(): Promise<CrmEmailAccount[]> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts`,
    method: 'GET',
    headers,
  });
  return Array.isArray(response) ? response : [];
}

export async function fetchEmailFolders(
  accountId: string,
): Promise<CrmEmailFolder[]> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/folders`,
    method: 'GET',
    headers,
  });
  return Array.isArray(response) ? response : [];
}

export async function fetchEmailMessages(params: {
  accountId: string;
  folderId?: string;
  q?: string;
  limit?: number;
  cursor?: string;
  isStarred?: boolean;
}): Promise<CrmPaginatedMessages> {
  const headers = await communicationAuthHeaders();
  const query: Record<string, string | number | boolean> = {
    limit: params.limit ?? 100,
  };
  if (params.folderId) query.folderId = params.folderId;
  if (params.q) query.q = params.q;
  if (params.cursor) query.cursor = params.cursor;
  if (typeof params.isStarred === 'boolean') query.isStarred = params.isStarred;

  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${params.accountId}/messages`,
    method: 'GET',
    headers,
    params: query,
  });

  return {
    items: Array.isArray(response?.items) ? response.items : [],
    nextCursor: response?.nextCursor ?? null,
  };
}

/** Walk cursor pages until the selected folder is fully loaded. */
export async function fetchAllEmailMessages(params: {
  accountId: string;
  folderId?: string;
  q?: string;
  isStarred?: boolean;
}): Promise<CrmPaginatedMessages> {
  const items: CrmPaginatedMessages['items'] = [];
  let cursor: string | undefined;
  // Cap pages to avoid runaway loops if the API misbehaves.
  for (let page = 0; page < 50; page += 1) {
    const result = await fetchEmailMessages({
      ...params,
      limit: 200,
      cursor,
    });
    items.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return { items, nextCursor: null };
}

export async function fetchEmailMessage(
  accountId: string,
  messageId: string,
): Promise<CrmEmailMessageDetail> {
  const headers = await communicationAuthHeaders();
  return crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/messages/${messageId}`,
    method: 'GET',
    headers,
  });
}

export async function fetchEmailConversation(
  accountId: string,
  conversationId: string,
): Promise<CrmConversationMessages> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/messages/conversation/${encodeURIComponent(conversationId)}`,
    method: 'GET',
    headers,
  });
  return {
    providerConversationId: response?.providerConversationId || conversationId,
    items: Array.isArray(response?.items) ? response.items : [],
  };
}

export const useGetCommunicationSettings = () =>
  useQuery(communicationQueryKeys.settings, fetchCommunicationSettings, {
    staleTime: 5 * 60_000,
    cacheTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: retryUnlessUnauthorized,
  });

export const useGetEmailAccounts = (enabled = true) => {
  const userId = useAuthenticationStore((s) => s.userId);
  return useQuery(communicationQueryKeys.accounts(userId), fetchEmailAccounts, {
    enabled: enabled && Boolean(userId),
    keepPreviousData: true,
    staleTime: 60_000,
    cacheTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: retryUnlessUnauthorized,
  });
};

export const useGetEmailFolders = (accountId?: string | null) =>
  useQuery(
    communicationQueryKeys.folders(accountId || ''),
    () => fetchEmailFolders(accountId as string),
    {
      enabled: Boolean(accountId),
      keepPreviousData: true,
      staleTime: 60_000,
      cacheTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetEmailMessages = (params: {
  accountId?: string | null;
  folderId?: string | null;
  q?: string;
  isStarred?: boolean;
  enabled?: boolean;
}) =>
  useQuery(
    communicationQueryKeys.messages(
      params.accountId || '',
      params.folderId || '',
      params.q || '',
      params.isStarred,
    ),
    () =>
      fetchAllEmailMessages({
        accountId: params.accountId as string,
        folderId: params.folderId || undefined,
        q: params.q || undefined,
        isStarred: params.isStarred,
      }),
    {
      enabled:
        Boolean(params.accountId) &&
        (params.enabled !== undefined
          ? params.enabled
          : Boolean(params.folderId) || params.isStarred === true),
      keepPreviousData: true,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetEmailMessage = (
  accountId?: string | null,
  messageId?: string | null,
) =>
  useQuery(
    communicationQueryKeys.message(accountId || '', messageId || ''),
    () => fetchEmailMessage(accountId as string, messageId as string),
    {
      enabled: Boolean(accountId) && Boolean(messageId),
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetEmailConversation = (
  accountId?: string | null,
  conversationId?: string | null,
) =>
  useQuery(
    communicationQueryKeys.conversation(accountId || '', conversationId || ''),
    () => fetchEmailConversation(accountId as string, conversationId as string),
    {
      enabled: Boolean(accountId) && Boolean(conversationId),
      retry: retryUnlessUnauthorized,
    },
  );

export interface CrmPersonSuggestion {
  name: string;
  email: string;
}

export async function searchMailboxPeople(
  accountId: string,
  q: string,
): Promise<CrmPersonSuggestion[]> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/people`,
    method: 'GET',
    headers,
    params: { q },
  });
  return Array.isArray(response) ? response : [];
}

export const useSearchMailboxPeople = (
  accountId?: string | null,
  q?: string,
) => {
  const query = (q || '').trim();
  return useQuery(
    communicationQueryKeys.people(accountId || '', query),
    () => searchMailboxPeople(accountId as string, query),
    {
      enabled: Boolean(accountId) && query.length >= 2,
      keepPreviousData: false,
      staleTime: 15_000,
      cacheTime: 60_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export async function fetchProviderEmailSignature(
  accountId: string,
): Promise<ProviderEmailSignature> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/signature`,
    method: 'GET',
    headers,
  });
  return {
    html: typeof response?.html === 'string' ? response.html : '',
    text: typeof response?.text === 'string' ? response.text : undefined,
    source:
      response?.source === 'gmail' || response?.source === 'microsoft'
        ? response.source
        : 'none',
    supported: response?.supported !== false,
  };
}

/** Provider (Gmail/M365) signature for settings import preview. */
export const useProviderEmailSignature = (
  accountId?: string | null,
  enabled = true,
) =>
  useQuery(
    communicationQueryKeys.providerSignature(accountId || ''),
    () => fetchProviderEmailSignature(accountId as string),
    {
      enabled: Boolean(accountId) && enabled,
      staleTime: 5 * 60_000,
      cacheTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: retryUnlessUnauthorized,
    },
  );

export async function fetchEmailSignatures(
  accountId?: string | null,
): Promise<CrmEmailSignature[]> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/signatures`,
    method: 'GET',
    headers,
    params: accountId ? { accountId } : undefined,
  });
  return Array.isArray(response) ? response : [];
}

export const useGetEmailSignatures = (
  accountId?: string | null,
  enabled = true,
) =>
  useQuery(
    communicationQueryKeys.signatures(accountId || undefined),
    () => fetchEmailSignatures(accountId),
    {
      enabled,
      staleTime: 60_000,
      cacheTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: retryUnlessUnauthorized,
    },
  );

export async function fetchCalendarEvents(
  accountId: string,
  from: string,
  to: string,
): Promise<CrmCalendarEvent[]> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/calendar/events`,
    method: 'GET',
    headers,
    params: { from, to },
  });
  return Array.isArray(response) ? response : [];
}

export const useGetCalendarEvents = (
  accountId?: string | null,
  from?: string | null,
  to?: string | null,
) => {
  return useQuery(
    communicationQueryKeys.calendarEvents(
      accountId || '',
      from || '',
      to || '',
    ),
    () =>
      fetchCalendarEvents(accountId as string, from as string, to as string),
    {
      enabled: Boolean(accountId && from && to),
      keepPreviousData: true,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export async function fetchCommunicationTasks(): Promise<
  CrmCommunicationTask[]
> {
  const headers = await communicationAuthHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/communication/tasks`,
    method: 'GET',
    headers,
  });
  return Array.isArray(response) ? response : [];
}

export const useGetCommunicationTasks = (enabled = true) => {
  return useQuery(
    communicationQueryKeys.tasks,
    () => fetchCommunicationTasks(),
    {
      enabled,
      staleTime: 60_000,
      cacheTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: retryUnlessUnauthorized,
    },
  );
};
