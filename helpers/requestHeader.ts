import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';

export const requestHeader = async () => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  const userId = useAuthenticationStore.getState().userId;

  return {
    Authorization: `Bearer ${token}`,
    ...(tenantId && { tenantId }),
    ...(userId && { userId }),
  };
};
