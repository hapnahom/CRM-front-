'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  notFound,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { GitBranch, Handshake, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazyNamed } from '@/utils/lazyNamed';
import { useIsClient } from '@/hooks/useIsClient';
import {
  PipelineDashboardSkeleton,
  PipelinePageContentSkeleton,
} from '@/components/loading/skeleton-screens';
import { PipelineModuleDashboardProvider } from '@/components/pipeline/PipelineModuleDashboard';
import {
  PipelineWorkspaceFiltersProvider,
  PipelineFiltersToolbar,
} from '@/modules/sales-pipeline/pipeline-filters';
import { AiPipelineInsightsEntry } from '@/modules/ai-intelligence/AiPipelineInsightsEntry';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';

const LeadsManagementPage = lazyNamed(
  () => import('@/modules/leads/LeadsManagementPage'),
  'LeadsManagementPage',
  { ssr: false, loading: () => <PipelinePageContentSkeleton /> },
);

const DealsManagementPage = lazyNamed(
  () => import('@/modules/deals/DealsManagementPage'),
  'DealsManagementPage',
  { ssr: false, loading: () => <PipelinePageContentSkeleton /> },
);

const SalesPipelineWorkspace = lazyNamed(
  () => import('@/modules/sales-pipeline/SalesPipelineWorkspace'),
  'SalesPipelineWorkspace',
  { ssr: false, loading: () => <PipelineDashboardSkeleton /> },
);

const PipelineReportButton = lazyNamed(
  () => import('@/modules/sales-pipeline/PipelineReportDialog'),
  'PipelineReportButton',
  { ssr: false, loading: () => null },
);

export type SalesHubTab = 'leads' | 'deals' | 'sales-pipeline';

const TAB_PARAM = 'tab';

function buildSalesHubTabs(): {
  id: SalesHubTab;
  label: string;
  subtitle: string;
  icon: ReactNode;
}[] {
  const tabs: {
    id: SalesHubTab;
    label: string;
    subtitle: string;
    icon: ReactNode;
  }[] = [
    {
      id: 'sales-pipeline',
      label: 'Pipeline',
      subtitle: 'Revenue funnel and team pipeline performance',
      icon: <GitBranch size={15} />,
    },
    {
      id: 'deals',
      label: dealUiLabel({ plural: true }),
      subtitle: isLeadsEnabled()
        ? 'Pipeline, forecast, and deal execution in one view'
        : 'Pipeline, forecast, and opportunity execution in one view',
      icon: <Handshake size={15} />,
    },
  ];

  if (isLeadsEnabled()) {
    tabs.push({
      id: 'leads',
      label: 'Leads',
      subtitle: 'Pipeline, scoring, and lead qualification in one view',
      icon: <Users size={15} />,
    });
  }

  return tabs;
}

function parseTabParam(value: string | null): SalesHubTab | null {
  if (value === 'deals' || value === 'sales-pipeline') {
    return value;
  }
  if (value === 'leads' && isLeadsEnabled()) {
    return value;
  }
  return null;
}

function readTabFromLocation(): SalesHubTab {
  if (typeof window === 'undefined') return 'sales-pipeline';
  return (
    parseTabParam(new URLSearchParams(window.location.search).get(TAB_PARAM)) ??
    'sales-pipeline'
  );
}

