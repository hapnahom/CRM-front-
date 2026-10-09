'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Select } from 'antd';
import {
  ArrowRight,
  Calendar,
  FileImage,
  Megaphone,
  Plus,
  Radio,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingDashboardSkeleton } from '@/components/loading/skeleton-screens';
import { tokens } from '@/lib/design-tokens';
import { useMarketingOverview } from '@/store/server/features/marketing/queries';
import { LeadChannelPieChart } from './Charts';
import { CreateCampaignModal } from './CampaignModals';
import { formatCampaignRoi } from './utils';
import {
  DashboardCard,
  EmptyHint,
  KpiCard,
  StatusBadge,
  formatMoney,
  formatNumber,
} from './ui-kit';
import { cn } from '@/lib/utils';

const activityIcon = {
  campaign: Megaphone,
  lead: Users,
  budget: Wallet,
  event: Calendar,
  asset: FileImage,
  activity: Sparkles,
} as const;

const channelMeta = {
  Digital: {
    icon: Sparkles,
    iconBg: 'bg-brand-muted text-brand',
    barColor: tokens.color.brand,
  },
  Traditional: {
    icon: Radio,
    iconBg: 'bg-[#E8F1FF] text-[#0062FF]',
    barColor: tokens.color.blue,
  },
  Events: {
    icon: Calendar,
    iconBg: 'bg-[#E7F8EF] text-[#0BA259]',
    barColor: tokens.color.success,
  },
} as const;

function formatRelativeTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function pctOfMax(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

export function MarketingDashboard() {
  const [period, setPeriod] = useState('mtd');
  const [campaignOpen, setCampaignOpen] = useState(false);
  const { data: overview, isLoading } = useMarketingOverview(period);

  const kpis = overview?.kpis ?? [];
  const channelPerformance = overview?.channelPerformance ?? [];
  const topCampaigns = overview?.topCampaigns ?? [];
  const upcomingEvents = overview?.upcomingEvents ?? [];
  const recentActivity = overview?.recentActivity ?? [];

  const channels = useMemo(() => {
    const maxSpend = Math.max(...channelPerformance.map((c) => c.spend), 0);
    const maxLeads = Math.max(...channelPerformance.map((c) => c.leads), 0);
    const maxRoi = Math.max(
      ...channelPerformance.map((c) => Math.abs(c.roi ?? 0)),
      0,
    );

    return channelPerformance.map((row) => {
      const meta =
        channelMeta[row.channel as keyof typeof channelMeta] ??
        channelMeta.Digital;
      return {
        name: row.channel,
        activities: `${row.activities} activities`,
        icon: meta.icon,
        iconBg: meta.iconBg,
        barColor: meta.barColor,
        spend: formatMoney(row.spend),
        spendPct: pctOfMax(row.spend, maxSpend),
        leads: row.leads,
        leadsPct: pctOfMax(row.leads, maxLeads),
        roi: formatCampaignRoi(row.roi),
        roiPct: pctOfMax(Math.abs(row.roi ?? 0), maxRoi),
      };
    });
  }, [channelPerformance]);

  return (
    <div className="min-h-full w-full space-y-4 bg-white p-4 sm:space-y-5 sm:p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Performance overview
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={period}
            onChange={setPeriod}
            className="min-w-[140px]"
            options={[
              { value: 'mtd', label: 'Month to date' },
              { value: 'qtd', label: 'Quarter to date' },
              { value: 'ytd', label: 'Year to date' },
              { value: 'last30', label: 'Last 30 days' },
            ]}
          />
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-brand text-[12px] font-medium text-brand-foreground hover:bg-brand-hover"
            onClick={() => setCampaignOpen(true)}
          >
            <Plus size={14} />
            New Campaign
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="-mx-4 -mb-4 overflow-hidden sm:-mx-5 sm:-mb-5 lg:-mx-6 lg:-mb-6">
          <MarketingDashboardSkeleton />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.length === 0 ? (
              <div className="col-span-full">
                <EmptyHint>
                  No KPI data yet. Create your first campaign to get started.
                </EmptyHint>
              </div>
            ) : (
              kpis.map((kpi) => <KpiCard key={kpi.id} {...kpi} />)
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <LeadChannelPieChart
                className="h-full"
                data={overview?.channelMix}
              />
            </div>

            <div className="lg:col-span-7">
              <DashboardCard className="h-full bg-white p-4 sm:p-5">
                <div>
                  <h2 className="m-0 text-[15px] font-semibold text-foreground">
                    Channel performance
                  </h2>
                  <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
                    Live rollup from campaign, activity, and event results
                  </p>
                </div>

                {channels.length === 0 ? (
                  <div className="mt-4">
                    <EmptyHint>No activity data yet.</EmptyHint>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="grid grid-cols-12 gap-2 border-b border-border pb-3 sm:gap-4">
                      <div className="col-span-3" />
                      {channels.map((ch) => {
                        const Icon = ch.icon;
                        return (
                          <div key={ch.name} className="col-span-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'flex size-7 shrink-0 items-center justify-center rounded-lg',
                                  ch.iconBg,
                                )}
                              >
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0">
                                <p className="m-0 truncate text-[13px] font-semibold text-foreground">
                                  {ch.name}
                                </p>
                                <p className="m-0 truncate text-[11px] text-muted-foreground">
                                  {ch.activities}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(
                      [
                        ['Spend', 'spend', 'spendPct'],
                        ['Leads', 'leads', 'leadsPct'],
                        ['ROI', 'roi', 'roiPct'],
                      ] as const
                    ).map(([label, valueKey, pctKey], rowIndex, rows) => (
                      <div
                        key={label}
                        className={cn(
                          'grid grid-cols-12 items-center gap-2 py-3.5 sm:gap-4',
                          rowIndex < rows.length - 1 &&
                            'border-b border-border/60',
                        )}
                      >
                        <div className="col-span-3 text-[12px] font-medium text-muted-foreground">
                          {label}
                        </div>
                        {channels.map((ch) => (
                          <div key={ch.name} className="col-span-3 space-y-1.5">
                            <p className="m-0 text-[13px] font-semibold tabular-nums text-foreground">
                              {ch[valueKey]}
                            </p>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${ch[pctKey]}%`,
                                  backgroundColor: ch.barColor,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <DashboardCard className="overflow-hidden bg-white lg:col-span-7">
              <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
                <div>
                  <h2 className="m-0 text-[15px] font-semibold text-foreground">
                    Top performing campaigns
                  </h2>
                  <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
                    Ranked by attributed leads, then ROI
                  </p>
                </div>
                <Link
                  href="/marketing/campaigns"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
                >
                  View all
                  <ArrowRight size={12} />
                </Link>
              </div>

              {topCampaigns.length === 0 ? (
                <div className="p-4">
                  <EmptyHint>No campaigns in this period.</EmptyHint>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wide text-[#718096]">
                        <th className="px-4 py-2.5 sm:px-5">Campaign</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Leads</th>
                        <th className="px-3 py-2.5">Spend</th>
                        <th className="px-4 py-2.5 text-right sm:px-5">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCampaigns.slice(0, 4).map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="border-t border-border transition-colors hover:bg-surface-elevated"
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={`/marketing/campaigns/${campaign.id}`}
                              className="text-[13px] font-medium text-foreground hover:text-brand"
                            >
                              {campaign.name}
                            </Link>
                            <p className="m-0 max-w-[200px] truncate text-[11px] text-muted-foreground">
                              {campaign.objective}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={campaign.status} />
                          </td>
                          <td className="px-3 py-3 text-[13px] tabular-nums text-foreground">
                            {formatNumber(campaign.leads)}
                          </td>
                          <td className="px-3 py-3 text-[13px] tabular-nums text-foreground">
                            {formatMoney(campaign.spend)}
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums sm:px-5">
                            {campaign.roi === null ||
                            campaign.roi === undefined ? (
                              <span className="font-normal text-muted-foreground">
                                {formatCampaignRoi(null)}
                              </span>
                            ) : (
                              <span
                                className={
                                  campaign.roi >= 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }
                              >
                                {formatCampaignRoi(campaign.roi)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardCard>

            <div className="space-y-4 lg:col-span-5">
              <DashboardCard className="bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="m-0 text-[15px] font-semibold text-foreground">
                    Upcoming events
                  </h2>
                  <Link
                    href="/marketing/events"
                    className="text-[12px] font-medium text-brand hover:underline"
                  >
                    All events
                  </Link>
                </div>

                <div className="mt-3 divide-y divide-border">
                  {upcomingEvents.length === 0 ? (
                    <EmptyHint>No upcoming events.</EmptyHint>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/marketing/events/${event.id}`}
                            className="m-0 block truncate text-[13px] font-medium text-foreground hover:text-brand"
                          >
                            {event.name}
                          </Link>
                          <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
                            {event.location || event.status || 'Events channel'}
                          </p>
                        </div>
                        <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                          {event.date}
                          {event.endDate && event.endDate !== event.date
                            ? ` → ${event.endDate}`
                            : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </DashboardCard>

              <DashboardCard className="bg-white p-4 sm:p-5">
                <div className="border-b border-border pb-3">
                  <h2 className="m-0 text-[15px] font-semibold text-foreground">
                    Recent activity
                  </h2>
                </div>

                <div className="mt-3 space-y-3">
                  {recentActivity.length === 0 ? (
                    <EmptyHint>No recent activity.</EmptyHint>
                  ) : (
                    recentActivity.slice(0, 3).map((item) => {
                      const Icon =
                        activityIcon[item.type as keyof typeof activityIcon] ??
                        Sparkles;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                              <Icon size={15} />
                            </span>
                            <div className="min-w-0">
                              <p className="m-0 truncate text-[13px] font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="m-0 truncate text-[11px] text-muted-foreground">
                                {item.detail}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            {formatRelativeTime(item.time)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </DashboardCard>
            </div>
          </section>
        </>
      )}

      <CreateCampaignModal open={campaignOpen} onOpenChange={setCampaignOpen} />
    </div>
  );
}
