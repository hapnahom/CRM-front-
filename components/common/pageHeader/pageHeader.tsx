'use client';
import React from 'react';
import { classNames } from '@/utils/classNames';
import { Tooltip } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  size?: 'small' | 'medium';
  toolTip?: string;
  horizontalPadding?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  size = 'medium',
  children,
  toolTip,
  horizontalPadding = 'px-2',
}) => {
  const { isMobile } = useIsMobile();
  return (
    <div
      className={`flex justify-between flex-wrap items-center ${horizontalPadding}`}
    >
      <div className={`flex-1 ${horizontalPadding}`}>
        {isMobile ? (
          <Tooltip title={toolTip} placement="top">
            <h2
              className={classNames('text-foreground ', {
                'text-xl': size === 'medium',
                'text-lg': size === 'small',
              })}
            >
              {title}
            </h2>
          </Tooltip>
        ) : (
          <Tooltip title={toolTip} placement="top">
            <h2
              className={classNames('text-foreground', {
                'text-2xl': size === 'medium',
                'text-xl': size === 'small',
              })}
            >
              {title}
            </h2>
          </Tooltip>
        )}

        {description && (
          <div className="m-1 sm:mt-2 text-sm text-muted-foreground font-medium">
            {description}
          </div>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
};

export default PageHeader;
