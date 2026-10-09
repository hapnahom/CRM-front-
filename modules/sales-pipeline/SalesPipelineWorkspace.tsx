'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ALL_CURRENCIES,
  isAllCurrencies,
  type PipelineCurrency,
  type PipelineFilterSelection,
  type PipelinePeriodSelection,
} from './pipeline-filter';
import {
  CurrencySelector,
  DepartmentFilter,
  PeriodSelector,
  useOptionalPipelineWorkspaceFilters,
} from './pipeline-filters';
import { usePipelineCurrencies } from '@/store/server/features/deals/pipeline/currency-queries';
import { SalesPipelineDashboard } from './SalesPipelineDashboard';

function WorkspaceHeader({
  filter,
  onFilterChange,
  currency,
  onCurrencyChange,
  period,
  onPeriodChange,
}: {
  filter: PipelineFilterSelection;
  onFilterChange: (filter: PipelineFilterSelection) => void;
  currency: PipelineCurrency;
  onCurrencyChange: (currency: PipelineCurrency) => void;
  period: PipelinePeriodSelection;
  onPeriodChange: (period: PipelinePeriodSelection) => void;
}) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-white">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-4 md:px-6">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground sm:text-[20px]">
            Pipeline
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DepartmentFilter filter={filter} onFilterChange={onFilterChange} />
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <CurrencySelector value={currency} onChange={onCurrencyChange} />
        </div>
      </div>
    </div>
  );
}

export function SalesPipelineWorkspace({
  hideHeader = false,
}: {
  hideHeader?: boolean;
} = {}) {
  const sharedFilters = useOptionalPipelineWorkspaceFilters();
  const [localFilter, setLocalFilter] = useState<PipelineFilterSelection>({
    type: 'all',
  });
  const [localCurrency, setLocalCurrency] =
    useState<PipelineCurrency>(ALL_CURRENCIES);
  const [localPeriod, setLocalPeriod] = useState<PipelinePeriodSelection>({
    type: 'all',
  });
  const { data: currencies } = usePipelineCurrencies();

  useEffect(() => {
    if (sharedFilters || !currencies?.length) return;
    setLocalCurrency((current) => {
      if (isAllCurrencies(current)) return ALL_CURRENCIES;
      if (currencies.some((item) => item.code === current)) return current;
      return ALL_CURRENCIES;
    });
  }, [currencies, sharedFilters]);

  const filter = sharedFilters?.filter ?? localFilter;
  const setFilter = sharedFilters?.setFilter ?? setLocalFilter;
  const currency = sharedFilters?.currency ?? localCurrency;
  const setCurrency = sharedFilters?.setCurrency ?? setLocalCurrency;
  const period = sharedFilters?.period ?? localPeriod;
  const setPeriod = sharedFilters?.setPeriod ?? setLocalPeriod;

  const dashboardKey = useMemo(
    () =>
      `${filter.type}-${filter.type === 'department' ? filter.departmentId : filter.type === 'team' ? filter.teamId : filter.type === 'member' ? filter.memberId : 'all'}-${currency}-${period.type === 'session' ? period.sessionId : period.type === 'annual' ? `annual:${period.calendarId ?? 'current'}` : 'all-periods'}`,
    [filter, currency, period],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {!hideHeader ? (
        <WorkspaceHeader
          filter={filter}
          onFilterChange={setFilter}
          currency={currency}
          onCurrencyChange={setCurrency}
          period={period}
          onPeriodChange={setPeriod}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SalesPipelineDashboard
          key={dashboardKey}
          filter={filter}
          currency={currency}
        />
      </div>
    </div>
  );
}
