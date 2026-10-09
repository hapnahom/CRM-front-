'use client';

import type { MarketingPerformance } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { campaignBadgeClass, formatMoneyCompact } from './utils';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyNamed } from '@/utils/lazyNamed';

const MarketingChannelDonut = lazyNamed(
  () => import('./Charts'),
  'MarketingChannelDonut',
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[180px] items-center justify-center">
        <Skeleton className="h-[160px] w-[160px] rounded-full" />
      </div>
    ),
  },
);

export function MarketingPerformancePanel({
  data,
  currency,
}: {
  data: MarketingPerformance;
  currency: string;
}) {
  const stats = [
    { label: 'Leads Generated', value: data.leadsGenerated.toLocaleString() },
    { label: 'Opportunities', value: data.opportunities.toLocaleString() },
    {
      label: 'Revenue',
      value: formatMoneyCompact(data.revenue * 1_000_000, currency),
    },
    { label: 'ROI', value: `${data.roi}%` },
  ];

  return (
    <DashboardCard className="h-full">
      <SectionTitle>Marketing Performance</SectionTitle>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
          >
            <p className="m-0 text-[11px] text-muted-foreground">
              {stat.label}
            </p>
            <p className="m-0 mt-0.5 text-sm font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lead Channels
          </p>
          <MarketingChannelDonut channels={data.channels} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active Campaigns
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {data.campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="truncate text-sm text-foreground">
                  {campaign.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignBadgeClass(
                    campaign.status,
                  )}`}
                >
                  {campaign.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
