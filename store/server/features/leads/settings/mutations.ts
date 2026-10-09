import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  authHeaders,
  LEAD_ACTIVITY_TYPES_URL,
  LEAD_SCORING_RULES_URL,
  LEAD_TYPES_URL,
  LEAD_STAGES_URL,
} from '../pipeline/api';

function invalidateSettingsQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
  queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
  queryClient.invalidateQueries({ queryKey: ['lead-activity-types'] });
  queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
}

// ─── Stages ─────────────────────────────────────────────────────────────────

export function useCreateLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      category?: string;
      order?: number;
      color?: string;
      borderColor?: string;
      isConversion?: boolean;
      requiresApproval?: boolean;
      approvalWorkflowId?: string | null;
      expirationDays?: number | null;
      expirationAction?: 'mark_expired' | 'move_to_lost' | null;
      expirationLostStageId?: string | null;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: LEAD_STAGES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateLeadStage() {
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
        url: `${LEAD_STAGES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_STAGES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useReorderLeadStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stageIds: string[]) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_STAGES_URL}/reorder`,
        method: 'PATCH',
        headers,
        data: { stageIds },
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

export function useCreateLeadType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: LEAD_TYPES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateLeadType() {
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
        url: `${LEAD_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteLeadType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

// ─── Activity types ─────────────────────────────────────────────────────────

export function useCreateLeadActivityType() {
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
        url: LEAD_ACTIVITY_TYPES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateLeadActivityType() {
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
        url: `${LEAD_ACTIVITY_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteLeadActivityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_ACTIVITY_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

// ─── Scoring rules ──────────────────────────────────────────────────────────

export function useCreateLeadScoringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      criteria: string;
      points: number;
      enabled?: boolean;
      order?: number;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: LEAD_SCORING_RULES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useUpdateLeadScoringRule() {
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
        url: `${LEAD_SCORING_RULES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}

export function useDeleteLeadScoringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_SCORING_RULES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateSettingsQueries(queryClient),
  });
}
