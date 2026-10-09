'use client';

import { Input } from '@/components/ui/input';
import {
  TARGETS_CARD_CLASS,
  TARGETS_TABLE_HEAD_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { cn } from '@/lib/utils';

export type AllocationLineDraft = {
  key: string;
  label: string;
  forecastValue: number;
  suggestedAmount: number;
  amount: number;
  childScopeLevel: string;
  childOrgUnitId: string | null;
  userId: string | null;
};

type Props = {
  currencyCode: string;
  requiredAmount: number;
  lines: AllocationLineDraft[];
  readOnly?: boolean;
  hideForecastColumn?: boolean;
  onChangeAmount: (key: string, amount: number) => void;
};

export function AllocationLinesEditor({
  currencyCode,
  requiredAmount,
  lines,
  readOnly = false,
  hideForecastColumn = false,
  onChangeAmount,
}: Props) {
  const allocated = lines.reduce(
    (sum, line) => sum + Number(line.amount || 0),
    0,
  );
  const remaining = requiredAmount - allocated;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver = remaining < -0.01;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={cn(TARGETS_CARD_CLASS, 'px-4 py-3')}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Required
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatCompactMoney(requiredAmount, currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Allocated
            </p>
            <p
              className={cn(
                'text-lg font-semibold tabular-nums',
                isOver ? 'text-destructive' : 'text-foreground',
              )}
            >
              {formatCompactMoney(allocated, currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Remaining
            </p>
            <p
              className={cn(
                'text-lg font-semibold tabular-nums',
                isBalanced
                  ? 'text-emerald-600'
                  : isOver
                    ? 'text-destructive'
                    : 'text-amber-600',
              )}
            >
              {formatCompactMoney(remaining, currencyCode)}
            </p>
          </div>
        </div>
      </div>

      <div className={cn(TARGETS_CARD_CLASS, 'min-h-0 flex-1 overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className={cn('px-4 py-2.5', TARGETS_TABLE_HEAD_CLASS)}>
                  Unit
                </th>
                {!hideForecastColumn ? (
                  <th
                    className={cn(
                      'px-4 py-2.5 text-right',
                      TARGETS_TABLE_HEAD_CLASS,
                    )}
                  >
                    Forecast
                  </th>
                ) : null}
                <th
                  className={cn(
                    'px-4 py-2.5 text-right',
                    TARGETS_TABLE_HEAD_CLASS,
                  )}
                >
                  Suggested
                </th>
                <th
                  className={cn(
                    'px-4 py-2.5 text-right',
                    TARGETS_TABLE_HEAD_CLASS,
                  )}
                >
                  Allocation
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-b border-border/60">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {line.label}
                  </td>
                  {!hideForecastColumn ? (
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatCompactMoney(line.forecastValue, currencyCode)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatCompactMoney(line.suggestedAmount, currencyCode)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {readOnly ? (
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCompactMoney(line.amount, currencyCode)}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number.isFinite(line.amount) ? line.amount : 0}
                        onChange={(event) =>
                          onChangeAmount(
                            line.key,
                            Number(event.target.value || 0),
                          )
                        }
                        className="ml-auto h-8 w-36 text-right tabular-nums"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!lines.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {readOnly
              ? 'No allocation lines for this scope.'
              : 'No child units to allocate yet. Open or refresh the draft after the parent amount is set — departments, teams, or members are seeded from org structure (forecast fills suggested amounts when available).'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
