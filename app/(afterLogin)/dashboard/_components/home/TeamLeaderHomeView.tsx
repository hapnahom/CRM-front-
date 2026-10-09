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
import { TeamMemberPerformanceCard } from './TeamMemberPerformanceCard';
import { HomeDashboardBottomSection } from './HomeDashboardBottomSection';
import {
  dealUiLabel,
  leadDealSettingsSectionLabel,
} from '@/config/salesWorkflow';

interface TeamLeaderHomeViewProps {
  data: HomeDashboardApiResponse;
  periodSelector?: React.ReactNode;
  sessionId?: string;
}

export const TeamLeaderHomeView: React.FC<TeamLeaderHomeViewProps> = ({
  data,
  periodSelector,
  sessionId,
}) => {
  const { currency, metrics } = data;
  const teamName = metrics.teamName || 'Team';

  return (
    <div className="space-y-4 sm:space-y-5">
      <HomeKpiGrid showSdConversion={metrics.sdConversionConfigured}>
        <KpiCard
          label={`${teamName} Pipeline`}
          value={formatMoney(metrics.pipelineValue, currency)}
          hint={leadDealSettingsSectionLabel()}
        />
        <KpiCard
          label="Team Closed Won"
          value={formatMoney(metrics.closedRevenue, currency)}
          hint={metrics.closedRevenueGrowthLabel}
        />
        <KpiCard
          label="Quota Achievement"
          value={formatPercent(metrics.quotaAchievement)}
          hint={metrics.quotaAchievementLabel}
        />
        <KpiCard
          label="Team Win Rate"
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
          label="Team Members"
          value={`${metrics.teamMembersCount} ${
            metrics.teamMembersCount === 1 ? 'Rep' : 'Reps'
          }`}
          hint={`Avg Cycle: ${metrics.avgDealCycleDays} Days`}
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
            title="Team Revenue vs Target"
          />
        </div>

        <div className="lg:col-span-4">
          <DistributionDonutCard
            distribution={data.distribution}
            currency={currency}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <TeamMemberPerformanceCard
            members={data.teamMembers}
            currency={currency}
            title="Team Member Performance"
          />
        </div>
      </section>

      <HomeDashboardBottomSection
        customers={data.topCustomers}
        currency={currency}
        topCustomersTitle={`${teamName} Top Customers`}
        closedDeals={data.closedDeals}
        closedDealsTitle={`Recent Won ${dealUiLabel({ plural: true })}`}
        closedDealsHint="Team closed"
      />
    </div>
  );
};
