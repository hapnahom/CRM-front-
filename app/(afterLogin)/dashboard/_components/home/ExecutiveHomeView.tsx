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
import {
  dealUiLabel,
  leadDealSettingsSectionLabel,
} from '@/config/salesWorkflow';

interface ExecutiveHomeViewProps {
  data: HomeDashboardApiResponse;
  periodSelector?: React.ReactNode;
  sessionId?: string;
}

export const ExecutiveHomeView: React.FC<ExecutiveHomeViewProps> = ({
  data,
  periodSelector,
  sessionId,
}) => {
  const { currency, metrics } = data;

  return (
    <div className="space-y-4 sm:space-y-5">
      <HomeKpiGrid
        showSdConversion={metrics.sdConversionConfigured}
        baseCount={5}
      >
        <KpiCard
          label="Total Pipeline"
          value={formatMoney(metrics.pipelineValue, currency)}
          hint={leadDealSettingsSectionLabel()}
        />
        <KpiCard
          label="Won"
          value={formatMoney(metrics.closedRevenue, currency)}
          hint={metrics.closedRevenueGrowthLabel}
        />
        <KpiCard
          label="Target"
          value={formatMoney(metrics.forecastValue, currency)}
          hint={metrics.forecastGrowthLabel}
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
        />
        <SdConversionKpiCard metrics={metrics} />
      </HomeKpiGrid>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <QuotaRingCard
            quota={data.quotaYtd}
            quotaAttainment={data.quotaAttainment}
            currency={currency}
            periodSelector={periodSelector}
            sessionId={sessionId}
          />
        </div>

        <div className="lg:col-span-4">
          <RevenueVsTargetCard
            data={data.revenueVsTarget}
            currency={currency}
            title="Revenue vs Target"
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
        topCustomersTitle="Top Enterprise Customers"
        closedDeals={data.closedDeals}
        closedDealsTitle={`Recent Closed ${dealUiLabel({ plural: true })}`}
        closedDealsHint="Won contracts"
      />
    </div>
  );
};
