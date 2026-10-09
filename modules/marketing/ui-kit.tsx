'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Gauge,
  Globe,
  Megaphone,
  Search,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { CampaignStatus, AssetStatus, EventStatus } from './mock-data';

/** Standard list search — fixed width, not full-bleed */
export function MarketingSearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative w-[min(100%,320px)] min-w-[200px] shrink-0',
        className,
      )}
    >
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 border-border bg-white pl-9 text-[12px] dark:bg-surface-card"
      />
    </div>
  );
}

/** Brand-styled dropdown filter (replaces chip filters) */
export function MarketingFilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          'h-8 w-[160px] shrink-0 border-border bg-surface-card text-[12px] shadow-none sm:w-[180px]',
          'focus:ring-brand/30 data-[state=open]:border-brand data-[state=open]:ring-1 data-[state=open]:ring-brand/30',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-[12px] focus:bg-brand-muted focus:text-brand"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Detail page header: larger arrow-only back control */
export function MarketingDetailHeader({
  backHref,
  onBack,
  backLabel,
  title,
  badges,
  actions,
  description,
}: {
  backHref?: string;
  onBack?: () => void;
  backLabel: string;
  title: string;
  badges?: ReactNode;
  actions?: ReactNode;
  description?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }
              if (backHref) router.push(backHref);
            }}
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={`Back to ${backLabel}`}
            title={`Back to ${backLabel}`}
          >
            <ArrowLeft className="size-5" strokeWidth={2.25} />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              {badges}
            </div>
            {description ? (
              <p className="m-0 mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Detail tabs — same chrome as Sales Hub (Pipeline / Leads / Deals):
 * 12px medium, brand underline + text when active.
 */
export const marketingTabsListClass =
  'h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0';

export const marketingTabTriggerClass = cn(
  'relative -mb-px inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-none',
  'border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5',
  'text-[12px] font-medium text-muted-foreground shadow-none transition-colors',
  'after:hidden hover:border-border hover:text-foreground',
  'data-[state=active]:border-brand data-[state=active]:bg-transparent',
  'data-[state=active]:text-brand data-[state=active]:shadow-none',
);

export function DashboardCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="m-0 text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function TrendChip({
  value,
  positive,
  suffix,
}: {
  value: string;
  positive: boolean;
  suffix?: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-1.5 pt-2 text-[12px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          positive ? 'text-emerald-600' : 'text-rose-600',
        )}
      >
        {positive ? (
          <ArrowUpRight size={13} aria-hidden="true" />
        ) : (
          <ArrowDownRight size={13} aria-hidden="true" />
        )}
        {value}
      </span>
      {suffix ? (
        <span className="truncate text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  );
}

export function formatMoney(amount: number, currency = 'ETB') {
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}K`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export function formatMarketingDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMarketingDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type IconTheme = { Icon: LucideIcon; fg: string; bg: string };

const kpiIconThemes: Record<string, IconTheme> = {
  campaigns: {
    Icon: Megaphone,
    fg: tokens.color.brand,
    bg: tokens.color.brandMuted,
  },
  leads: { Icon: Users, fg: tokens.color.blue, bg: '#E8F1FF' },
  conversion: {
    Icon: Gauge,
    fg: tokens.color.blue,
    bg: tokens.color.lightblue,
  },
  roi: { Icon: TrendingUp, fg: tokens.color.success, bg: '#E7F8EF' },
  spend: { Icon: Wallet, fg: tokens.color.brand, bg: tokens.color.brandMuted },
  reach: { Icon: Globe, fg: tokens.color.purple, bg: tokens.color.lightPurple },
  target: { Icon: Target, fg: tokens.color.brand, bg: tokens.color.brandMuted },
};

export function KpiCard({
  label,
  value,
  secondaryValue,
  trendLabel,
  trendDirection,
  progress,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  trendLabel: string;
  trendDirection: 'up' | 'down' | 'neutral';
  sparkline?: number[];
  progress?: number;
  icon: string;
}) {
  const theme = kpiIconThemes[icon] ?? kpiIconThemes.campaigns;
  const { Icon } = theme;

  return (
    <DashboardCard className="flex min-h-[122px] flex-col justify-between bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="m-0 mt-2 truncate text-[22px] font-bold leading-none tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.bg, color: theme.fg }}
        >
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </div>

      {typeof progress === 'number' && secondaryValue ? (
        <div className="mt-auto pt-3 text-[11px] text-muted-foreground">
          {secondaryValue}
        </div>
      ) : trendDirection !== 'neutral' ? (
        <TrendChip
          value={trendLabel}
          positive={trendDirection === 'up'}
          suffix="vs prior"
        />
      ) : trendLabel ? (
        <div className="mt-auto pt-3 text-[11px] text-muted-foreground">
          {trendLabel}
        </div>
      ) : null}
    </DashboardCard>
  );
}

export function InsightCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-surface-elevated">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-medium text-foreground">{title}</p>
        <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
      <ArrowUpRight size={14} className="mt-1 shrink-0 text-muted-foreground" />
    </div>
  );
}

export function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
      <p className="m-0 text-[11px] text-muted-foreground">{label}</p>
      <p className="m-0 mt-0.5 text-sm font-bold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | AssetStatus | EventStatus | string;
}) {
  const className = statusBadgeClass(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      {status}
    </span>
  );
}

export function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (
    ['active', 'live', 'approved', 'upcoming', 'connected', 'synced'].includes(
      s,
    )
  ) {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (
    [
      'paused',
      'pending',
      'in review',
      'in progress',
      'error',
      'failed',
    ].includes(s)
  ) {
    return 'bg-amber-50 text-amber-800';
  }
  if (
    [
      'draft',
      'scheduled',
      'planned',
      'not connected',
      'not synced',
      'manual',
    ].includes(s)
  ) {
    return 'bg-sky-50 text-sky-700';
  }
  if (['completed', 'archived', 'sent'].includes(s)) {
    return 'bg-slate-100 text-slate-700';
  }
  if (['rejected', 'cancelled', 'canceled'].includes(s)) {
    return 'bg-rose-50 text-rose-700';
  }
  return 'bg-muted text-muted-foreground';
}

export function PhaseBadge({ label = 'Phase 2' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

export function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = tokens.color.brand,
  trackClassName,
}: {
  value: number;
  max?: number;
  color?: string;
  trackClassName?: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div
      className={cn(
        'h-1.5 overflow-hidden rounded-full bg-surface-elevated',
        trackClassName,
      )}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
