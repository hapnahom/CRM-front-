import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  ReportFilters,
  ResolvedReportPeriod,
} from '@/modules/sales-pipeline/report/types';
import { pipelineReportRequestParams } from '@/store/server/features/reports/queries';

export const PIPELINE_STAGE_ANALYTICS_URL = `${CRM_URL}/pipeline/analytics/stage-metrics`;

export type PipelineStageAnalytics = {
  stageDurationAverages: Array<{
    stageId: string;
    stageName: string;
    averageDays: number;
    transitionCount: number;
  }>;
  stageExitConversions: Array<{
    configured: boolean;
    metricId?: string | null;
    metricName?: string | null;
    rate?: number | null;
    toSuccess: number;
    toLost: number;
    toAlso: number;
    rateByCurrency?: Record<string, number | null>;
    detail: string;
  }>;
  dropAnalysis: Array<{
    reason?: string | null;
    stageId: string;
    stageName: string;
    count: number;
  }>;
  stagnation: {
    configured: boolean;
    thresholdDays?: number | null;
    stuckDealCount: number;
  };
  salesCycleDuration: {
    configured: boolean;
    averageDays?: number | null;
    completedCycles: number;
    detail: string;
  };
};

export type PipelineStageAnalyticsParams = {
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
    updatedBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

function stageAnalyticsRequestBody({
  period,
  filters,
}: PipelineStageAnalyticsParams): Record<string, unknown> {
  return pipelineReportRequestParams({ period, filters });
}

export function usePipelineStageAnalytics(params: {
  period: ResolvedReportPeriod;
  filters: ReportFilters | null;
  enabled?: boolean;
}) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const enabled = params.enabled ?? true;
  const requestParams =
    params.filters != null
      ? { period: params.period, filters: params.filters }
      : null;

  return useQuery({
    queryKey: [
      'pipeline-stage-analytics',
      tenantId,
      requestParams ? stageAnalyticsRequestBody(requestParams) : null,
    ],
    queryFn: async (): Promise<PipelineStageAnalytics> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: PIPELINE_STAGE_ANALYTICS_URL,
        method: 'POST',
        headers,
        data: stageAnalyticsRequestBody(requestParams!),
      });
      return response as PipelineStageAnalytics;
    },
    enabled: enabled && Boolean(tenantId) && requestParams != null,
    staleTime: 60_000,
  });
}
