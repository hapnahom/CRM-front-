import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { useMutation, useQueryClient } from 'react-query';
import NotificationMessage from '@/components/common/notification/notificationMessage';

const createStage = async (data: any) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/deal-stage`,
      method: 'POST',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Created',
      description: 'Stage successfully Created.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Stage Creation Failed',
    });
    throw error;
  }
};

const updateStage = async ({ id, data }: { id: string; data: any }) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/deal-stage/${id}`,
      method: 'PATCH',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Updated',
      description: 'Stage successfully updated.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Stage Update Failed',
    });
    throw error;
  }
};

// Check if any deals are using the stage
const checkDealsUsingStage = async (stageId: string) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    const response = await crudRequest({
      url: `${CRM_URL}/deals/with-details?engagementStageId=${stageId}&page=1&limit=1`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });

    // Check if there are any deals using this stage
    const deals = response?.data || response || [];
    return Array.isArray(deals) ? deals.length > 0 : false;
  } catch (error) {
    return false; // If we can't check, assume no deals to be safe
  }
};

const deleteStage = async (id: string) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    // First check if any deals are using this stage
    const hasDeals = await checkDealsUsingStage(id);

    if (hasDeals) {
      NotificationMessage.error({
        message: 'Cannot Delete Stage',
        description:
          'This stage is currently being used by one or more deals. Please move those deals to another stage before deleting this one.',
      });
      throw new Error('Stage is being used by deals');
    }

    await crudRequest({
      url: `${CRM_URL}/deal-stage/${id}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Deleted',
      description: 'Stage successfully deleted.',
    });
  } catch (error: any) {
    // Only show generic error if it's not our custom error
    if (!error?.message?.includes('Stage is being used by deals')) {
      NotificationMessage.error({
        message: 'Stage Deletion Failed',
        description: 'An unexpected error occurred while deleting the stage.',
      });
    }
    throw error;
  }
};

export const useCreateStage = () => {
  const queryClient = useQueryClient();
  return useMutation(({ data }: { data: any }) => createStage(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-stages');
      queryClient.invalidateQueries('deal-stages-settings');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Stage Creation Failed',
        description: errorMessage,
      });
    },
  });
};

export const useUpdateStage = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: any }) => updateStage({ id, data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-stages');
        queryClient.invalidateQueries('deal-stages-settings');
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message;
        NotificationMessage.error({
          message: 'Stage Update Failed',
          description: errorMessage,
        });
      },
    },
  );
};

export const useDeleteStage = () => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => deleteStage(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-stages');
      queryClient.invalidateQueries('deal-stages-settings');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Stage Deletion Failed',
        description: errorMessage,
      });
    },
  });
};
