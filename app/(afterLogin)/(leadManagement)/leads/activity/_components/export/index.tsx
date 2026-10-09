'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TbFileUpload } from 'react-icons/tb';
import { useExportAndDownloadActivities } from '@/store/server/features/leads/activity/export/mutations';
import { toast } from 'sonner';
interface ActionDropdownProps {
  onExport?: () => void;
  filters?: any; // Activity filters if needed
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  onExport,
  filters,
}) => {
  const { exportAndDownload, isLoading, error } =
    // eslint-disable-next-line
    useExportAndDownloadActivities();

  const handleExport = async () => {
    try {
      await exportAndDownload({
        format: 'xlsx',
        filters: filters,
        includeDocuments: false,
      });

      // Call the original onExport callback if provided
      if (onExport) {
        onExport();
      }
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to export activities. Please try again.';

      //You can use your notification system here
      toast.error('Export Failed', {
        description: errorMessage,
      });
    }
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-2 min-w-48">
      <div className="space-y-2">
        <div className="text-lg font-bold text-black">Actions</div>
        <Button
          onClick={handleExport}
          disabled={isLoading}
          className="w-full h-10 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover px-6 rounded-md text-brand-foreground"
        >
          {isLoading ? (
            <Spinner className="text-brand-foreground" />
          ) : (
            <TbFileUpload />
          )}
          {isLoading ? 'Exporting...' : 'Export Activities'}
        </Button>
        {error && (
          <div className="text-red-500 text-sm mt-2">
            Export failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );

  return dropdownContent;
};

export default ActionDropdown;
