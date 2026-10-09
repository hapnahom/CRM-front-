import React from 'react';
import { Skeleton, Spin } from 'antd';

interface LoadingStatesProps {
  type?: 'skeleton' | 'spinner';
  rows?: number;
  className?: string;
}

const LoadingStates: React.FC<LoadingStatesProps> = ({
  type = 'skeleton',
  rows = 3,
  className = '',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={className}>
        <Skeleton active paragraph={{ rows }} />
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center h-32 ${className}`}>
      <Spin size="large" />
    </div>
  );
};

export default LoadingStates;
