'use client';

import { CalendarClock } from 'lucide-react';
import type { ExpectedToClose } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact, stageBadgeClass } from './utils';
import { dealUiLabel } from '@/config/salesWorkflow';

export function ExpectedToCloseCard({
  data,
  currency,
}: {
  data?: ExpectedToClose;
  currency: string;
}) {
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const dealPluralLower = dealUiLabel({ plural: true, lowercase: true });

  return (
    <DashboardCard className="flex h-full min-h-[260px] flex-col">
      <SectionTitle
        action={
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
            {formatMoneyCompact(total, currency)}
          </span>
        }
      >
        Expected to Close
      </SectionTitle>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <CalendarClock size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No {dealPluralLower} expected to close in this period.
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Open {dealPluralLower} with a close date will appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium text-foreground">
                  {row.name}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageBadgeClass(
                    row.stage,
                  )}`}
                >
                  {row.stage}
                </span>
              </div>
              <p className="m-0 shrink-0 text-sm font-medium text-foreground">
                {formatMoneyCompact(row.value, currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
