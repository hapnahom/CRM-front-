import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { CreateTeamPayload, UpdateTeamPayload } from './types';

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

function invalidateTeamQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries(['crm-teams']);
  queryClient.invalidateQueries(['crm-team']);
  queryClient.invalidateQueries(['crm-team-members']);
  queryClient.invalidateQueries(['crm-departments']);
  queryClient.invalidateQueries(['crm-department']);
  queryClient.invalidateQueries(['team-options']);
  queryClient.invalidateQueries(['platform-users']);
  queryClient.invalidateQueries(['crm-teams-list']);
  queryClient.invalidateQueries(['crm-my-team']);
  queryClient.invalidateQueries(['crm-my-team-members']);
  queryClient.invalidateQueries(['crm-team-members']);
  queryClient.invalidateQueries(['sales-teams']);
}

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (data: CreateTeamPayload) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/teams`,
        method: 'POST',
        headers,
        data,
      });
    },
    {
      onSuccess: () => invalidateTeamQueries(queryClient),
    },
  );
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ id, data }: { id: string; data: UpdateTeamPayload }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/teams/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    {
      onSuccess: () => invalidateTeamQueries(queryClient),
    },
  );
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/teams/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => invalidateTeamQueries(queryClient),
    },
  );
};

export const useReplaceTeamMembers = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ id, memberIds }: { id: string; memberIds: string[] }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/teams/${id}/members`,
        method: 'PUT',
        headers,
        data: { memberIds },
      });
    },
    {
      onSuccess: () => invalidateTeamQueries(queryClient),
    },
  );
};
