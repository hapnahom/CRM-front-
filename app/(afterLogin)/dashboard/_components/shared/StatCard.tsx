import {
  HiMiniArrowTrendingUp,
  HiMiniArrowTrendingDown,
} from 'react-icons/hi2';
import React from 'react';
import { Skeleton } from 'antd';
import { cn } from '@/lib/utils';

interface PlaceholderData {
  label: string;
  value: string;
  onClick?: () => void;
}

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  placeholderData?: PlaceholderData[];
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  icon,
  loading = false,
  onClick,
  className = '',
  placeholderData = [],
}) => {
  if (loading) {
    return (
      <div
        className={cn(
          'h-full rounded-xl border border-border bg-surface-card p-5 shadow-sm',
          className,
        )}
      >
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'h-full w-full rounded-xl border border-border bg-surface-card p-5 text-left shadow-sm transition-shadow duration-200',
        onClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </h3>
            <div className="mt-1 truncate text-2xl font-bold text-foreground">
              {value}
            </div>
            {trend && (
              <div
                className={cn(
                  'mt-3 flex items-center gap-1 text-xs font-medium',
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {trend.isPositive ? (
                  <HiMiniArrowTrendingUp />
                ) : (
                  <HiMiniArrowTrendingDown />
                )}
                <span>{trend.value.split(' ')[0]}</span>
                <span className="ml-1 font-normal text-muted-foreground">
                  from last month
                </span>
              </div>
            )}
          </div>
          <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand [&_svg]:text-brand">
            {icon}
          </div>
        </div>

        {placeholderData.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {placeholderData.map((item, index) => (
              <span
                key={index}
                className={`rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium text-muted-foreground ${
                  item.onClick
                    ? 'cursor-pointer hover:border-brand-border hover:bg-brand-muted hover:text-brand'
                    : ''
                }`}
                onClick={(e) => {
                  if (item.onClick) {
                    e.stopPropagation();
                    item.onClick();
                  }
                }}
              >
                {item.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export default StatCard;
