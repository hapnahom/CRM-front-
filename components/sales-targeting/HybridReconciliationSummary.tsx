'use client';

import { useMemo } from 'react';
import {
  HybridGapAccountingSkeleton,
  HybridReconciliationSkeleton,
  TARGETS_CARD_CLASS,
  TARGETS_KPI_LABEL_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { cn } from '@/lib/utils';
import { filterHybridCompanyInboxTeams } from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import type { TargetReconciliationView } from '@/store/server/features/salesTargeting/types';

export function sumHybridCompanyApprovedTeams(
  data?: TargetReconciliationView,
): number {
  const sum = (data?.bottomUpTeams ?? []).reduce(
    (acc, row) => acc + Number(row.amount ?? 0),
    0,
  );
  return Math.round(sum * 100) / 100;
}

/** Passed workflow step 1 per Target Settings; not yet company-approved. */
export function hybridAwaitingCompanyTeams(
  data?: TargetReconciliationView,
  companyOnly = false,
) {
  return filterHybridCompanyInboxTeams(
    data?.pendingBottomUpTeams ?? [],
    companyOnly,
  );
}

export function getHybridCompanyCardRollup(
  data: TargetReconciliationView | undefined,
  strategicFallback: number,
) {
  const strategic =
    Number(data?.strategicTarget ?? 0) > 0
      ? Number(data?.strategicTarget ?? 0)
      : Number(strategicFallback ?? 0);
  const proposalAmount = sumHybridCompanyApprovedTeams(data);
  const remainingGap = Math.round((strategic - proposalAmount) * 100) / 100;
  return { strategic, proposalAmount, remainingGap };
}

export function hybridReconciliationMetrics(
  data: TargetReconciliationView | undefined,
) {
  const status = data?.reconciliationStatus ?? 'PENDING';
  const isReconciled = status === 'RECONCILED' || status === 'FINALIZED';
  const strategic = Number(data?.strategicTarget ?? 0);
  const originalStrategic = Number(
    data?.initialCompanyStrategicTarget ??
      data?.originalStrategicTarget ??
      strategic,
  );
  const bottomUp =
    data?.bottomUpTeams != null
      ? sumHybridCompanyApprovedTeams(data)
      : Number(data?.bottomUpTarget ?? 0);
  const reconciledTotal = Number(data?.reconciledTeamTotal ?? bottomUp);
  const gap = Math.round((strategic - bottomUp) * 100) / 100;
  const remaining = Math.round((strategic - reconciledTotal) * 100) / 100;
  const uncovered = Number(data?.uncoveredAmount ?? 0);
  const overage = Number(data?.overageAmount ?? 0);
  const coverageAmount = Number(data?.opportunityCoverageAmount ?? 0);
  const coveragePct = Number(data?.opportunityCoveragePercent ?? 0);
  const selectedCount = data?.selectedOpportunities?.length ?? 0;
  const official =
    data?.finalOfficialCompanyTarget != null
      ? Number(data.finalOfficialCompanyTarget)
      : isReconciled
        ? strategic
        : null;

  return {
    status,
    isReconciled,
    strategic,
    originalStrategic,
    bottomUp,
    reconciledTotal,
    gap,
    remaining,
    uncovered,
    overage,
    coverageAmount,
    coveragePct,
    selectedCount,
    official,
  };
}

type Props = {
  data?: TargetReconciliationView;
  currencyCode: string;
  isLoading?: boolean;
  /** Slightly denser type for overview pages (same metrics as Details). */
  compact?: boolean;
  className?: string;
  selectedOpportunityCount?: number;
};

export function HybridReconciliationSummary({
  data,
  currencyCode,
  isLoading,
  compact,
  className,
  selectedOpportunityCount,
}: Props) {
  const m = useMemo(() => hybridReconciliationMetrics(data), [data]);
  const selectedCount = selectedOpportunityCount ?? m.selectedCount;

  const primarySize = compact ? 'text-[18px]' : 'text-[22px]';
  const secondarySize = compact ? 'text-[15px]' : 'text-[18px]';

  if (isLoading && !data) {
    return (
      <HybridReconciliationSkeleton compact={compact} className={className} />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          TARGETS_CARD_CLASS,
          'grid gap-0 overflow-hidden sm:grid-cols-[1fr_auto_1fr_auto_1fr]',
        )}
      >
        <div className={compact ? 'p-4' : 'p-5'}>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Strategic target
          </p>
          <p
            className={cn(
              'mt-1.5 font-bold tabular-nums text-foreground',
              primarySize,
            )}
          >
            {formatCompactMoney(m.strategic, currencyCode)}
          </p>
          {m.originalStrategic !== m.strategic ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Original {formatCompactMoney(m.originalStrategic, currencyCode)}
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Independent of team proposals
            </p>
          )}
        </div>
        <div className="hidden items-center px-1 text-[18px] text-muted-foreground sm:flex">
          −
        </div>
        <div
          className={cn(
            'border-t border-border sm:border-t-0 sm:border-l',
            compact ? 'p-4' : 'p-5',
          )}
        >
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Bottom-up proposal
          </p>
          <p
            className={cn(
              'mt-1.5 font-bold tabular-nums text-foreground',
              primarySize,
            )}
          >
            {formatCompactMoney(m.bottomUp, currencyCode)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            After company approval
          </p>
        </div>
        <div className="hidden items-center px-1 text-[18px] text-muted-foreground sm:flex">
          =
        </div>
        <div
          className={cn(
            'border-t border-border bg-muted/30 sm:border-t-0 sm:border-l',
            compact ? 'p-4' : 'p-5',
          )}
        >
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Gap
          </p>
          <p
            className={cn(
              'mt-1.5 font-bold tabular-nums',
              primarySize,
              Math.abs(m.gap) < 0.01 ? 'text-emerald-700' : 'text-foreground',
            )}
          >
            {formatCompactMoney(m.gap, currencyCode)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Uncovered {formatCompactMoney(m.uncovered, currencyCode)} · Overage{' '}
            {formatCompactMoney(m.overage, currencyCode)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          TARGETS_CARD_CLASS,
          'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
          compact ? 'p-4' : 'p-5',
        )}
      >
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Reconciled team total
          </p>
          <p
            className={cn(
              'mt-1 font-bold tabular-nums text-foreground',
              secondarySize,
            )}
          >
            {formatCompactMoney(m.reconciledTotal, currencyCode)}
          </p>
        </div>
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Remaining to close
          </p>
          <p
            className={cn(
              'mt-1 font-bold tabular-nums',
              secondarySize,
              Math.abs(m.remaining) < 0.01
                ? 'text-emerald-700'
                : 'text-amber-900',
            )}
          >
            {formatCompactMoney(m.remaining, currencyCode)}
          </p>
        </div>
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Opportunity coverage
          </p>
          <p
            className={cn(
              'mt-1 font-bold tabular-nums text-foreground',
              secondarySize,
            )}
          >
            {formatCompactMoney(m.coverageAmount, currencyCode)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {selectedCount} selected · {m.coveragePct.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Official company target
          </p>
          <p
            className={cn(
              'mt-1 font-bold tabular-nums text-foreground',
              secondarySize,
            )}
          >
            {m.official != null
              ? formatCompactMoney(m.official, currencyCode)
              : '—'}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {m.isReconciled
              ? 'Authoritative after mark reconciled'
              : 'Set when marked reconciled'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function resolveHybridModalMetrics(
  data: TargetReconciliationView | undefined,
  strategicFallback?: number,
) {
  const base = hybridReconciliationMetrics(data);
  const strategic =
    base.strategic > 0 ? base.strategic : Number(strategicFallback ?? 0);
  const bottomUp = base.bottomUp;
  const gap = Math.round((strategic - bottomUp) * 100) / 100;
  const remaining = Math.round((strategic - base.reconciledTotal) * 100) / 100;
  return { ...base, strategic, bottomUp, gap, remaining };
}

/** Target · proposals · gap (or official target when reconciled). */
export function HybridCompanyTargetModalPanel({
  data,
  currencyCode,
  isLoading,
  strategicFallback,
  className,
}: {
  data?: TargetReconciliationView;
  currencyCode: string;
  isLoading?: boolean;
  strategicFallback?: number;
  className?: string;
}) {
  const m = useMemo(
    () => resolveHybridModalMetrics(data, strategicFallback),
    [data, strategicFallback],
  );
  const money = (amount: number) => formatCompactMoney(amount, currencyCode);
  const showOfficial =
    m.isReconciled &&
    m.official != null &&
    (data?.reconciliationStatus === 'RECONCILED' ||
      data?.reconciliationStatus === 'FINALIZED');

  if (isLoading && !data) {
    return <HybridGapAccountingSkeleton className={className} />;
  }

  if (showOfficial) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-4">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
            Official company target
          </p>
          <p className="mt-2 text-[26px] font-bold tabular-nums text-foreground">
            {money(m.official!)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Reconciliation complete. Finalize the plan to publish official
            allocations to progress.
          </p>
        </div>
        <HybridStrategicGapAccounting
          data={data}
          currencyCode={currencyCode}
          strategicFallback={strategicFallback}
        />
        <HybridBottomUpProposalsPanel data={data} currencyCode={currencyCode} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <HybridStrategicGapAccounting
        data={data}
        currencyCode={currencyCode}
        strategicFallback={strategicFallback}
      />
      <HybridBottomUpProposalsPanel data={data} currencyCode={currencyCode} />
    </div>
  );
}

/** Compact strategic − bottom-up = gap (reconciliation API). */
export function HybridStrategicGapAccounting({
  data,
  currencyCode,
  isLoading,
  className,
  strategicFallback,
  variant = 'hero',
}: {
  data?: TargetReconciliationView;
  currencyCode: string;
  isLoading?: boolean;
  className?: string;
  /** When reconciliation has not loaded yet, use saved strategic from the card. */
  strategicFallback?: number;
  /** `compact` = Details modal summary; `hero` = company card-style columns. */
  variant?: 'hero' | 'compact';
}) {
  const m = useMemo(
    () => resolveHybridModalMetrics(data, strategicFallback),
    [data, strategicFallback],
  );
  const money = (amount: number) => formatCompactMoney(amount, currencyCode);

  if (isLoading && !data) {
    return <HybridGapAccountingSkeleton className={className} />;
  }

  if (variant === 'compact') {
    const gapClosed = Math.abs(m.gap) < 0.01;
    return (
      <div
        className={cn(
          TARGETS_CARD_CLASS,
          'grid gap-0 overflow-hidden sm:grid-cols-[1fr_auto_1fr_auto_1fr]',
          className,
        )}
      >
        <div className="px-4 py-3.5">
          <p className={TARGETS_KPI_LABEL_CLASS}>Strategic</p>
          <p className="mt-2 text-[18px] font-bold tabular-nums text-foreground">
            {money(m.strategic)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Company target
          </p>
        </div>
        <div
          className="hidden items-center px-1 text-[16px] text-muted-foreground sm:flex"
          aria-hidden
        >
          −
        </div>
        <div className="border-t border-border px-4 py-3.5 sm:border-l sm:border-t-0">
          <p className={TARGETS_KPI_LABEL_CLASS}>Proposals</p>
          <p className="mt-2 text-[18px] font-bold tabular-nums text-foreground">
            {money(m.bottomUp)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            After company approval
          </p>
        </div>
        <div
          className="hidden items-center px-1 text-[16px] text-muted-foreground sm:flex"
          aria-hidden
        >
          =
        </div>
        <div
          className={cn(
            'border-t border-border px-4 py-3.5 sm:border-l sm:border-t-0',
            gapClosed ? 'bg-emerald-500/[0.05]' : 'bg-muted/20',
          )}
        >
          <p className={TARGETS_KPI_LABEL_CLASS}>Gap</p>
          <p
            className={cn(
              'mt-2 text-[18px] font-bold tabular-nums',
              gapClosed ? 'text-emerald-700' : 'text-foreground',
            )}
          >
            {money(m.gap)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {gapClosed ? 'Ready to reconcile' : 'Remaining to close'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3',
        className,
      )}
    >
      <div>
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Strategic target
        </p>
        <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-foreground sm:text-[26px]">
          {money(m.strategic)}
        </p>
      </div>
      <div>
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Proposal amount
        </p>
        <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-foreground sm:text-[26px]">
          {money(m.bottomUp)}
        </p>
      </div>
      <div>
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Remaining gap
        </p>
        <p
          className={cn(
            'mt-1.5 text-[22px] font-bold leading-none tabular-nums sm:text-[26px]',
            Math.abs(m.remaining) < 0.01
              ? 'text-emerald-700'
              : 'text-foreground',
          )}
        >
          {money(m.remaining)}
        </p>
      </div>
    </div>
  );
}

/** Company-approved teams only (reconciliation scope). */
export function HybridBottomUpProposalsPanel({
  data,
  currencyCode,
  className,
}: {
  data?: TargetReconciliationView;
  currencyCode: string;
  className?: string;
}) {
  const approved = data?.bottomUpTeams ?? [];

  if (approved.length === 0) {
    return (
      <p className={cn('m-0 text-[11px] text-muted-foreground', className)}>
        No company-approved team proposals for this period yet.
      </p>
    );
  }

  return (
    <ul className={cn('m-0 space-y-1.5', className)}>
      {approved.map((team) => (
        <li
          key={team.requestId || team.teamId}
          className="flex justify-between gap-2 text-[12px]"
        >
          <span className="truncate font-medium text-foreground">
            {team.teamName}
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            {formatCompactMoney(Number(team.amount ?? 0), currencyCode)}
          </span>
        </li>
      ))}
    </ul>
  );
}
