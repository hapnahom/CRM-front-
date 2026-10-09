import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { CRM_URL } from '@/utils/constants';
import { Company } from '../interface';
import { notification } from 'antd';

/**
 * Update Company mutation (PATCH)
 */
export function useUpdateCompanyMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: Partial<Company>;
    }) => {
      try {
        const token = await getCurrentToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const params: any = {
          url: `${CRM_URL}/companies/${companyId}`,
          method: 'PATCH',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
          data: data,
        };
        // Attach abort signal separately to avoid TypeScript error when RequestParams doesn't include 'signal'
        params.signal = controller.signal;
        const response = await crudRequest(params);

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate companies query to refetch updated data
      queryClient.invalidateQueries(['companies', tenantId]);
      handleSuccessMessage('PATCH');
    },
    onError: (error: any) => {
      notification.error({
        message: 'Company update failed',
        description:
          error?.response?.data?.message ||
          'Failed to update company information. Please try again.',
      });
    },
  });
}
