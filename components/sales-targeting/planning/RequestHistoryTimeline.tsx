'use client';

import { cn } from '@/lib/utils';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import type { TargetRequestHistoryEvent } from '@/store/server/features/salesTargeting/types';

function formatEventLabel(event: TargetRequestHistoryEvent): string {
  if (event.eventType === 'submission') return 'Submitted for review';
  if (event.eventType === 'review') {
    const level = event.reviewLevel?.toLowerCase() ?? 'reviewer';
    const decision = event.decision?.toLowerCase() ?? 'updated';
    return `${level} ${decision}`;
  }
  switch (event.revisionSource) {
    case 'TEAM_SUBMISSION':
      return 'Team proposed';
    case 'TEAM_RESUBMISSION':
      return 'Team resubmitted';
    case 'DEPARTMENT_MODIFICATION':
      return 'Department adjusted';
    case 'COMPANY_MODIFICATION':
      return 'Company adjusted';
    case 'RECONCILIATION':
      return 'Reconciliation adjustment';
    default:
      return `Revision ${event.revisionNumber ?? ''}`.trim();
  }
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  events: TargetRequestHistoryEvent[];
  currencyCode: string;
  className?: string;
};

export function RequestHistoryTimeline({
  events,
  currencyCode,
  className,
}: Props) {
  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground">No revision history yet.</p>
    );
  }

  return (
    <ol className={cn('space-y-0', className)}>
      {events.map((event, index) => (
        <li
          key={`${event.eventType}-${event.occurredAt}-${index}`}
          className="relative pl-6 pb-4 last:pb-0"
        >
          {index < events.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[7px] top-3 h-full w-px bg-border"
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              'absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 bg-surface-card',
              event.eventType === 'review'
                ? 'border-foreground/70'
                : event.eventType === 'submission'
                  ? 'border-emerald-500'
                  : 'border-muted-foreground/40',
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {formatEventLabel(event)}
              </p>
              {event.amount != null ? (
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCompactMoney(event.amount, currencyCode)}
                </p>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatWhen(event.occurredAt)}
            </p>
            {event.amountDelta != null && event.amountDelta !== 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Change:{' '}
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    event.amountDelta > 0
                      ? 'text-emerald-700'
                      : 'text-amber-700',
                  )}
                >
                  {event.amountDelta > 0 ? '+' : ''}
                  {formatCompactMoney(event.amountDelta, currencyCode)}
                </span>
              </p>
            ) : null}
            {event.forecastSnapshotAmount != null ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Forecast at event:{' '}
                <span className="font-medium tabular-nums">
                  {formatCompactMoney(
                    event.forecastSnapshotAmount,
                    currencyCode,
                  )}
                </span>
              </p>
            ) : null}
            {event.revisionReason ? (
              <p className="mt-1 text-[12px] text-foreground/80">
                {event.revisionReason}
              </p>
            ) : null}
            {event.comment ? (
              <p className="mt-1 rounded-md bg-muted/50 px-2 py-1 text-[12px] text-foreground/80">
                {event.comment}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
