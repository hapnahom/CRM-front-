'use client';

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Clock3,
  Gauge,
  Goal,
  Handshake,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import type { KpiMetric } from './types';
import { trendClass } from './utils';

type IconTheme = {
  Icon: LucideIcon;
  fg: string;
  bg: string;
};

const iconTile = {
  fg: tokens.color.brand,
  bg: tokens.color.brandMuted,
};

const iconThemes: Record<string, IconTheme> = {
  pipeline: { Icon: ShoppingBag, ...iconTile },
  target: { Icon: Goal, ...iconTile },
  forecast: { Icon: BarChart3, ...iconTile },
  revenue: { Icon: Goal, ...iconTile },
  winrate: { Icon: Gauge, ...iconTile },
  opportunities: { Icon: Handshake, ...iconTile },
  customers: { Icon: Building2, ...iconTile },
  cycle: { Icon: Clock3, ...iconTile },
};

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const theme = iconThemes[metric.icon] ?? iconThemes.pipeline;
  const { Icon } = theme;
  const showArrow = metric.trendDirection !== 'neutral';
  const positive = metric.trendDirection !== 'down';

  return (
    <div className="flex h-full min-h-[132px] flex-col rounded-xl border border-border bg-white p-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-2.5">
        <p className="m-0 line-clamp-2 text-[12px] font-medium leading-4 text-muted-foreground">
          {metric.label}
        </p>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.bg, color: theme.fg }}
        >
          <Icon size={18} strokeWidth={2.25} />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <p className="m-0 text-[22px] font-bold leading-7 tracking-tight text-foreground">
          {metric.value}
          {metric.valueSuffix ? (
            <span className="ml-1 text-[12px] font-medium text-muted-foreground">
              {metric.valueSuffix}
            </span>
          ) : null}
        </p>
      </div>

      {metric.secondaryValue ? (
        <p className="m-0 mt-0.5 text-[12px] font-medium text-muted-foreground">
          {metric.secondaryValue}
        </p>
      ) : null}

      <div
        className={cn(
          'mt-auto flex items-center gap-1 pt-2 text-[12px] font-medium',
          trendClass(metric.trendDirection),
        )}
      >
        {showArrow ? (
          positive ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          )
        ) : null}
        <span>{metric.trendLabel}</span>
        {metric.trendContext ? (
          <span className="font-normal text-muted-foreground">
            {metric.trendContext}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function KpiRow({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <KpiCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
