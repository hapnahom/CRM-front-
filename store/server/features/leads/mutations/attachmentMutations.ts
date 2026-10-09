import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { UploadAttachmentRequest, DeleteAttachmentRequest } from '../interface';
import { notification } from 'antd';

export function useUploadLeadAttachmentMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();
  return useMutation({
    mutationFn: async ({ leadId, fileData }: UploadAttachmentRequest) => {
      try {
        const token = await getCurrentToken();

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'PATCH',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: {
            attachments: [fileData],
            tenantId: tenantId,
          },
        });

        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch lead attachments
      queryClient.invalidateQueries(['lead-attachments', variables.leadId]);
      // Also invalidate lead detail to refresh attachments
      queryClient.invalidateQueries(['lead-detail', variables.leadId]);

      notification.success({
        message: 'File uploaded successfully',
        description: 'The file has been attached to the lead.',
      });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Upload failed',
        description:
          error?.response?.data?.message ||
          'Failed to upload file. Please try again.',
      });
    },
  });
}

export function useDeleteLeadAttachmentMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();
  return useMutation({
    mutationFn: async ({ leadId, attachmentId }: DeleteAttachmentRequest) => {
      try {
        const token = await getCurrentToken();

        const response = await crudRequest({
          url: `${CRM_URL}/leads/${leadId}`,
          method: 'PATCH',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
          data: {
            removeAttachment: attachmentId,
            tenantId: tenantId,
          },
        });

        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch lead attachments
      queryClient.invalidateQueries(['lead-attachments', variables.leadId]);
      // Also invalidate lead detail to refresh attachments
      queryClient.invalidateQueries(['lead-detail', variables.leadId]);

      notification.success({
        message: 'File deleted successfully',
        description: 'The file has been removed from the lead.',
      });
    },
    onError: (error: any) => {
      notification.error({
        message: 'Deletion failed',
        description:
          error?.response?.data?.message ||
          'Failed to delete file. Please try again.',
      });
    },
  });
}
