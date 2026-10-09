import { CRM_URL } from '@/utils/constants';
import { communicationAuthHeaders } from '@/store/server/features/communication/queries';

export const MARKETING_URL = `${CRM_URL}/marketing`;

export async function marketingAuthHeaders(): Promise<Record<string, string>> {
  return communicationAuthHeaders();
}

export const retryUnlessUnauthorized = (
  failureCount: number,
  err: unknown,
): boolean => {
  if ((err as { response?: { status?: number } })?.response?.status === 401) {
    return false;
  }
  return failureCount < 3;
};

export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}
