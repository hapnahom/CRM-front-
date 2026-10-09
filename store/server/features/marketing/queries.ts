import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  MARKETING_URL,
  marketingAuthHeaders,
  retryUnlessUnauthorized,
  unwrapList,
} from './api';
import type {
  MarketingAsset,
  MarketingAudience,
  MarketingCampaign,
  MarketingEvent,
  MarketingIntegration,
  MarketingOverview,
  MarketingMailbox,
  AudienceMemberRow,
} from './types';

export const marketingQueryKeys = {
  overview: (period: string) => ['marketing-overview', period] as const,
  campaigns: (filters: string) => ['marketing-campaigns', filters] as const,
  campaign: (id: string) => ['marketing-campaign', id] as const,
  audiences: ['marketing-audiences'] as const,
  audience: (id: string) => ['marketing-audience', id] as const,
  assets: (filters: string) => ['marketing-assets', filters] as const,
  events: (filters: string) => ['marketing-events', filters] as const,
  event: (id: string) => ['marketing-event', id] as const,
  integrations: ['marketing-integrations'] as const,
  mailboxes: (provider?: string) =>
    ['marketing-mailboxes', provider ?? 'all'] as const,
  suggestMembers: (key: string) => ['marketing-audience-suggest', key] as const,
};

async function get<T>(path: string): Promise<T> {
  const headers = await marketingAuthHeaders();
  return crudRequest({
    url: `${MARKETING_URL}${path}`,
    method: 'GET',
    headers,
  }) as Promise<T>;
}

export function useMarketingOverview(period = 'mtd') {
  return useQuery(
    marketingQueryKeys.overview(period),
    () =>
      get<MarketingOverview>(`/overview?period=${encodeURIComponent(period)}`),
    {
      retry: retryUnlessUnauthorized,
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  );
}

export function useMarketingCampaigns(filters?: {
  search?: string;
  status?: string;
  objective?: string;
}) {
  const key = JSON.stringify(filters || {});
  return useQuery(
    marketingQueryKeys.campaigns(key),
    async () => {
      const headers = await marketingAuthHeaders();
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.status && filters.status !== 'All')
        params.status = filters.status;
      if (filters?.objective && filters.objective !== 'All')
        params.objective = filters.objective;
      const raw = await crudRequest({
        url: `${MARKETING_URL}/campaigns`,
        method: 'GET',
        headers,
        params,
      });
      return unwrapList<MarketingCampaign>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export function useMarketingCampaign(id: string) {
  return useQuery(
    marketingQueryKeys.campaign(id),
    () => get<MarketingCampaign>(`/campaigns/${id}`),
    { enabled: Boolean(id), retry: retryUnlessUnauthorized },
  );
}

export function useMarketingAudiences() {
  return useQuery(
    marketingQueryKeys.audiences,
    async () => {
      const headers = await marketingAuthHeaders();
      const raw = await crudRequest({
        url: `${MARKETING_URL}/audiences`,
        method: 'GET',
        headers,
      });
      return unwrapList<MarketingAudience>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export function useMarketingAudience(id: string) {
  return useQuery(
    marketingQueryKeys.audience(id),
    () => get<MarketingAudience>(`/audiences/${id}`),
    { enabled: Boolean(id), retry: retryUnlessUnauthorized },
  );
}

export function useMarketingAssets(filters?: {
  search?: string;
  mediaKind?: string;
}) {
  const key = JSON.stringify(filters || {});
  return useQuery(
    marketingQueryKeys.assets(key),
    async () => {
      const headers = await marketingAuthHeaders();
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.mediaKind && filters.mediaKind !== 'All')
        params.mediaKind = filters.mediaKind;
      const raw = await crudRequest({
        url: `${MARKETING_URL}/assets`,
        method: 'GET',
        headers,
        params,
      });
      return unwrapList<MarketingAsset>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export function useMarketingEvents(filters?: {
  type?: string;
  status?: string;
}) {
  const key = JSON.stringify(filters || {});
  return useQuery(
    marketingQueryKeys.events(key),
    async () => {
      const headers = await marketingAuthHeaders();
      const params: Record<string, string> = {};
      if (filters?.type && filters.type !== 'All') params.type = filters.type;
      if (filters?.status && filters.status !== 'All')
        params.status = filters.status;
      const raw = await crudRequest({
        url: `${MARKETING_URL}/events`,
        method: 'GET',
        headers,
        params,
      });
      return unwrapList<MarketingEvent>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export function useMarketingEvent(id: string) {
  return useQuery(
    marketingQueryKeys.event(id),
    () => get<MarketingEvent>(`/events/${id}`),
    { enabled: Boolean(id), retry: retryUnlessUnauthorized },
  );
}

export function useMarketingIntegrations() {
  return useQuery(
    marketingQueryKeys.integrations,
    async () => {
      const headers = await marketingAuthHeaders();
      const raw = await crudRequest({
        url: `${MARKETING_URL}/integrations`,
        method: 'GET',
        headers,
      });
      return unwrapList<MarketingIntegration>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export type MarketingMailboxProvider = 'microsoft365' | 'gmail';

export function useMarketingMailboxes(provider?: MarketingMailboxProvider) {
  return useQuery(
    marketingQueryKeys.mailboxes(provider),
    async () => {
      const headers = await marketingAuthHeaders();
      const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
      const raw = await crudRequest({
        url: `${MARKETING_URL}/integrations/email/mailboxes${query}`,
        method: 'GET',
        headers,
      });
      return unwrapList<MarketingMailbox>(raw);
    },
    { retry: retryUnlessUnauthorized },
  );
}

export function useSuggestAudienceMembers(
  body: {
    conditions: Array<{ field: string; operator: string; value: string }>;
    search: string;
    excludeCustomerIds: string[];
  },
  enabled: boolean,
) {
  const key = JSON.stringify({
    search: body.search,
    exclude: body.excludeCustomerIds,
    conditions: body.conditions,
  });
  return useQuery(
    marketingQueryKeys.suggestMembers(key),
    async () => {
      const headers = await marketingAuthHeaders();
      const raw = await crudRequest({
        url: `${MARKETING_URL}/audiences/suggest-members`,
        method: 'POST',
        headers,
        data: body,
      });
      return unwrapList<AudienceMemberRow>(raw);
    },
    {
      enabled,
      retry: retryUnlessUnauthorized,
      keepPreviousData: true,
    },
  );
}

export function usePreviewAudienceMembers(
  conditions: Array<{ field: string; operator: string; value: string }>,
  enabled: boolean,
) {
  return useQuery(
    marketingQueryKeys.suggestMembers(
      JSON.stringify({ preview: true, conditions }),
    ),
    async () => {
      const headers = await marketingAuthHeaders();
      const raw = await crudRequest({
        url: `${MARKETING_URL}/audiences/preview-members`,
        method: 'POST',
        headers,
        data: { conditions },
      });
      return raw as { matchedCustomers: number; matchedContacts: number };
    },
    {
      enabled,
      retry: retryUnlessUnauthorized,
      keepPreviousData: true,
    },
  );
}
