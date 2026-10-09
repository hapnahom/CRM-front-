import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { CampaignStatus, TrendDirection } from './types';

export const DASHBOARD_CHART_COLORS = [
  tokens.color.brand,
  tokens.color.orange,
  tokens.color.brandHover,
  tokens.color.textMuted,
  tokens.color.textPrimary,
  tokens.color.textSubtle,
  tokens.color.brandBorder,
];

/** Lighter tints of brand orange for vendor progress bars. */
export const DASHBOARD_VENDOR_BAR_COLORS = [
  tokens.color.brand,
  '#F1844A',
  '#F49A6B',
  '#F7B08C',
  '#F9C6AD',
  tokens.color.brandBorder,
];

export function formatMoneyCompact(amount: number, currency = 'ETB') {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return `${sign}${currency} ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${currency} ${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}${currency} ${abs.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
}

export function formatMoneyFull(amount: number, currency = 'ETB') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;
  }
}

export function stageBadgeClass(stage: string) {
  const normalized = stage.toLowerCase();
  if (normalized.includes('won')) return 'bg-brand-muted text-brand';
  if (normalized.includes('lost')) return 'bg-rose-50 text-rose-700';
  return 'bg-muted text-muted-foreground';
}

export function campaignBadgeClass(status: CampaignStatus) {
  switch (status) {
    case 'Live':
      return 'bg-brand-muted text-brand';
    case 'In Progress':
      return 'bg-muted text-foreground';
    case 'Planned':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function trendClass(direction: TrendDirection) {
  return cn(
    direction === 'up' && 'text-emerald-600',
    direction === 'down' && 'text-rose-600',
    direction === 'neutral' && 'text-muted-foreground',
  );
}

export function severityBadgeClass(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'high':
      return 'bg-brand-muted text-brand';
    case 'medium':
      return 'bg-muted text-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
