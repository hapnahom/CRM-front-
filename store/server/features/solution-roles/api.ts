import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const SOLUTION_ROLES_URL = `${CRM_URL}/solution-roles`;

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export { retryUnlessUnauthorized } from '@/utils/retryUnlessUnauthorized';
