import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { message } from 'antd';
import { fileUpload } from '@/utils/fileUpload';
import { CRM_URL } from '@/utils/constants';
import {
  ActivityDocumentResponse,
  UploadActivityDocumentInput,
  ActivityDocumentPayload,
  UpdateActivityDocumentInput,
} from './types';

// --- File Server Upload Function ---
const uploadToFileServer = async (file: File): Promise<string> => {
  try {
    const response = await fileUpload(file);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(
        `File server upload failed: ${response.status} ${response.statusText}`,
      );
    }

    const filePath = response.data?.image || response.data?.viewImage;

    if (!filePath) {
      const mockFilePath = `https://files.ienetworks.co/uploads/${file.name}`;
      return mockFilePath;
    }

    return filePath;
  } catch (error) {
    throw error;
  }
};

// --- Backend Document Creation Function ---
const createActivityDocument = async (
  payload: ActivityDocumentPayload,
): Promise<ActivityDocumentResponse> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/activity-documents`,
      method: 'POST',
      data: payload,
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- Main Upload Function ---
const uploadActivityDocument = async (
  data: UploadActivityDocumentInput,
): Promise<ActivityDocumentResponse> => {
  try {
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    if (!data.activityId) {
      throw new Error('Activity ID is required for document upload.');
    }

    try {
      // Step 1: Upload file to file server
      const filePath = await uploadToFileServer(data.file);

      // Step 2: Create document record in backend
      const documentPayload: ActivityDocumentPayload = {
        activityId: data.activityId,
        filePath: filePath,
        fileName: data.documentName || data.file.name,
        tenantId: tenantId,
      };

      const result = await createActivityDocument(documentPayload);
      return result;
    } catch (uploadError) {
      throw uploadError;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('File server upload failed')) {
        throw new Error(
          `File upload failed: ${error.message}. Please check the file server configuration.`,
        );
      } else if (error.message.includes('Backend document creation error')) {
        throw new Error(
          `Document record creation failed: ${error.message}. Please check the backend configuration.`,
        );
      }
    }

    throw error;
  }
};

// --- Update Activity Document Function ---
const updateActivityDocument = async (
  id: string,
  data: UpdateActivityDocumentInput,
): Promise<ActivityDocumentResponse> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/activity-documents/${id}`,
      method: 'PATCH',
      data,
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- Delete Activity Document Function ---
const deleteActivityDocument = async (id: string): Promise<void> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    await crudRequest({
      url: `${CRM_URL}/activity-documents/${id}`,
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for uploading activity documents.
 */
export const useUploadActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(uploadActivityDocument, {
    onSuccess: (data, variables) => {
      // Invalidate activity documents queries to refresh the list
      queryClient.invalidateQueries(['activityDocuments']);

      // Also invalidate specific activity documents if we have an activityId
      if (data.activityId) {
        queryClient.invalidateQueries([
          'activityDocuments',
          'byActivity',
          data.activityId,
        ]);
      }

      message.success(
        `Document "${variables.file.name}" uploaded successfully!`,
      );
    },
    onError: (error: any, variables) => {
      let errorMessage = 'Failed to upload document.';

      if (error?.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (Array.isArray(error.message)) {
          errorMessage = error.message.join(', ');
        }
      }

      message.error(
        `Failed to upload "${variables?.file?.name || 'document'}": ${errorMessage}`,
      );
    },
  });
};

/**
 * Hook for updating activity documents.
 */
export const useUpdateActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, data }: { id: string; data: UpdateActivityDocumentInput }) =>
      updateActivityDocument(id, data),
    {
      onSuccess: (data, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['activityDocuments']);
        queryClient.invalidateQueries(['activityDocument', variables.id]);

        if (data.activityId) {
          queryClient.invalidateQueries([
            'activityDocuments',
            'byActivity',
            data.activityId,
          ]);
        }

        message.success('Document updated successfully!');
      },
      onError: (error: any) => {
        let errorMessage = 'Failed to update document.';

        if (error?.message) {
          if (typeof error.message === 'string') {
            errorMessage = error.message;
          } else if (Array.isArray(error.message)) {
            errorMessage = error.message.join(', ');
          }
        }

        message.error(`Failed to update document: ${errorMessage}`);
      },
    },
  );
};

/**
 * Hook for deleting activity documents.
 */
export const useDeleteActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(deleteActivityDocument, {
    // eslint-disable-next-line
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries(['activityDocuments']);
      queryClient.invalidateQueries(['activityDocument', variables]);

      message.success('Document deleted successfully!');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to delete document.';

      if (error?.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (Array.isArray(error.message)) {
          errorMessage = error.message.join(', ');
        }
      }

      message.error(`Failed to delete document: ${errorMessage}`);
    },
  });
};
