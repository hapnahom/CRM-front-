'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { isModuleEnabled } from '@/config/modules';
import { TopCustomersSummaryTable } from './TopCustomersSummaryTable';
import { ClosedDealsCard } from './ClosedDealsCard';
import { AiInsightsPanel } from '@/modules/ai-intelligence/AiInsightsPanel';
import type { HomeClosedDeal, HomeTopCustomer } from './types';

interface HomeDashboardBottomSectionProps {
  customers: HomeTopCustomer[];
  currency: string;
  topCustomersTitle: string;
  closedDeals: HomeClosedDeal[];
  closedDealsTitle: string;
  closedDealsHint?: string;
}

export function HomeDashboardBottomSection({
  customers,
  currency,
  topCustomersTitle,
  closedDeals,
  closedDealsTitle,
  closedDealsHint,
}: HomeDashboardBottomSectionProps) {
  const aiInsightsEnabled = isModuleEnabled('aiInsights');

  return (
    <section
      className={cn(
        'grid grid-cols-1 items-stretch gap-4',
        aiInsightsEnabled
          ? 'lg:grid-cols-12 lg:h-[44rem] lg:min-h-[44rem] lg:max-h-[44rem]'
          : 'lg:grid-cols-2',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 w-full',
          aiInsightsEnabled && 'lg:col-span-7',
        )}
      >
        <TopCustomersSummaryTable
          customers={customers}
          currency={currency}
          title={topCustomersTitle}
        />
      </div>

      {aiInsightsEnabled ? (
        <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden lg:col-span-5">
          <div className="shrink-0">
            <ClosedDealsCard
              deals={closedDeals}
              currency={currency}
              title={closedDealsTitle}
              hint={closedDealsHint}
              maxItems={5}
            />
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <AiInsightsPanel title="AI Insights" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 w-full">
          <ClosedDealsCard
            deals={closedDeals}
            currency={currency}
            title={closedDealsTitle}
            hint={closedDealsHint}
            maxItems={5}
            fillHeight
          />
        </div>
      )}
    </section>
  );
}
