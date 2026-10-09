import React, { useEffect, useState } from 'react';
import { Button } from 'antd';

interface RemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedItem: string;
  itemType: string;
  position?: { x: number; y: number };
  isLoading?: boolean;
}

const RemoveModal: React.FC<RemoveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  position,
  isLoading = false,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Modal Content */}
      <div
        className={`z-50 bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-[280px] ${
          isMobile
            ? 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-[90vw]'
            : 'absolute'
        }`}
        style={
          !isMobile
            ? {
                top: position?.y || 0,
                left: position?.x || 0,
                transform: 'translateX(-100%)',
              }
            : {}
        }
      >
        <div className="text-center mb-4">
          <h4 className="font-bold text-foreground mb-2">Remove {itemType}</h4>
          <p className="text-foreground text-sm">
            Are you sure you want to delete this {itemType} ?
          </p>
        </div>

        <div
          className={`flex justify-center gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}
        >
          <Button
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
            className={`bg-brand hover:bg-brand-hover border-brand hover:border-brand-hover text-brand-foreground text-sm px-4 py-5 ${isMobile ? 'w-full' : ''}`}
          >
            Remove {itemType}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            className={`text-brand border-brand hover:bg-brand-muted text-sm px-4 py-5 ${isMobile ? 'w-full' : ''}`}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
};

export default RemoveModal;
