import type { PipelineListQueryParams } from '@/lib/pipeline/list-query';
import type { ReportFilters, ResolvedReportPeriod } from './types';
import {
  fetchPipelineReportRecords,
  pipelineReportRequestParams,
} from '@/store/server/features/reports/queries';
import { loadReportCustomFields } from './custom-fields';

/** @deprecated Use pipelineReportRequestParams — kept for cache key compatibility */
export function reportListParams(
  period: ResolvedReportPeriod,
  filters: ReportFilters,
): PipelineListQueryParams {
  const request = pipelineReportRequestParams({ period, filters });
  const params: PipelineListQueryParams = {};
  if (request.sessionId) params.sessionId = request.sessionId;
  if (request.sessionIds) params.sessionIds = request.sessionIds;
  if (request.teamId) params.teamId = request.teamId;
  if (request.responsibleUserId) {
    params.responsibleUserId = request.responsibleUserId;
  }
  return params;
}

export async function loadReportRecords(
  period: ResolvedReportPeriod,
  filters: ReportFilters,
  options?: {
    dealInactiveStageIds?: string[];
    dealLostStageIds?: string[];
    leadLostStageIds?: string[];
    selectedColumnIds?: string[];
  },
) {
  const {
    leads,
    deals,
    scopeLabel,
    scope,
    lastActivityAtByDealId,
    lastActivityAtByLeadId,
  } = await fetchPipelineReportRecords({
    period,
    filters,
  });

  const dealInactiveStageIds = [
    ...new Set([
      ...(options?.dealInactiveStageIds ?? []),
      ...deals
        .filter((deal) => deal.stage?.category === 'inactive')
        .map((deal) => deal.stage?.id)
        .filter((stageId): stageId is string => Boolean(stageId)),
    ]),
  ];
  const dealLostStageIds = [
    ...new Set([
      ...(options?.dealLostStageIds ?? []),
      ...deals
        .filter((deal) => deal.stage?.category === 'lost')
        .map((deal) => deal.stage?.id)
        .filter((stageId): stageId is string => Boolean(stageId)),
    ]),
  ];
  const leadLostStageIds = [
    ...new Set([
      ...(options?.leadLostStageIds ?? []),
      ...leads
        .filter((lead) => (lead.status ?? '').toLowerCase() === 'disqualified')
        .map((lead) => lead.stage?.id)
        .filter((stageId): stageId is string => Boolean(stageId)),
    ]),
  ];

  let customFields;
  try {
    customFields = await loadReportCustomFields({
      dealIds: deals.map((deal) => deal.id),
      leadIds: leads.map((lead) => lead.id),
      dealInactiveStageIds,
      dealLostStageIds,
      leadLostStageIds,
      selectedColumnIds: options?.selectedColumnIds,
    });
  } catch {
    customFields = undefined;
  }

  return {
    leads,
    deals,
    scopeLabel,
    scope,
    customFields,
    lastActivityAtByDealId,
    lastActivityAtByLeadId,
  };
}
