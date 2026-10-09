'use client';

import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, CalendarRange, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TARGETS_CARD_CLASS } from '@/components/sales-targeting/ui-kit';
import type {
  HorizonSummary,
  OverviewStatTone,
} from '@/components/sales-targeting/planning/overviewHorizonSummary';
import type { OverviewWorkflowTone } from '@/components/sales-targeting/planning/overviewScopeUtils';

const PILL_CLASS: Record<OverviewWorkflowTone, string> = {
  success:
    'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning:
    'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
  danger:
    'border-red-200/80 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300',
  muted: 'border-border bg-muted/40 text-muted-foreground',
};

const PILL_DOT_CLASS: Record<OverviewWorkflowTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  muted: 'bg-muted-foreground/45',
};

const STAT_VALUE_CLASS: Record<OverviewStatTone, string> = {
  default: 'text-foreground',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-600 dark:text-red-300',
};

export type HorizonCardAction = {
  id: string;
  label: string;
  onClick: () => void;
};

type Props = {
  variant: 'annual' | 'period';
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  /** Rendered under the header (e.g. the period selector). */
  headerExtra?: ReactNode;
  summary: HorizonSummary | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  blockedCount?: number;
  onViewBlocked?: () => void;
  actions?: HorizonCardAction[];
  openLabel: string;
  onOpen: () => void;
};

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: OverviewWorkflowTone;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        PILL_CLASS[tone],
      )}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', PILL_DOT_CLASS[tone])}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

function CardBodySkeleton() {
  return (
    <div className="space-y-5 px-5 py-5" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
        {Array.from({ length: 4 }).map((unused, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanningHorizonCard({
  variant,
  eyebrow,
  title,
  subtitle,
  headerExtra,
  summary,
  loading = false,
  error = false,
  onRetry,
  blockedCount = 0,
  onViewBlocked,
  actions = [],
  openLabel,
  onOpen,
}: Props) {
  const Icon = variant === 'annual' ? Target : CalendarRange;

  return (
    <section className={cn(TARGETS_CARD_CLASS, 'flex min-w-0 flex-col')}>
      <header className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                variant === 'annual'
                  ? 'bg-brand/10 text-brand'
                  : 'bg-surface-elevated text-muted-foreground',
              )}
            >
              <Icon size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </p>
              <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">
                {title}
              </h3>
              {subtitle ? (
                <p className="text-[12px] text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {summary && !loading ? (
            <StatusPill
              label={summary.status.label}
              tone={summary.status.tone}
            />
          ) : null}
        </div>
        {headerExtra ? <div className="mt-3.5">{headerExtra}</div> : null}
      </header>

      {loading ? (
        <CardBodySkeleton />
      ) : error || !summary ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <p className="text-[13px] text-muted-foreground">
            Couldn’t load this horizon.
          </p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onRetry}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {summary.primary.label}
          </p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tabular-nums text-foreground">
            {summary.primary.value}
          </p>
          {summary.primary.hint ? (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {summary.primary.hint}
            </p>
          ) : null}

          {summary.progress ? (
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="font-medium text-foreground">
                  {summary.progress.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {Math.round(summary.progress.percent)}%
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={summary.progress.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(summary.progress.percent)}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${summary.progress.percent}%` }}
                />
              </div>
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                {summary.progress.caption}
              </p>
            </div>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
            {summary.stats.map((stat) => (
              <div key={stat.key} className="min-w-0">
                <dt className="text-[11px] font-medium text-muted-foreground">
                  {stat.label}
                </dt>
                <dd
                  className={cn(
                    'mt-1 truncate text-[15px] font-semibold tabular-nums',
                    STAT_VALUE_CLASS[stat.tone ?? 'default'],
                  )}
                >
                  {stat.value}
                </dd>
                {stat.hint ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {stat.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      )}

      {blockedCount > 0 && onViewBlocked ? (
        <button
          type="button"
          onClick={onViewBlocked}
          className="mx-5 mb-4 flex items-center gap-2 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-left text-[12px] text-amber-900 transition-colors hover:bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertCircle
            size={14}
            className="shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate font-medium">
            {blockedCount} scope{blockedCount === 1 ? '' : 's'} cannot propose
            yet
          </span>
          <span className="shrink-0 font-semibold text-brand">View</span>
        </button>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onOpen}
        >
          {openLabel}
          <ArrowRight size={13} aria-hidden />
        </Button>
      </footer>
    </section>
  );
}
