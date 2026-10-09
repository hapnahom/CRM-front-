import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Interfaces ---
export interface Sector {
  id: string;
  name: string;
  description: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

// --- API Service Function ---

/**
 * Fetches sectors for the current tenant.
 */
const getSectors = async (): Promise<Sector[]> => {
  try {
    const token = await getCurrentToken();

    // Get tenant ID dynamically inside the function
    const tenantId = useAuthenticationStore.getState().tenantId;

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

    const response = await crudRequest({
      url: `${CRM_URL}/sectors`,
      method: 'GET',
      headers,
    });

    // Backend returns paginated data: { data: Sector[], pagination: {...} }
    // Extract just the data array for the frontend
    return response?.data || [];
  } catch (error) {
    throw error;
  }
};

// --- React Query Hook ---

/**
 * Hook for fetching sectors.
 */
export const useGetSectors = () => {
  return useQuery<Sector[]>(['sectors'], getSectors, {
    keepPreviousData: true,
    staleTime: 0, // Always consider data stale for immediate updates
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to fetch sectors';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
