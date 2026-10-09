'use client';
import React from 'react';
import classNames from 'classnames';

interface BlockWrapperProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  withBackground?: boolean;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({
  children,
  className = '',
  padding = '',
  withBackground = true,
}) => {
  return (
    <div
      className={classNames(
        padding,
        withBackground ? 'bg-muted' : '',
        className,
      )}
      style={{ borderRadius: 11 }}
    >
      {children}
    </div>
  );
};

export default BlockWrapper;
