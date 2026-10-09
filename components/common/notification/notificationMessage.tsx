'use client';

import React from 'react';
import { notification as antdNotification } from 'antd';
import {
  CloseCircleFilled,
  InfoCircleFilled,
  CheckCircleFilled,
} from '@ant-design/icons';

antdNotification.config({
  placement: 'topRight',
  duration: 3,
  top: 0,
});

interface NotificationProps {
  message: string;
  description?: string;
}

// Global success banner handler - will be set by the provider
let globalSuccessHandler:
  | ((message: string, description?: string, duration?: number) => void)
  | null = null;

export const setGlobalSuccessHandler = (
  handler: (message: string, description?: string, duration?: number) => void,
) => {
  globalSuccessHandler = handler;
};

const NotificationMessage = {
  error: ({ message, description }: NotificationProps) => {
    antdNotification.error({
      message,
      description,
      className: 'notification',
      icon: <CloseCircleFilled style={{ color: 'var(--color-error)' }} />,
    });
  },
  warning: ({ message, description }: NotificationProps) => {
    antdNotification.warning({
      message,
      description,
      className: 'notification',
      icon: <InfoCircleFilled style={{ color: 'var(--color-warning)' }} />,
    });
  },
  success: ({ message, description }: NotificationProps) => {
    // Use banner for mobile, antd notification for desktop
    if (
      typeof window !== 'undefined' &&
      window.innerWidth <= 768 &&
      globalSuccessHandler
    ) {
      // Mobile view - use banner
      globalSuccessHandler(message, description, 4000);
    } else {
      // Desktop view - use antd notification
      antdNotification.success({
        message,
        description,
        className: 'notification',
        icon: <CheckCircleFilled style={{ color: 'var(--color-success)' }} />,
      });
    }
  },
  info: ({ message, description }: NotificationProps) => {
    antdNotification.info({
      message,
      description,
      className: 'notification',
      icon: (
        <InfoCircleFilled style={{ color: 'var(--color-info, #1677ff)' }} />
      ),
    });
  },
};

export default NotificationMessage;