/** Reads URL search params without suspending the tab chrome. */
function SalesHubUrlSync({
  activeTab,
  onTabFromUrl,
}: {
  activeTab: SalesHubTab;
  onTabFromUrl: (tab: SalesHubTab) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isClient = useIsClient();

  const requestedTab = parseTabParam(searchParams.get(TAB_PARAM));
  const rawTab = searchParams.get(TAB_PARAM);

  useEffect(() => {
    if (!isClient) return;
    if (rawTab === 'leads' && !isLeadsEnabled()) {
      notFound();
      return;
    }
    const leadId = searchParams.get('leadId');
    if (leadId) {
      if (!isLeadsEnabled()) {
        notFound();
        return;
      }
      router.replace(`/leads/${encodeURIComponent(leadId)}`);
      return;
    }
    const dealId = searchParams.get('dealId');
    if (dealId) {
      router.replace(`/deals/${encodeURIComponent(dealId)}`);
    }
  }, [isClient, rawTab, router, searchParams]);

  useEffect(() => {
    if (!isClient) return;
    if (requestedTab && requestedTab !== activeTab) {
      onTabFromUrl(requestedTab);
    }
  }, [activeTab, isClient, onTabFromUrl, requestedTab]);

  useEffect(() => {
    if (!isClient) return;
    if (requestedTab) return;
    const fallback = 'sales-pipeline';
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(TAB_PARAM) === fallback) return;
    params.set(TAB_PARAM, fallback);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [isClient, pathname, requestedTab, router, searchParams]);

  return null;
}

function SalesHubHeaderActions({ activeTab }: { activeTab: SalesHubTab }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
      <PipelineFiltersToolbar />
      {activeTab === 'sales-pipeline' ? <PipelineReportButton /> : null}
    </div>
  );
}

function SalesHubChrome({
  accessibleTabs,
  activeTab,
  activeTabMeta,
  setActiveTab,
  children,
}: {
  accessibleTabs: ReturnType<typeof buildSalesHubTabs>;
  activeTab: SalesHubTab;
  activeTabMeta: ReturnType<typeof buildSalesHubTabs>[number];
  setActiveTab: (tab: SalesHubTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card">
      <div className="flex-shrink-0 border-b border-border bg-surface-card">
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[20px] font-semibold text-foreground">
              {activeTabMeta.label}
            </h1>
            <p className="m-0 text-[10.5px] leading-tight text-muted-foreground">
              {activeTabMeta.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <AiPipelineInsightsEntry />
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:px-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-1">
              {accessibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  <span
                    className={
                      activeTab === tab.id
                        ? 'text-brand'
                        : 'text-muted-foreground'
                    }
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shrink-0 pb-2 sm:pb-2">
            <SalesHubHeaderActions activeTab={activeTab} />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function SalesHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useIsClient();
  const accessibleTabs = useMemo(() => buildSalesHubTabs(), []);

  const [activeTab, setActiveTabState] =
    useState<SalesHubTab>(readTabFromLocation);

  const activeTabMeta = useMemo(
    () =>
      accessibleTabs.find((tab) => tab.id === activeTab) ?? accessibleTabs[0],
    [accessibleTabs, activeTab],
  );

  if (isClient && !isLeadsEnabled() && activeTab === 'leads') {
    notFound();
  }

  const setActiveTab = useCallback(
    (tab: SalesHubTab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams(window.location.search);
      params.set(TAB_PARAM, tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const syncTabFromUrl = useCallback((tab: SalesHubTab) => {
    setActiveTabState(tab);
  }, []);

  // No accessible tabs → hide the hub (do not show a permission error).
  if (isClient && accessibleTabs.length === 0) {
    return null;
  }

  const chromeProps = {
    accessibleTabs,
    activeTab,
    activeTabMeta,
    setActiveTab,
  };

  const tabContent =
    activeTab === 'leads' ? (
      <LeadsManagementPage hideHeader />
    ) : activeTab === 'deals' ? (
      <DealsManagementPage hideHeader />
    ) : (
      <SalesPipelineWorkspace hideHeader />
    );

  const body =
    activeTab === 'leads' || activeTab === 'deals' ? (
      <PipelineModuleDashboardProvider module={activeTab}>
        {tabContent}
      </PipelineModuleDashboardProvider>
    ) : (
      tabContent
    );

  return (
    <PipelineWorkspaceFiltersProvider>
      <Suspense fallback={null}>
        <SalesHubUrlSync activeTab={activeTab} onTabFromUrl={syncTabFromUrl} />
      </Suspense>
      <SalesHubChrome {...chromeProps}>{body}</SalesHubChrome>
    </PipelineWorkspaceFiltersProvider>
  );
}
