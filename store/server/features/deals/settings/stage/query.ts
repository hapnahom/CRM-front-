import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useQuery } from 'react-query';

const getDealStages = async () => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!token || !tenantId) {
      throw new Error('Authentication token or tenant ID not available');
    }

    if (!CRM_URL) {
      throw new Error('CRM_URL is not configured');
    }

    const response = await crudRequest({
      url: `${CRM_URL}/deal-stage`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });

    // Handle different response formats consistently
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const useGetDealStages = () => {
  const { tenantId } = useAuthenticationStore();

  return useQuery<any>(['deal-stages-settings', tenantId], getDealStages, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!tenantId, // Only run query if tenantId is available
  });
};
