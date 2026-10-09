'use client';

import React from 'react';
import { Button } from 'antd';
import { TbFileUpload } from 'react-icons/tb';
import { useExportAndDownloadStagnantDeals } from '@/store/server/features/dashboard';
import NotificationMessage from '@/components/common/notification/notificationMessage';

interface ActionDropdownProps {
  onExport?: () => void;
  filters?: {
    page?: number;
    limit?: number;
    companyId?: string;
    engagementStageId?: string;
    ownerId?: string;
    date?: string; // YYYY-MM-DD format
    currency?: string;
  };
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  onExport,
  filters,
}) => {
  // Get export mutation hook
  const exportMutation = useExportAndDownloadStagnantDeals();

  const handleExport = async () => {
    try {
      // Extract only filter fields (remove page/limit)

      //eslint-disable-next-line
      const { page, limit, ...filterFields } = filters || {};

      // Call the export API with current filters
      exportMutation.mutate({
        exportType: 'EXCEL',
        filename: `stagnant_deals_${new Date().toISOString().split('T')[0]}`,
        filters: filterFields,
      });

      // Call the original onExport callback if provided
      if (onExport) {
        onExport();
      }
    } catch (error: any) {
      NotificationMessage.error({
        message: 'Export Failed',
        description: error.response.data.message,
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
          loading={exportMutation.isLoading}
          className="w-full h-10 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover px-6 rounded-md"
        >
          {exportMutation.isLoading ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>
    </div>
  );

  return dropdownContent;
};

export default ActionDropdown;
