import { CRM_URL } from '@/utils/constants';
import axios from 'axios';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/**
 * Lead Export Service
 *
 * This service handles backend export functionality for leads.
 * It exports to Excel format (.xlsx) with rich formatting and all related data.
 *
 * Backend Requirements:
 * 1. POST /leads/export/csv/selected - for exporting selected leads by IDs
 * 2. GET /leads/export/csv - for exporting all leads with filters
 * 3. Case-insensitive search (ILIKE instead of LIKE)
 * 4. Include source.name in search query
 */

export interface ExportFilters {
  searchTerm?: string;
  stage?: string;
  source?: string;
  companyId?: string;
  sectorId?: string;
  revenue?: number;
  currency?: string;
  contactPersonEmail?: string;
  contactPersonPhoneNumber?: string;
  leadRate?: number;
}

export interface ExportSelectedRequest {
  leadIds: string[];
}

/**
 * Export all leads with optional filters
 */
export const exportAllLeads = async (
  filters: ExportFilters = {},
): Promise<Blob> => {
  try {
    const { userId, tenantId, token } = useAuthenticationStore.getState();

    // Build query parameters from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${CRM_URL}/leads/export/csv${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const requestConfig = {
      url,
      method: 'GET' as const,
      headers: {
        Accept:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Authorization: `Bearer ${token}`,
        requestedBy: userId,
        createdBy: userId,
        tenantId: tenantId,
      },
      responseType: 'blob' as const,
    };

    // Create a timeout promise
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(
        () => reject(new Error('Request timeout after 30 seconds')),
        30000,
      );
    });

    // Create the axios request promise
    const axiosPromise = axios({
      ...requestConfig,
      timeout: 30000, // 30 second timeout
    });

    // Race between axios and timeout
    const response = (await Promise.race([
      axiosPromise,
      timeoutPromise,
    ])) as any;

    return (response as any).data;
  } catch (error: any) {
    throw new Error(
      `Failed to export leads: ${error.message || 'Unknown error'}`,
    );
  }
};

/**
 * Export selected leads by IDs
 * Note: This endpoint needs to be implemented by backend developer
 */
export const exportSelectedLeads = async (leadIds: string[]): Promise<Blob> => {
  try {
    if (!leadIds || leadIds.length === 0) {
      throw new Error('No lead IDs provided for export');
    }

    const { userId, tenantId, token } = useAuthenticationStore.getState();

    const response = await axios({
      url: `${CRM_URL}/leads/export/csv/selected`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Authorization: `Bearer ${token}`,
        requestedBy: userId,
        createdBy: userId,
        tenantId: tenantId,
      },
      data: { leadIds },
      responseType: 'blob',
    });

    return response.data;
  } catch (error: any) {
    throw new Error(
      `Failed to export selected leads: ${error.message || 'Unknown error'}`,
    );
  }
};

/**
 * Download blob as file
 */
export const downloadBlobAsFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Generate filename with timestamp
 */
export const generateExportFilename = (prefix: string = 'leads'): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_export_${timestamp}.xlsx`;
};

/**
 * Fallback export function that fetches leads and generates CSV on frontend
 * This is a temporary solution while we debug the backend export endpoint
 */
export const exportLeadsFallback = async (
  filters: ExportFilters = {},
): Promise<Blob> => {
  try {
    const { userId, tenantId, token } = useAuthenticationStore.getState();

    // Build query parameters from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    // Fetch leads using the working /leads endpoint
    const url = `${CRM_URL}/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await axios({
      url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        requestedBy: userId,
        createdBy: userId,
        tenantId: tenantId,
      },
      timeout: 10000,
    });

    // Generate CSV from the leads data
    const leads = response.data?.data || [];
    const csvContent = generateCSVFromLeads(leads);

    // Return CSV blob
    return new Blob([csvContent], { type: 'text/csv' });
  } catch (error: any) {
    throw new Error(`Frontend CSV generation failed: ${error.message}`);
  }
};

/**
 * Generate CSV content from leads data
 */
const generateCSVFromLeads = (leads: any[]): string => {
  if (!leads || leads.length === 0) {
    return 'No leads found';
  }

  // Define CSV headers
  const headers = [
    'Leads Name',
    'Contact Person Email',
    'Contact Person Phone',
    'Source',
    'Company',
    'Sector',
    'Engagement Stage',
    'Lead Rate',
    'Revenue',
    'Currency',
    'Additional Information',
    'Created At',
  ];

  // Generate CSV rows
  const rows = leads.map((lead) => [
    `"${lead.name || ''}"`,
    `"${lead.contactPersonEmail || ''}"`,
    `"${lead.contactPersonPhoneNumber || ''}"`,
    `"${lead.source?.name || ''}"`,
    `"${lead.company?.name || ''}"`,
    `"${lead.sector?.name || ''}"`,
    `"${lead.engagementStage?.name || ''}"`,
    `"${lead.leadRate || ''}"`,
    `"${lead.estimatedBudgets?.[0]?.amount || ''}"`,
    `"${lead.estimatedBudgets?.[0]?.currency?.name || ''}"`,
    `"${lead.additionalInformation || ''}"`,
    `"${lead.createdAt || ''}"`,
  ]);

  // Combine headers and rows
  const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];

  return csvLines.join('\n');
};
