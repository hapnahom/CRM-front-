import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { useMutation, useQueryClient } from 'react-query';
import NotificationMessage from '@/components/common/notification/notificationMessage';

const createActivityType = async (data: any) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/deal-activity-types`,
      method: 'POST',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Created',
      description: 'Deal Activity Type successfully Created.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Deal Activity Type Creation Failed',
    });
    throw error;
  }
};

const updateActivityType = async (data: any, id: string) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/deal-activity-types/${id}`,
      method: 'PATCH',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Updated',
      description: 'Deal Activity Type successfully Updated.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Deal Activity Type Update Failed',
    });
  }
};

const deleteActivityType = async (id: string) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/deal-activity-types/${id}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const useCreateActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(({ data }: { data: any }) => createActivityType(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-activity-types');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Deal Activity Type Creation Failed',
        description: errorMessage,
      });
    },
  });
};

export const useUpdateActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ data, id }: { data: any; id: string }) => updateActivityType(data, id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-activity-types');
      },
    },
  );
};

export const useDeleteActivityType = () => {
  const queryClient = useQueryClient();
  return useMutation(({ id }: { id: string }) => deleteActivityType(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-activity-types');
    },
  });
};
