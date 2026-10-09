'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TopOpportunity } from './types';
import { DashboardCard } from './DashboardCard';
import { formatMoneyFull, stageBadgeClass } from './utils';

export function TopOpportunitiesTable({
  rows,
  currency,
}: {
  rows: TopOpportunity[];
  currency: string;
}) {
  return (
    <DashboardCard className="h-full overflow-hidden p-0 sm:p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <h2 className="m-0 text-[14px] font-bold leading-5 text-[#334155]">
          Top Opportunities
        </h2>
        <Link
          href="/sales-hub?tab=deals"
          className="text-xs font-semibold text-brand hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
              <th className="px-4 py-3 font-semibold sm:px-5">Opportunity</th>
              <th className="px-3 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Stage</th>
              <th className="px-3 py-3 font-semibold">Value</th>
              <th className="px-3 py-3 font-semibold">Prob.</th>
              <th className="px-3 py-3 font-semibold">Close Date</th>
              <th className="px-3 py-3 font-semibold">Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No open opportunities found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-elevated"
                >
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">
                    {row.name}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.customer}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stageBadgeClass(
                        row.stage,
                      )}`}
                    >
                      {row.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground">
                    {formatMoneyFull(row.value, currency)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.probability}%
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.closeDate ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="size-7">
                        {row.ownerAvatarUrl ? (
                          <AvatarImage
                            src={row.ownerAvatarUrl}
                            alt={row.ownerName}
                          />
                        ) : null}
                        <AvatarFallback className="bg-brand-muted text-[10px] font-bold text-brand">
                          {row.ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground">
                        {row.ownerName}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
