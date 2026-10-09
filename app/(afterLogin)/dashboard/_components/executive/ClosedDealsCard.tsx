'use client';

import { dealUiLabel } from '@/config/salesWorkflow';
import { Check } from 'lucide-react';
import type { ClosedDeals, QuotaProgress } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact, stageBadgeClass } from './utils';

export function ClosedDealsCard({
  data,
  quota,
  currency,
}: {
  data?: ClosedDeals;
  quota?: QuotaProgress;
  currency: string;
}) {
  const rows = data?.rows ?? [];
  const count = data?.count ?? rows.length;
  const total = data?.total ?? 0;
  const target = quota?.target ?? 0;
  const remaining = quota?.remaining ?? Math.max(0, target - total);
  const percent = quota?.percent ?? 0;

  return (
    <DashboardCard className="flex h-full min-h-[260px] flex-col">
      <SectionTitle
        action={
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
            {formatMoneyCompact(total, currency)} · {count}{' '}
            {dealUiLabel({ plural: count !== 1 })}
          </span>
        }
      >
        Closed {dealUiLabel({ plural: true })}
      </SectionTitle>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Check size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No closed {dealUiLabel({ plural: true, lowercase: true })} in this
            period.
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Won revenue: {formatMoneyCompact(total, currency)}
            {target > 0
              ? ` • Target: ${formatMoneyCompact(target, currency)}`
              : ''}
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

      <CardFooter
        label={`${percent.toFixed(1)}% quota achieved`}
        value={
          target > 0
            ? `${formatMoneyCompact(remaining, currency)} remaining`
            : undefined
        }
        valueClassName={remaining > 0 ? 'text-rose-600' : undefined}
      />
    </DashboardCard>
  );
}
