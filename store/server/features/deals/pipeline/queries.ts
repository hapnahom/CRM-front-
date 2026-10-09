import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  buildPipelineListRequestParams,
  parsePipelinePagination,
  PIPELINE_KANBAN_PAGE_SIZE,
  PIPELINE_LIST_PAGE_SIZE,
  type PipelineListQueryParams,
} from '@/lib/pipeline/list-query';
import {
  authHeaders,
  CONTACTS_URL,
  CUSTOMERS_URL,
  DEAL_STAGES_URL,
  DEAL_TYPES_URL,
  DEALS_BASE_URL,
  retryUnlessUnauthorized,
} from './api';
import {
  PipelineContactSummary,
  PipelineCustomerSummary,
  PipelineDeal,
  PipelineStage,
  PipelineType,
  PipelineTeamSummary,
  PaginatedDeals,
} from './types';

const BOARD_PAGE_SIZE = PIPELINE_KANBAN_PAGE_SIZE;

interface PaginatedResponse<T> {
  data: T[];
  pagination?: unknown;
}

function asArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (
    response &&
    typeof response === 'object' &&
    Array.isArray((response as PaginatedResponse<T>).data)
  ) {
    return (response as PaginatedResponse<T>).data;
  }
  return [];
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}

function mapTeam(raw: Record<string, unknown>): PipelineTeamSummary | null {
  const team = raw.team ?? raw.salesTeam;
  if (team && typeof team === 'object' && (team as { name?: string }).name) {
    const t = team as { id?: string; name: string; branch?: string | null };
    return {
      id: String(t.id ?? raw.salesTeamId ?? t.name),
      name: t.name,
      branch: t.branch ?? null,
    };
  }
  if (typeof raw.teamName === 'string' && raw.teamName.trim()) {
    return {
      id: String(raw.teamId ?? raw.teamName),
      name: raw.teamName.trim(),
      branch: null,
    };
  }
  return null;
}

function mapCustomer(
  raw: Record<string, unknown>,
): PipelineCustomerSummary | null {
  const customer = raw.customer ?? raw.company ?? raw.account;
  if (!customer || typeof customer !== 'object') return null;
  const c = customer as Record<string, unknown>;
  const accountName =
    (c.accountName as string) ??
    (c.name as string) ??
    (c.companyName as string) ??
    null;
  if (!accountName) return null;
  return {
    id: String(c.id ?? raw.customerId ?? accountName),
    accountName,
    industry: (c.industry as string) ?? null,
    city: (c.city as string) ?? null,
    country: (c.country as string) ?? null,
  };
}

function mapDeal(raw: Record<string, unknown>): PipelineDeal {
  const customer = mapCustomer(raw);
  const team = mapTeam(raw);
  const value = toNumber(raw.value);

  return {
    ...(raw as unknown as PipelineDeal),
    customerId: String(raw.customerId ?? customer?.id ?? ''),
    customer,
    team,
    value,
    baseValue: toNumber(raw.baseValue),
    stageEnteredAt: (raw.stageEnteredAt as string) ?? '',
    expectedClose: (raw.expectedClose as string) ?? null,
  };
}

function mapStage(raw: Record<string, unknown>): PipelineStage {
  return {
    id: raw.id as string,
    name: raw.name as string,
    category: raw.category as PipelineStage['category'],
    order: toNumber(raw.order),
    color: (raw.color as string) ?? null,
    borderColor: (raw.borderColor as string) ?? null,
    dealsCount: toNumber(raw.dealsCount),
    requiresApproval: Boolean(raw.requiresApproval),
    approvalWorkflowId: (raw.approvalWorkflowId as string) ?? null,
    expirationDays: (raw.expirationDays as number) ?? null,
    expirationAction:
      (raw.expirationAction as 'mark_expired' | 'move_to_lost') ?? null,
    expirationLostStageId: (raw.expirationLostStageId as string) ?? null,
  };
}

