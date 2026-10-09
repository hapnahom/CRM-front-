import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { useQuery } from 'react-query';

const fetchActivityTypes = async () => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    const response = await crudRequest({
      url: `${CRM_URL}/deal-activity-types`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const useGetActivityTypes = () => {
  return useQuery('deal-activity-types', fetchActivityTypes, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
};
