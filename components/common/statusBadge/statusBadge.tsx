import React, { FC, PropsWithChildren } from 'react';
import { classNames } from '@/utils/classNames';

export enum StatusBadgeTheme {
  secondary = 'secondary',
  warning = 'warning',
  success = 'success',
  danger = 'danger',
}

interface StatusBadgeProps extends PropsWithChildren {
  theme?: StatusBadgeTheme;
  className?: string;
  transparentBg?: boolean;
}

const StatusBadge: FC<StatusBadgeProps> = ({
  theme = StatusBadgeTheme.secondary,
  className = '',
  transparentBg = false,
  children,
}) => {
  const badgeClass = classNames(
    'min-h-6 py-1 px-4 flex items-center justify-center rounded-lg font-bold text-xs w-max',
    {
      ['bg-success-second/20']:
        theme === StatusBadgeTheme.success && !transparentBg,
      ['text-success']: theme === StatusBadgeTheme.success,
      ['bg-warning-second/20']:
        theme === StatusBadgeTheme.warning && !transparentBg,
      ['text-warning']: theme === StatusBadgeTheme.warning,
      ['bg-error-second/20']:
        theme === StatusBadgeTheme.danger && !transparentBg,
      ['text-error']: theme === StatusBadgeTheme.danger,
      ['bg-accent-blue/20']:
        theme === StatusBadgeTheme.secondary && !transparentBg,
      ['text-accent-blue']: theme === StatusBadgeTheme.secondary,
    },
    [className],
  );

  return <div className={badgeClass}>{children}</div>;
};

export default StatusBadge;
