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

// --- Delete Document Function ---
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

// --- Update Document Function ---
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
      data: data,
      headers,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for uploading activity documents.
 */
export const useUploadActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ActivityDocumentResponse,
    Error,
    UploadActivityDocumentInput
  >(uploadActivityDocument, {
    onMutate: async () => {
      message.loading({ content: 'Uploading document...', key: 'upload' });
    },
    onSuccess: (data) => {
      message.success({
        content: 'Document uploaded successfully!',
        key: 'upload',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['activityDocuments']);
      if (data.activityId) {
        queryClient.invalidateQueries([
          'activityDocuments',
          'byActivity',
          data.activityId,
        ]);
      }
    },
    onError: (error: Error) => {
      message.error({
        content: error.message || 'Failed to upload document.',
        key: 'upload',
      });
    },
  });
};

/**
 * Hook for deleting activity documents.
 */
export const useDeleteActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>(deleteActivityDocument, {
    onMutate: async () => {
      message.loading({ content: 'Deleting document...', key: 'delete' });
    },
    onSuccess: () => {
      message.success({
        content: 'Document deleted successfully!',
        key: 'delete',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['activityDocuments']);
    },
    onError: (error: Error) => {
      message.error({
        content: error.message || 'Failed to delete document.',
        key: 'delete',
      });
    },
  });
};

/**
 * Hook for updating activity documents.
 */
export const useUpdateActivityDocument = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ActivityDocumentResponse,
    Error,
    { id: string; data: UpdateActivityDocumentInput }
  >(({ id, data }) => updateActivityDocument(id, data), {
    onMutate: async () => {
      message.loading({ content: 'Updating document...', key: 'update' });
    },
    onSuccess: (data) => {
      message.success({
        content: 'Document updated successfully!',
        key: 'update',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['activityDocuments']);
      queryClient.invalidateQueries(['activityDocument', data.id]);
      if (data.activityId) {
        queryClient.invalidateQueries([
          'activityDocuments',
          'byActivity',
          data.activityId,
        ]);
      }
    },
    onError: (error: Error) => {
      message.error({
        content: error.message || 'Failed to update document.',
        key: 'update',
      });
    },
  });
};
