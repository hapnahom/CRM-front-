import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useQuery } from 'react-query';

const getDealSources = async () => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!token || !tenantId) {
      throw new Error('Authentication token or tenant ID not available');
    }

    if (!CRM_URL) {
      throw new Error('CRM_URL is not configured');
    }

    return await crudRequest({
      url: `${CRM_URL}/source?isDeal=true`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const useGetDealSources = () => {
  return useQuery<any>('deal-sources', getDealSources, {
    keepPreviousData: true,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
