import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type {
  ReportFilters,
  ReportTargetInput,
  ResolvedReportPeriod,
} from '@/modules/sales-pipeline/report/types';
import {
  createFavoriteApi,
  createScheduleApi,
  deleteFavoriteApi,
  exportReportApi,
  fetchFilterOptionsApi,
  generateReportApi,
  listFavoritesApi,
  shareReportApi,
  toFavoriteReport,
} from './api';
import type { ReportBuilderState } from '@/modules/reports/builder/types';

export type PipelineReportRecordsParams = {
  period: ResolvedReportPeriod;
  filters: ReportFilters;
};

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

export function pipelineReportRequestParams({
  period,
  filters,
  mode = 'report',
}: PipelineReportRecordsParams & { mode?: 'full' | 'report' }): Record<
  string,
  string
> {
  const params: Record<string, string> = {};

  if (mode === 'report') {
    params.mode = 'report';
  }

  // Custom / calendar date ranges filter by createdAt on the client; session
  // filters would drop records whose fiscal session falls outside the overlap.
  if (!period.applyCreatedAtFilter) {
    if (period.sessionId) params.sessionId = period.sessionId;
    else if (period.sessionIds?.length) {
      params.sessionIds = period.sessionIds.join(',');
    }
  } else {
    params.from = period.from;
    params.to = period.to;
  }

  if (filters.teamIds.length === 1) params.teamId = filters.teamIds[0];
  if (filters.teamIds.length > 1) params.teamIds = filters.teamIds.join(',');

  if (filters.ownerIds.length === 1) {
    params.responsibleUserId = filters.ownerIds[0];
  }
  if (filters.ownerIds.length > 1) {
    params.ownerIds = filters.ownerIds.join(',');
  }

  return params;
}

function mapDeal(raw: Record<string, unknown>): PipelineDeal {
  return raw as unknown as PipelineDeal;
}

function mapLead(raw: Record<string, unknown>): PipelineLead {
  return raw as unknown as PipelineLead;
}

export type PipelineReportScope = {
  level: 'company' | 'department' | 'team' | 'personal';
  label: string;
  teamId?: string | null;
  departmentId?: string | null;
  teamName?: string | null;
  departmentName?: string | null;
  allowedOwnerIds: string[];
  allowedTeamIds: string[];
};

export async function fetchPipelineReportRecords(
  params: PipelineReportRecordsParams,
): Promise<{
  leads: PipelineLead[];
  deals: PipelineDeal[];
  scopeLabel: string;
  scope: PipelineReportScope;
  lastActivityAtByDealId: Record<string, string>;
  lastActivityAtByLeadId: Record<string, string>;
}> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/reports/pipeline-records`,
    method: 'GET',
    headers,
    params: pipelineReportRequestParams(params),
  });

  const payload = response as {
    scope?: {
      level?: PipelineReportScope['level'];
      label?: string;
      teamId?: string | null;
      departmentId?: string | null;
      teamName?: string | null;
      departmentName?: string | null;
      allowedOwnerIds?: string[];
      allowedTeamIds?: string[];
    };
    leads?: Record<string, unknown>[];
    deals?: Record<string, unknown>[];
    lastActivityAtByDealId?: Record<string, string>;
    lastActivityAtByLeadId?: Record<string, string>;
  };

  const scope: PipelineReportScope = {
    level: payload.scope?.level ?? 'personal',
    label: payload.scope?.label ?? 'Report',
    teamId: payload.scope?.teamId ?? null,
    departmentId: payload.scope?.departmentId ?? null,
    teamName: payload.scope?.teamName ?? null,
    departmentName: payload.scope?.departmentName ?? null,
    allowedOwnerIds: payload.scope?.allowedOwnerIds ?? [],
    allowedTeamIds: payload.scope?.allowedTeamIds ?? [],
  };

  let leads = (payload.leads ?? []).map(mapLead);
  let deals = (payload.deals ?? []).map(mapDeal);

  // Defense in depth: never show owners outside the backend-resolved max access.
  if (scope.allowedOwnerIds.length) {
    const allowed = new Set(scope.allowedOwnerIds);
    leads = leads.filter(
      (lead) =>
        lead.responsibleUserId && allowed.has(String(lead.responsibleUserId)),
    );
    deals = deals.filter(
      (deal) =>
        deal.responsibleUserId && allowed.has(String(deal.responsibleUserId)),
    );
  }

  return {
    scopeLabel: scope.label,
    scope,
    leads,
    deals,
    lastActivityAtByDealId: payload.lastActivityAtByDealId ?? {},
    lastActivityAtByLeadId: payload.lastActivityAtByLeadId ?? {},
  };
}

export async function fetchPipelineReportTargetProgress(
  params: PipelineReportRecordsParams,
): Promise<ReportTargetInput | null> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/reports/pipeline-target-progress`,
    method: 'GET',
    headers,
    params: pipelineReportRequestParams(params),
  });

  const payload = response as { targets?: ReportTargetInput | null };
  return payload.targets ?? null;
}

export function usePipelineReportTargetProgress(
  params: PipelineReportRecordsParams | null,
  enabled = true,
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: [
      'pipeline-report-target-progress',
      tenantId,
      params ? pipelineReportRequestParams(params) : null,
    ],
    queryFn: () => fetchPipelineReportTargetProgress(params!),
    enabled: enabled && Boolean(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useReportFavorites() {
  return useQuery(['report-favorites'], listFavoritesApi, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateReportFavorite() {
  const qc = useQueryClient();
  return useMutation(createFavoriteApi, {
    onSuccess: () => qc.invalidateQueries(['report-favorites']),
  });
}

export function useDeleteReportFavorite() {
  const qc = useQueryClient();
  return useMutation(deleteFavoriteApi, {
    onSuccess: () => qc.invalidateQueries(['report-favorites']),
  });
}

export function useGenerateReport() {
  return useMutation(
    ({
      state,
      name,
      periodLabel,
    }: {
      state: ReportBuilderState;
      name: string;
      periodLabel?: string;
    }) => generateReportApi(state, name, periodLabel),
    {
      // Result view is enough — no global "Success" popup after generate
      onMutate: () => ({ skipSuccessMessage: true }),
    },
  );
}

export function useExportReport() {
  return useMutation(
    ({
      state,
      name,
      format,
    }: {
      state: ReportBuilderState;
      name: string;
      format: 'excel' | 'pdf' | 'csv' | 'word';
    }) => exportReportApi(state, name, format),
  );
}

export function useCreateReportSchedule() {
  return useMutation(createScheduleApi);
}

export function useShareReport() {
  return useMutation(shareReportApi);
}

export function useReportFilterOptions(fields?: string[]) {
  return useQuery(
    ['report-filter-options', fields],
    () => fetchFilterOptionsApi(fields),
    {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  );
}

export { toFavoriteReport };
