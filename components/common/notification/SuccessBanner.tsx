'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleFilled } from '@ant-design/icons';

interface SuccessBannerProps {
  message: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}

export default function SuccessBanner({
  message,
  description,
  duration = 4000,
  onClose,
}: SuccessBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Only show on mobile screens
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    return null;
  }

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
      <div
        className="bg-green-50 text-green-800 px-4 py-3 flex items-center justify-center gap-3 shadow-lg border-b-2"
        style={{
          backgroundColor: tokens.color.successMuted, // Even lighter green (green-50)
          borderBottomColor: tokens.color.success, // Deep green border (green-600)
          borderRadius: '0 0 8px 8px', // Rounded bottom corners only
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 bg-green-600 rounded-full">
            <CheckCircleFilled className="text-brand-foreground text-sm" />
          </div>
          <span className="font-medium text-sm text-green-800">{message}</span>
          {description && (
            <span className="text-green-700 text-xs">{description}</span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
