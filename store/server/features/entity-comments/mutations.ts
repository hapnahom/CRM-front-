import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { authHeaders, commentsBaseUrl, ENTITY_COMMENTS_URL } from './api';
import type {
  CommentEntityType,
  CreateCommentPayload,
  EntityComment,
  UpdateCommentPayload,
} from './types';

function invalidateEntityComments(
  queryClient: ReturnType<typeof useQueryClient>,
  entityType: CommentEntityType,
  entityId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['entity-comments', entityType, entityId],
  });
}

export function useCreateEntityComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      data,
    }: {
      entityType: CommentEntityType;
      entityId: string;
      data: CreateCommentPayload;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: commentsBaseUrl(entityType, entityId),
        method: 'POST',
        headers,
        data,
      }) as Promise<EntityComment>;
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      invalidateEntityComments(
        queryClient,
        variables.entityType,
        variables.entityId,
      );
    },
  });
}

export function useCreateCommentReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      data,
    }: {
      commentId: string;
      data: CreateCommentPayload;
      entityType: CommentEntityType;
      entityId: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${ENTITY_COMMENTS_URL}/${commentId}/replies`,
        method: 'POST',
        headers,
        data,
      }) as Promise<EntityComment>;
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      invalidateEntityComments(
        queryClient,
        variables.entityType,
        variables.entityId,
      );
      queryClient.invalidateQueries({
        queryKey: ['entity-comment-replies', variables.commentId],
      });
    },
  });
}

export function useUpdateEntityComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCommentPayload;
      entityType: CommentEntityType;
      entityId: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${ENTITY_COMMENTS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data,
      }) as Promise<EntityComment>;
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      invalidateEntityComments(
        queryClient,
        variables.entityType,
        variables.entityId,
      );
    },
  });
}

export function useDeleteEntityComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      entityType: CommentEntityType;
      entityId: string;
      parentCommentId?: string | null;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${ENTITY_COMMENTS_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: (mutationResult, variables) => {
      void mutationResult;
      invalidateEntityComments(
        queryClient,
        variables.entityType,
        variables.entityId,
      );
      if (variables.parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: ['entity-comment-replies', variables.parentCommentId],
        });
      }
    },
  });
}
