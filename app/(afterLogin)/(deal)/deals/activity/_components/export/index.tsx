'use client';

import React from 'react';
import { Button } from 'antd';
import { TbFileUpload } from 'react-icons/tb';
import { useExportAndDownloadDealActivities } from '@/store/server/features/deals/activity/export/mutations';
import NotificationMessage from '@/components/common/notification/notificationMessage';

interface ActionDropdownProps {
  onExport?: () => void;
  filters?: any;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  onExport,
  filters,
}) => {
  const { exportAndDownload, isLoading, error } =
    useExportAndDownloadDealActivities();

  const handleExport = async () => {
    try {
      await exportAndDownload({
        format: 'xlsx',
        filters: filters,
        includeDocuments: false,
      });

      if (onExport) {
        onExport();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to export deal activities. Please try again.';

      NotificationMessage.error({
        message: 'Export Failed',
        description: errorMessage,
      });
    }
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-2 min-w-48">
      <div className="space-y-2">
        <div className="text-lg font-bold text-black">Actions</div>
        <Button
          type="primary"
          icon={<TbFileUpload />}
          onClick={handleExport}
          loading={isLoading}
          disabled={isLoading}
          className="w-full h-10 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover px-6 rounded-md"
        >
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
