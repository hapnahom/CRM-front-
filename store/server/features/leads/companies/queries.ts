import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Configuration ---
// Remove hardcoded BASE_URL and use imported one

// --- Interfaces ---
export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
  logo?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

// --- API Service Function ---

/**
 * Fetches companies for the current tenant.
 */
const getCompanies = async (): Promise<Company[]> => {
  try {
    const token = await getCurrentToken();

    // 🚨 FIXED: Get tenant ID dynamically inside the function
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
      url: `${CRM_URL}/companies`,
      method: 'GET',
      headers,
    });

    // Backend returns paginated data: { data: Company[], pagination: {...} }
    // Extract just the data array for the frontend
    return response?.data || [];
  } catch (error) {
    throw error;
  }
};

// --- React Query Hook ---

/**
 * Hook for fetching companies.
 */
export const useGetCompanies = () => {
  return useQuery<Company[]>(['companies'], getCompanies, {
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
        error?.response?.data?.message || 'Failed to fetch companies';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};
