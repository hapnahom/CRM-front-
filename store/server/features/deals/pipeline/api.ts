import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const DEALS_BASE_URL = `${CRM_URL}/deals`;
export const DEAL_STAGES_URL = `${CRM_URL}/deal-stages`;
export const DEAL_TYPES_URL = `${CRM_URL}/opportunity-types`;
export const DEAL_ACTIVITY_TYPES_URL = `${CRM_URL}/deal-activity-types`;
export const DEAL_ACTIVITIES_URL = `${CRM_URL}/deal-activities`;
export const CUSTOMERS_URL = `${CRM_URL}/customers`;
export const CONTACTS_URL = `${CRM_URL}/contacts`;

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
