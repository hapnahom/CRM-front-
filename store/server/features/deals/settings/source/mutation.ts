import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { useMutation, useQueryClient } from 'react-query';
import NotificationMessage from '@/components/common/notification/notificationMessage';

const createDealSource = async (data: any) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/source`,
      method: 'POST',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Created',
      description: 'Deal Source successfully Created.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Deal Source Creation Failed',
    });
    throw error;
  }
};

const updateDealSource = async ({ id, data }: { id: string; data: any }) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/source/${id}`,
      method: 'PATCH',
      data: data,
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Updated',
      description: 'Deal Source successfully updated.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Deal Source Update Failed',
    });
    throw error;
  }
};

const deleteDealSource = async (id: string) => {
  const token = await getCurrentToken();
  const tenantId = useAuthenticationStore.getState().tenantId;
  try {
    await crudRequest({
      url: `${CRM_URL}/source/${id}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
      },
    });
    NotificationMessage.success({
      message: 'Successfully Deleted',
      description: 'Deal Source successfully deleted.',
    });
  } catch (error) {
    NotificationMessage.error({
      message: 'Deal Source Deletion Failed',
    });
    throw error;
  }
};

export const useCreateDealSource = () => {
  const queryClient = useQueryClient();
  return useMutation(({ data }: { data: any }) => createDealSource(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-sources');
      queryClient.refetchQueries('deal-sources');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Deal Source Creation Failed',
        description: errorMessage,
      });
    },
  });
};

export const useUpdateDealSource = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: any }) => updateDealSource({ id, data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deal-sources');
        queryClient.refetchQueries('deal-sources');
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message;
        NotificationMessage.error({
          message: 'Deal Source Update Failed',
          description: errorMessage,
        });
      },
    },
  );
};

export const useDeleteDealSource = () => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => deleteDealSource(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('deal-sources');
      queryClient.refetchQueries('deal-sources');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message;
      NotificationMessage.error({
        message: 'Deal Source Deletion Failed',
        description: errorMessage,
      });
    },
  });
};
