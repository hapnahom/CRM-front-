import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CreateCustomerDto,
  CreateJourneyStageDto,
  CustomerResponse,
  UpdateCustomerDto,
  UpdateJourneyStageDto,
  CustomerJourneyStage,
  CustomerNextAction,
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

const createCustomer = async (
  payload: CreateCustomerDto,
): Promise<CustomerResponse> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/customers`,
    method: 'POST',
    data: payload,
    headers,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation(createCustomer, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-customers'] });
    },
  });
};

const updateCustomer = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateCustomerDto;
}): Promise<CustomerResponse> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/customers/${id}`,
    method: 'PATCH',
    data: payload,
    headers,
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation(updateCustomer, {
    onSuccess: (updatedCustomer, variables) => {
      void updatedCustomer;
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-customers'] });
      queryClient.invalidateQueries({
        queryKey: ['customer-detail', variables.id],
      });
    },
  });
};

const deleteCustomer = async (id: string): Promise<{ message: string }> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/customers/${id}`,
    method: 'DELETE',
    headers,
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation(deleteCustomer, {
    onSuccess: (deleteResult, customerId) => {
      void deleteResult;
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-customers'] });
      queryClient.invalidateQueries({
        queryKey: ['customer-detail', customerId],
      });
      // Backend clears customerId on linked contacts when customer is deleted.
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

function invalidateJourney(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
}

export const useCreateJourneyStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreateJourneyStageDto): Promise<CustomerJourneyStage> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customer-journey-stages`,
        method: 'POST',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateJourney(queryClient) },
  );
};

export const useUpdateJourneyStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateJourneyStageDto;
    }): Promise<CustomerJourneyStage> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customer-journey-stages/${id}`,
        method: 'PATCH',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateJourney(queryClient) },
  );
};

export const useDeleteJourneyStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (id: string): Promise<{ message: string }> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customer-journey-stages/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    { onSuccess: () => invalidateJourney(queryClient) },
  );
};

export const useReorderJourneyStages = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (stageIds: string[]): Promise<CustomerJourneyStage[]> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customer-journey-stages/reorder`,
        method: 'POST',
        data: { stageIds },
        headers,
      });
    },
    { onSuccess: () => invalidateJourney(queryClient) },
  );
};

export const useResetJourneyStages = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (): Promise<CustomerJourneyStage[]> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customer-journey-stages/reset-defaults`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: () => {
        invalidateJourney(queryClient);
      },
    },
  );
};

export const useChangeCustomerStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      customerId,
      toStageId,
    }: {
      customerId: string;
      toStageId: string;
    }): Promise<CustomerResponse> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/stage`,
        method: 'POST',
        data: { toStageId },
        headers,
      });
    },
    {
      onSuccess: (mutationResult, variables) => {
        void mutationResult;
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
        queryClient.invalidateQueries({
          queryKey: ['customer-detail', variables.customerId],
        });
        queryClient.invalidateQueries({
          queryKey: ['activities', `customer:${variables.customerId}`],
        });
      },
    },
  );
};

export const useCompleteCustomerNextAction = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (customerId: string): Promise<CustomerNextAction | null> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/next-action/complete`,
        method: 'POST',
        headers,
      });
    },
    {
      onSuccess: (mutationResult, customerId) => {
        void mutationResult;
        queryClient.invalidateQueries({
          queryKey: ['customer-next-action', customerId],
        });
        queryClient.invalidateQueries({ queryKey: ['communication-tasks'] });
      },
    },
  );
};

export const useRescheduleCustomerNextAction = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      customerId,
      dueAt,
    }: {
      customerId: string;
      dueAt: string;
    }): Promise<CustomerNextAction | null> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/next-action`,
        method: 'PATCH',
        data: { dueAt },
        headers,
      });
    },
    {
      onSuccess: (mutationResult, variables) => {
        void mutationResult;
        queryClient.invalidateQueries({
          queryKey: ['customer-next-action', variables.customerId],
        });
        queryClient.invalidateQueries({ queryKey: ['communication-tasks'] });
      },
    },
  );
};
