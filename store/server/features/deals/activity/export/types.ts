/**
 * Export-specific types for deal activity export functionality
 */

export interface DealActivityFilters {
  dealId?: string;
  priority?: string;
  activityDate?: string;
  activityType?: string;
}

export interface ExportDealActivityParams {
  filters?: DealActivityFilters;
  format?: 'xlsx';
  includeDocuments?: boolean;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
}

export interface ExportDealActivityResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: Date;
  xlsxData?: ArrayBuffer | Blob; // Raw XLSX data from backend
  xlsxBlob?: Blob; // Processed XLSX blob for download
}

// XLSX Headers for deal activities export
export const DEAL_ACTIVITY_XLSX_HEADERS = [
  'Deal ID',
  'Deal Name',
  'Activity Name',
  'Activity Type',
  'Assignee',
  'Priority',
  'Description',
  'Activity Date',
  'Is Completed',
  'Created At',
  'Updated At',
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
