import { tokens } from '@/lib/design-tokens';
import {
  formatTargetAmount,
  formatTargetPercent,
  roundTarget,
  TARGET_FRACTION_DIGITS,
} from '@/lib/target-format';

/** Blue — target / goal series (pairs with achievement green). */
export const HOME_TARGET_COLOR = tokens.color.blue;

/** Green — achieved / attainment series. */
export const HOME_ACHIEVED_COLOR = tokens.color.success;

/** Distinct hues for pipeline distribution segments. */
export const HOME_DISTRIBUTION_COLORS = [
  '#ED6925',
  '#0062FF',
  '#0BA259',
  '#8C62FF',
  '#E6BB20',
  '#E03137',
  '#FE964A',
  '#1D9BF0',
] as const;

export function formatMoney(value: number, currency = 'ETB') {
  const amount = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const code = currency?.trim();
  const prefix = code ? `${sign}${code} ` : sign;

  if (abs >= 1_000_000_000_000) {
    return `${prefix}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${prefix}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${prefix}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${prefix}${abs.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
}

/** Same scale as formatMoney but without the currency prefix (chart axes). */
export function formatCompactNumber(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) {
    return `${sign}${roundTarget(abs / 1_000).toFixed(TARGET_FRACTION_DIGITS)}K`;
  }
  return `${sign}${formatTargetAmount(abs)}`;
}

export function formatPercent(value: number) {
  return formatTargetPercent(Number.isFinite(value) ? value : 0);
}

export function dealStageBadgeClass(stage: string) {
  const normalized = (stage || '').toLowerCase();
  if (normalized.includes('won')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized.includes('lost')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (normalized.includes('negotiat') || normalized.includes('contract')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (normalized.includes('proposal') || normalized.includes('quot')) {
    return 'bg-brand-muted text-brand border-brand-border';
  }
  if (normalized.includes('qualif') || normalized.includes('discover')) {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  return 'bg-surface-elevated text-muted-foreground border-border';
}

export function probabilityBarColor(probability: number) {
  if (probability >= 80) return tokens.color.success;
  if (probability >= 60) return tokens.color.brand;
  return tokens.color.orange;
}
