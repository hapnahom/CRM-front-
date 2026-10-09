import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { UpdateLeadStageRequest } from '../interface';
import NotificationMessage from '@/components/common/notification/notificationMessage';

export function useUpdateLeadStageMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthenticationStore();

  return useMutation({
    mutationFn: async (data: UpdateLeadStageRequest) => {
      try {
        const token = await getCurrentToken();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const params: any = {
          url: `${CRM_URL}/leads/${data.leadId}`,
          method: 'PATCH',
          headers: {
            tenantId: tenantId,
            Authorization: `Bearer ${token}`,
          },
          data: {
            engagementStageId: data.stageId,
          },
          // include AbortSignal if the underlying request util supports it
          signal: controller.signal,
        };

        const response = await crudRequest(params);

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        throw error;
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      const previousLeadsQueries = queryClient.getQueriesData({
        queryKey: ['leads'],
      });

      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) {
          return oldData;
        }

        if (oldData.data && Array.isArray(oldData.data)) {
          const updatedData = {
            ...oldData,
            data: oldData.data.map((lead: any) => {
              if (lead.id === variables.leadId) {
                return { ...lead, engagementStageId: variables.stageId };
              }
              return lead;
            }),
          };
          return updatedData;
        }

        if (Array.isArray(oldData)) {
          const updatedData = oldData.map((lead: any) => {
            if (lead.id === variables.leadId) {
              return { ...lead, engagementStageId: variables.stageId };
            }
            return lead;
          });
          return updatedData;
        }

        return oldData;
      });

      return { previousLeadsQueries };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['engagement-stages'] });
    },
    onError: (unusedError, unusedVariables, context) => {
      NotificationMessage.error({
        message: 'Stage Update Failed',
        description: 'Failed to update lead stage. Please try again.',
      });

      if (context?.previousLeadsQueries) {
        context.previousLeadsQueries.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
