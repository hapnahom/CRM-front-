'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  LayoutDashboard,
  Target,
  UserRound,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SalesTargetingProvider,
  useSalesTargeting,
} from '@/components/sales-targeting/SalesTargetingContext';
import { TargetDefinitionSection } from '@/components/sales-targeting/TargetDefinitionSection';
import { DepartmentDistributionSection } from '@/components/sales-targeting/DepartmentDistributionSection';
import { PersonDistributionSection } from '@/components/sales-targeting/PersonDistributionSection';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import {
  TabContentSkeleton,
  ShellHeaderSkeleton,
  TARGETS_PAGE_TITLE_CLASS,
} from '@/components/sales-targeting/ui-kit';
import {
  resolveAllowedSalesTargetingTab,
  resolveSalesTargetingTabAccess,
  type SalesTargetingTab,
} from '@/components/sales-targeting/permissions';
import { PlanningDashboard } from '@/components/sales-targeting/planning/PlanningDashboard';
import { TargetOverviewDesignMock } from '@/components/sales-targeting/TargetOverviewDesignMock';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';

type ModuleTab = SalesTargetingTab;

const MAIN_TABS: {
  id: ModuleTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
  { id: 'annual', label: 'Annual Targets', icon: <Target size={14} /> },
  { id: 'sessions', label: 'Periods', icon: <CalendarRange size={14} /> },
  { id: 'persons', label: 'People', icon: <UserRound size={14} /> },
];

function isModuleTab(value: string | null): value is ModuleTab {
  return (
    value === 'overview' ||
    value === 'annual' ||
    value === 'sessions' ||
    value === 'persons'
  );
}

function wantsForecastPage(
  tabFromUrl: string | null,
  viewFromUrl: string | null,
) {
  return (
    tabFromUrl === 'forecast' ||
    tabFromUrl === 'settings' ||
    viewFromUrl === 'forecast' ||
    viewFromUrl === 'plans' ||
    viewFromUrl === 'settings'
  );
}

