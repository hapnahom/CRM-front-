import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { invalidateSalesTargetProgressQueries } from '@/store/server/features/salesTargeting/invalidateProgress';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';
import {
  authHeaders,
  LEAD_ACTIVITIES_URL,
  LEADS_BASE_URL,
} from '../pipeline/api';

export interface UpdateLeadPayload {
  name?: string;
  stageId?: string;
  value?: number;
  currency?: string;
  expectedClose?: string;
  solutionCategory?: string;
  currentState?: string;
  nextStep?: string;
  description?: string;
  typeId?: string;
  originatorType?: 'CAMPAIGN' | 'USER' | 'PARTNER' | null;
  campaignId?: string | null;
  originatorUserId?: string | null;
  originatorPartnerId?: string | null;
  customerId?: string;
  contactId?: string | null;
  sessionId?: string | null;
  responsibleUserId?: string;
  observerUserIds?: string[];
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateLeadPayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEADS_BASE_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['lead-detail', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      if (
        variables.data.stageId !== undefined ||
        variables.data.value !== undefined ||
        variables.data.currency !== undefined
      ) {
        invalidateSalesTargetProgressQueries(queryClient);
      }
      invalidateCustomersDashboard(queryClient);
    },
  });
}

export interface CreateActivityPayload {
  activityTypeId?: string;
  title: string;
  date: string;
  note?: string;
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: CreateActivityPayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEADS_BASE_URL}/${leadId}/activities`,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['lead-activities', variables.leadId],
      });
    },
  });
}

export function useUpdateLeadActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      leadId: string;
      data: Partial<CreateActivityPayload>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_ACTIVITIES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['lead-activities', variables.leadId],
      });
    },
  });
}

export function useDeleteLeadActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; leadId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${LEAD_ACTIVITIES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['lead-activities', variables.leadId],
      });
    },
  });
}
