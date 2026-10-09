'use client';

import { Sparkles } from 'lucide-react';
import type { AiInsights } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { cn } from '@/lib/utils';

const toneStyles = {
  danger: 'border-rose-200 bg-rose-50',
  success: 'border-emerald-200 bg-emerald-50',
  info: 'border-sky-200 bg-sky-50',
  warning: 'border-amber-200 bg-amber-50',
} as const;

export function AiInsightsPanel({ data }: { data: AiInsights }) {
  return (
    <DashboardCard className="h-full">
      <SectionTitle
        action={
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-muted px-2 py-1 text-[11px] font-semibold text-brand">
            <Sparkles size={12} />
            AI
          </span>
        }
      >
        AI Insights
      </SectionTitle>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              'rounded-lg border px-3 py-2.5',
              toneStyles[card.tone],
            )}
          >
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {card.title}
            </p>
            <p className="m-0 mt-1 text-sm font-bold text-foreground">
              {card.value}
            </p>
            <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
              {card.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-brand-border bg-brand-muted/40 px-3 py-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-brand">
          Suggested Next Action
        </p>
        <p className="m-0 mt-1 text-sm text-foreground">
          {data.suggestedAction}
        </p>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-brand hover:underline"
        >
          {data.suggestedLinkLabel} →
        </button>
      </div>
    </DashboardCard>
  );
}