function SalesTargetsInner() {
  const { isLoading, plan, orgTargetSettingMethod, fiscalCalendar } =
    useSalesTargeting();

  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab') ?? null;
  const viewFromUrl = searchParams?.get('view') ?? null;
  const { tabAccess, defaultTab, canSeeAnnual, canSeeOverview } = useMemo(
    () => resolveSalesTargetingTabAccess(),
    [],
  );

  const visibleTabs = useMemo(
    () => MAIN_TABS.filter((tab) => tabAccess[tab.id]),
    [tabAccess],
  );

  const inferredTab: ModuleTab = (() => {
    if (isModuleTab(tabFromUrl)) {
      return resolveAllowedSalesTargetingTab(tabFromUrl);
    }
    // Legacy: standalone Approvals tab → Overview → Requests
    if (tabFromUrl === 'approvals') {
      return 'overview';
    }
    if (viewFromUrl === 'plan') {
      const legacy = searchParams?.get('tab');
      if (legacy === 'annual') return resolveAllowedSalesTargetingTab('annual');
      if (legacy === 'sessions') {
        return resolveAllowedSalesTargetingTab('sessions');
      }
      if (legacy === 'persons') {
        return resolveAllowedSalesTargetingTab('persons');
      }
      return resolveAllowedSalesTargetingTab('annual');
    }
    return defaultTab;
  })();

  /** Optimistic tab until the URL catches up (avoids reverting clicks via inferredTab). */
  const [pendingTab, setPendingTab] = useState<ModuleTab | null>(null);
  const activeTab = pendingTab ?? inferredTab;

  useEffect(() => {
    if (pendingTab != null && inferredTab === pendingTab) {
      setPendingTab(null);
    }
  }, [inferredTab, pendingTab]);

  useEffect(() => {
    if (!wantsForecastPage(tabFromUrl, viewFromUrl)) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('tab');
    params.delete('view');
    params.delete('planView');
    params.delete('planId');
    if (tabFromUrl === 'settings' || viewFromUrl === 'settings') {
      params.set('forecastView', 'rules');
    }
    const query = params.toString();
    router.replace(
      query
        ? `/sales-targeting/forecast?${query}`
        : '/sales-targeting/forecast',
    );
  }, [router, searchParams, tabFromUrl, viewFromUrl]);

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      try {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.delete('view');
        for (const [key, value] of Object.entries(patch)) {
          if (value == null || value === '') params.delete(key);
          else params.set(key, value);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch {
        // URL deep-link optional
      }
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!searchParams?.get('planId')) return;
    replaceParams({ planId: null });
  }, [searchParams, replaceParams]);

  useEffect(() => {
    if (isLoading) return;
    if (pendingTab != null) return;
    if (wantsForecastPage(tabFromUrl, viewFromUrl)) return;

    // Legacy approvals deep-link → overview requests sub-view
    if (tabFromUrl === 'approvals') {
      replaceParams({ tab: 'overview', planView: 'requests' });
      return;
    }

    const urlTab = isModuleTab(tabFromUrl) ? tabFromUrl : null;
    if (urlTab && tabAccess[urlTab]) return;
    if (tabFromUrl === inferredTab) return;

    replaceParams({ tab: inferredTab, planId: null });
  }, [
    isLoading,
    pendingTab,
    tabFromUrl,
    viewFromUrl,
    tabAccess,
    inferredTab,
    replaceParams,
  ]);

  const setActiveTab = useCallback(
    (tab: ModuleTab) => {
      setPendingTab(tab);
      replaceParams({
        tab,
        planId: null,
        forecastView: null,
        ...(tab === 'overview' ? {} : { planView: null }),
      });
    },
    [replaceParams],
  );

  if (isLoading || wantsForecastPage(tabFromUrl, viewFromUrl)) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
        <ShellHeaderSkeleton />
        <TabContentSkeleton
          tab={
            activeTab === 'annual'
              ? 'annual'
              : activeTab === 'sessions'
                ? 'sessions'
                : activeTab === 'persons'
                  ? 'persons'
                  : 'overview'
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
      <div className="flex-shrink-0 border-b border-border bg-surface-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className={TARGETS_PAGE_TITLE_CLASS}>Targets</h1>
            {plan && plan.targetSettingMethod !== orgTargetSettingMethod ? (
              <p className="text-[11px] text-muted-foreground">
                No target plan for the current setting method yet. Change method
                in Settings or create a plan.
              </p>
            ) : fiscalCalendar ? (
              <p className="text-[11px] text-muted-foreground md:hidden">
                {formatFiscalYearLabel(fiscalCalendar)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-1">
              {visibleTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                    activeTab === item.id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  <span
                    className={
                      activeTab === item.id
                        ? 'text-brand'
                        : 'text-muted-foreground'
                    }
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 self-center pb-1 items-center">
            <SalesTargetingCurrencyToolbar variant="inline" />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'overview' && <TargetOverviewDesignMock />}
        {activeTab === 'annual' && canSeeAnnual && <TargetDefinitionSection />}
        {activeTab === 'sessions' && tabAccess.sessions && (
          <DepartmentDistributionSection />
        )}
        {activeTab === 'persons' && tabAccess.persons && (
          <PersonDistributionSection />
        )}
      </div>
    </div>
  );
}

export function SalesTargetingShell() {
  const { defaultTab } = resolveSalesTargetingTabAccess();

  return (
    <SalesTargetingProvider>
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card">
            <ShellHeaderSkeleton />
            <TabContentSkeleton
              tab={
                defaultTab === 'annual'
                  ? 'annual'
                  : defaultTab === 'sessions'
                    ? 'sessions'
                    : defaultTab === 'persons'
                      ? 'persons'
                      : 'overview'
              }
            />
          </div>
        }
      >
        <SalesTargetsInner />
      </Suspense>
    </SalesTargetingProvider>
  );
}
