import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type { CreateVectorDto, UpdateVectorDto, Vector } from './types';

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

export const useCreateVector = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async (payload: CreateVectorDto): Promise<Vector> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/vectors`,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries('vectors');
        void queryClient.invalidateQueries('customers-dashboard');
      },
    },
  );
};

export const useUpdateVector = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateVectorDto;
    }): Promise<Vector> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/vectors/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries('vectors');
        void queryClient.invalidateQueries('customers');
        void queryClient.invalidateQueries('customers-dashboard');
        void queryClient.invalidateQueries('customer-detail');
      },
    },
  );
};

export const useDeleteVector = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async (id: string): Promise<{ message: string }> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/vectors/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries('vectors');
        void queryClient.invalidateQueries('customers');
        void queryClient.invalidateQueries('customers-dashboard');
        void queryClient.invalidateQueries('customer-detail');
      },
    },
  );
};
