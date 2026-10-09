import { cn } from '@/lib/utils';
import { Fragment } from 'react';
import {
  formatCompactAmount,
  formatDetailedAmount,
  formatMoneyMap,
} from '@/modules/sales-pipeline/report/format';
import type { MoneyByCurrency } from '@/modules/sales-pipeline/report/types';

const DEFAULT_CURRENCY = 'ETB';
const PAIR_CODES = ['ETB', 'USD'] as const;

export function asMoneyMap(value: unknown): MoneyByCurrency {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const money: MoneyByCurrency = {};
  for (const [code, amount] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const numeric = Number(amount);
    if (!code || !Number.isFinite(numeric)) continue;
    money[code.trim().toUpperCase()] = numeric;
  }
  return money;
}

function amountFor(money: MoneyByCurrency, code: string): number | null {
  const numeric = money[code];
  if (numeric == null || !Number.isFinite(numeric) || numeric === 0)
    return null;
  return numeric;
}

/** Drop zero/empty currencies. When a currency is selected, keep only that code. */
export function presentMoney(
  money: MoneyByCurrency | undefined,
  currency?: string | null,
): MoneyByCurrency {
  const map = asMoneyMap(money ?? {});
  const nonzero: MoneyByCurrency = {};
  for (const [code, amount] of Object.entries(map)) {
    if (amount !== 0) nonzero[code] = amount;
  }
  const code = currency?.trim().toUpperCase();
  if (!code || code === 'ALL') return nonzero;
  const amount = nonzero[code];
  return amount != null ? { [code]: amount } : {};
}

export function formatBaseMoney(value: number, currency = DEFAULT_CURRENCY) {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatCompactMoney(value: number, currency = DEFAULT_CURRENCY) {
  return formatCompactAmount(value, currency);
}

export function MoneyAmount({
  value,
  currency = DEFAULT_CURRENCY,
  className,
  align = 'end',
  size = 'sm',
  compact = false,
}: {
  value: number;
  currency?: string;
  className?: string;
  align?: 'start' | 'end';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex flex-col tabular-nums',
        align === 'end' ? 'items-end text-right' : 'items-start text-left',
        className,
      )}
    >
      <span
        className={cn(
          'font-semibold text-foreground',
          size === 'lg' && 'text-xl',
          size === 'md' && 'text-sm',
          size === 'sm' && 'text-[13px]',
        )}
      >
        {compact
          ? formatCompactAmount(value, currency)
          : formatDetailedAmount(value, currency)}
      </span>
    </span>
  );
}

/**
 * Native stored amounts only. Missing currencies are omitted, not shown as —.
 */
export function DualCurrencyPair({
  money,
  compact = true,
  align = 'end',
  size = 'sm',
  fit = 'content',
  className,
}: {
  money?: MoneyByCurrency;
  compact?: boolean;
  align?: 'start' | 'end';
  size?: 'sm' | 'md' | 'lg';
  fit?: 'content' | 'fill';
  className?: string;
}) {
  const map = asMoneyMap(money ?? {});
  const extras = Object.keys(map)
    .filter(
      (code) =>
        !PAIR_CODES.includes(code as (typeof PAIR_CODES)[number]) &&
        amountFor(map, code) != null,
    )
    .sort();
  const rows = [...PAIR_CODES, ...extras]
    .map((code) => ({
      code,
      amount: amountFor(map, code),
    }))
    .filter((row) => row.amount != null);
  const format = compact ? formatCompactAmount : formatDetailedAmount;

  if (rows.length === 0) {
    return (
      <span
        className={cn(
          'tabular-nums font-semibold text-muted-foreground',
          align === 'end' ? 'text-right' : 'text-left',
          size === 'lg' && 'text-base',
          size === 'md' && 'text-sm',
          size === 'sm' && 'text-[13px]',
          className,
        )}
      >
        —
      </span>
    );
  }

  return (
    <div
      className={cn(
        'grid items-baseline gap-x-1.5 gap-y-0.5 tabular-nums',
        align === 'end'
          ? 'justify-items-stretch text-right'
          : 'justify-items-start text-left',
        fit === 'fill'
          ? 'w-full grid-cols-[2.25rem_minmax(0,1fr)]'
          : 'inline-grid w-max grid-cols-[auto_auto]',
        className,
      )}
    >
      {rows.map((row) => (
        <Fragment key={row.code}>
          <span
            className={cn(
              'text-left font-medium uppercase tracking-wide text-muted-foreground',
              size === 'lg' ? 'text-[11px]' : 'text-[10px]',
            )}
          >
            {row.code}
          </span>
          <span
            className={cn(
              'text-left font-semibold text-foreground',
              size === 'lg' && 'text-base',
              size === 'md' && 'text-sm',
              size === 'sm' && 'text-[13px]',
            )}
          >
            {row.amount == null ? '—' : format(row.amount, '')}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** Single-line native amounts for tables and compact lists: "ETB 1.2M · USD 50K". */
export function DualCurrencyInline({
  money,
  label,
  className,
}: {
  money?: MoneyByCurrency;
  label?: string | null;
  className?: string;
}) {
  const map = asMoneyMap(money ?? {});
  const hasAmount = Object.values(map).some((amount) => amount !== 0);
  const text = hasAmount
    ? label?.trim() || formatMoneyMap(map, true, '—')
    : '—';
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums text-[13px] font-semibold text-foreground',
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Sales Hub-style native amounts: "ETB 1.2M · USD 50K". */
export function MoneyStack({
  value,
  money,
  compact = true,
  className,
  align = 'end',
  size = 'sm',
}: {
  value?: string | null;
  money?: MoneyByCurrency;
  compact?: boolean;
  className?: string;
  align?: 'start' | 'end';
  size?: 'sm' | 'md' | 'lg';
}) {
  const label = value?.trim() || formatMoneyMap(money ?? {}, compact, '—');
  const parts = label.split(' · ').filter(Boolean);
  if (parts.length <= 1) {
    return (
      <span
        className={cn(
          'inline-flex tabular-nums font-semibold text-foreground',
          align === 'end'
            ? 'justify-end text-right'
            : 'justify-start text-left',
          size === 'lg' && 'text-xl',
          size === 'md' && 'text-sm',
          size === 'sm' && 'text-[13px]',
          className,
        )}
      >
        {parts[0] || '—'}
      </span>
    );
  }
  return (
    <ul
      className={cn(
        'm-0 list-none space-y-0.5 p-0 tabular-nums font-semibold text-foreground',
        align === 'end' ? 'text-right' : 'text-left',
        size === 'lg' && 'text-sm',
        size === 'md' && 'text-[13px]',
        size === 'sm' && 'text-[12px]',
        className,
      )}
    >
      {parts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}
