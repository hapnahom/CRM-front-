'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import { antdPageTheme } from '@/lib/design-tokens';
import { formatUserName } from '@/lib/format-user-name';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useGetExecutiveDashboard } from '@/store/server/features/dashboard/executive/queries';
import {
  toEnabledCurrencies,
  useGetTenantCurrencies,
} from '@/store/server/features/tenant-management/tenant-currencies/queries';
import type {
  DashboardFiltersState,
  KpiMetric,
  VendorPipelineDatum,
} from './types';
import { DASHBOARD_VENDOR_BAR_COLORS } from './utils';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSkeleton } from './DashboardSkeleton';
import { KpiRow } from './KpiRow';
import { DepartmentPerformanceCard } from './DepartmentPerformanceCard';
import { QuotaProgressCard } from './QuotaProgressCard';
import { PipelineByVendorCard } from './PipelineByVendorCard';
import { TopOpportunitiesCard } from './TopOpportunitiesCard';
import { TeamPerformanceCard } from './TeamPerformanceCard';
import { MemberPerformanceCard } from './MemberPerformanceCard';
import { ClosedDealsCard } from './ClosedDealsCard';
import { ExpectedToCloseCard } from './ExpectedToCloseCard';

function defaultDateRange(): [string, string] {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

function greetingFromUserData(userData: Record<string, any>, fallback: string) {
  return formatUserName(
    {
      firstName: userData?.firstName,
      middleName: userData?.middleName,
      lastName: userData?.lastName,
      name: userData?.name,
      email: userData?.email,
    },
    fallback,
  );
}

function withVendorColors(rows: VendorPipelineDatum[]): VendorPipelineDatum[] {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row, index) => ({
    ...row,
    color:
      DASHBOARD_VENDOR_BAR_COLORS[index % DASHBOARD_VENDOR_BAR_COLORS.length],
    percent:
      row.percent ?? (total > 0 ? Math.round((row.value / total) * 100) : 0),
  }));
}

export function ExecutiveDashboard() {
  const userData = useAuthenticationStore((s) => s.userData);
  const [filters, setFilters] = useState<DashboardFiltersState>({
    dateRange: defaultDateRange(),
    currency: 'ETB',
  });

  const { data: tenantCurrencies } = useGetTenantCurrencies();

  const currencyOptions = useMemo(() => {
    const enabled = toEnabledCurrencies(tenantCurrencies ?? []);
    if (!enabled.length) {
      return [
        { value: 'ETB', label: 'ETB' },
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
      ];
    }
    return enabled.map((c) => ({
      value: c.name.toUpperCase(),
      label: c.name.toUpperCase(),
    }));
  }, [tenantCurrencies]);

  useEffect(() => {
    if (!currencyOptions.length) return;
    const exists = currencyOptions.some((c) => c.value === filters.currency);
    if (!exists) {
      setFilters((prev) => ({ ...prev, currency: currencyOptions[0].value }));
    }
  }, [currencyOptions, filters.currency]);

  const queryParams = useMemo(
    () => ({
      startDate: filters.dateRange[0],
      endDate: filters.dateRange[1],
      currency: filters.currency,
    }),
    [filters],
  );

  const { data, isLoading, isFetching } = useGetExecutiveDashboard(queryParams);

  const filterOptions = useMemo(
    () => ({
      currencies: currencyOptions,
    }),
    [currencyOptions],
  );

  const greetingName = greetingFromUserData(userData || {}, 'there');
  const scopeLabel = data?.scopeLabel || 'Dashboard';
  const currency = data?.currency || filters.currency;
  const kpis = (data?.kpis || []) as KpiMetric[];
  const vendorRows = withVendorColors(data?.pipelineByVendor ?? []);
  const loading = isLoading && !data;

  return (
    <ConfigProvider theme={antdPageTheme}>
      <div className="flex h-full flex-col overflow-auto bg-white">
        <DashboardHeader
          scopeLabel={scopeLabel}
          greetingName={greetingName}
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
        />

        <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6">
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div
                className={isFetching ? 'opacity-80 transition-opacity' : ''}
              >
                <KpiRow metrics={kpis} />
              </div>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <DepartmentPerformanceCard
                  data={data?.departmentPerformance}
                  currency={currency}
                />
                <QuotaProgressCard
                  data={data?.quotaProgress}
                  currency={currency}
                />
                <PipelineByVendorCard
                  data={vendorRows}
                  currency={currency}
                  primaryName={data?.primaryVendorName}
                  primaryPercent={data?.primaryVendorPercent}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopOpportunitiesCard
                  rows={data?.topOpportunities || []}
                  actions={data?.actionCenter || []}
                  currency={currency}
                />
                <TeamPerformanceCard
                  data={data?.teamPerformance}
                  currency={currency}
                />
                <MemberPerformanceCard
                  data={data?.memberPerformance}
                  currency={currency}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <ClosedDealsCard
                    data={data?.closedDeals}
                    quota={data?.quotaProgress}
                    currency={currency}
                  />
                </div>
                <div className="lg:col-span-2">
                  <ExpectedToCloseCard
                    data={data?.expectedToClose}
                    currency={currency}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
