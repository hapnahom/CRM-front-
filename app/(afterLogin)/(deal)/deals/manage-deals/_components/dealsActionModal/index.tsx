'use client';

import React from 'react';
import { Button } from 'antd';
import { ImportOutlined, ExportOutlined } from '@ant-design/icons';

interface DealsActionModalProps {
  onImport: () => void;
  onExport: () => void;
}

const DealsActionModal: React.FC<DealsActionModalProps> = ({
  onImport,
  onExport,
}) => {
  const handleImport = () => {
    onImport();
  };

  const handleExport = () => {
    onExport();
  };

  return (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-[300px]">
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground mb-3">Lead Actions</div>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          onClick={handleImport}
          className="w-full h-12 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover text-base"
        >
          Import Deals
        </Button>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          className="w-full h-12 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover text-base"
        >
          Export Deals
        </Button>
      </div>
    </div>
  );
};

export default DealsActionModal;
