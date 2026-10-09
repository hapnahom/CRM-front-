import { CRM_URL } from './constants';
import { requestHeader } from '@/helpers/requestHeader';

// Export deals using backend API
export const exportDealsFromBackend = async (params: {
  exportType: 'EXCEL' | 'PDF';
  filename?: string;
  worksheetName?: string;
  filters?: {
    dealName?: string;
    companyId?: string;
    engagementStageId?: string;
    supplierId?: string;
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}): Promise<{ success: boolean; message: string; blob?: Blob }> => {
  try {
    const headers = await requestHeader();

    const requestBody = {
      exportType: params.exportType,
      filename:
        params.filename ||
        `deals_export_${new Date().toISOString().split('T')[0]}`,
      worksheetName: params.worksheetName || 'Deals Export',
      filters: params.filters || {},
      orderBy: params.orderBy || 'dealName',
      orderDirection: params.orderDirection || 'ASC',
    };

    const response = await fetch(`${CRM_URL}/deals/export`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      } as any,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    // Get the file blob from response
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Determine file extension based on export type
    const extension = params.exportType === 'EXCEL' ? 'xlsx' : 'pdf';
    link.download = `${requestBody.filename}.${extension}`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Successfully exported deals as ${params.exportType}`,
      blob,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error exporting deals: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Find and export deals in one request
export const findAndExportDeals = async (params: {
  exportType: 'EXCEL' | 'PDF';
  filename?: string;
  worksheetName?: string;
  dealName?: string;
  engagementStageId?: string;
  companyId?: string;
  supplierId?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ success: boolean; message: string; blob?: Blob }> => {
  try {
    const headers = await requestHeader();

    const requestBody = {
      exportType: params.exportType,
      filename:
        params.filename ||
        `filtered_deals_${new Date().toISOString().split('T')[0]}`,
      worksheetName: params.worksheetName || 'Filtered Deals',
      dealName: params.dealName,
      engagementStageId: params.engagementStageId,
      companyId: params.companyId,
      supplierId: params.supplierId,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      currency: params.currency,
      sortBy: params.sortBy || 'submissionDate',
      sortOrder: params.sortOrder || 'desc',
    };

    const response = await fetch(`${CRM_URL}/deals/find-and-export`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      } as any,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    // Get the file blob from response
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Determine file extension based on export type
    const extension = params.exportType === 'EXCEL' ? 'xlsx' : 'pdf';
    link.download = `${requestBody.filename}.${extension}`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Successfully exported filtered deals as ${params.exportType}`,
      blob,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error exporting filtered deals: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
