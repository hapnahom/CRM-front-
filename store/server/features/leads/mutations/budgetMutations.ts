import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { notification } from 'antd';

export function useEstimatedBudgetMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      leadId,
      amount,
      currencyId,
    }: {
      leadId: string;
      amount: number;
      currency?: string;
      currencyId?: string;
    }) => {
      try {
        const token = await getCurrentToken();

        // Check if we have an existing budget ID
        const existingBudget = await crudRequest({
          url: `${CRM_URL}/estimated-budgets/lead/${leadId}`,
          method: 'GET',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null);

        if (existingBudget?.id) {
          // Update existing budget
          const response = await crudRequest({
            url: `${CRM_URL}/estimated-budgets/${existingBudget.id}`,
            method: 'PATCH',
            headers: {
              tenantId: tenantId,
              Authorization: `Bearer ${token}`,
            },
            data: {
              amount,
              currencyId,
            },
          });
          return response;
        } else {
          // Create new budget
          const response = await crudRequest({
            url: `${CRM_URL}/estimated-budgets`,
            method: 'POST',
            headers: {
              tenantId: tenantId,
              Authorization: `Bearer ${token}`,
            },
            data: {
              leadId,
              amount,
              currencyId,
            },
          });
          return response;
        }
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch estimated budget
      queryClient.invalidateQueries(['estimated-budget', variables.leadId]);
      // Also invalidate lead detail to refresh budget
      queryClient.invalidateQueries(['lead-detail', variables.leadId]);
    },
    onError: (error: any) => {
      notification.error({
        message: 'Budget operation failed',
        description:
          error?.response?.data?.message ||
          'Failed to create/update estimated budget. Please try again.',
      });
    },
  });
}

export function useDeleteEstimatedBudgetMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (leadId: string) => {
      try {
        const token = await getCurrentToken();

        // First, get the budget for this lead to get the budget ID
        const budgetResponse = await crudRequest({
          url: `${CRM_URL}/estimated-budgets/lead/${leadId}`,
          method: 'GET',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!budgetResponse?.id) {
          throw new Error('No budget found for this lead');
        }

        // Delete the budget using its ID
        const response = await crudRequest({
          url: `${CRM_URL}/estimated-budgets/${budgetResponse.id}`,
          method: 'DELETE',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
        });

        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, leadId) => {
      // Invalidate and refetch estimated budget
      queryClient.invalidateQueries(['estimated-budget', leadId]);
      // Also invalidate lead detail to refresh budget
      queryClient.invalidateQueries(['lead-detail', leadId]);

      notification.success({
        message: 'Budget deleted successfully',
        description: 'Estimated budget has been removed from this lead.',
      });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Budget deletion failed',
        description:
          error?.response?.data?.message ||
          'Failed to delete estimated budget. Please try again.',
      });
    },
  });
}
