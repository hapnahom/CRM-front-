import React from 'react';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  loading?: boolean;
  chartHeight?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  className = '',
  headerActions,
  loading = false,
  chartHeight = 'h-[300px]',
}) => {
  if (loading) {
    return (
      <div
        className={cn(
          'flex w-full flex-col rounded-xl border border-border bg-surface-card p-5 shadow-sm',
          className,
        )}
      >
        <div className="animate-pulse">
          <div className="mb-5 h-4 w-40 rounded bg-muted" />
          <div className={`${chartHeight} rounded-md bg-muted`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-xl border border-border bg-surface-card p-5 shadow-sm',
        className,
      )}
    >
      <div className="mb-5 flex min-h-[28px] items-center justify-between gap-3">
        {title && (
          <div className="min-w-0 text-sm font-bold text-[#334155]">
            {title}
          </div>
        )}
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>

      <div className={cn('min-h-0', chartHeight)}>{children}</div>
    </div>
  );
};

export default ChartContainer;
