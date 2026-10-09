'use client';

import React from 'react';
import type { HomeDashboardApiResponse } from './types';
import { formatMoney, formatPercent } from './utils';
import { KpiCard } from './KpiCard';
import { HomeKpiGrid } from './HomeKpiGrid';
import { SdConversionKpiCard } from './SdConversionKpiCard';
import { QuotaRingCard } from './QuotaRingCard';
import { RevenueVsTargetCard } from './RevenueVsTargetCard';
import { DistributionDonutCard } from './DistributionDonutCard';
import { HomeDashboardBottomSection } from './HomeDashboardBottomSection';
import { leadDealSettingsSectionLabel } from '@/config/salesWorkflow';

interface TeamMemberHomeViewProps {
  data: HomeDashboardApiResponse;
  periodSelector?: React.ReactNode;
  sessionId?: string;
}

export const TeamMemberHomeView: React.FC<TeamMemberHomeViewProps> = ({
  data,
  periodSelector,
  sessionId,
}) => {
  const { currency, metrics } = data;

  return (
    <div className="space-y-4 sm:space-y-5">
      <HomeKpiGrid showSdConversion={metrics.sdConversionConfigured}>
        <KpiCard
          label="My Pipeline"
          value={formatMoney(metrics.pipelineValue, currency)}
          hint={leadDealSettingsSectionLabel()}
        />
        <KpiCard
          label="My Closed Won"
          value={formatMoney(metrics.closedRevenue, currency)}
          hint={metrics.closedRevenueGrowthLabel}
        />
        <KpiCard
          label="Quota Attainment"
          value={formatPercent(metrics.quotaAchievement)}
          hint={metrics.quotaAchievementLabel}
        />
        <KpiCard
          label="Win Rate"
          value={formatPercent(metrics.winRate)}
          hint={metrics.winRateLabel}
        />
        <KpiCard
          label="Active Opportunities"
          value={metrics.activeOpportunities}
          hint={metrics.activeOpportunitiesLabel}
          hintTone="info"
        />
        <KpiCard
          label="Assigned Accounts"
          value={`${metrics.assignedAccounts} ${
            metrics.assignedAccounts === 1 ? 'Account' : 'Accounts'
          }`}
          hint={`${metrics.tasksDueToday} Tasks Due Today`}
          hintTone="muted"
        />
        <SdConversionKpiCard metrics={metrics} />
      </HomeKpiGrid>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <QuotaRingCard
            quota={data.quotaYtd}
            quotaAttainment={data.quotaAttainment}
            currency={currency}
            thirdCell="pacing"
            periodSelector={periodSelector}
            sessionId={sessionId}
          />
        </div>

        <div className="lg:col-span-4">
          <RevenueVsTargetCard
            data={data.revenueVsTarget}
            currency={currency}
            title="My Revenue vs Target"
          />
        </div>

        <div className="lg:col-span-4">
          <DistributionDonutCard
            distribution={data.distribution}
            currency={currency}
          />
        </div>
      </section>

      <HomeDashboardBottomSection
        customers={data.topCustomers}
        currency={currency}
        topCustomersTitle="My Assigned Key Accounts"
        closedDeals={data.closedDeals}
        closedDealsTitle="My Won Contracts"
        closedDealsHint="Closed won"
      />
    </div>
  );
};
