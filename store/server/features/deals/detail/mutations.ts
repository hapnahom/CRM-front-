import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { invalidateSalesTargetProgressQueries } from '@/store/server/features/salesTargeting/invalidateProgress';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';
import {
  authHeaders,
  DEAL_ACTIVITIES_URL,
  DEALS_BASE_URL,
} from '../pipeline/api';

export interface UpdateDealPayload {
  name?: string;
  stageId?: string;
  previousStageId?: string | null;
  value?: number;
  exactValue?: number;
  currency?: string;
  expectedClose?: string;
  description?: string;
  typeId?: string;
  customerId?: string;
  contactId?: string | null;
  sessionId?: string | null;
  responsibleUserId?: string;
  observerUserIds?: string[];
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
  campaignId?: string | null;
  originatorUserId?: string | null;
  originatorPartnerId?: string | null;
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDealPayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEALS_BASE_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: ['deal-detail', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      invalidateCustomersDashboard(queryClient);
      if (
        variables.data.stageId !== undefined ||
        variables.data.value !== undefined ||
        variables.data.exactValue !== undefined ||
        variables.data.currency !== undefined
      ) {
        queryClient.invalidateQueries({ queryKey: ['product-performance'] });
        invalidateSalesTargetProgressQueries(queryClient);
      }
    },
  });
}

export interface CreateDealActivityPayload {
  activityTypeId?: string;
  title: string;
  date: string;
  note?: string;
  assignedToUserId?: string;
  dueDate?: string;
  completedAt?: string;
}

export function useCreateDealActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealId,
      data,
    }: {
      dealId: string;
      data: CreateDealActivityPayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEALS_BASE_URL}/${dealId}/activities`,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: ['deal-activities', variables.dealId],
      });
    },
  });
}

export function useUpdateDealActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      dealId: string;
      data: Partial<CreateDealActivityPayload>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_ACTIVITIES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: ['deal-activities', variables.dealId],
      });
    },
  });
}

export function useDeleteDealActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; dealId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${DEAL_ACTIVITIES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      queryClient.invalidateQueries({
        queryKey: ['deal-activities', variables.dealId],
      });
    },
  });
}
