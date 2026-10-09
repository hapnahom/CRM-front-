'use client';

import React, { useMemo } from 'react';
import type { HomeClosedDeal } from './types';
import { formatMoney } from './utils';
import { dealUiLabel } from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_ITEMS = 5;

interface ClosedDealsCardProps {
  deals: HomeClosedDeal[];
  currency: string;
  title?: string;
  hint?: string;
  /** Cap visible deals (dashboard right column shows 5). */
  maxItems?: number;
  /** Stretch to fill the parent column height (e.g. when AI Insights is hidden). */
  fillHeight?: boolean;
  className?: string;
}

export const ClosedDealsCard: React.FC<ClosedDealsCardProps> = ({
  deals,
  currency,
  title = `Recent Closed ${dealUiLabel({ plural: true })}`,
  hint = 'Won contracts',
  maxItems = DEFAULT_MAX_ITEMS,
  fillHeight = false,
  className,
}) => {
  const visibleDeals = useMemo(
    () => deals.slice(0, maxItems),
    [deals, maxItems],
  );

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-border bg-white p-4 sm:p-5',
        fillHeight ? 'flex h-full min-h-0 flex-col' : 'shrink-0',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border pb-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div
        className={cn(
          'mt-2.5 space-y-2',
          fillHeight && 'min-h-0 flex-1 overflow-auto',
        )}
      >
        {visibleDeals.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">
            No closed {dealUiLabel({ plural: true, lowercase: true })} in this
            period.
          </p>
        ) : (
          visibleDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex min-h-[2.75rem] items-center justify-between rounded-lg bg-surface-elevated p-2 text-xs hover:bg-surface-hover"
            >
              <div className="mr-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="block truncate font-medium text-foreground">
                    {deal.name}
                  </strong>
                  <span className="rounded bg-surface-hover px-1 font-mono text-[9px] text-muted-foreground">
                    {deal.dealNumber}
                  </span>
                </div>
                <span className="text-[10.5px] text-muted-foreground">
                  {deal.team}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <strong className="text-xs font-semibold text-foreground">
                  {formatMoney(deal.value, currency)}
                </strong>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-800">
                  {deal.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
