import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { patchPaginatedPipelineCache } from '@/lib/pipeline/list-query';
import { authHeaders, LEADS_BASE_URL } from './api';
import { CreatePipelineLeadInput, PipelineLead } from './types';

import { invalidateSalesTargetProgressQueries } from '@/store/server/features/salesTargeting/invalidateProgress';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';

// Real CRM backend mutations
// signatures the board already uses; they now call the lead module API and
// invalidate the cached board queries so the UI re-reads server state.
//
//   PATCH /leads/:id/stage  { stageId }  -> LeadResponseDto
//   POST  /leads            CreateLeadDto -> LeadResponseDto

export function useChangeLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      stageId,
      fieldValues,
      roleAssignments,
      allowValidationException,
      validationSummary,
      validationExceptionFieldIds,
    }: {
      leadId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEADS_BASE_URL}/${leadId}/stage`,
        method: 'PATCH',
        headers,
        data: {
          stageId,
          fieldValues,
          roleAssignments,
          allowValidationException,
          validationSummary,
          validationExceptionFieldIds,
        },
      });
    },
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline-leads'] });
      await queryClient.cancelQueries({ queryKey: ['lead-detail', leadId] });
      const previous = queryClient.getQueriesData({
        queryKey: ['pipeline-leads'],
      });
      const previousDetail = queryClient.getQueriesData({
        queryKey: ['lead-detail', leadId],
      });

      queryClient.setQueriesData(
        { queryKey: ['pipeline-leads'] },
        (old: unknown) =>
          patchPaginatedPipelineCache<PipelineLead>(old, (leads) => {
            const today = new Date().toISOString();
            return leads.map((lead) =>
              lead.id === leadId
                ? {
                    ...lead,
                    stageId,
                    stageEnteredAt:
                      lead.stageId === stageId ? lead.stageEnteredAt : today,
                  }
                : lead,
            );
          }),
      );

      const today = new Date().toISOString();
      queryClient.setQueriesData(
        { queryKey: ['lead-detail', leadId] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const detail = old as { stageId?: string; stageEnteredAt?: string };
          if (detail.stageId === stageId) return old;
          return { ...detail, stageId, stageEnteredAt: today };
        },
      );

      return { previous, previousDetail };
    },
    onError: (error, variables, context) => {
      void error;
      void variables;
      if (context?.previous) {
        context.previous.forEach(([key, data]: [any, any]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousDetail) {
        context.previousDetail.forEach(([key, data]: [any, any]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (error, variables) => {
      void error;
      const leadId = (variables as { leadId?: string } | undefined)?.leadId;
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead-detail', leadId] });
      }
      queryClient.invalidateQueries({
        queryKey: ['pipeline-approval-requests'],
      });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export function useCreatePipelineLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreatePipelineLeadInput,
    ): Promise<PipelineLead> => {
      const headers = await authHeaders();
      return crudRequest({
        url: LEADS_BASE_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({
        queryKey: ['pipeline-approval-requests'],
      });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEADS_BASE_URL}/${leadId}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: (result, leadId) => {
      void result;
      void queryClient.cancelQueries({ queryKey: ['lead-detail', leadId] });
      queryClient.removeQueries({ queryKey: ['lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export interface ConvertLeadInput {
  dealName: string;
  dealStageId: string;
  typeId?: string;
  expectedClose?: string;
  description?: string;
  fieldValues?: Array<{ entityFieldId: string; value?: unknown }>;
  allowValidationException?: boolean;
  validationSummary?: string;
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: ConvertLeadInput;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEADS_BASE_URL}/${leadId}/convert`,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}
