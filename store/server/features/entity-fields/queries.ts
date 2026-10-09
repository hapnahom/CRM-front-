import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import type {
  PaginatedEntityFieldResponse,
  EntityFieldResponse,
  QueryEntityFieldParams,
  BackendEntityType,
} from './types';

// ─── Shared header helper ─────────────────────────────────────────────────────

async function buildHeaders(tenantId: string) {
  const token = await getCurrentToken();
  return { tenantId, Authorization: `Bearer ${token}` };
}

// ─── Fetch paginated list ─────────────────────────────────────────────────────

export async function fetchEntityFields(
  tenantId: string,
  params: QueryEntityFieldParams = {},
): Promise<PaginatedEntityFieldResponse> {
  const headers = await buildHeaders(tenantId);
  const query = new URLSearchParams();
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.appliesTo) query.set('appliesTo', params.appliesTo);
  if (params.pipelineOnly) query.set('pipelineOnly', 'true');
  if (params.leadStageId) query.set('leadStageId', params.leadStageId);
  if (params.dealStageId) query.set('dealStageId', params.dealStageId);
  if (params.stageId) query.set('stageId', params.stageId);
  if (params.search) query.set('search', params.search);
  if (params.fieldType) query.set('fieldType', params.fieldType);
  if (params.required !== undefined)
    query.set('required', String(params.required));
  if (params.active !== undefined) query.set('active', String(params.active));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const qs = query.toString();
  return crudRequest({
    url: `${CRM_URL}/entity-fields${qs ? `?${qs}` : ''}`,
    method: 'GET',
    headers,
  });
}

// ─── React Query hooks ────────────────────────────────────────────────────────

export function useEntityFields(
  entityType: BackendEntityType,
  params: QueryEntityFieldParams = {},
) {
  const { tenantId } = useAuthenticationStore();
  return useQuery<PaginatedEntityFieldResponse>({
    queryKey: ['entityFields', entityType, params],
    queryFn: () => fetchEntityFields(tenantId!, { ...params, entityType }),
    enabled: !!tenantId,
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePipelineCustomFields(
  params: Omit<QueryEntityFieldParams, 'pipelineOnly'> & {
    enabled?: boolean;
  } = {},
) {
  const { tenantId } = useAuthenticationStore();
  const { enabled = true, ...queryParams } = params;
  return useQuery<PaginatedEntityFieldResponse>({
    queryKey: ['pipelineCustomFields', queryParams],
    queryFn: () =>
      fetchEntityFields(tenantId!, {
        ...queryParams,
        pipelineOnly: true,
        pageSize: queryParams.pageSize ?? 200,
      }),
    enabled: !!tenantId && enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ─── Fetch fields for a stage (cumulative open/won; lost isolated unless mode=detail) ─────

export type StageFieldsMode = 'transition' | 'detail';

export async function fetchFieldsForStage(
  tenantId: string,
  entityType: BackendEntityType,
  stageId: string,
  mode: StageFieldsMode = 'transition',
): Promise<EntityFieldResponse[]> {
  const headers = await buildHeaders(tenantId);
  const modeQuery = mode === 'detail' ? '&mode=detail' : '';
  return crudRequest({
    url: `${CRM_URL}/entity-fields/for-stage?entityType=${entityType}&stageId=${stageId}${modeQuery}`,
    method: 'GET',
    headers,
  });
}

export function useFieldsForStage(
  entityType: BackendEntityType,
  stageId: string | null | undefined,
  options?: { mode?: StageFieldsMode },
) {
  const { tenantId } = useAuthenticationStore();
  const mode = options?.mode ?? 'transition';
  return useQuery<EntityFieldResponse[]>({
    queryKey: ['entityFieldsForStage', entityType, stageId, mode],
    queryFn: () => fetchFieldsForStage(tenantId!, entityType, stageId!, mode),
    enabled: !!tenantId && !!stageId,
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export interface EntityFieldUsageDto {
  leadCount: number;
  dealCount: number;
  partnerCount: number;
  valueCount: number;
}

export async function fetchEntityFieldUsage(
  tenantId: string,
  id: string,
): Promise<EntityFieldUsageDto> {
  const headers = await buildHeaders(tenantId);
  return crudRequest({
    url: `${CRM_URL}/entity-fields/${id}/usage`,
    method: 'GET',
    headers,
  }) as Promise<EntityFieldUsageDto>;
}
