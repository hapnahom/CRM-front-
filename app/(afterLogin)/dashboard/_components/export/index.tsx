'use client';

import React, { useState } from 'react';
import { Button, message } from 'antd';
import { TbFileTypePdf } from 'react-icons/tb';
import { exportDashboardToPdf } from '@/utils/exportDashboardToPdf';

interface ActionDropdownProps {
  filters?: {
    calendarId?: string;
    sessionId?: string;
    monthId?: string;
  };
  dashboardRef?: React.RefObject<HTMLDivElement>;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({ dashboardRef }) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!dashboardRef || !dashboardRef.current) {
      message.error('Dashboard content not available for export');
      return;
    }

    try {
      setIsExportingPdf(true);
      message.loading({
        content: 'Generating high-quality PDF... This may take a moment',
        key: 'pdf-export',
        duration: 0,
      });

      // Wait for charts to fully render
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await exportDashboardToPdf({
        dashboardRef,
        filename: `CRM_Dashboard_${new Date().toISOString().split('T')[0]}`,
        includeMetadata: {
          title: 'CRM Dashboard Report',
          generatedBy: 'CRM System',
        },
      });

      message.destroy('pdf-export');

      if (result.success) {
        message.success(
          'Dashboard exported successfully! Check your downloads folder.',
        );
      } else {
        message.error(result.message || 'Failed to export dashboard');
      }
    } catch (error: any) {
      message.destroy('pdf-export');
      message.error('An error occurred while exporting PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-3 min-w-48">
      <div className="space-y-2">
        <div className="text-base font-semibold text-foreground mb-3">
          Export Dashboard
        </div>

        {/* Export as PDF */}
        <Button
          type="primary"
          icon={<TbFileTypePdf size={20} />}
          onClick={handleExportPdf}
          loading={isExportingPdf}
          disabled={!dashboardRef}
          className="w-full h-11 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover px-6 rounded-lg flex items-center justify-center gap-2 font-medium"
        >
          {isExportingPdf ? 'Generating PDF...' : 'Export as PDF'}
        </Button>
      </div>
    </div>
  );

  return dropdownContent;
};

export default ActionDropdown;
