import { useMutation, useQueryClient } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { CRM_URL } from '@/utils/constants';
import { handleNetworkError } from '@/utils/showErrorResponse';
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { showValidationErrors } from '@/utils/showValidationErrors';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { ExportDealActivityParams, ExportDealActivityResponse } from './types';
import { exportActivitiesToXLSX } from '@/utils/exportActivityToXlsx';
import axios from 'axios';

// --- API Service Functions ---

/**
 * Builds query string from deal activity filters
 */
const buildDealActivityQueryString = (filters: any): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Map frontend filter names to backend parameter names
      let backendKey = key;
      if (key === 'activityType') {
        backendKey = 'activityTypeId'; // Backend expects activityTypeId
      }

      if (value instanceof Date) {
        params.append(backendKey, value.toISOString());
      } else {
        params.append(backendKey, String(value));
      }
    }
  });

  return params.toString();
};

/**
 * Exports deal activities to XLSX format for the current tenant.
 */
const fetchDealActivitiesXLSX = async (
  params: ExportDealActivityParams = {},
): Promise<ExportDealActivityResponse> => {
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

    // Add filters to query params
    if (params.filters) {
      const filterQueryString = buildDealActivityQueryString(params.filters);
      const filterParams = new URLSearchParams(filterQueryString);

      // Add each filter parameter to queryParams
      filterParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    // Add date range if provided
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
      url: `${CRM_URL}/activities/deals/export/csv`,
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
        fileName: `deal_activities_export_${Date.now()}.xlsx`,
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
          response.data.fileName || `deal_activities_export_${Date.now()}.xlsx`,
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
 * Hook for exporting deal activities to XLSX.
 */
export const useExportDealActivitiesToXLSX = () => {
  const queryClient = useQueryClient();

  return useMutation(fetchDealActivitiesXLSX, {
    // eslint-disable-next-line
    onSuccess: (data) => {
      handleSuccessMessage('Export completed successfully!');

      // Invalidate deal activities query to refresh data
      queryClient.invalidateQueries(['filter-deal-activities']);
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
export const useDownloadExportedDealActivityFile = () => {
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
export const useExportAndDownloadDealActivities = () => {
  const exportMutation = useExportDealActivitiesToXLSX();
  const downloadMutation = useDownloadExportedDealActivityFile();

  const exportAndDownload = async (params: ExportDealActivityParams) => {
    try {
      // First export the data
      const exportResult = await exportMutation.mutateAsync(params);

      // Then download the file if XLSX data is provided
      if (exportResult.xlsxData) {
        await downloadMutation.mutateAsync({
          xlsxData: exportResult.xlsxData,
          fileName:
            exportResult.fileName ||
            `deal_activities_export_${Date.now()}.xlsx`,
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
