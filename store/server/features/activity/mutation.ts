import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { ACTIVITIES_URL, authHeaders } from './api';
import type { Activity, CreateManualActivityRequest } from './types';

export function useCreateManualActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateManualActivityRequest,
    ): Promise<Activity> => {
      const headers = await authHeaders();
      return crudRequest({
        url: ACTIVITIES_URL,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: (data, variables) => {
      void data;
      handleSuccessMessage('POST', 'Activity logged successfully');
      queryClient.invalidateQueries(['activities']);
      queryClient.invalidateQueries([
        'activities',
        `${variables.entityType}:${variables.entityId}`,
      ]);
      if (variables.entityType === 'CUSTOMER') {
        queryClient.invalidateQueries([
          'activities',
          `customer:${variables.entityId}`,
        ]);
      }
    },
    onError: (error: unknown) => {
      handleNetworkError(error);
    },
  });
}

/** @deprecated Legacy pages expected update support — manual activities are append-only in the new API */
export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<never> => {
      throw new Error(
        'Activity updates are not supported in the centralized activities API',
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(['activities']);
    },
  });
}

/** @deprecated Legacy pages expected delete support — not exposed in the new history API */
export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<never> => {
      throw new Error(
        'Activity deletion is not supported in the centralized activities API',
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries(['activities']);
    },
  });
}
