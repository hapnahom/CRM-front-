import React from 'react';
import { Modal, Button } from 'antd';

interface SetDefaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  selectedCurrency: string;
  isLoading?: boolean;
}

const SetDefaultModal: React.FC<SetDefaultModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCurrency,
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      title={<div className="text-center font-bold">Set Default</div>}
      open={isOpen}
      onCancel={onClose}
      centered
      closable={false}
      footer={
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleConfirm}
            loading={isLoading}
            className="bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground py-5"
          >
            Set Default
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="text-brand border-brand hover:bg-brand-muted py-5"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="py-4 text-center">
        <p className="text-foreground mb-2">
          Are you sure you want to make <strong>{selectedCurrency}</strong> the
          default currency?
        </p>
        <p className="text-muted-foreground text-sm">
          This will replace the current default currency for your organization.
        </p>
      </div>
    </Modal>
  );
};

export default SetDefaultModal;
