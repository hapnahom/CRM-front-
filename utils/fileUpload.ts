import { AxiosResponse } from 'axios';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import apiClient from '@/utils/apiClient';
import { extractUploadErrorMessage } from '@/utils/extractUploadErrorMessage';

export interface CustomFile {
  image: string;
  viewImage: string;
}

export const fileUpload = async (
  file: File,
  options?: { timeoutMs?: number },
): Promise<AxiosResponse<CustomFile>> => {
  try {
    const token = await getCurrentToken();
    const { tenantId } = useAuthenticationStore.getState();
    const formData = new FormData();
    formData.append('file', file);

    // Use apiClient so expired ID tokens are refreshed and the upload retried.
    const response = await apiClient.post<CustomFile>(
      `${CRM_URL}/files/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
          ...tenantHeadersFromStoreTenantId(tenantId),
        },
        // Marketing assets can be large creative files.
        timeout: options?.timeoutMs ?? 120_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    return response;
  } catch (error) {
    const description = extractUploadErrorMessage(error);
    NotificationMessage.error({
      message: 'File upload error',
      description,
    });
    throw error;
  }
};
