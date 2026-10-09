import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  authHeaders,
  commentRepliesQueryKey,
  commentsBaseUrl,
  ENTITY_COMMENTS_URL,
  entityCommentsQueryKey,
  retryUnlessUnauthorized,
} from './api';
import type { CommentEntityType, PaginatedComments } from './types';

export function useEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  page = 1,
  pageSize = 20,
) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);

  return useQuery({
    queryKey: [
      ...entityCommentsQueryKey(entityType, entityId, page),
      pageSize,
      tenantId,
    ],
    queryFn: async (): Promise<PaginatedComments> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: commentsBaseUrl(entityType, entityId),
        method: 'GET',
        headers,
        params: { page, pageSize },
      });
      return (
        (response as PaginatedComments) ?? {
          data: [],
          pagination: {
            totalItems: 0,
            currentPage: page,
            itemsPerPage: pageSize,
            totalPages: 1,
          },
        }
      );
    },
    enabled: Boolean(tenantId) && Boolean(entityId),
    keepPreviousData: true,
    retry: retryUnlessUnauthorized,
  });
}

export function useCommentReplies(commentId: string, page = 1, pageSize = 20) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);

  return useQuery({
    queryKey: [...commentRepliesQueryKey(commentId, page), pageSize, tenantId],
    queryFn: async (): Promise<PaginatedComments> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${ENTITY_COMMENTS_URL}/${commentId}/replies`,
        method: 'GET',
        headers,
        params: { page, pageSize },
      });
      return (
        (response as PaginatedComments) ?? {
          data: [],
          pagination: {
            totalItems: 0,
            currentPage: page,
            itemsPerPage: pageSize,
            totalPages: 1,
          },
        }
      );
    },
    enabled: Boolean(tenantId) && Boolean(commentId),
    keepPreviousData: true,
    retry: retryUnlessUnauthorized,
  });
}
