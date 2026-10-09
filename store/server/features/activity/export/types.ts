/**
 * Export-specific types for global activity export functionality
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

// XLSX Headers for global activity export
export const XLSX_HEADERS = [
  'Activity ID',
  'Activity Name',
  'Activity Type',
  'Entity Type',
  'Lead ID',
  'Deal ID',
  'Assignee',
  'Team',
  'Priority',
  'Activity Date',
  'Status',
  'Is Completed',
  'Failed',
  'Reason',
  'Description',
  'Responsible Persons',
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
