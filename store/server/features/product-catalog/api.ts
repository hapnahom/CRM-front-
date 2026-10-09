import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';

export const PRODUCT_FAMILIES_URL = `${CRM_URL}/product-families`;
export const PRODUCTS_URL = `${CRM_URL}/products`;
export const VENDORS_URL = `${CRM_URL}/vendors`;
export const PARTNERS_URL = `${CRM_URL}/implementation-partners`;
export const LEADS_URL = `${CRM_URL}/leads`;
export const DEALS_URL = `${CRM_URL}/deals`;

export async function catalogAuthHeaders(): Promise<Record<string, string>> {
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

export function unwrapCatalogList<T>(raw: unknown): T[] {
  let current: unknown = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) return current as T[];
    if (!current || typeof current !== 'object') return [];
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if ('data' in obj) {
      current = obj.data;
      continue;
    }
    return [];
  }
  return Array.isArray(current) ? (current as T[]) : [];
}
