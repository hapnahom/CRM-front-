import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  ExportActivityParams,
  ExportActivityResponse,
} from '@/store/server/features/activity/export/types';
import { exportActivitiesToXLSX } from '@/utils/exportActivityToXlsx';
import { buildActivityQueryString } from '../utils';
import axios from 'axios';

// --- API Service Functions ---

/**
 * Exports global activities to XLSX format for the current tenant.
 */
const fetchActivitiesXLSX = async (
  params: ExportActivityParams = {},
): Promise<ExportActivityResponse> => {
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

    // Build query parameters for filters
    const queryParams: Record<string, any> = {
      format: params.format || 'xlsx',
      includeDocuments: params.includeDocuments || false,
    };

    // Determine endpoint based on entityType
    let endpoint = '/activities/export/csv';

    if (params.filters?.entityType === 'deal') {
      endpoint = '/activities/deals/export/csv';
    } else if (params.filters?.entityType === 'lead') {
      endpoint = '/activities/leads/export/csv';
    }

    // Add filters to query params using the utility function
    if (params.filters) {
      // Remove entityType from filters since it's now in the URL path
      // eslint-disable-next-line
      const { entityType: _, ...otherFilters } = params.filters;
      const filterQueryString = buildActivityQueryString(otherFilters);
      const filterParams = new URLSearchParams(filterQueryString);

      // Add each filter parameter to queryParams
      filterParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    // Add date range if provided (this overrides any date filters in the filters object)
    if (params.dateRange) {
      if (params.dateRange.startDate) {
        queryParams.startDate = params.dateRange.startDate.toISOString();
      }
      if (params.dateRange.endDate) {
        queryParams.endDate = params.dateRange.endDate.toISOString();
      }
    }

    // For binary data, we need to use axios directly with responseType: 'arraybuffer'
    const response = await axios({
      url: `${CRM_URL}${endpoint}`,
      method: 'GET',
      headers,
      params: queryParams,
      responseType: 'arraybuffer', // This is crucial for binary data
    });

    // Handle XLSX response - the backend returns XLSX data as binary
    if (response.data instanceof ArrayBuffer) {
      return {
        success: true,
        message: 'Export completed successfully',
        xlsxData: response.data,
        fileName: `global_activities_export_${Date.now()}.xlsx`,
      };
    }

    // Handle JSON response with XLSX data (fallback case)
    if (
      response &&
      typeof response === 'object' &&
      response.data &&
      !(response.data instanceof ArrayBuffer)
    ) {
      return {
        success: response.data.success || true,
        message: response.data.message || 'Export completed successfully',
        xlsxData: response.data.xlsxData || response.data.data,
        fileName:
          response.data.fileName ||
          `global_activities_export_${Date.now()}.xlsx`,
        downloadUrl: response.data.downloadUrl,
      };
    }

    // If we get here, something went wrong
    throw new Error('Unexpected response format from export API');
  } catch (error) {
    throw error;
  }
};

/**
 * Downloads the exported file from XLSX data or URL.
 */
const downloadExportedFile = async (
  xlsxData: ArrayBuffer | Blob,
  fileName: string,
): Promise<void> => {
  try {
    // Use the XLSX utility to handle the download
    await exportActivitiesToXLSX(xlsxData, fileName);
  } catch (error) {
    throw error;
  }
};

// --- React Query Hooks ---

/**
 * Hook for exporting global activities to XLSX.
 */
export const useExportActivitiesToXLSX = () => {
  const queryClient = useQueryClient();

  return useMutation(fetchActivitiesXLSX, {
    // eslint-disable-next-line
    onSuccess: (data) => {
      handleSuccessMessage('Export completed successfully!');

      // Invalidate activities query to refresh data
      queryClient.invalidateQueries(['global-activities']);
    },
    onError: (error: any) => {
      if (error?.response?.data?.errors) {
        showValidationErrors(error.response.data.errors);
      } else {
        handleNetworkError(error);
      }

      const errorMessage = error?.response?.data?.message || 'Export failed';
      NotificationMessage.error({
        message: 'Error',
        description: errorMessage,
      });
    },
  });
};

/**
 * Hook for downloading exported files.
 */
export const useDownloadExportedFile = () => {
  return useMutation(
    ({
      xlsxData,
      fileName,
    }: {
      xlsxData: ArrayBuffer | Blob;
      fileName: string;
    }) => downloadExportedFile(xlsxData, fileName),
    {
      onSuccess: () => {
        handleSuccessMessage('File downloaded successfully!');
      },
      // eslint-disable-next-line
      onError: (error: any) => {},
    },
  );
};

/**
 * Combined hook for export and download in one operation.
 */
export const useExportAndDownloadActivities = () => {
  const exportMutation = useExportActivitiesToXLSX();
  const downloadMutation = useDownloadExportedFile();

  const exportAndDownload = async (params: ExportActivityParams) => {
    try {
      // First export the data
      const exportResult = await exportMutation.mutateAsync(params);

      // Then download the file if XLSX data is provided
      if (exportResult.xlsxData) {
        await downloadMutation.mutateAsync({
          xlsxData: exportResult.xlsxData,
          fileName:
            exportResult.fileName ||
            `global_activities_export_${Date.now()}.xlsx`,
        });
      }
      // eslint-disable-next-line
      return exportResult;
    } catch (error) {
      // eslint-disable-next-line
      throw error;
    }
  };

  return {
    exportAndDownload,
    isLoading: exportMutation.isLoading || downloadMutation.isLoading,
    error: exportMutation.error || downloadMutation.error,
    isSuccess: exportMutation.isSuccess && downloadMutation.isSuccess,
  };
};
