import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { authHeaders, OPPORTUNITY_TYPES_URL } from './api';
import type {
  OpportunityTypeAppliesTo,
  OpportunityTypeCategory,
} from './queries';

function invalidateOpportunityTypeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['opportunity-types'] });
  // Legacy keys still used by older deal filters until fully migrated.
  queryClient.invalidateQueries({ queryKey: ['dealTypes'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-dashboard'] });
}

export type OpportunityTypeWritePayload = {
  name: string;
  description?: string | null;
  appliesTo?: OpportunityTypeAppliesTo;
  category?: OpportunityTypeCategory;
};

export function useCreateOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OpportunityTypeWritePayload) => {
      const headers = await authHeaders();
      return crudRequest({
        url: OPPORTUNITY_TYPES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateOpportunityTypeQueries(queryClient),
  });
}

export function useUpdateOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: OpportunityTypeWritePayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${OPPORTUNITY_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => invalidateOpportunityTypeQueries(queryClient),
  });
}

export function useDeleteOpportunityType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${OPPORTUNITY_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateOpportunityTypeQueries(queryClient),
  });
}
