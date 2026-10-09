import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  authHeaders,
  DEAL_ACTIVITY_TYPES_URL,
  DEAL_TYPES_URL,
  DEAL_STAGES_URL,
  DEALS_BASE_URL,
} from '../pipeline/api';

function invalidateSettingsQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['deal-stages'] });
  queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
  queryClient.invalidateQueries({ queryKey: ['dealTypes'] });
  queryClient.invalidateQueries({ queryKey: ['deal-activity-types'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
}

export function useCreateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      category?: string;
      order?: number;
      color?: string;
      borderColor?: string;
      requiresApproval?: boolean;
      approvalWorkflowId?: string | null;
      expirationDays?: number | null;
      expirationAction?: 'mark_expired' | 'move_to_lost' | null;
      expirationLostStageId?: string | null;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: DEAL_STAGES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_STAGES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_STAGES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useReorderDealStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stageIds: string[]) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_STAGES_URL}/reorder`,
        method: 'PATCH',
        headers,
        data: { stageIds },
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useCreateDealType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: DEAL_TYPES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateDealType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string };
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteDealType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useCreateDealActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      icon?: string;
      order?: number;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: DEAL_ACTIVITY_TYPES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateDealActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_ACTIVITY_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteDealActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_ACTIVITY_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export async function checkDealsUsingStage(stageId: string): Promise<number> {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: DEALS_BASE_URL,
    method: 'GET',
    headers,
    params: { stageId, page: 1, pageSize: 1 },
  });
  const pagination = (response as { pagination?: { totalItems?: number } })
    ?.pagination;
  return pagination?.totalItems ?? 0;
}
