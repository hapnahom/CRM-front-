import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { COLLABORATION_BACKEND_URL } from '@/utils/collaboration';

export { COLLABORATION_BACKEND_URL };

/**
 * The signed-in user's id *in collaboration's id space*. CRM's auth store holds
 * the CRM-local user id; collaboration knows people by their Selamnew/org-emp id
 * (`selamnewId`), which `/auth/me` carries through onto `userData`. Falls back to
 * the CRM id only so requests still go out — collaboration will simply not match
 * it, which the callers handle.
 */
export function currentCollaborationUserId(): string {
  const { userId, userData } = useAuthenticationStore.getState();
  const selamnewId =
    typeof userData?.selamnewId === 'string' ? userData.selamnewId.trim() : '';
  if (selamnewId) return selamnewId;
  return userId != null && userId !== '' ? String(userId) : '';
}

/**
 * Headers the collaboration API expects. It identifies the caller by the
 * `userId` header (not the bearer subject), and scopes everything by
 * `tenantId` — both are sent explicitly here rather than relying on the CRM
 * request helper's own header shape.
 */
export async function collaborationHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    userId: currentCollaborationUserId(),
    tenantId: tenantId != null && tenantId !== '' ? String(tenantId) : '',
  };
}

/** Collaboration list endpoints return either a bare array or `{ items }`. */
export function collaborationRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  const items = (payload as { items?: unknown })?.items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

export function readCollaborationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const data = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data;
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