function mapCustomerList(
  raw: Record<string, unknown>,
): PipelineCustomerSummary {
  return {
    id: raw.id as string,
    accountName: raw.accountName as string,
    industry: (raw.industry as string) ?? null,
    city: (raw.city as string) ?? null,
    country: (raw.country as string) ?? null,
  };
}

function mapContact(raw: Record<string, unknown>): PipelineContactSummary {
  return {
    id: raw.id as string,
    firstName: raw.firstName as string,
    lastName: raw.lastName as string,
    email: (raw.email as string) ?? null,
    phoneNumber: (raw.phoneNumber as string) ?? null,
    role: (raw.role as string) ?? null,
    isPrimaryContact: Boolean(raw.isPrimaryContact),
    customerId: (raw.customerId as string) ?? null,
  };
}

export async function fetchAllPipelineDeals(
  params?: PipelineListQueryParams,
): Promise<PipelineDeal[]> {
  const headers = await authHeaders();
  const items: PipelineDeal[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const requestParams = buildPipelineListRequestParams({
      ...params,
      page,
      pageSize: PIPELINE_KANBAN_PAGE_SIZE,
    });
    const response = await crudRequest({
      url: DEALS_BASE_URL,
      method: 'GET',
      headers,
      params: requestParams,
    });
    const data = asArray<Record<string, unknown>>(response).map(mapDeal);
    items.push(...data);
    const pagination = parsePipelinePagination(
      response,
      data.length,
      page,
      PIPELINE_KANBAN_PAGE_SIZE,
    );
    totalPages = pagination.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return items;
}

export function usePipelineDeals(
  params?: PipelineListQueryParams & { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const requestParams = buildPipelineListRequestParams(params);
  const hookEnabled = params?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-deals', tenantId, requestParams],
    queryFn: async (): Promise<PaginatedDeals> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: DEALS_BASE_URL,
        method: 'GET',
        headers,
        params: requestParams,
      });
      const data = asArray<Record<string, unknown>>(response).map(mapDeal);
      return {
        data,
        pagination: parsePipelinePagination(
          response,
          data.length,
          Number(requestParams.page),
          Number(requestParams.pageSize),
        ),
      };
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    keepPreviousData: true,
  });
}

export function useDealStages(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['deal-stages', tenantId],
    queryFn: async (): Promise<PipelineStage[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: DEAL_STAGES_URL,
        method: 'GET',
        headers,
      });
      return asArray<Record<string, unknown>>(response).map(mapStage);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDealTypes(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async (): Promise<PipelineType[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: DEAL_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<Record<string, unknown>>(response).map((raw) => ({
        id: String(raw.id),
        name: String(raw.name),
      }));
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 10 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineCustomers(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-deal-customers', tenantId],
    queryFn: async (): Promise<PipelineCustomerSummary[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: CUSTOMERS_URL,
        method: 'GET',
        headers,
        params: { page: 1, pageSize: BOARD_PAGE_SIZE },
      });
      return asArray<Record<string, unknown>>(response).map(mapCustomerList);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineContacts(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-deal-contacts', tenantId],
    queryFn: async (): Promise<PipelineContactSummary[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: CONTACTS_URL,
        method: 'GET',
        headers,
      });
      return asArray<Record<string, unknown>>(response).map(mapContact);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export interface PipelineDealOption {
  id: string;
  name: string;
}

/** Paginated deal lookup for dropdowns (replaces bulk usePipelineDeals). */
export function usePipelineDealOptions(options?: {
  search?: string;
  enabled?: boolean;
  pageSize?: number;
}) {
  const search = options?.search?.trim() ?? '';
  const pageSize = options?.pageSize ?? PIPELINE_LIST_PAGE_SIZE;
  const hookEnabled = options?.enabled !== false;

  const query = usePipelineDeals({
    page: 1,
    pageSize,
    search: search || undefined,
    enabled: hookEnabled,
  });

  const dealOptions = useMemo((): PipelineDealOption[] => {
    return (query.data?.data ?? []).map((deal) => ({
      id: deal.id,
      name: deal.name,
    }));
  }, [query.data]);

  return {
    ...query,
    dealOptions,
  };
}
