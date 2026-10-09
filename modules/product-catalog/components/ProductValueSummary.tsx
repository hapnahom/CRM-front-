'use client';

import { cn } from '@/lib/utils';
import {
  computeProductsTotal,
  computeValueDifference,
  formatCatalogMoney,
  formatSignedMoney,
} from '@/modules/product-catalog/utils';
import type { OpportunityProductLine } from '@/modules/product-catalog/types';

export interface ProductValueSummaryProps {
  lines: OpportunityProductLine[];
  opportunityValue: number;
  currency?: string;
  className?: string;
}

export function ProductValueSummary({
  lines,
  opportunityValue,
  currency = 'USD',
  className,
}: ProductValueSummaryProps) {
  const productsTotal = computeProductsTotal(lines);
  const difference = computeValueDifference(productsTotal, opportunityValue);

  const diffTone =
    difference === 0
      ? 'text-muted-foreground'
      : difference > 0
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-sky-700 dark:text-sky-400';

  const banner =
    difference === 0
      ? null
      : difference > 0
        ? 'Products total is higher than opportunity value. This does not block saving.'
        : 'Products total is lower than opportunity value. This does not block saving.';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        <SummaryCell
          label="Opportunity value"
          value={formatCatalogMoney(opportunityValue, currency)}
        />
        <SummaryCell
          label="Products total"
          value={formatCatalogMoney(productsTotal, currency)}
          emphasize
        />
        <SummaryCell
          label="Difference"
          value={formatSignedMoney(difference, currency)}
          valueClassName={diffTone}
        />
      </div>
      {banner ? (
        <p
          className={cn(
            'rounded-lg border px-3 py-2 text-[11px] leading-relaxed',
            difference > 0
              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
              : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
          )}
        >
          {banner}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  emphasize,
  valueClassName,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="bg-surface-elevated/50 px-3.5 py-2.5 sm:px-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 tabular-nums',
          emphasize
            ? 'text-sm font-semibold text-foreground'
            : 'text-sm font-medium text-foreground',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}
