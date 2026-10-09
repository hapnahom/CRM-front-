'use client';

import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, Clock3 } from 'lucide-react';
import type { ActionItem, TopOpportunity } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact, stageBadgeClass } from './utils';
import { cn } from '@/lib/utils';

export function TopOpportunitiesCard({
  rows,
  actions,
  currency,
}: {
  rows: TopOpportunity[];
  actions: ActionItem[];
  currency: string;
}) {
  const visibleDeals = rows.slice(0, 3);
  const visibleActions = actions.filter((item) => item.count > 0).slice(0, 2);

  return (
    <DashboardCard className="flex h-full min-h-[320px] flex-col">
      <SectionTitle
        action={
          <Link
            href="/sales-hub?tab=deals"
            className="text-xs font-semibold text-brand hover:underline"
          >
            View all
          </Link>
        }
      >
        Top Opportunities
      </SectionTitle>

      {visibleDeals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <BriefcaseBusiness size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No open opportunities
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            No high-priority deals for the selected filters.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {visibleDeals.map((row) => {
            const unassigned = row.ownerName === 'Unassigned';
            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="m-0 truncate text-sm font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="m-0 shrink-0 text-sm font-medium text-foreground">
                    {formatMoneyCompact(row.value, currency)}
                  </p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageBadgeClass(
                      row.stage,
                    )}`}
                  >
                    {row.stage}
                  </span>
                  {unassigned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                      <AlertTriangle size={12} />
                      Unassigned
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {row.ownerName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleActions.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Action Items & Tasks
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {visibleActions.map((item) => {
              const critical =
                item.severity === 'critical' || item.severity === 'high';
              const content = (
                <span className="flex items-center gap-2">
                  {critical ? (
                    <AlertTriangle
                      size={14}
                      className="shrink-0 text-rose-600"
                    />
                  ) : (
                    <Clock3
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="truncate">
                    {item.label} ({item.count})
                  </span>
                </span>
              );

              const className = cn(
                'flex rounded-lg border px-3 py-2.5 text-sm',
                critical
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-border bg-surface-elevated text-foreground',
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className={className}>
                      {content}
                    </Link>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </DashboardCard>
  );
}
