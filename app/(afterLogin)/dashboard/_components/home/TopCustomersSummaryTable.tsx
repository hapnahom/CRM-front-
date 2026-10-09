'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { HomeTopCustomer } from './types';
import { formatMoney } from './utils';
import { CustomerAvatar } from '@/modules/customers/components/CustomerAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';

const TOP_CUSTOMERS_DISPLAY_LIMIT = 10;

interface TopCustomersSummaryTableProps {
  customers: HomeTopCustomer[];
  currency: string;
  title?: string;
}

function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export const TopCustomersSummaryTable: React.FC<
  TopCustomersSummaryTableProps
> = ({ customers, currency, title = 'Top Enterprise Customers' }) => {
  const router = useRouter();

  const sortedCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => b.totalCombinedValue - a.totalCombinedValue)
        .slice(0, TOP_CUSTOMERS_DISPLAY_LIMIT),
    [customers],
  );

  const totalValue = sortedCustomers.reduce(
    (sum, c) => sum + c.totalCombinedValue,
    0,
  );

  return (
    <article className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="shrink-0 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>

      <div className="shrink-0 border-b border-border bg-surface-elevated px-4 py-2 text-xs">
        <span className="text-[11px] text-muted-foreground">
          Combined Pipeline Value:{' '}
          <strong className="font-semibold text-foreground">
            {formatMoney(totalValue, currency)}
          </strong>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-[1] border-b border-border bg-surface-elevated text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-3">#</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Sector</th>
              <th className="px-3 py-3">Account Owner</th>
              {isLeadsEnabled() ? (
                <th className="px-3 py-3 text-center">Active Leads</th>
              ) : null}
              <th className="px-3 py-3 text-center">
                Active {dealUiLabel({ plural: true })}
              </th>
              <th className="px-3 py-3 text-right">Pipeline Value</th>
            </tr>
          </thead>
          {/* Reserve vertical space for up to 10 enterprise rows */}
          <tbody className="divide-y divide-border [&_tr]:h-[3.25rem]">
            {sortedCustomers.length === 0 ? (
              <tr>
                <td
                  colSpan={isLeadsEnabled() ? 7 : 6}
                  className="py-10 text-center text-xs text-muted-foreground"
                >
                  No customer accounts found.
                </td>
              </tr>
            ) : (
              sortedCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer transition-colors hover:bg-surface-hover/70"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <td className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">
                    #{index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar
                        name={customer.name}
                        initials={customer.initials}
                        logoUrl={customer.logoUrl}
                        size="sm"
                        className="size-8 text-[11px]"
                      />
                      <div className="min-w-0">
                        <strong className="block truncate text-[12px] font-semibold text-foreground">
                          {customer.name}
                        </strong>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {customer.vector}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar size="sm" className="size-6">
                        {customer.ownerAvatarUrl ? (
                          <AvatarImage
                            src={customer.ownerAvatarUrl}
                            alt={customer.owner}
                          />
                        ) : null}
                        <AvatarFallback className="bg-surface-elevated text-[9px] font-semibold text-muted-foreground">
                          {ownerInitials(customer.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-[11.5px] font-medium text-foreground">
                        {customer.owner}
                      </span>
                    </div>
                  </td>
                  {isLeadsEnabled() ? (
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center rounded border border-brand-border bg-brand-muted px-2 py-1 text-[10.5px] font-medium text-brand">
                        {customer.leadsCount}{' '}
                        {customer.leadsCount === 1 ? 'Lead' : 'Leads'}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10.5px] font-medium text-emerald-700">
                      {customer.dealsCount}{' '}
                      {dealUiLabel({ plural: customer.dealsCount !== 1 })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <strong className="text-[12px] font-semibold text-foreground">
                      {formatMoney(customer.totalCombinedValue, currency)}
                    </strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
};
