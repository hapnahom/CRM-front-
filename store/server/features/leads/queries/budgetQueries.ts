import { useQuery } from 'react-query';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';

export interface EstimatedBudget {
  id: string;
  leadId: string;
  amount: number;
  currencyId: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook for fetching estimated budget for a specific lead
 */
export function useEstimatedBudgetQuery(leadId: string) {
  const { tenantId } = useAuthenticationStore();

  return useQuery({
    queryKey: ['estimated-budget', leadId, tenantId],
    queryFn: async (): Promise<EstimatedBudget | null> => {
      try {
        const token = await getCurrentToken();

        // Validate that tenant ID exists
        if (!tenantId) {
          throw new Error(
            'Tenant ID not found. Please ensure you are properly authenticated.',
          );
        }

        const headers = {
          tenantId: tenantId,
          Authorization: `Bearer ${token}`,
        };

        // Use the specialized endpoint to find budget by lead ID
        const response = await crudRequest({
          url: `${CRM_URL}/estimated-budgets/lead/${leadId}`,
          method: 'GET',
          headers,
        });

        return response;
      } catch (error: any) {
        // If 404, return null (budget doesn't exist yet)
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: !!leadId && !!tenantId,
  });
}
