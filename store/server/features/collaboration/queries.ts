import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  COLLABORATION_BACKEND_URL,
  collaborationHeaders,
  collaborationRows,
} from './api';
import type {
  CollaborationSpace,
  CollaborationTemplate,
  CollaborationTemplateChannel,
} from './types';

function mapTemplateChannel(
  raw: unknown,
  index: number,
): CollaborationTemplateChannel | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!id || !name) return null;

  return {
    id,
    name,
    description:
      typeof record.description === 'string' ? record.description : null,
    type: record.type === 'private' ? 'private' : 'public',
    layout: record.layout === 'posts' ? 'posts' : 'threads',
    position: typeof record.position === 'number' ? record.position : index,
  };
}

function mapTemplate(raw: unknown): CollaborationTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!id || !name) return null;

  const channels = Array.isArray(record.channels)
    ? record.channels
        .map((channel, index) => mapTemplateChannel(channel, index))
        .filter(
          (channel): channel is CollaborationTemplateChannel =>
            channel !== null,
        )
        .sort((a, b) => a.position - b.position)
    : [];

  return {
    id,
    name,
    description:
      typeof record.description === 'string' ? record.description : null,
    icon: typeof record.icon === 'string' ? record.icon : null,
    isActive: record.isActive !== false,
    channels,
  };
}

function mapSpace(raw: unknown): CollaborationSpace | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!id || !name) return null;

  return {
    id,
    name,
    type: record.type === 'private' ? 'private' : 'public',
    description:
      typeof record.description === 'string' ? record.description : null,
    color: typeof record.color === 'string' ? record.color : null,
    entityType:
      typeof record.entityType === 'string' ? record.entityType : null,
    entityId: typeof record.entityId === 'string' ? record.entityId : null,
  };
}

/**
 * Space templates offered by collaboration. Disabled when no collaboration
 * backend URL is configured, so CRM flows degrade to their pre-integration
 * behaviour instead of erroring.
 */
export function useCollaborationTemplates(enabled = true) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['collaboration-space-templates', tenantId],
    queryFn: async (): Promise<CollaborationTemplate[]> => {
      const headers = await collaborationHeaders();
      const response = await crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/space-templates`,
        method: 'GET',
        headers,
        params: { activeOnly: true },
      });
      return collaborationRows(response)
        .map(mapTemplate)
        .filter(
          (template): template is CollaborationTemplate =>
            template !== null && template.isActive,
        );
    },
    enabled: enabled && Boolean(COLLABORATION_BACKEND_URL) && Boolean(tenantId),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Pulls the id list out of `GET /user-roles/active-ids`. The endpoint answers
 * `{ userIds }`, but the payload can arrive wrapped (`{ data: { userIds } }`)
 * depending on the response interceptors in play, so all three shapes are
 * accepted. Returning [] on an unrecognised shape is safe only because callers
 * treat an empty roster as "unknown" rather than "nobody is a member".
 */
function readActiveMemberIds(payload: unknown): string[] {
  const source =
    (payload as { userIds?: unknown })?.userIds ??
    (payload as { data?: { userIds?: unknown } })?.data?.userIds ??
    payload;
  return Array.isArray(source)
    ? source.filter((id): id is string => typeof id === 'string' && id !== '')
    : [];
}

/**
 * User ids holding an ACTIVE collaboration platform membership. Collaboration
 * refuses to add anyone else to a space, so CRM uses this to warn up front
 * instead of failing mid-create.
 */
export function useCollaborationActiveMemberIds(enabled = true) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);

  return useQuery({
    queryKey: ['collaboration-active-member-ids', tenantId],
    queryFn: async (): Promise<string[]> => {
      const headers = await collaborationHeaders();
      const response = await crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/user-roles/active-ids`,
        method: 'GET',
        headers,
      });
      return readActiveMemberIds(response);
    },
    enabled:
      enabled &&
      Boolean(COLLABORATION_BACKEND_URL) &&
      Boolean(tenantId) &&
      Boolean(userId),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Every space the signed-in user can reach, used to offer an existing space for
 * a record that has none. Collaboration filters the list by membership, so a
 * private space the user is not in is never offered — they could not open it.
 */
export function useCollaborationSpaces(enabled = true) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);

  return useQuery({
    queryKey: ['collaboration-spaces', tenantId],
    queryFn: async (): Promise<CollaborationSpace[]> => {
      const headers = await collaborationHeaders();
      const response = await crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/spaces`,
        method: 'GET',
        headers,
      });
      return collaborationRows(response)
        .map(mapSpace)
        .filter((space): space is CollaborationSpace => space !== null);
    },
    enabled:
      enabled &&
      Boolean(COLLABORATION_BACKEND_URL) &&
      Boolean(tenantId) &&
      Boolean(userId),
    staleTime: 60_000,
    retry: false,
  });
}

/** Spaces already linked to a CRM record (a lead or a deal). */
export function useCollaborationSpacesForEntity(params: {
  entityType: string;
  entityId: string;
  enabled?: boolean;
}) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  return useQuery({
    queryKey: [
      'collaboration-spaces-by-entity',
      tenantId,
      params.entityType,
      params.entityId,
    ],
    queryFn: async (): Promise<CollaborationSpace[]> => {
      const headers = await collaborationHeaders();
      const response = await crudRequest({
        url: `${COLLABORATION_BACKEND_URL}/spaces/by-entity`,
        method: 'GET',
        headers,
        params: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });
      return collaborationRows(response)
        .map(mapSpace)
        .filter((space): space is CollaborationSpace => space !== null);
    },
    enabled:
      (params.enabled ?? true) &&
      Boolean(COLLABORATION_BACKEND_URL) &&
      Boolean(tenantId) &&
      Boolean(params.entityId),
    retry: false,
  });
}
