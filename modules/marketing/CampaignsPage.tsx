'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTableSkeleton } from '@/components/loading/skeleton-screens';
import { useMarketingCampaigns } from '@/store/server/features/marketing/queries';
import {
  campaignTotalSpend,
  formatCampaignRoi,
  resolveCampaignRoi,
} from './utils';
import { type CampaignObjective, type CampaignStatus } from './mock-data';
import { CreateCampaignModal } from './CampaignModals';
import {
  DashboardCard,
  EmptyHint,
  MarketingFilterSelect,
  MarketingSearchField,
  ProgressBar,
  StatusBadge,
  TypeBadge,
  formatMoney,
  formatNumber,
} from './ui-kit';

const STATUS_OPTIONS: Array<'All' | CampaignStatus> = [
  'All',
  'Draft',
  'Scheduled',
  'Active',
  'Paused',
  'Completed',
  'Cancelled',
];

const OBJECTIVE_OPTIONS: Array<'All' | CampaignObjective> = [
  'All',
  'Lead Generation',
  'Brand Awareness',
  'Product Promotion',
  'Customer Retention',
  'Event Promotion',
  'Revenue Generation',
  'Other',
];

export function CampaignsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('All');
  const [objectiveFilter, setObjectiveFilter] =
    useState<(typeof OBJECTIVE_OPTIONS)[number]>('All');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: campaigns = [], isLoading } = useMarketingCampaigns({
    search: query.trim() || undefined,
    status: statusFilter,
    objective: objectiveFilter,
  });

  const filtered = campaigns;

  return (
    <div className="min-h-full w-full space-y-4 bg-white p-4 sm:space-y-5 sm:p-5 lg:p-6">
      <DashboardCard className="overflow-hidden border border-border bg-white shadow-xs">
        <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[15px] font-semibold text-foreground">
                All Campaigns
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {filtered.length}
              </span>
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand text-[12px] font-medium text-white shadow-xs hover:bg-brand/90"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              New Campaign
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <MarketingSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search campaigns, owners…"
            />
            <MarketingFilterSelect
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as (typeof STATUS_OPTIONS)[number])
              }
              placeholder="Status"
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: s === 'All' ? 'All statuses' : s,
              }))}
            />
            <MarketingFilterSelect
              value={objectiveFilter}
              onValueChange={(v) =>
                setObjectiveFilter(v as (typeof OBJECTIVE_OPTIONS)[number])
              }
              placeholder="Objective"
              options={OBJECTIVE_OPTIONS.map((o) => ({
                value: o,
                label: o === 'All' ? 'All objectives' : o,
              }))}
              className="sm:w-[200px]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-hidden">
            <DataTableSkeleton columns={7} className="rounded-none border-0" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyHint>No campaigns match your filters.</EmptyHint>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#718096]">
                  <th className="px-4 py-2.5 font-semibold sm:px-5">
                    Campaign
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Activities</th>
                  <th className="px-3 py-2.5 font-semibold">Dates</th>
                  <th className="px-3 py-2.5 font-semibold">Budget</th>
                  <th className="px-3 py-2.5 font-semibold">Leads</th>
                  <th className="px-4 py-2.5 font-semibold sm:px-5">ROI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => {
                  const activityCount =
                    campaign.activityCount ?? campaign.activities?.length ?? 0;
                  const spend = campaignTotalSpend(campaign);
                  const roi = resolveCampaignRoi(campaign);
                  const budgetPct =
                    campaign.budget > 0
                      ? Math.round((spend / campaign.budget) * 100)
                      : 0;
                  return (
                    <tr
                      key={campaign.id}
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/marketing/campaigns/${campaign.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/marketing/campaigns/${campaign.id}`);
                        }
                      }}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-surface-elevated"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <p className="m-0 text-[13px] font-semibold text-foreground">
                          {campaign.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <TypeBadge label={campaign.objective} />
                          <span className="text-[11px] text-muted-foreground">
                            {campaign.owner}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-3 py-3 text-[13px] text-foreground tabular-nums">
                        {activityCount}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">
                        {campaign.startDate}
                        <br />
                        <span className="text-[11px]">
                          → {campaign.endDate}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="m-0 text-[13px] text-foreground tabular-nums">
                          {formatMoney(spend)}
                        </p>
                        <div className="mt-1 w-24">
                          <ProgressBar value={budgetPct} />
                        </div>
                        <p className="m-0 mt-0.5 text-[10px] text-muted-foreground">
                          of {formatMoney(campaign.budget)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-foreground tabular-nums">
                        {formatNumber(campaign.leadsGenerated)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold tabular-nums sm:px-5">
                        {roi === null ? (
                          <span className="font-normal text-muted-foreground">
                            {formatCampaignRoi(null)}
                          </span>
                        ) : (
                          <span
                            className={
                              roi >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }
                          >
                            {formatCampaignRoi(roi)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      <CreateCampaignModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
