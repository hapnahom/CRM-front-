/**
 * CSV Export utility for activities
 * Handles CSV data processing and file downloads
 */

import { XLSX_HEADERS } from '@/store/server/features/leads/activity/export/types';

// Use XLSX headers for CSV export as well
const CSV_HEADERS = XLSX_HEADERS;
import { handleSuccessMessage } from '@/utils/showSuccessMessage';
import { handleNetworkError } from '@/utils/showErrorResponse';

/**
 * Downloads CSV data as a file
 */
export const downloadCSVFile = (
  csvData: string,
  fileName: string = 'activities_export',
): void => {
  try {
    // Create blob from CSV data
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${Date.now()}.csv`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    handleSuccessMessage('CSV file downloaded successfully!');
  } catch (error: any) {
    handleNetworkError(error);
    throw error;
  }
};

/**
 * Processes CSV data and ensures proper formatting
 */
export const processCSVData = (csvData: string): string => {
  try {
    // If the data doesn't start with headers, add them
    if (!csvData.startsWith('Lead ID,')) {
      const headers = CSV_HEADERS.join(',');
      return `${headers}\n${csvData}`;
    }

    return csvData;
    // eslint-disable-next-line
  } catch (error) {
    return csvData;
  }
};

/**
 * Validates CSV data format
 */
export const validateCSVData = (csvData: string): boolean => {
  try {
    if (!csvData || typeof csvData !== 'string') {
      return false;
    }

    // Check if it contains the expected headers
    const hasHeaders = CSV_HEADERS.some((header: string) =>
      csvData.includes(header),
    );

    // Check if it has at least one data row (after headers)
    const lines = csvData.split('\n');
    const hasData = lines.length > 1;

    return hasHeaders && hasData;
    // eslint-disable-next-line
  } catch (error) {
    // eslint-disable-next-line
    return false;
  }
};

/**
 * Converts CSV data to JSON format (optional utility)
 */
export const csvToJson = (csvData: string): any[] => {
  try {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');

    const jsonData = lines.slice(1).map((line) => {
      const values = line.split(',');
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });

      return obj;
    });

    return jsonData.filter((row) =>
      Object.values(row).some((value) => value !== ''),
    );
    // eslint-disable-next-line
  } catch (error) {
    return [];
  }
};

/**
 * Main export function that handles the complete CSV export process
 */
export const exportActivitiesToCSV = async (
  csvData: string,
  fileName: string = 'activities_export',
): Promise<void> => {
  try {
    // Validate CSV data
    if (!validateCSVData(csvData)) {
      throw new Error('Invalid CSV data format');
    }

    // Process CSV data
    const processedData = processCSVData(csvData);

    // Download the file
    downloadCSVFile(processedData, fileName);
  } catch (error: any) {
    handleNetworkError(error);
    throw error;
  }
};
