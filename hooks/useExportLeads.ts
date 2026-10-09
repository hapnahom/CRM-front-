import { Leads } from '@/store/server/features/leads/interface';
import {
  exportAllLeads,
  exportSelectedLeads,
  downloadBlobAsFile,
  generateExportFilename,
  exportLeadsFallback,
  ExportFilters,
} from '@/services/leadExportService';

export const useExportLeads = () => {
  const exportLeadsToCSV = async (
    leads: Leads[],
    selectedRows: string[],
    filters: ExportFilters = {},
    onSuccess?: (message: string) => void,
    onError?: (error: string) => void,
  ) => {
    try {
      let blob: Blob;
      let exportMessage: string;
      let filename: string;

      if (selectedRows.length > 0) {
        // Export selected leads
        blob = await exportSelectedLeads(selectedRows);
        exportMessage = `Successfully exported ${selectedRows.length} selected leads`;
        filename = generateExportFilename('selected_leads');
      } else {
        // Export all leads with current filters
        try {
          blob = await exportAllLeads(filters);
          exportMessage = `Successfully exported ${leads.length} leads`;
          filename = generateExportFilename('leads');
        } catch (error: any) {
          blob = await exportLeadsFallback(filters);
          exportMessage = `Successfully exported ${leads.length} leads (using CSV fallback)`;
          filename = generateExportFilename('leads').replace('.xlsx', '.csv');
        }
      }

      // Download the file
      downloadBlobAsFile(blob, filename);

      onSuccess?.(exportMessage);
    } catch (error: any) {
      const errorMsg = `Export failed: ${error.message || 'Please try again.'}`;
      onError?.(errorMsg);
    }
  };

  return {
    exportLeadsToCSV,
  };
};
