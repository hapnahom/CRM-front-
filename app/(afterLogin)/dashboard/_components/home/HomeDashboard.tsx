'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConfigProvider } from 'antd';
import { Coins } from 'lucide-react';
import { antdPageTheme } from '@/lib/design-tokens';
import { settingsPath } from '@/lib/routes/settings';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useGetHomeDashboard } from '@/store/server/features/dashboard/home/queries';
import { HomeDashboardSkeleton } from './HomeDashboardSkeleton';
import { ExecutiveHomeView } from './ExecutiveHomeView';
import { TeamLeaderHomeView } from './TeamLeaderHomeView';
import { TeamMemberHomeView } from './TeamMemberHomeView';
import { HOME_CARD_CLASS } from './HomeCard';
import { createEmptyHomeDashboard } from './empty-data';
import {
  HomeDashboardPeriodSelector,
  type ResolvedDashboardPeriod,
} from './HomeDashboardPeriodSelector';
import {
  emptyHomeDashboardFilters,
  HomeDashboardFilters,
  type HomeDashboardFiltersValue,
} from './HomeDashboardFilters';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import { useHomeDashboardSalesTarget } from '@/hooks/useHomeDashboardSalesTarget';
import { applySalesTargetToDashboard } from './applySalesTargetToDashboard';

function CurrencySetupBanner({ variant }: { variant: 'missing' | 'error' }) {
  const isMissing = variant === 'missing';

  return (
    <Alert className="border-border bg-surface-elevated">
      <Coins aria-hidden />
      <AlertTitle>
        {isMissing ? 'No currencies configured' : 'Unable to load currencies'}
      </AlertTitle>
      <AlertDescription>
        {isMissing
          ? 'This workspace has no tenant currencies yet. Dashboard metrics stay empty until at least one currency is configured.'
          : 'We could not verify currencies for this workspace. Metrics below are empty until currencies load successfully.'}
      </AlertDescription>
      <AlertAction>
        {isMissing ? (
          <Link
            href={settingsPath('currencies')}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            Configure currencies
          </Link>
        ) : (
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        )}
      </AlertAction>
    </Alert>
  );
}

function DashboardMessageState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`${HOME_CARD_CLASS} flex flex-col items-center justify-center gap-4 px-6 py-16 text-center sm:py-20`}
    >
      <div className="space-y-2">
        <h2 className="m-0 text-base font-semibold text-foreground">{title}</h2>
        <p className="mx-auto m-0 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function HomeDashboard() {
  const [filters, setFilters] = useState<HomeDashboardFiltersValue>(
    emptyHomeDashboardFilters,
  );
  const [period, setPeriod] = useState<ResolvedDashboardPeriod | null>(null);

  const handleFiltersChange = useCallback((next: HomeDashboardFiltersValue) => {
    setFilters(next);
  }, []);

  const queryParams = useMemo(
    () => ({
      startDate: filters.startDate,
      endDate: filters.endDate,
      currency: filters.currency,
      sessionId: filters.sessionId,
      calendarId: filters.calendarId,
    }),
    [
      filters.calendarId,
      filters.currency,
      filters.endDate,
      filters.sessionId,
      filters.startDate,
    ],
  );

  const { data, isLoading, isFetching, isPreviousData, isError, refetch } =
    useGetHomeDashboard(queryParams, filters.ready);

  const salesTarget = useHomeDashboardSalesTarget({
    calendarId: filters.calendarId,
    sessionId: filters.sessionId,
    currencyCode: filters.currency,
    enabled:
      Boolean(data) &&
      data?.view === 'executive' &&
      filters.currencyStatus === 'configured',
  });

  const emptyDashboard = useMemo(() => createEmptyHomeDashboard(), []);
  const currencyBlocked =
    filters.currencyStatus === 'missing' || filters.currencyStatus === 'error';
  // Only skeleton on the first load. Showing a full-page skeleton during
  // keepPreviousData refetches unmounts HomeDashboardPeriodSelector, which
  // remounts at annual then re-inits to the current session and thrashing
  // filters/query forever (React #185).
  const loading = !currencyBlocked && isLoading && !data;
  const isPeriodRefetching = isFetching && isPreviousData;

  const dashboardData = useMemo(() => {
    if (currencyBlocked) return emptyDashboard;
    if (!data) return data;
    if (data.view !== 'executive' || !salesTarget.ready) return data;
    return applySalesTargetToDashboard(data, salesTarget, filters.sessionId);
  }, [currencyBlocked, data, emptyDashboard, filters.sessionId, salesTarget]);
  const periodSelector = (
    <HomeDashboardPeriodSelector
      onResolvedChange={setPeriod}
      className="w-[184px] max-w-[184px]"
    />
  );

  return (
    <ConfigProvider theme={antdPageTheme}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-white">
        <header className="shrink-0 border-b border-border bg-white px-4 py-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="m-0 min-w-0 truncate text-[20px] font-semibold text-foreground">
              {dashboardData?.viewLabel ?? 'Dashboard'}
            </h1>
            <HomeDashboardFilters
              onChange={handleFiltersChange}
              period={period}
            />
          </div>
        </header>

        <div className="w-full space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6">
          {filters.currencyStatus === 'missing' ||
          filters.currencyStatus === 'error' ? (
            <CurrencySetupBanner variant={filters.currencyStatus} />
          ) : null}

          {loading ? (
            <HomeDashboardSkeleton />
          ) : !dashboardData ? (
            <DashboardMessageState
              title={
                isError
                  ? 'We could not load your dashboard'
                  : 'Your dashboard is ready for data'
              }
              description={
                isError
                  ? 'Something went wrong while fetching your metrics. Check your connection and try again.'
                  : isLeadsEnabled()
                    ? 'Once leads, deals, and pipeline activity are recorded, KPIs and charts will appear here.'
                    : `Once ${dealUiLabel({ plural: true, lowercase: true })} and pipeline activity are recorded, KPIs and charts will appear here.`
              }
              action={
                isError ? (
                  <button
                    type="button"
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-hover"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                ) : null
              }
            />
          ) : (
            <div
              className={
                isPeriodRefetching
                  ? 'pointer-events-none opacity-70 transition-opacity'
                  : undefined
              }
            >
              {dashboardData.view === 'team_leader' ||
              dashboardData.view === 'department' ? (
                <TeamLeaderHomeView
                  data={dashboardData}
                  periodSelector={periodSelector}
                  sessionId={filters.sessionId}
                />
              ) : dashboardData.view === 'team_member' ? (
                <TeamMemberHomeView
                  data={dashboardData}
                  periodSelector={periodSelector}
                  sessionId={filters.sessionId}
                />
              ) : (
                <ExecutiveHomeView
                  data={dashboardData}
                  periodSelector={periodSelector}
                  sessionId={filters.sessionId}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
