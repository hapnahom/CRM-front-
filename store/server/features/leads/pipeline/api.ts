import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

// Shared request helpers for the redesigned Leads pipeline feature. These mirror
// the pattern used by the customers/contacts features (real CRM backend calls
// via `crudRequest`, Firebase bearer token, and tenant headers).

export const LEADS_BASE_URL = `${CRM_URL}/leads`;
export const LEAD_STAGES_URL = `${CRM_URL}/lead-stages`;
export const LEAD_TYPES_URL = `${CRM_URL}/opportunity-types`;
export const LEAD_ACTIVITY_TYPES_URL = `${CRM_URL}/lead-activity-types`;
export const LEAD_SCORING_RULES_URL = `${CRM_URL}/lead-scoring-rules`;
export const LEAD_ACTIVITIES_URL = `${CRM_URL}/lead-activities`;
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
