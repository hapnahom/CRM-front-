import { useMutation } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { CRM_URL } from '@/utils/constants';
import axios from 'axios';
import { ExportStagnantDealsRequest } from './types';

// --- API Service Functions ---

/**
 * Builds query parameters for stagnant deals export.
 * Converts the ExportStagnantDealsRequest into URL query parameters.
 */
const buildExportQueryParams = (
  data: ExportStagnantDealsRequest,
): Record<string, any> => {
  const params: Record<string, any> = {
    exportType: data.exportType || 'EXCEL',
  };

  // Add optional parameters
  if (data.filename) {
    params.filename = data.filename;
  }
  if (data.worksheetName) {
    params.worksheetName = data.worksheetName;
  }

  // Add filters as individual query parameters
  if (data.filters) {
    if (data.filters.companyId) {
      params.companyId = data.filters.companyId;
    }
    if (data.filters.engagementStageId) {
      params.engagementStageId = data.filters.engagementStageId;
    }
    if (data.filters.ownerId) {
      params.ownerId = data.filters.ownerId;
    }
    if (data.filters.date) {
      params.date = data.filters.date;
    }
    if (data.filters.currency) {
      params.currency = data.filters.currency;
    }
  }

  return params;
};

/**
 * Exports stagnant deals to EXCEL/CSV.
 * Uses GET request with query parameters and handles binary file download.
 */
const exportStagnantDeals = async (
  data: ExportStagnantDealsRequest,
): Promise<void> => {
  try {
    const token = await getCurrentToken();
    const tenantId = useAuthenticationStore.getState().tenantId;

    if (!tenantId) {
      throw new Error(
        'Tenant ID not found. Please ensure you are properly authenticated.',
      );
    }

    const headers = {
      tenantId: tenantId,
      Authorization: `Bearer ${token}`,
    };

    // Build query parameters from request data
    const queryParams = buildExportQueryParams(data);

    // Make GET request with query parameters and arraybuffer response type
    const response = await axios({
      url: `${CRM_URL}/dashboard/stagnant-deals/export`,
      method: 'GET',
      headers,
      params: queryParams,
      responseType: 'arraybuffer', // Important: for binary Excel data
    });

    // Handle binary response data
    if (response.data instanceof ArrayBuffer) {
      // Determine filename
      const filename = data.filename
        ? `${data.filename}.xlsx`
        : 'stagnant_deals_export.xlsx';

      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      throw new Error('Unexpected response format from export API');
    }
  } catch (error) {
    throw error;
  }
};

// --- React Query Mutation Hooks ---

/**
 * Hook for exporting stagnant deals to EXCEL/CSV.
 */
export const useExportStagnantDeals = () => {
  return useMutation<void, Error, ExportStagnantDealsRequest>(
    exportStagnantDeals,
    {
      onSuccess: () => {
        handleSuccessMessage('POST', 'Export request processed successfully');

        // Show success notification
        NotificationMessage.success({
          message: 'Export Success',
          description: 'File has been downloaded successfully.',
        });
      },
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message || 'Failed to export stagnant deals';
        NotificationMessage.error({
          message: 'Export Failed',
          description: errorMessage,
        });
      },
    },
  );
};

/**
 * Combined hook for exporting and downloading stagnant deals in one operation.
 */
export const useExportAndDownloadStagnantDeals = () => {
  const exportMutation = useExportStagnantDeals();

  return useMutation<void, Error, ExportStagnantDealsRequest>(
    async (data) => {
      // Export and download in one operation
      await exportMutation.mutateAsync(data);
    },
    {
      onSuccess: () => {
        handleSuccessMessage(
          'POST',
          'Export and download completed successfully',
        );

        NotificationMessage.success({
          message: 'Export Complete',
          description: 'File has been exported and downloaded successfully.',
        });
      },
      onError: (error: any) => {
        if (error?.response?.data?.errors) {
          showValidationErrors(error.response.data.errors);
        } else {
          handleNetworkError(error);
        }

        const errorMessage =
          error?.response?.data?.message ||
          'Failed to export and download stagnant deals';
        NotificationMessage.error({
          message: 'Export Failed',
          description: errorMessage,
        });
      },
    },
  );
};
