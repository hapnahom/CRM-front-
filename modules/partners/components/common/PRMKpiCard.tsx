'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PRMKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon: React.ReactNode;
  iconBgColor?: string;
  accentColor?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

/** Matches Sales Hub pipeline KPI card chrome. */
export function PRMKpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBgColor = 'bg-brand-muted text-brand',
  accentColor = 'text-foreground',
  onClick,
  isActive = false,
  className,
}: PRMKpiCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex min-h-[104px] flex-col justify-between rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors dark:bg-surface-card',
        isActive && 'border-brand bg-brand-muted/30',
        isClickable && 'cursor-pointer hover:border-brand/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconBgColor,
          )}
        >
          {icon}
        </span>
      </div>

      <p
        className={cn(
          'mt-2 truncate text-[20px] font-bold leading-none tabular-nums tracking-tight sm:text-[22px]',
          accentColor,
        )}
      >
        {value}
      </p>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-medium">
          {subtitle ? (
            <span className="truncate tabular-nums text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
          {trend ? (
            <span
              className={cn(
                'ml-auto shrink-0 tabular-nums',
                trend.isNeutral
                  ? 'text-muted-foreground'
                  : trend.isPositive
                    ? 'text-success'
                    : 'text-error',
              )}
            >
              {trend.value}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
