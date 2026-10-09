import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import type {
  EntityFieldResponse,
  CreateEntityFieldRequest,
  UpdateEntityFieldRequest,
} from './types';

async function buildHeaders(tenantId: string) {
  const token = await getCurrentToken();
  return { tenantId, Authorization: `Bearer ${token}` };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateEntityField() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<EntityFieldResponse, Error, CreateEntityFieldRequest>({
    mutationFn: async (data) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      return crudRequest({
        url: `${CRM_URL}/entity-fields`,
        method: 'POST',
        headers,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Field created successfully',
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Failed to create field';
      NotificationMessage.error({ message: 'Error', description: msg });
      handleNetworkError(error);
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateEntityField() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<
    EntityFieldResponse,
    Error,
    { id: string; data: UpdateEntityFieldRequest; confirmUpdate?: boolean }
  >({
    mutationFn: async ({ id, data, confirmUpdate }) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      const qs = confirmUpdate ? '?confirmUpdate=true' : '';
      return crudRequest({
        url: `${CRM_URL}/entity-fields/${id}${qs}`,
        method: 'PATCH',
        headers,
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Field updated successfully',
      });
    },
    onError: (error: any) => {
      const payload = error?.response?.data;
      const nested =
        payload?.message && typeof payload.message === 'object'
          ? payload.message
          : payload;
      if (
        error?.response?.status === 409 &&
        nested?.code === 'FIELD_STAGE_CHANGE_REQUIRES_CONFIRM'
      ) {
        return;
      }
      const msg =
        typeof nested?.message === 'string'
          ? nested.message
          : typeof payload?.message === 'string'
            ? payload.message
            : 'Failed to update field';
      NotificationMessage.error({
        message: 'Error',
        description: msg,
      });
      if (error?.response?.status !== 409) {
        handleNetworkError(error);
      }
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteEntityField() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<void, Error, { id: string; confirmUnlink?: boolean }>({
    mutationFn: async ({ id, confirmUnlink }) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      const qs = confirmUnlink ? '?confirmUnlink=true' : '';
      return crudRequest({
        url: `${CRM_URL}/entity-fields/${id}${qs}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Field deleted successfully',
      });
    },
    onError: (error: any) => {
      // 409 usage conflicts are handled by the confirm dialog — skip toast noise.
      if (error?.response?.status === 409) return;
      const msg = error?.response?.data?.message ?? 'Failed to delete field';
      NotificationMessage.error({
        message: 'Error',
        description: typeof msg === 'string' ? msg : 'Failed to delete field',
      });
      handleNetworkError(error);
    },
  });
}

// ─── Toggle active ────────────────────────────────────────────────────────────

export function useActivateEntityField() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<
    EntityFieldResponse,
    Error,
    { id: string; active: boolean }
  >({
    mutationFn: async ({ id, active }) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      const path = active ? 'activate' : 'deactivate';
      return crudRequest({
        url: `${CRM_URL}/entity-fields/${id}/${path}`,
        method: 'PATCH',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
    },
    onError: (error: any) => handleNetworkError(error),
  });
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export function useDuplicateEntityField() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<EntityFieldResponse, Error, string>({
    mutationFn: async (id) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      return crudRequest({
        url: `${CRM_URL}/entity-fields/${id}/duplicate`,
        method: 'POST',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
      NotificationMessage.success({
        message: 'Success',
        description: 'Field duplicated',
      });
    },
    onError: (error: any) => handleNetworkError(error),
  });
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export function useReorderEntityFields() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation<{ success: boolean }, Error, string[]>({
    mutationFn: async (orderedIds) => {
      if (!tenantId) throw new Error('Tenant ID not found');
      const headers = await buildHeaders(tenantId);
      return crudRequest({
        url: `${CRM_URL}/entity-fields/reorder/batch`,
        method: 'PATCH',
        headers,
        data: { orderedIds },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entityFields']);
      queryClient.invalidateQueries(['pipelineCustomFields']);
      queryClient.invalidateQueries(['entityFieldsForStage']);
    },
    onError: (error: any) => handleNetworkError(error),
  });
}
