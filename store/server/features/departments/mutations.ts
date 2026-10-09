import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  UpdateOrganizationStructureSettingsPayload,
} from './types';

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

function invalidateDepartmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries(['crm-departments']);
  queryClient.invalidateQueries(['crm-department']);
  queryClient.invalidateQueries(['crm-teams']);
  queryClient.invalidateQueries(['crm-teams-list']);
  queryClient.invalidateQueries(['sales-teams']);
  queryClient.invalidateQueries(['org-structure-departments']);
  queryClient.invalidateQueries(['crm-organization-structure-settings']);
  queryClient.invalidateQueries(['sales-targeting-approval-workspace-access']);
}

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (data: CreateDepartmentPayload) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/departments`,
        method: 'POST',
        headers,
        data,
      });
    },
    {
      onSuccess: () => invalidateDepartmentQueries(queryClient),
    },
  );
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ id, data }: { id: string; data: UpdateDepartmentPayload }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/departments/${id}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    {
      onSuccess: () => invalidateDepartmentQueries(queryClient),
    },
  );
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/departments/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => invalidateDepartmentQueries(queryClient),
    },
  );
};

export const useUpdateOrganizationStructureSettings = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (data: UpdateOrganizationStructureSettingsPayload) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/departments/organization-settings`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    {
      onSuccess: () => invalidateDepartmentQueries(queryClient),
    },
  );
};
