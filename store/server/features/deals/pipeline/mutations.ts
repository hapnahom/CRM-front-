import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { patchPaginatedPipelineCache } from '@/lib/pipeline/list-query';
import { authHeaders, DEALS_BASE_URL } from './api';
import { CreatePipelineDealInput, PipelineDeal } from './types';
import { invalidateSalesTargetProgressQueries } from '@/store/server/features/salesTargeting/invalidateProgress';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';

export function useChangeDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      stageId,
      fieldValues,
      roleAssignments,
      allowValidationException,
      validationSummary,
      validationExceptionFieldIds,
      exactValue,
      solutionExactAmounts,
    }: {
      dealId: string;
      stageId: string;
      fieldValues?: Array<{ entityFieldId: string; value: unknown }>;
      roleAssignments?: Array<{ roleId: string; userId: string }>;
      allowValidationException?: boolean;
      validationSummary?: string;
      validationExceptionFieldIds?: string[];
      exactValue?: number;
      solutionExactAmounts?: Array<{ solutionId: string; exactAmount: number }>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEALS_BASE_URL}/${dealId}/stage`,
        method: 'PATCH',
        headers,
        data: {
          stageId,
          fieldValues,
          roleAssignments,
          allowValidationException,
          validationSummary,
          validationExceptionFieldIds,
          exactValue,
          solutionExactAmounts,
        },
      });
    },
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline-deals'] });
      await queryClient.cancelQueries({ queryKey: ['deal-detail', dealId] });
      const previous = queryClient.getQueriesData({
        queryKey: ['pipeline-deals'],
      });
      const previousDetail = queryClient.getQueriesData({
        queryKey: ['deal-detail', dealId],
      });

      queryClient.setQueriesData(
        { queryKey: ['pipeline-deals'] },
        (old: unknown) =>
          patchPaginatedPipelineCache<PipelineDeal>(old, (deals) => {
            const today = new Date().toISOString();
            return deals.map((deal) =>
              deal.id === dealId
                ? {
                    ...deal,
                    stageId,
                    stageEnteredAt:
                      deal.stageId === stageId ? deal.stageEnteredAt : today,
                  }
                : deal,
            );
          }),
      );

      const today = new Date().toISOString();
      queryClient.setQueriesData(
        { queryKey: ['deal-detail', dealId] },
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
        context.previous.forEach(([key, data]: [unknown, unknown]) => {
          queryClient.setQueryData(key as string[], data);
        });
      }
      if (context?.previousDetail) {
        context.previousDetail.forEach(([key, data]: [unknown, unknown]) => {
          queryClient.setQueryData(key as string[], data);
        });
      }
    },
    onSettled: (error, variables) => {
      void error;
      const dealId = (variables as { dealId?: string } | undefined)?.dealId;
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      if (dealId) {
        queryClient.invalidateQueries({ queryKey: ['deal-detail', dealId] });
        queryClient.invalidateQueries({
          queryKey: ['deal-stage-history', dealId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['pipeline-approval-requests'],
      });
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export function useCreatePipelineDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreatePipelineDealInput,
    ): Promise<PipelineDeal> => {
      const headers = await authHeaders();
      return crudRequest({
        url: DEALS_BASE_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      queryClient.invalidateQueries({
        queryKey: ['pipeline-approval-requests'],
      });
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const headers = await authHeaders();
      await crudRequest({
        url: `${DEALS_BASE_URL}/${dealId}`,
        method: 'DELETE',
        headers,
      });
      return dealId;
    },
    onSuccess: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: ['deal-detail', dealId] });
      queryClient.removeQueries({ queryKey: ['deal-detail', dealId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      invalidateSalesTargetProgressQueries(queryClient);
      invalidateCustomersDashboard(queryClient);
    },
  });
}
