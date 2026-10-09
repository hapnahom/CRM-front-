import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { CommentEntityType } from './types';

export const ENTITY_COMMENTS_URL = `${CRM_URL}/entity-comments`;

export function commentsBaseUrl(
  entityType: CommentEntityType,
  entityId: string,
): string {
  const segment = entityType === 'LEAD' ? 'leads' : 'deals';
  return `${CRM_URL}/${segment}/${entityId}/comments`;
}

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

export function entityCommentsQueryKey(
  entityType: CommentEntityType,
  entityId: string,
  page?: number,
) {
  return ['entity-comments', entityType, entityId, page ?? 1] as const;
}

export function commentRepliesQueryKey(commentId: string, page?: number) {
  return ['entity-comment-replies', commentId, page ?? 1] as const;
}
