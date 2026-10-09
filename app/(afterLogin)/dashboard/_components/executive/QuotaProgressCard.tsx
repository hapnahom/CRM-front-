'use client';

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { QuotaProgress } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact } from './utils';

function QuotaRing({ percent }: { percent: number }) {
  const size = 140;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative size-[140px] shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.brandMuted}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold leading-7 tracking-tight text-foreground">
          {percent.toFixed(2)}%
        </span>
        <span className="text-[12px] font-medium text-muted-foreground">
          Achieved
        </span>
      </div>
    </div>
  );
}

export function QuotaProgressCard({
  data,
  currency,
}: {
  data?: QuotaProgress;
  currency: string;
}) {
  const percent = data?.percent ?? 0;
  const won = data?.won ?? 0;
  const target = data?.target ?? 0;
  const remaining = data?.remaining ?? Math.max(0, target - won);

  const stats = [
    { label: 'Won', value: formatMoneyCompact(won, currency) },
    {
      label: 'Target',
      value: target > 0 ? formatMoneyCompact(target, currency) : 'Not set',
    },
    {
      label: 'Remaining',
      value: target > 0 ? formatMoneyCompact(remaining, currency) : 'Not set',
      tone: remaining > 0 && target > 0 ? 'text-rose-600' : undefined,
    },
  ];

  return (
    <DashboardCard className="flex h-full min-h-[320px] flex-col">
      <SectionTitle
        action={
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
            {data?.periodLabel || 'Progress'}
          </span>
        }
      >
        Overall Target vs Achievement
      </SectionTitle>

      <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center">
        <QuotaRing percent={percent} />
        <div className="grid w-full grid-cols-1 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
            >
              <p className="m-0 text-[11px] text-muted-foreground">
                {stat.label}
              </p>
              <p
                className={cn(
                  'm-0 mt-0.5 text-sm font-bold',
                  stat.tone || 'text-foreground',
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <CardFooter
        label="Remaining Target Gap"
        value={target > 0 ? formatMoneyCompact(remaining, currency) : 'Not set'}
        valueClassName={
          remaining > 0 && target > 0 ? 'text-rose-600' : undefined
        }
      />
    </DashboardCard>
  );
}
