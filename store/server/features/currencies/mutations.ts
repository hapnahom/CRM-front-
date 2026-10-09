import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import type {
  CreateCrmCurrencyInput,
  CrmCurrency,
  UpdateCrmCurrencyInput,
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  return { Authorization: `Bearer ${token}` };
}

export function invalidateCurrencyCaches(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['crm-currencies'] });
  queryClient.invalidateQueries({ queryKey: ['currencies'] });
  queryClient.invalidateQueries({ queryKey: ['tenantCurrencies'] });
  queryClient.invalidateQueries({ queryKey: ['sales-target-plans'] });
  queryClient.invalidateQueries({ queryKey: ['sales-target-plan'] });
}

export const useCreateCrmCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCrmCurrencyInput): Promise<CrmCurrency> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/currencies`,
        method: 'POST',
        headers,
        data: input,
      });
    },
    onSuccess: () => {
      invalidateCurrencyCaches(queryClient);
    },
  });
};

export const useUpdateCrmCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCrmCurrencyInput;
    }): Promise<CrmCurrency> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/currencies/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => {
      invalidateCurrencyCaches(queryClient);
    },
  });
};

export const useDeleteCrmCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const headers = await authHeaders();
      await crudRequest({
        url: `${CRM_URL}/currencies/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      invalidateCurrencyCaches(queryClient);
    },
  });
};
