import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import {
  PlatformUser,
  UpdateUserPayload,
  CreateRolePayload,
  UpdateRolePayload,
} from './types';
import { crudRequest } from '@/utils/crudRequest';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

// ─── PATCH /users/:id ────────────────────────────────────────────────────────
const updatePlatformUser = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateUserPayload;
}): Promise<PlatformUser> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/users/${id}`,
    method: 'PATCH',
    data: payload,
    headers,
  });
};

export const useUpdatePlatformUser = () => {
  const queryClient = useQueryClient();
  return useMutation(updatePlatformUser, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
};

// ─── POST /invitations ────────────────────────────────────────────────────────
interface CreateInvitationPayload {
  inviteeSelamnewId: string;
  roleIds: string[];
  teamId?: string;
  inviteeEmailOverride?: string;
}

const createInvitation = async (
  payload: CreateInvitationPayload,
): Promise<{ invitationId: string; expiresAt: string }> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/invitations`,
    method: 'POST',
    data: payload,
    headers,
  });
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation(createInvitation, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
};

// ─── DELETE /users/:id ───────────────────────────────────────────────────────
const deletePlatformUser = async (id: string): Promise<void> => {
  const headers = await authHeaders();
  await crudRequest({
    url: `${CRM_URL}/users/${id}`,
    method: 'DELETE',
    headers,
  });
};

export const useDeletePlatformUser = () => {
  const queryClient = useQueryClient();
  return useMutation(deletePlatformUser, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
};

const invalidateRoleQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: ['user-management-roles'] });
  queryClient.invalidateQueries({ queryKey: ['role-options'] });
};

const createRole = async (payload: CreateRolePayload) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/roles`,
    method: 'POST',
    headers,
    data: payload,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation(createRole, {
    onSuccess: () => {
      invalidateRoleQueries(queryClient);
    },
  });
};

const updateRole = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateRolePayload;
}) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/roles/${id}`,
    method: 'PUT',
    headers,
    data: payload,
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation(updateRole, {
    onSuccess: (data, variables) => {
      invalidateRoleQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: ['user-management-role', variables.id],
      });
    },
  });
};

const deleteRole = async (id: string): Promise<void> => {
  const headers = await authHeaders();
  await crudRequest({
    url: `${CRM_URL}/roles/${id}`,
    method: 'DELETE',
    headers,
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation(deleteRole, {
    onSuccess: (data, id) => {
      invalidateRoleQueries(queryClient);
      queryClient.removeQueries({ queryKey: ['user-management-role', id] });
    },
  });
};
