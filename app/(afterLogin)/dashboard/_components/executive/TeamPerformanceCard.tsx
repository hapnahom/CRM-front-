'use client';

import type { TeamPerformance } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact } from './utils';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { dealUiLabel } from '@/config/salesWorkflow';

export function TeamPerformanceCard({
  data,
  currency,
}: {
  data?: TeamPerformance;
  currency: string;
}) {
  const rows = data?.rows ?? [];
  const dealLabel = dealUiLabel();
  const dealLabelPlural = dealUiLabel({ plural: true });
  const dealLabelPluralLower = dealUiLabel({ plural: true, lowercase: true });

  return (
    <DashboardCard className="flex h-full min-h-[320px] flex-col">
      <SectionTitle
        action={
          <div className="text-right">
            <p className="m-0 text-[14px] font-bold leading-5 text-brand">
              {data?.healthPercent?.toFixed(1) ?? '0.0'}%
            </p>
            <p className="m-0 text-[12px] font-medium text-muted-foreground">
              Pipeline Health
            </p>
          </div>
        }
      >
        Team Performance
      </SectionTitle>

      <div className="flex-1 space-y-0">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No team pipeline data yet.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
                  row.idle
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-brand-muted text-brand',
                )}
              >
                {row.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-medium text-foreground">
                  {row.name}
                </p>
                <p className="m-0 text-xs text-muted-foreground">
                  {row.idle
                    ? `0 ${dealLabelPlural} • Idle pipeline`
                    : `${row.dealCount} ${row.dealCount === 1 ? dealLabel : dealLabelPlural} • ${row.winProbability}% win prob.`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'm-0 text-sm font-medium',
                    row.idle ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {formatMoneyCompact(row.pipelineValue, currency)}
                </p>
                <div className="ml-auto mt-1 h-2.5 w-[70px] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, row.winProbability)}%`,
                      backgroundColor: row.idle
                        ? undefined
                        : tokens.color.brand,
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CardFooter
        label={`${data?.activeDealCount ?? 0} Active ${dealLabelPluralLower} managed across all sales units`}
      />
    </DashboardCard>
  );
}
