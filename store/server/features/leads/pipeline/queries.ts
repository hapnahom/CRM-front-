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
  LEAD_TYPES_URL,
  LEAD_STAGES_URL,
  LEADS_BASE_URL,
  retryUnlessUnauthorized,
} from './api';
import {
  PipelineContactSummary,
  PipelineCustomerSummary,
  PipelineLead,
  PipelineType,
  PipelineStage,
  PipelineTeamSummary,
  PaginatedLeads,
} from './types';

// Real CRM backend data for the redesigned Leads pipeline. These hooks keep the
// exact signatures/return shapes the board (LeadsManagementPage) already
// consumes, but read from the lead module API instead of the in-memory mock.
//
// Backend reference (NestJS, global prefix /api/v1):
//   GET /leads          -> { data: LeadResponseDto[], pagination }
//   GET /lead-stages    -> LeadStageResponseDto[]
//   GET /customers      -> { data: CustomerListItem[], pagination }
//   GET /contacts       -> ContactResponse[]

// Kanban requests a single large page (backend caps pageSize at 200).
// List view uses smaller pages via PipelineListQueryParams.pageSize.

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

function mapTeam(raw: any): PipelineTeamSummary | null {
  if (raw?.team && typeof raw.team === 'object' && raw.team.name) {
    return {
      id: String(raw.team.id ?? raw.teamId ?? raw.team.name),
      name: raw.team.name,
      branch: raw.team.branch ?? null,
    };
  }
  if (typeof raw?.team === 'string' && raw.team.trim()) {
    return {
      id: String(raw.teamId ?? raw.team),
      name: raw.team.trim(),
      branch: null,
    };
  }
  if (raw?.teamName?.trim()) {
    return {
      id: String(raw.teamId ?? raw.teamName),
      name: raw.teamName.trim(),
      branch: null,
    };
  }
  if (raw?.salesTeam?.name) {
    return {
      id: String(raw.salesTeam.id ?? raw.teamId ?? raw.salesTeam.name),
      name: raw.salesTeam.name,
      branch: raw.salesTeam.branch ?? null,
    };
  }
  return null;
}

function mapLeadCustomer(raw: any): PipelineCustomerSummary | null {
  const customer = raw?.customer ?? raw?.company ?? raw?.account;
  if (!customer || typeof customer !== 'object') return null;

  const accountName =
    customer.accountName ?? customer.name ?? customer.companyName ?? null;
  if (!accountName) return null;

  return {
    id: String(customer.id ?? raw.customerId ?? raw.companyId ?? accountName),
    accountName,
    industry: customer.industry ?? null,
    city: customer.city ?? null,
    country: customer.country ?? null,
  };
}

function mapLead(raw: any): PipelineLead {
  const customer = mapLeadCustomer(raw);
  const team = mapTeam(raw);
  const value = toNumber(raw?.value);

  return {
    ...raw,
    customerId: String(raw.customerId ?? customer?.id ?? ''),
    customer,
    team,
    teamId: team?.id ?? raw.teamId ?? null,
    value,
    baseValue: toNumber(raw?.baseValue),
    stageEnteredAt: raw.stageEnteredAt ?? raw.stage_entered_at ?? '',
    expectedClose: raw.expectedClose ?? raw.expected_close ?? null,
  } as PipelineLead;
}

function mapStage(raw: any): PipelineStage {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    order: toNumber(raw?.order),
    color: raw.color ?? null,
    borderColor: raw.borderColor ?? null,
    isConversion: raw.isConversion ?? false,
    requiresApproval: raw.requiresApproval ?? false,
    approvalWorkflowId: raw.approvalWorkflowId ?? null,
    expirationDays: raw.expirationDays ?? null,
    expirationAction: raw.expirationAction ?? null,
    expirationLostStageId: raw.expirationLostStageId ?? null,
  };
}

function mapType(raw: any): PipelineType {
  return { id: raw.id, name: raw.name };
}

function mapCustomer(raw: any): PipelineCustomerSummary {
  return {
    id: raw.id,
    accountName: raw.accountName,
    industry: raw.industry ?? null,
    city: raw.city ?? null,
    country: raw.country ?? null,
  };
}

function mapContact(raw: any): PipelineContactSummary {
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email ?? null,
    phoneNumber: raw.phoneNumber ?? null,
    role: raw.role ?? null,
    isPrimaryContact: raw.isPrimaryContact ?? false,
    customerId: raw.customerId ?? raw.customer?.id ?? null,
  };
}

export async function fetchAllPipelineLeads(
  params?: PipelineListQueryParams,
): Promise<PipelineLead[]> {
  const headers = await authHeaders();
  const items: PipelineLead[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const requestParams = buildPipelineListRequestParams({
      ...params,
      page,
      pageSize: PIPELINE_KANBAN_PAGE_SIZE,
    });
    const response = await crudRequest({
      url: LEADS_BASE_URL,
      method: 'GET',
      headers,
      params: requestParams,
    });
    const data = asArray<any>(response).map(mapLead);
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

export function usePipelineLeads(
  params?: PipelineListQueryParams & { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const requestParams = buildPipelineListRequestParams(params);
  const hookEnabled = params?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-leads', tenantId, requestParams],
    queryFn: async (): Promise<PaginatedLeads> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEADS_BASE_URL,
        method: 'GET',
        headers,
        params: requestParams,
      });
      const data = asArray<any>(response).map(mapLead);
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

export function useLeadStages(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['lead-stages', tenantId],
    queryFn: async (): Promise<PipelineStage[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEAD_STAGES_URL,
        method: 'GET',
        headers,
      });
      return asArray<any>(response).map(mapStage);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLeadTypes(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['opportunity-types', tenantId],
    queryFn: async (): Promise<PipelineType[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: LEAD_TYPES_URL,
        method: 'GET',
        headers,
      });
      return asArray<any>(response).map(mapType);
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
    queryKey: ['pipeline-customers', tenantId],
    queryFn: async (): Promise<PipelineCustomerSummary[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: CUSTOMERS_URL,
        method: 'GET',
        headers,
        params: { page: 1, pageSize: PIPELINE_KANBAN_PAGE_SIZE },
      });
      return asArray<any>(response).map(mapCustomer);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineContacts(options?: { enabled?: boolean }) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-contacts', tenantId],
    queryFn: async (): Promise<PipelineContactSummary[]> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: CONTACTS_URL,
        method: 'GET',
        headers,
      });
      return asArray<any>(response).map(mapContact);
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export interface PipelineLeadOption {
  id: string;
  name: string;
}

/** Paginated lead lookup for dropdowns (replaces bulk useGetLeads). */
export function usePipelineLeadOptions(options?: {
  search?: string;
  enabled?: boolean;
  pageSize?: number;
}) {
  const search = options?.search?.trim() ?? '';
  const pageSize = options?.pageSize ?? PIPELINE_LIST_PAGE_SIZE;
  const hookEnabled = options?.enabled !== false;

  const query = usePipelineLeads({
    page: 1,
    pageSize,
    search: search || undefined,
    enabled: hookEnabled,
  });

  const leadOptions = useMemo((): PipelineLeadOption[] => {
    return (query.data?.data ?? []).map((lead) => ({
      id: lead.id,
      name: lead.name,
    }));
  }, [query.data]);

  return {
    ...query,
    leadOptions,
  };
}
