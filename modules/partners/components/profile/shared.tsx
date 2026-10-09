'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const TABLE_HEAD_CLASS =
  'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground';
export const TABLE_CELL_CLASS = 'px-4 py-3 text-sm text-foreground';

/** Matches the filter dropdowns used across Sales Hub / Product Catalog. */
export const FILTER_TRIGGER_CLASS = 'h-[31.5px] border-border text-[12px]';

export const PROGRESS_TRACK_COLOR = '#cbd5e1';

/** Content pad used by Sales Hub list tabs (Leads / Deals). */
export const MODULE_CONTENT_PAD = 'p-[10.5px] sm:p-[17.5px]';

export function formatMoney(value: number) {
  const abs = Math.abs(Number.isFinite(value) ? value : 0);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000)
    return `$${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000)
    return `$${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${sign}${(abs / 1_000).toFixed(0)}K`;
  return `$${sign}${abs.toLocaleString()}`;
}

export function attainmentColor(value: number) {
  if (value >= 100) return '#059669';
  if (value >= 75) return '#2563eb';
  return '#d97706';
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="m-0 text-[12px] font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

export function AttainmentBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full"
        style={{ backgroundColor: PROGRESS_TRACK_COLOR }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: attainmentColor(value),
          }}
        />
      </div>
      <span className="text-xs tabular-nums text-foreground">
        {Math.round(value)}%
      </span>
    </div>
  );
}

/** Per-tab KPI card — mirrors Sales Hub period / metric cards. */
export function ProfileKpiCard({
  label,
  value,
  hint,
  icon,
  accentClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] dark:bg-surface-card">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand',
          accentClassName,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="m-0 mt-1 truncate text-[18px] font-bold leading-none tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="m-0 mt-1.5 truncate text-[10px] font-medium text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
