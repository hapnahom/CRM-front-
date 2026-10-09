import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const PARTNERS_URL = `${CRM_URL}/partners`;
export const PARTNER_ROLES_URL = `${CRM_URL}/partner-roles`;
export const PARTNER_TIERS_URL = `${CRM_URL}/partner-tiers`;
export const PARTNER_PARTNERSHIP_TYPES_URL = `${CRM_URL}/partner-partnership-types`;
export const PARTNER_CERTIFICATIONS_URL = `${CRM_URL}/partner-certifications`;
export const ENTITY_FIELDS_URL = `${CRM_URL}/entity-fields`;

export async function partnersAuthHeaders(): Promise<Record<string, string>> {
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

export function unwrapList<T>(raw: unknown): T[] {
  let current: unknown = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) return current as T[];
    if (!current || typeof current !== 'object') return [];
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if ('data' in obj) {
      current = obj.data;
      continue;
    }
    return [];
  }
  return Array.isArray(current) ? (current as T[]) : [];
}
