import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { COLLABORATION_BACKEND_URL, collaborationHeaders } from './api';
import type {
  CollaborationSpace,
  CreateCollaborationSpaceInput,
  LinkCollaborationSpaceInput,
} from './types';

/**
 * Creates a space in collaboration for a CRM record. Collaboration materializes
 * the picked template's channels inside it and stores entityType/entityId so
 * the space stays tied to the lead or deal.
 */
export function useCreateCollaborationSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateCollaborationSpaceInput,
    ): Promise<CollaborationSpace> => {
      if (!COLLABORATION_BACKEND_URL) {
        throw new Error('Collaboration backend URL is not configured.');
      }
      const headers = await collaborationHeaders();
      return crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/spaces`,
        method: 'POST',
        headers,
        data: input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collaboration-spaces-by-entity'],
      });
    },
  });
}

/**
 * Points an existing collaboration space at a CRM record, for leads and deals
 * created before the space (or without one). Collaboration refuses a space that
 * already belongs to another record, so the error is worth surfacing.
 */
export function useLinkCollaborationSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: LinkCollaborationSpaceInput,
    ): Promise<CollaborationSpace> => {
      if (!COLLABORATION_BACKEND_URL) {
        throw new Error('Collaboration backend URL is not configured.');
      }
      const headers = await collaborationHeaders();
      return crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/spaces/${input.spaceId}/entity-link`,
        method: 'PATCH',
        headers,
        data: { entityType: input.entityType, entityId: input.entityId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['collaboration-spaces-by-entity'],
      });
      queryClient.invalidateQueries({ queryKey: ['collaboration-spaces'] });
    },
  });
}
