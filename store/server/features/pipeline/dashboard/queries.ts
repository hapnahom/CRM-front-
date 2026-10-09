import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  PipelineModuleDashboardParams,
  PipelineModuleDashboardResponse,
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

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }
  return failureCount < 3;
};

function buildDashboardParams(
  params: PipelineModuleDashboardParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.currency) query.currency = params.currency;
  if (params.teamId) query.teamId = params.teamId;
  if (params.departmentId) query.departmentId = params.departmentId;
  if (params.responsibleUserId) {
    query.responsibleUserId = params.responsibleUserId;
  }
  if (params.affectedUserIds?.length) {
    query.affectedUserIds = params.affectedUserIds.join(',');
  }
  if (params.solutionCategory) {
    query.solutionCategory = params.solutionCategory;
  }
  if (params.highValueLimit != null) {
    query.highValueLimit = params.highValueLimit;
  }
  if (params.sessionId) query.sessionId = params.sessionId;
  else if (params.sessionIds) query.sessionIds = params.sessionIds;
  return query;
}

async function fetchModuleDashboard(
  module: 'leads' | 'deals',
  params: PipelineModuleDashboardParams,
): Promise<PipelineModuleDashboardResponse> {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/${module}/dashboard`,
    method: 'GET',
    headers,
    params: buildDashboardParams(params),
  });
}

export function usePipelineModuleDashboard(
  module: 'leads' | 'deals',
  params: PipelineModuleDashboardParams,
  options?: { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled = options?.enabled !== false && Boolean(tenantId);

  return useQuery({
    queryKey: ['pipeline-module-dashboard', module, tenantId, params],
    queryFn: () => fetchModuleDashboard(module, params),
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
    refetchOnWindowFocus: false,
  });
}
