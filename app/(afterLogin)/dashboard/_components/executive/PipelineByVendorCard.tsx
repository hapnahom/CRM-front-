'use client';

import { Boxes } from 'lucide-react';
import type { VendorPipelineDatum } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact } from './utils';
import { dealUiLabel } from '@/config/salesWorkflow';

export function PipelineByVendorCard({
  data,
  currency,
  primaryName,
  primaryPercent,
}: {
  data: VendorPipelineDatum[];
  currency: string;
  primaryName?: string;
  primaryPercent?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const primary =
    primaryName || [...data].sort((a, b) => b.value - a.value)[0]?.vendor;
  const primaryShare =
    primaryPercent ??
    [...data].sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0]?.percent;

  return (
    <DashboardCard className="flex h-full min-h-[320px] flex-col">
      <SectionTitle>Pipeline by Vendor / Solution</SectionTitle>
      {data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Boxes size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No vendor pipeline yet.
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Open {dealUiLabel({ plural: true, lowercase: true })} with a catalog
            vendor will appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 pt-1">
          {data.map((row) => {
            const pct = Math.max(8, (row.value / max) * 100);
            return (
              <div key={row.vendor}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {row.vendor}
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoneyCompact(row.value, currency)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <CardFooter
        label="Primary Partner"
        value={
          primary
            ? `${primary}${primaryShare != null ? ` (${primaryShare}%)` : ''}`
            : undefined
        }
        valueClassName="text-brand"
      />
    </DashboardCard>
  );
}
