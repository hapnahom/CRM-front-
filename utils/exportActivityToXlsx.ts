/**
 * XLSX Export utility for activities
 * Handles XLSX data processing and file downloads
 */

import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { handleNetworkError } from '@/utils/showErrorResponse';

/**
 * Downloads XLSX data as a file
 */
export const downloadXLSXFile = (
  xlsxData: ArrayBuffer | Blob,
  fileName: string = 'activities_export',
): void => {
  try {
    // Create blob from XLSX data
    const blob =
      xlsxData instanceof Blob
        ? xlsxData
        : new Blob([xlsxData], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${Date.now()}.xlsx`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    handleSuccessMessage('XLSX file downloaded successfully!');
  } catch (error: any) {
    handleNetworkError(error);
    throw error;
  }
};

/**
 * Validates XLSX data format
 */
export const validateXLSXData = (xlsxData: ArrayBuffer | Blob): boolean => {
  try {
    if (!xlsxData) {
      return false;
    }

    // Check if it's a valid ArrayBuffer or Blob
    if (xlsxData instanceof ArrayBuffer) {
      return xlsxData.byteLength > 0;
    }

    if (xlsxData instanceof Blob) {
      return xlsxData.size > 0;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Processes XLSX data and ensures proper formatting
 */
export const processXLSXData = (xlsxData: ArrayBuffer | Blob): Blob => {
  try {
    if (xlsxData instanceof Blob) {
      return xlsxData;
    }

    // Convert ArrayBuffer to Blob
    return new Blob([xlsxData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (error) {
    throw new Error('Failed to process XLSX data');
  }
};

/**
 * Main export function that handles the complete XLSX export process
 */
export const exportActivitiesToXLSX = async (
  xlsxData: ArrayBuffer | Blob,
  fileName: string = 'activities_export',
): Promise<void> => {
  try {
    // Validate XLSX data
    if (!validateXLSXData(xlsxData)) {
      throw new Error('Invalid XLSX data format');
    }

    // Process XLSX data
    const processedData = processXLSXData(xlsxData);

    // Download the file
    downloadXLSXFile(processedData, fileName);
  } catch (error: any) {
    handleNetworkError(error);
    throw error;
  }
};

/**
 * Helper function to create a proper XLSX filename
 */
export const createXLSXFileName = (
  baseName: string = 'activities_export',
): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${baseName}_${timestamp}.xlsx`;
};

/**
 * Helper function to get XLSX MIME type
 */
export const getXLSXMimeType = (): string => {
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
};
