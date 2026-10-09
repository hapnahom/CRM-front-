'use client';

import React from 'react';
import { Button } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

interface ActionDropdownProps {
  onExport: () => void;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({ onExport }) => {
  const handleExport = () => {
    onExport();
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-48">
      <div className="space-y-2">
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          className="w-full h-10 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover"
        >
          Export Report
        </Button>
      </div>
    </div>
  );

  return dropdownContent;
};

export default ActionDropdown;
