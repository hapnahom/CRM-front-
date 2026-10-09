'use client';

import React from 'react';
import { Modal, Button } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const handleExport = () => {
    onExport();
    onClose();
  };

  return (
    <Modal
      title="Actions"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <div className="space-y-4">
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          className="w-full h-12 bg-primary hover:bg-primary-hover border-primary hover:border-primary-hover text-base"
        >
          Export Report
        </Button>
      </div>
    </Modal>
  );
};

export default ActionModal;
