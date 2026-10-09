import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { authHeaders, PIPELINE_ROLES_URL } from './api';
import type {
  PipelineRoleAppliesTo,
  PipelineRoleUsageContext,
} from './queries';

function invalidatePipelineRoleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['pipeline-roles'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-roles-for-stage'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-role-assignments'] });
}

export type PipelineRoleWritePayload = {
  name: string;
  usageContext?: PipelineRoleUsageContext;
  appliesTo?: PipelineRoleAppliesTo;
  leadStageId?: string | null;
  dealStageId?: string | null;
  description?: string | null;
  required?: boolean;
  isPrimary?: boolean;
  countsTowardTargetAchievement?: boolean;
  multiSelect?: boolean;
  exclusiveWithRoleIds?: string[];
  active?: boolean;
  displayOrder?: number;
};

export type PipelineRoleUpdatePayload = Partial<PipelineRoleWritePayload>;

export function useCreatePipelineRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PipelineRoleWritePayload) => {
      const headers = await authHeaders();
      return crudRequest({
        url: PIPELINE_ROLES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidatePipelineRoleQueries(queryClient),
  });
}

export function useUpdatePipelineRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: PipelineRoleUpdatePayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_ROLES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidatePipelineRoleQueries(queryClient),
  });
}

export function useReorderPipelineRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_ROLES_URL}/reorder/batch`,
        method: 'PATCH',
        headers,
        data: { orderedIds },
      });
    },
    onSuccess: () => invalidatePipelineRoleQueries(queryClient),
  });
}

export function useDeletePipelineRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confirmUnlink,
    }: {
      id: string;
      confirmUnlink?: boolean;
    }) => {
      const headers = await authHeaders();
      const qs = confirmUnlink ? '?confirmUnlink=true' : '';
      return crudRequest({
        url: `${PIPELINE_ROLES_URL}/${id}${qs}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidatePipelineRoleQueries(queryClient),
  });
}

export function useUpsertPipelineRoleAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      entityType: 'LEAD' | 'DEAL';
      entityId: string;
      stageId: string;
      assignments: Array<{ roleId: string; userId: string }>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${PIPELINE_ROLES_URL}/assignments`,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: [
          'pipeline-role-assignments',
          variables.entityType,
          variables.entityId,
        ],
      });
      if (variables.entityType === 'LEAD') {
        queryClient.invalidateQueries({
          queryKey: ['lead-detail', variables.entityId],
        });
        queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['deal-detail', variables.entityId],
        });
        queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      }
    },
  });
}
