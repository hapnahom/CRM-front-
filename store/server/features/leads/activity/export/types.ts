/**
 * Export-specific types for activity export functionality
 */

import { ActivityFilters } from '../types';

export interface ExportActivityParams {
  filters?: ActivityFilters;
  format?: 'xlsx';
  includeDocuments?: boolean;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
}

export interface ExportActivityResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: Date;
  xlsxData?: ArrayBuffer | Blob; // Raw XLSX data from backend
  xlsxBlob?: Blob; // Processed XLSX blob for download
}

// XLSX Headers that the backend returns
export const XLSX_HEADERS = [
  'Lead ID',
  'Name',
  'Contact Person First Name',
  'Contact Person Last Name',
  'Contact Person Position',
  'Contact Person Email',
  'Contact Person Phone',
  'Company',
  'Sector',
  'Source',
  'Lead Type',
  'Engagement Stage',
  'Supplier',
  'Lead Rate',
  'Additional Information',
  'Solutions',
  'Created At',
  'Updated At',
  'Tenant ID',
] as const;

export interface ExportProgress {
  isExporting: boolean;
  progress?: number;
  status?: 'preparing' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ExportHistory {
  id: string;
  fileName: string;
  format: string;
  exportedAt: Date;
  recordCount: number;
  status: 'completed' | 'failed';
  downloadUrl?: string;
}
