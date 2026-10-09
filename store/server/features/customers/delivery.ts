import { useMutation, useQuery, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CreateCustomerProjectDto,
  CreateProjectLicenseDto,
  CreateProjectProductDto,
  CustomerDeliverySummary,
  DeliveryLicense,
  DeliveryProductAssignment,
  DeliveryProject,
  UpdateCustomerProjectDto,
  UpdateProjectLicenseDto,
  UpdateProjectProductDto,
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

function retryUnlessUnauthorized(failureCount: number, error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 401 || status === 403) return false;
  return failureCount < 2;
}

export const customerDeliveryKeys = {
  projects: (customerId: string) => ['customer-projects', customerId] as const,
  summary: (customerId: string) =>
    ['customer-delivery-summary', customerId] as const,
};

function invalidateDelivery(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
) {
  queryClient.invalidateQueries({
    queryKey: customerDeliveryKeys.projects(customerId),
  });
  queryClient.invalidateQueries({
    queryKey: customerDeliveryKeys.summary(customerId),
  });
}

export const useGetCustomerProjects = (customerId: string | null) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<DeliveryProject[]>(
    [...customerDeliveryKeys.projects(customerId ?? ''), tenantId],
    async () => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects`,
        method: 'GET',
        headers,
      });
      return Array.isArray(response) ? response : [];
    },
    {
      enabled: Boolean(customerId && tenantId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useGetCustomerDeliverySummary = (customerId: string | null) => {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  return useQuery<CustomerDeliverySummary>(
    [...customerDeliveryKeys.summary(customerId ?? ''), tenantId],
    async () => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/delivery-summary`,
        method: 'GET',
        headers,
      });
    },
    {
      enabled: Boolean(customerId && tenantId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
};

export const useCreateCustomerProject = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreateCustomerProjectDto): Promise<DeliveryProject> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects`,
        method: 'POST',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useUpdateCustomerProject = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: UpdateCustomerProjectDto;
    }): Promise<DeliveryProject> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}`,
        method: 'PATCH',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useDeleteCustomerProject = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async (projectId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}`,
        method: 'DELETE',
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useCreateProjectProduct = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: CreateProjectProductDto;
    }): Promise<DeliveryProductAssignment> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}/products`,
        method: 'POST',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useUpdateProjectProduct = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      assignmentId,
      payload,
    }: {
      projectId: string;
      assignmentId: string;
      payload: UpdateProjectProductDto;
    }): Promise<DeliveryProductAssignment> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}/products/${assignmentId}`,
        method: 'PATCH',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useDeleteProjectProduct = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      assignmentId,
    }: {
      projectId: string;
      assignmentId: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}/products/${assignmentId}`,
        method: 'DELETE',
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useCreateProjectLicense = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      assignmentId,
      payload,
    }: {
      projectId: string;
      assignmentId: string;
      payload: CreateProjectLicenseDto;
    }): Promise<DeliveryLicense> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}/products/${assignmentId}/licenses`,
        method: 'POST',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};

export const useUpdateProjectLicense = (customerId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      projectId,
      assignmentId,
      licenseId,
      payload,
    }: {
      projectId: string;
      assignmentId: string;
      licenseId: string;
      payload: UpdateProjectLicenseDto;
    }): Promise<DeliveryLicense> => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/customers/${customerId}/projects/${projectId}/products/${assignmentId}/licenses/${licenseId}`,
        method: 'PATCH',
        data: payload,
        headers,
      });
    },
    { onSuccess: () => invalidateDelivery(queryClient, customerId) },
  );
};
