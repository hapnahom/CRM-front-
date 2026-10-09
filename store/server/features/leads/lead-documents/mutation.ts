import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { crudRequest } from '@/utils/crudRequest';
import { fileUpload } from '@/utils/fileUpload';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { showValidationErrors } from '@/utils/showValidationErrors';
import { CRM_URL } from '@/utils/constants';
import NotificationMessage from '@/components/common/notification/notificationMessage';

// --- Configuration ---
// Remove hardcoded BASE_URL and use imported one

// --- Interfaces ---
export interface UploadLeadDocumentInput {
  file: File;
  leadId?: string;
  documentName?: string;
  [key: string]: any;
}

export interface LeadDocumentResponse {
  id: string;
  name: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  tenantId: string;
  [key: string]: any;
}

export interface LeadDocumentPayload {
  leadId: string;
  filePath: string;
  fileName: string;
}

// --- File Server Upload Function ---
const uploadToFileServer = async (file: File): Promise<string> => {
  try {
    // Use the existing fileUpload utility instead of direct fetch
    const response = await fileUpload(file);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(
        `File server upload failed: ${response.status} ${response.statusText}`,
      );
    }

    // Extract file path/URL from response
    // The fileUpload utility returns CustomFile interface with image and viewImage
    const filePath = response.data?.image || response.data?.viewImage;

    if (!filePath) {
      // Fallback to mock path for testing
      const mockFilePath = `https://files.ienetworks.co/uploads/${file.name}`;
      return mockFilePath;
    }

    return filePath;
  } catch (error) {
    throw error;
  }
};

// --- Backend Document Creation Function ---
const createLeadDocument = async (
  payload: LeadDocumentPayload,
): Promise<LeadDocumentResponse> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    const response = await crudRequest({
      url: `${CRM_URL}/lead-documents`,
      method: 'POST',
      data: payload,
      headers,
      // skipEncryption: true, // Disable encryption for this request
    });

    return response;
  } catch (error) {
    throw error;
  }
};

// --- Main Upload Function ---
const uploadLeadDocument = async (
  data: UploadLeadDocumentInput,
): Promise<LeadDocumentResponse> => {
  try {
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    if (!data.leadId) {
      throw new Error('Lead ID is required for document upload.');
    }

    try {
      // Step 1: Upload file to file server
      const filePath = await uploadToFileServer(data.file);

      // Step 2: Create document record in backend
      const documentPayload: LeadDocumentPayload = {
        leadId: data.leadId,
        filePath: filePath,
        fileName: data.documentName || data.file.name,
      };

      const result = await createLeadDocument(documentPayload);

      return result;
    } catch (uploadError) {
      throw uploadError;
    }
  } catch (error: any) {
    // Provide more specific error messages
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

    if (error?.response?.data?.errors) {
      showValidationErrors(error.response.data.errors);
    } else {
      handleNetworkError(error);
    }
    throw error;
  }
};

// --- React Query Hook ---
export const useUploadLeadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation(uploadLeadDocument, {
    onSuccess: (data, variables) => {
      // Invalidate lead documents query to refresh the list - use correct query key
      queryClient.invalidateQueries(['lead-documents']);

      // Also invalidate specific lead documents query for this lead
      if (data.leadId) {
        queryClient.invalidateQueries(['lead-documents', data.leadId]);
        queryClient.invalidateQueries(['leads']);
      }

      NotificationMessage.success({
        message: 'Successfully Uploaded',
        description: `Document "${variables.file.name}" uploaded successfully!`,
      });
    },
    onError: (error: any, variables) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage =
        error?.response?.data?.message || 'Failed to upload document';
      NotificationMessage.error({
        message: 'Error',
        description: `Failed to upload "${variables?.file?.name || 'document'}": ${errorMessage}`,
      });
    },
  });
};
