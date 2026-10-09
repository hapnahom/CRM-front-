'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  formatTargetPercent,
  targetAchievementPercent,
} from '@/lib/target-format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

export const SALES_TARGETING_PAGE_CLASS =
  'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-card';

export const TARGETS_PAGE_PADDING_CLASS = 'p-3 sm:p-5';

export const TARGETS_PAGE_TITLE_CLASS =
  'm-0 text-[20px] font-semibold text-foreground';

export const TARGETS_CARD_CLASS =
  'rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]';

export const TARGETS_TABLE_HEAD_CLASS =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export const TARGETS_TABLE_HEAD_ROW_CLASS = cn(
  'border-b border-border bg-surface-elevated',
  TARGETS_TABLE_HEAD_CLASS,
);

export const TARGETS_KPI_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

export const TARGETS_KPI_VALUE_CLASS =
  'text-[22px] font-bold leading-none tabular-nums text-foreground';

export function SummaryKpiCard({
  label,
  value,
  hint,
  icon,
  className,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={TARGETS_KPI_LABEL_CLASS}>{label}</p>
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn('mt-3', TARGETS_KPI_VALUE_CLASS)}>{value}</p>
      {hint ? (
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          TARGETS_CARD_CLASS,
          'flex flex-col px-5 py-4 text-left transition-all hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.05)] cursor-pointer hover:border-brand/40 active:scale-[0.99]',
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        TARGETS_CARD_CLASS,
        'flex flex-col px-5 py-4 transition-shadow hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      {inner}
    </div>
  );
}

function SimpleProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-brand transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressBarRow({
  label,
  value,
  max,
  formatValue,
}: {
  label: string;
  value: number;
  max: number;
  formatValue?: (n: number) => string;
}) {
  const pct = targetAchievementPercent(value, max);
  const fmt = formatValue ?? ((n: number) => String(n));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {fmt(value)} / {fmt(max)} · {formatTargetPercent(pct)}
        </span>
      </div>
      <SimpleProgress value={pct} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    locked: 'bg-amber-50 text-amber-800 border-amber-200',
    archived: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    open: 'bg-sky-50 text-sky-700 border-sky-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    forecast: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    edited_forecast: 'bg-violet-50 text-violet-700 border-violet-200',
    manual: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  const label = status.replace(/_/g, ' ');
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize text-[10px] font-medium',
        map[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </Badge>
  );
}

export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-card/95 px-4 py-3 backdrop-blur sm:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModuleEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div
        className={cn(
          'grid gap-3 border-b border-border bg-surface-elevated px-4 py-3',
        )}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((unused, index) => (
          <SkeletonBlock key={`head-${index}`} className="h-3 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((unused, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((unusedCol, colIndex) => (
              <SkeletonBlock
                key={`${rowIndex}-${colIndex}`}
                className={cn('h-4', colIndex === 0 ? 'w-4/5' : 'w-2/3')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5 sm:px-6">
      {children}
    </div>
  );
}

export function SectionToolbar({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-shrink-0 flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {title || description ? (
        <div>
          {title ? (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        'h-8 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover',
        props.className,
      )}
    />
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={cn('rounded-md', className)} />;
}

function KpiCardSkeleton() {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'min-h-[104px] px-4 py-3')}>
      <div className="flex items-start justify-between gap-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="size-4 rounded-sm" />
      </div>
      <SkeletonBlock className="mt-3 h-7 w-28" />
      <SkeletonBlock className="mt-2 h-3 w-32" />
    </div>
  );
}

export function CurrencyToolbarSkeleton() {
  return (
    <div className="flex-shrink-0 border-b border-border px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonBlock className="h-4 w-52 max-w-full" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function TargetDistributionCardSkeleton() {
  return (
    <div
      className={cn(
        TARGETS_CARD_CLASS,
        'flex min-h-[16rem] flex-col p-5 lg:min-h-[18rem]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="h-4 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-[8.25rem] shrink-0 rounded-md" />
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-6 sm:flex-row sm:items-stretch">
        <SkeletonBlock className="mx-auto size-[176px] shrink-0 rounded-full sm:mx-0" />
        <div className="min-h-0 flex-1 space-y-3">
          {Array.from({ length: 4 }).map((unused, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <SkeletonBlock className="size-2.5 rounded-[2px]" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
              <SkeletonBlock className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopeTargetCardSkeleton() {
  return (
    <div
      className={cn(
        TARGETS_CARD_CLASS,
        'flex min-h-[16rem] flex-col p-5 lg:min-h-[18rem]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-36" />
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-3 w-48 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-20 shrink-0 rounded-md" />
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface-elevated/40 p-4">
        <SkeletonBlock className="h-3 w-44" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-sm" />
        <SkeletonBlock className="mt-2 h-3 w-56 max-w-full" />
        <div className="mt-auto space-y-2 pt-6">
          {Array.from({ length: 3 }).map((unused, index) => (
            <SkeletonBlock key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TargetOverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <TargetDistributionCardSkeleton />
      <ScopeTargetCardSkeleton />
    </div>
  );
}

function PeriodTargetsBarSkeleton() {
  return (
    <div
      className={cn(
        TARGETS_CARD_CLASS,
        'flex flex-wrap items-center justify-between gap-3 px-5 py-3.5',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-36 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

function PeopleTargetsBarSkeleton() {
  return (
    <div
      className={cn(
        TARGETS_CARD_CLASS,
        'flex flex-wrap items-center justify-between gap-3 px-5 py-3.5',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-7 w-40 rounded-full" />
        <SkeletonBlock className="h-7 w-44 rounded-full" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-md" />
        <SkeletonBlock className="h-8 w-28 rounded-md" />
        <SkeletonBlock className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

function DepartmentTargetPanelSkeleton() {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'p-5')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-36" />
          <SkeletonBlock className="h-6 w-48 max-w-full" />
          <SkeletonBlock className="h-3 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-24 shrink-0 rounded-md" />
      </div>
      <SkeletonBlock className="mt-6 h-3 w-16" />
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((unused, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-surface-card"
          >
            <div className="border-b border-border px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <SkeletonBlock className="size-2.5 rounded-[2px]" />
                  <SkeletonBlock className="h-4 w-28" />
                </div>
                <SkeletonBlock className="h-7 w-16 rounded-md" />
              </div>
            </div>
            <div className="space-y-2 px-4 py-3.5">
              <SkeletonBlock className="h-6 w-24" />
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamTargetAllocationPanelSkeleton() {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <SkeletonBlock className="h-3 w-44" />
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="h-3 w-52 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-24 shrink-0 rounded-md" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((unused, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface-elevated px-4 py-3.5"
          >
            <SkeletonBlock className="h-2.5 w-24" />
            <SkeletonBlock className="mt-3 h-7 w-28" />
            <SkeletonBlock className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SalesRepsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="border-b border-border px-5 py-4">
        <SkeletonBlock className="h-3 w-48" />
        <SkeletonBlock className="mt-2 h-3 w-72 max-w-full" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(160px,1.2fr)_minmax(110px,0.8fr)_minmax(88px,auto)] gap-3 border-b border-border bg-surface-elevated px-5 py-3">
            {Array.from({ length: 6 }).map((unused, index) => (
              <SkeletonBlock key={index} className="h-3 w-3/4" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: rows }).map((unused, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(160px,1.2fr)_minmax(110px,0.8fr)_minmax(88px,auto)] items-center gap-3 px-5 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <SkeletonBlock className="size-8 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-28" />
                    <SkeletonBlock className="h-2.5 w-20" />
                  </div>
                </div>
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-3 w-12" />
                <SkeletonBlock className="h-3 w-36" />
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HybridReconciliationSkeleton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          TARGETS_CARD_CLASS,
          'grid gap-0 overflow-hidden sm:grid-cols-[1fr_auto_1fr_auto_1fr]',
        )}
      >
        {Array.from({ length: 3 }).map((unused, index) => (
          <div key={index} className={compact ? 'p-4' : 'p-5'}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock
              className={cn('mt-3', compact ? 'h-6 w-28' : 'h-7 w-32')}
            />
            <SkeletonBlock className="mt-2 h-2.5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllocationWorkbenchSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-44 rounded-md" />
      </div>
      <div className={cn(TARGETS_CARD_CLASS, 'px-4 py-3')}>
        <SkeletonBlock className="mb-3 h-3 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((unused, index) => (
            <SkeletonBlock key={index} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}

function ForecastToolbarSkeleton() {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-card px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
          {Array.from({ length: 3 }).map((unused, index) => (
            <SkeletonBlock key={index} className="mx-0.5 h-8 w-16 rounded-md" />
          ))}
        </div>
        <SkeletonBlock className="h-8 w-36 rounded-md" />
        <SkeletonBlock className="h-8 w-40 rounded-md" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-8 w-28 rounded-md" />
        <SkeletonBlock className="h-8 w-36 rounded-md" />
        <SkeletonBlock className="h-8 w-32 rounded-md" />
      </div>
    </div>
  );
}

function ForecastTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(90px,0.7fr)_minmax(180px,1.3fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)] gap-3 border-b border-border bg-surface-elevated px-5 py-3">
            {Array.from({ length: 7 }).map((unused, index) => (
              <SkeletonBlock key={index} className="h-3 w-3/4" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: rows }).map((unused, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[minmax(90px,0.7fr)_minmax(180px,1.3fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)] gap-3 px-5 py-3.5"
              >
                {Array.from({ length: 7 }).map((unusedCol, colIndex) => (
                  <SkeletonBlock
                    key={colIndex}
                    className={cn('h-3.5', colIndex === 1 ? 'w-4/5' : 'w-2/3')}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScopePanelSkeleton() {
  return (
    <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <SkeletonBlock className="mt-0.5 size-4 rounded-sm" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-32 rounded-md" />
      </div>
      <div className="px-4 py-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-4 gap-3 border-b border-border bg-surface-elevated px-4 py-3">
            {Array.from({ length: 4 }).map((unused, index) => (
              <SkeletonBlock key={index} className="h-3 w-3/4" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 4 }).map((unused, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 gap-3 px-4 py-3">
                <SkeletonBlock className="h-3.5 w-4/5" />
                <SkeletonBlock className="h-3.5 w-16" />
                <SkeletonBlock className="h-3.5 w-20" />
                <SkeletonBlock className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ShellHeaderSkeleton({ tabCount = 5 }: { tabCount?: number }) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-surface-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <SkeletonBlock className="h-6 w-24" />
      </div>
      <div className="flex items-end justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
          {Array.from({ length: tabCount }).map((unused, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5"
            >
              <SkeletonBlock className="size-3.5 rounded-sm" />
              <SkeletonBlock className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        <div className="hidden shrink-0 pb-1 md:flex md:items-center">
          <SkeletonBlock className="h-8 w-44 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function TargetsTabScrollBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn(TARGETS_PAGE_PADDING_CLASS, 'space-y-6')}>
        {children}
      </div>
    </div>
  );
}

/** Shape-matched loading layouts for each Targets tab */
export function ForecastTabSkeleton() {
  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <ForecastToolbarSkeleton />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn(TARGETS_PAGE_PADDING_CLASS, 'space-y-4')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((unused, index) => (
              <KpiCardSkeleton key={index} />
            ))}
          </div>
          <SkeletonBlock className="h-3 w-56" />
          <ForecastTableSkeleton />
        </div>
      </div>
    </div>
  );
}

export function AnnualTabSkeleton() {
  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <CurrencyToolbarSkeleton />
      <TargetsTabScrollBody>
        <TargetOverviewCardsSkeleton />
        <DepartmentTargetPanelSkeleton />
      </TargetsTabScrollBody>
    </div>
  );
}

export function SessionTabSkeleton() {
  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <CurrencyToolbarSkeleton />
      <TargetsTabScrollBody>
        <PeriodTargetsBarSkeleton />
        <TargetOverviewCardsSkeleton />
        <DepartmentTargetPanelSkeleton />
      </TargetsTabScrollBody>
    </div>
  );
}

export function PersonTabSkeleton() {
  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <CurrencyToolbarSkeleton />
      <TargetsTabScrollBody>
        <PeopleTargetsBarSkeleton />
        <TeamTargetAllocationPanelSkeleton />
        <SalesRepsTableSkeleton />
      </TargetsTabScrollBody>
    </div>
  );
}

function HorizonCardSkeleton() {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <SkeletonBlock className="size-9 rounded-lg" />
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-5 px-5 py-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-8 w-40" />
        </div>
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
          {Array.from({ length: 4 }).map((unused, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className={cn(TARGETS_PAGE_PADDING_CLASS, 'space-y-5')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-3 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-40 rounded-md" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((unused, index) => (
          <HorizonCardSkeleton key={index} />
        ))}
      </div>
      <ScopePanelSkeleton />
    </div>
  );
}

export function OrgExplorerSkeleton() {
  return (
    <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="border-b border-border px-4 py-3">
        <SkeletonBlock className="h-4 w-44" />
        <SkeletonBlock className="mt-2 h-3 w-72 max-w-full" />
      </div>
      <TableSkeleton rows={8} columns={6} />
    </section>
  );
}

export function MemberPlanningPanelSkeleton() {
  return (
    <div className="flex-1 space-y-4 px-4 py-4">
      <div className="rounded-md border border-border bg-surface-elevated/40 px-3 py-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-2 h-7 w-32" />
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-12" />
        <SkeletonBlock className="h-20 w-full rounded-md" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-48" />
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] gap-3 border-b border-border bg-surface-elevated px-3 py-2.5">
            {Array.from({ length: 4 }).map((unused, index) => (
              <SkeletonBlock key={index} className="h-3 w-3/4" />
            ))}
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((unused, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] gap-3 px-3 py-3"
              >
                <SkeletonBlock className="h-3.5 w-4/5" />
                <SkeletonBlock className="h-3.5 w-16" />
                <SkeletonBlock className="h-3.5 w-16" />
                <SkeletonBlock className="h-7 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <SkeletonBlock className="h-9 w-24 rounded-md" />
        <SkeletonBlock className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function ReconciliationMatrixSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((unused, rowIndex) => (
        <tr key={rowIndex}>
          <td className="px-3 py-3">
            <SkeletonBlock className="h-3.5 w-28" />
          </td>
          <td className="px-3 py-3 text-right">
            <SkeletonBlock className="ml-auto h-3.5 w-16" />
          </td>
          <td className="px-3 py-3 text-right">
            <SkeletonBlock className="ml-auto h-3.5 w-16" />
          </td>
          <td className="px-3 py-3 text-right">
            <SkeletonBlock className="ml-auto h-3.5 w-12" />
          </td>
          <td className="px-3 py-3">
            <SkeletonBlock className="h-3.5 w-20" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function RequestHistoryTimelineSkeleton({
  items = 2,
}: {
  items?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((unused, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-3"
        >
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="mt-2 h-3 w-full max-w-md" />
          <SkeletonBlock className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function OpportunityPickerListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((unused, index) => (
        <div key={index} className="flex items-start gap-3 px-3 py-2.5">
          <SkeletonBlock className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-4/5" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          <SkeletonBlock className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
export function HybridGapAccountingSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background px-4 py-3',
        className,
      )}
    >
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((unused, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabContentSkeleton({
  tab,
}: {
  tab: 'overview' | 'forecast' | 'annual' | 'sessions' | 'persons';
}) {
  if (tab === 'overview') return <OverviewTabSkeleton />;
  if (tab === 'forecast') return <ForecastTabSkeleton />;
  if (tab === 'annual') return <AnnualTabSkeleton />;
  if (tab === 'sessions') return <SessionTabSkeleton />;
  return <PersonTabSkeleton />;
}
