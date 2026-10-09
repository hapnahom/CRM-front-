import { useMutation, useQueryClient } from 'react-query';
import {
  assignContactToCustomerApi,
  createContactApi,
  deleteContactApi,
  updateContactApi,
} from './api';
import type { CreateContactPayload, UpdateContactPayload } from './types';
import { invalidateCustomersDashboard } from '@/store/server/features/customers/queries';

async function invalidateContactQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: ['contacts-catalog'] });
  await queryClient.invalidateQueries({ queryKey: ['contacts'] });
  await queryClient.invalidateQueries({ queryKey: ['pipeline-contacts'] });
  await queryClient.invalidateQueries({ queryKey: ['pipeline-deal-contacts'] });
  invalidateCustomersDashboard(queryClient);
  if (customerId) {
    await queryClient.invalidateQueries({
      queryKey: ['customer-detail', customerId],
    });
  }
}

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateContactPayload) => createContactApi(payload),
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      void invalidateContactQueries(
        queryClient,
        variables.customerId ?? undefined,
      );
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateContactPayload;
    }) => updateContactApi(id, payload),
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      void invalidateContactQueries(
        queryClient,
        variables.payload.customerId ?? undefined,
      );
    },
  });
};

export const useAssignContactToCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      customerId,
    }: {
      contactId: string;
      customerId: string;
    }) => assignContactToCustomerApi(contactId, customerId),
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      void invalidateContactQueries(queryClient, variables.customerId);
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContactApi(id),
    onSuccess: () => {
      void invalidateContactQueries(queryClient);
    },
  });
};
