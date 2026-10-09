'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { HomeCard } from './HomeCard';

type HintTone = 'positive' | 'info' | 'muted';

const HINT_TONE_CLASS: Record<HintTone, string> = {
  positive: 'font-medium text-green-600',
  info: 'font-medium text-brand',
  muted: 'text-muted-foreground',
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: HintTone;
  showTrendArrow?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  hint,
  hintTone = 'positive',
  showTrendArrow = false,
}) => {
  return (
    <HomeCard className="h-full">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      {hint ? (
        <div className={cn('mt-1 text-[11px]', HINT_TONE_CLASS[hintTone])}>
          {showTrendArrow ? '↑ ' : null}
          {hint}
        </div>
      ) : null}
    </HomeCard>
  );
};
