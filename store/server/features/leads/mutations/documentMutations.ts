import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { notification } from 'antd';

export function useDeleteLeadDocumentMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      leadId, // eslint-disable-line @typescript-eslint/no-unused-vars
      documentId,
    }: {
      leadId: string;
      documentId: string;
    }) => {
      try {
        const token = await getCurrentToken();

        const response = await crudRequest({
          url: `${CRM_URL}/lead-documents/${documentId}`,
          method: 'DELETE',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
        });

        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch lead documents
      queryClient.invalidateQueries(['lead-documents', variables.leadId]);
      // Also invalidate lead detail to refresh documents
      queryClient.invalidateQueries(['lead-detail', variables.leadId]);

      notification.success({
        message: 'Document deleted successfully',
        description: 'The document has been removed from the lead.',
      });
    },
    onError: (unusedError: any) => {
      notification.error({
        message: 'Deletion failed',
        description:
          unusedError?.response?.data?.message ||
          'Failed to delete document. Please try again.',
      });
    },
  });
}
