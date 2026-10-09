import type { MoneyByCurrency } from './types';
import { calculateWinRate } from '@/lib/win-rate';
import {
  formatTargetAmount,
  formatTargetPercent,
  roundTarget,
  TARGET_FRACTION_DIGITS,
} from '@/lib/target-format';

export const EMPTY = '—';

export function addMoney(
  target: MoneyByCurrency,
  currency: string,
  amount: number,
): void {
  const code = currency || 'UNKNOWN';
  target[code] = (target[code] ?? 0) + (Number.isFinite(amount) ? amount : 0);
}

export function sumMoney(...parts: MoneyByCurrency[]): MoneyByCurrency {
  const result: MoneyByCurrency = {};
  for (const part of parts) {
    for (const [code, amount] of Object.entries(part)) {
      addMoney(result, code, amount);
    }
  }
  return result;
}

export function moneyTotal(money: MoneyByCurrency): number {
  return Object.values(money).reduce((sum, amount) => sum + amount, 0);
}

export function primaryCurrency(money: MoneyByCurrency, fallback = ''): string {
  const entries = Object.entries(money).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? fallback;
}

export function formatCompactAmount(amount: number, currency: string): string {
  const abs = Math.abs(Number.isFinite(amount) ? amount : 0);
  const sign = amount < 0 ? '-' : '';
  const code = currency || '';
  const prefix = code ? `${code} ${sign}` : sign;
  const scale = (value: number, suffix: string) =>
    `${prefix}${roundTarget(value).toFixed(TARGET_FRACTION_DIGITS)}${suffix}`;

  if (abs >= 1_000_000_000_000) return scale(abs / 1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return scale(abs / 1_000_000_000, 'B');
  if (abs >= 1_000_000) return scale(abs / 1_000_000, 'M');
  if (abs >= 1_000) return scale(abs / 1_000, 'K');
  return `${prefix}${formatTargetAmount(abs)}`;
}

export function formatDetailedAmount(amount: number, currency: string): string {
  const code = currency || '';
  const formatted = formatTargetAmount(amount);
  return code ? `${code} ${formatted}` : formatted;
}

/** Numeric amounts only — currency belongs in the column header. */
export function formatMoneyMapValues(
  money: MoneyByCurrency,
  compact: boolean,
  empty = EMPTY,
): string {
  const entries = Object.entries(money).filter(([, amount]) => amount !== 0);
  if (!entries.length) {
    const codes = Object.keys(money);
    if (!codes.length) return empty;
    return compact ? formatCompactAmount(0, '') : formatTargetAmount(0);
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries
    .map(([, amount]) =>
      compact ? formatCompactAmount(amount, '') : formatTargetAmount(amount),
    )
    .join(' · ');
}

export function formatMoneyMap(
  money: MoneyByCurrency,
  compact: boolean,
  empty = EMPTY,
): string {
  const entries = Object.entries(money).filter(([, amount]) => amount !== 0);
  if (!entries.length) {
    const codes = Object.keys(money);
    if (!codes.length) return empty;
    return compact
      ? formatCompactAmount(0, codes[0]!)
      : formatDetailedAmount(0, codes[0]!);
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries
    .map(([code, amount]) =>
      compact
        ? formatCompactAmount(amount, code)
        : formatDetailedAmount(amount, code),
    )
    .join(' · ');
}

export function formatPercent(
  value: number | null,
  digits = TARGET_FRACTION_DIGITS,
): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return formatTargetPercent(value, digits);
}

export function formatCoverage(value: number | null, label?: string): string {
  if (label) return label;
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return `${value.toFixed(1)}x`;
}

export function formatDate(value?: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(
  fromIso?: string | null,
  toDate = new Date(),
): number | null {
  const delta = signedDayDelta(fromIso, toDate);
  return delta == null ? null : Math.max(0, -delta);
}

/** Calendar days from `fromDate` until `targetIso`. Negative if the target is in the past. */
export function signedDayDelta(
  targetIso?: string | null,
  fromDate = new Date(),
): number | null {
  if (!targetIso) return null;
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return null;
  const start = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const end = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.floor((end - start) / 86_400_000);
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function winRate(won: number, lost: number): number | null {
  return calculateWinRate(won, lost);
}

const WIN_RATE_CURRENCIES = ['ETB', 'USD'] as const;

/** Win rate per currency from closed-won vs lost values, e.g. `ETB 45% · USD 60%`. */
export function formatWinRateByCurrency(
  won: MoneyByCurrency,
  lost: MoneyByCurrency,
  currencies: readonly string[] = WIN_RATE_CURRENCIES,
): string {
  return currencies
    .map((currency) => {
      const rate = winRate(won[currency] ?? 0, lost[currency] ?? 0);
      return rate == null
        ? `${currency} —`
        : `${currency} ${Math.round(rate)}%`;
    })
    .join(' · ');
}

export function coverageRatio(
  openPipeline: number,
  remainingTarget: number,
): { value: number | null; label: string } {
  if (remainingTarget < 0) {
    return { value: null, label: 'Target exceeded' };
  }
  if (remainingTarget === 0) {
    return { value: null, label: 'Target met' };
  }
  return { value: openPipeline / remainingTarget, label: '' };
}
