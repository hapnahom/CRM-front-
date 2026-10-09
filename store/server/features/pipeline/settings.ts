import { useMutation, useQuery, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { CustomPipelineMetricsConfig } from '@/modules/pipeline/custom-pipeline-metrics';

export const PIPELINE_SETTINGS_URL = `${CRM_URL}/pipeline/settings`;

export type StageMovementPolicy = 'any' | 'forward_only' | 'forward_adjacent';

export type PipelineEntityType = 'LEAD' | 'DEAL';

export interface PipelineSettings {
  id: string;
  entityType: PipelineEntityType;
  movementPolicy: StageMovementPolicy;
  customPipelineMetrics?: CustomPipelineMetricsConfig | null;
  tenantId?: string | null;
}

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

export function usePipelineSettings(entityType: PipelineEntityType) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);

  return useQuery({
    queryKey: ['pipeline-settings', tenantId, userId, entityType],
    queryFn: async (): Promise<PipelineSettings> => {
      const headers = await authHeaders();
      return crudRequest({
        url: PIPELINE_SETTINGS_URL,
        method: 'GET',
        headers,
        params: { entityType },
      });
    },
    enabled: !!tenantId && !!userId && !!entityType,
  });
}

export function useUpdatePipelineSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      entityType: PipelineEntityType;
      movementPolicy?: StageMovementPolicy;
      customPipelineMetrics?: CustomPipelineMetricsConfig | null;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: PIPELINE_SETTINGS_URL,
        method: 'PATCH',
        headers,
        data: payload,
      }) as Promise<PipelineSettings>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pipeline-settings'],
      });
    },
  });
}
