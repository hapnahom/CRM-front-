'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarRange, Clock, LineChart, Target, TrendingUp, Users } from 'lucide-react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import {
  useGetPlanningDashboard,
  useGetPlanningEligibility,
  useGetPlanningHierarchy,
  useGetTargetApprovalWorkspaceAccess,
} from '@/store/server/features/salesTargeting/queries';
import {
  SALES_TARGETING_PAGE_CLASS,
  SummaryKpiCard,
  TARGETS_CARD_CLASS,
  TARGETS_PAGE_PADDING_CLASS,
  TabContentSkeleton,
  OrgExplorerSkeleton,
} from '@/components/sales-targeting/ui-kit';
import { TargetOverviewDesignMock } from '@/components/sales-targeting/TargetOverviewDesignMock';
import {
  isBottomToTopMethod,
  isHybridMethod,
  isRequestWorkflowMethod,
  isTopToBottomMethod,
  planUsesTargetRequestWorkflow,
  usesAllocationWorkbench,
} from '@/components/sales-targeting/targetSettingMethod';
import { TopDownAllocationWorkbench } from '@/components/sales-targeting/planning/TopDownAllocationWorkbench';
import { ReconciliationWorkbench } from '@/components/sales-targeting/planning/ReconciliationWorkbench';
import { PlanningProposalsPanel } from '@/components/sales-targeting/planning/PlanningProposalsPanel';
import { PlanningPrerequisitesModal } from '@/components/sales-targeting/planning/PlanningPrerequisitesModal';
import { PlanningPhaseControl } from '@/components/sales-targeting/planning/PlanningPhaseControl';
import { PlanningDeferredAttention } from '@/components/sales-targeting/planning/PlanningDeferredAttention';
import { PlanningMyScopePanel } from '@/components/sales-targeting/planning/PlanningMyScopePanel';
import { PlanningOrgExplorer } from '@/components/sales-targeting/planning/PlanningOrgExplorer';
import { PlanningWorkbenchHeader } from '@/components/sales-targeting/planning/PlanningWorkbenchHeader';
import {
  PlanningHorizonCard,
  type HorizonCardAction,
} from '@/components/sales-targeting/planning/PlanningHorizonCard';
import {
  PlanningPeriodSelector,
  PlanningSegmentedControl,
} from '@/components/sales-targeting/planning/PlanningPeriodSelector';
import {
  buildHorizonSummary,
  describeTargetSettingMethod,
} from '@/components/sales-targeting/planning/overviewHorizonSummary';
import {
  formatOverviewDateRange,
  sortSessionsByStart,
} from '@/components/sales-targeting/planning/overviewScopeUtils';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { formatTargetSettingMethod } from '@/components/sales-targeting/targetSettingMethod';
import { Badge } from '@/components/ui/badge';
import type { PlanningSubView } from '@/components/sales-targeting/planning/planningTypes';
import {
  canEditCompanyTargets,
  canEditDepartmentTargets,
  canAccessForecast,
  resolveTargetDataScope,
} from '@/utils/dataScope';
import {
  findHierarchyNode,
  findPersonNodeForUser,
} from '@/components/sales-targeting/planning/planningHierarchyUtils';
import { cn } from '@/lib/utils';
import { useOrgFiscalSettings } from '@/providers/OrgFiscalSettingsProvider';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';

export type { PlanningSubView };

function isWorkbenchView(
  view: PlanningSubView,
): view is Exclude<PlanningSubView, 'overview'> {
  return view !== 'overview';
}

export function PlanningDashboard() {
  const {
    plan,
    selectedPlanId,
    activePlanCurrency,
    activeCurrencyCode,
    orgTargetSettingMethod,
    salesTeams,
    myTeamSalesTeamId,
    planCurrencies,
    sessions,
    fiscalCalendar,
    setActiveCurrencyId,
  } = useSalesTargeting();
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = selectedPlanId ?? plan?.id;
  const currencyId =
    activePlanCurrency?.currencyId ??
    planCurrencies[0]?.currencyId ??
    activeCurrencyCode ??
    'ETB';
  const scopeParams = useMemo(
    () => ({
      currencyId: currencyId ?? '',
      horizon: 'annual' as const,
      sessionId: null as string | null,
    }),
    [currencyId],
  );

  const targetScope = useMemo(() => resolveTargetDataScope(), []);

  const usesRequestWorkflow = isRequestWorkflowMethod(orgTargetSettingMethod);
  const planSupportsRequestWorkflow = planUsesTargetRequestWorkflow(
    plan,
    orgTargetSettingMethod,
  );
  const needsWorkspaceAccess = Boolean(
    planId &&
      (targetScope.level === 'team' ||
        targetScope.level === 'department' ||
        (usesRequestWorkflow && planSupportsRequestWorkflow)),
  );
  const currentUserId = useAuthenticationStore((state) => state.userId);

  const { data: approvalWorkspaceAccess } = useGetTargetApprovalWorkspaceAccess(
    planId,
    needsWorkspaceAccess,
  );

  const leadTeamIds = useMemo(() => {
    if (!currentUserId) return myTeamSalesTeamId ? [myTeamSalesTeamId] : [];
    const fromTeams = salesTeams
      .filter((team) => team.teamLeadId === currentUserId)
      .map((team) => team.id);
    if (fromTeams.length) return fromTeams;
    return myTeamSalesTeamId ? [myTeamSalesTeamId] : [];
  }, [salesTeams, currentUserId, myTeamSalesTeamId]);

  const showProposalsWorkbench =
    usesRequestWorkflow && planSupportsRequestWorkflow;

  const showApproverInbox =
    showProposalsWorkbench &&
    (approvalWorkspaceAccess?.showApprovalsTab ?? false);

  const planMethod = plan?.targetSettingMethod ?? orgTargetSettingMethod;
  const usesMemberProposals =
    isBottomToTopMethod(planMethod) || isHybridMethod(planMethod);
  const showAllocateWorkbench = usesAllocationWorkbench(planMethod);
  const showAllocateAction =
    showAllocateWorkbench &&
    (canEditCompanyTargets() || canEditDepartmentTargets());
  const allocateAttentionDescription =
    'Distribute company targets to departments';
  const showReconcileWorkbench =
    isHybridMethod(planMethod) &&
    (canEditCompanyTargets() ||
      AccessGuard.checkAccess({
        permissions: [PERMISSIONS.RECONCILE_TARGETS],
      }));
  const canViewFullOrg = targetScope.level === 'company';

  const planViewFromUrl = searchParams?.get('planView');
  const activeView: PlanningSubView =
    planViewFromUrl === 'org' && canViewFullOrg
      ? 'org'
      : showProposalsWorkbench && planViewFromUrl === 'requests'
        ? 'requests'
        : showAllocateAction && planViewFromUrl === 'allocate'
          ? 'allocate'
          : showReconcileWorkbench && planViewFromUrl === 'reconcile'
            ? 'reconcile'
            : 'overview';

  const isOverviewMode = activeView === 'overview';

  const setActiveView = useCallback(
    (
      view: PlanningSubView,
      allocateScope?: {
        horizon: 'annual' | 'session';
        sessionId: string | null;
      },
    ) => {
      try {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('tab', 'overview');
        if (isWorkbenchView(view)) {
          params.set('planView', view);
        } else {
          params.delete('planView');
        }
        if (view === 'allocate') {
          const horizon = allocateScope?.horizon ?? 'annual';
          if (horizon === 'session' && allocateScope?.sessionId) {
            params.set('allocateHorizon', 'session');
            params.set('sessionId', allocateScope.sessionId);
          } else {
            params.set('allocateHorizon', 'annual');
            params.delete('sessionId');
          }
        } else {
          params.delete('allocateHorizon');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch {
        // URL sync optional
      }
    },
    [router, searchParams],
  );

  const selectPlanCurrencyByTenantId = useCallback(
    (tenantCurrencyId: string) => {
      const match = planCurrencies.find(
        (entry) => entry.currencyId === tenantCurrencyId,
      );
      if (match) setActiveCurrencyId(match.id);
    },
    [planCurrencies, setActiveCurrencyId],
  );

  const navigateToAnnual = useCallback(
    (tenantCurrencyId: string) => {
      selectPlanCurrencyByTenantId(tenantCurrencyId);
      try {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('tab', 'annual');
        params.delete('planView');
        params.delete('allocateHorizon');
        params.delete('sessionId');
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch {
        // URL sync optional
      }
    },
    [router, searchParams, selectPlanCurrencyByTenantId],
  );

  const navigateToPeriod = useCallback(
    (tenantCurrencyId: string, sessionId: string) => {
      selectPlanCurrencyByTenantId(tenantCurrencyId);
      try {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('tab', 'sessions');
        params.set('sessionId', sessionId);
        params.delete('planView');
        params.delete('allocateHorizon');
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch {
        // URL sync optional
      }
    },
    [router, searchParams, selectPlanCurrencyByTenantId],
  );

  useEffect(() => {
    if (planViewFromUrl === 'requests' && !showProposalsWorkbench) {
      setActiveView('overview');
    }
    if (planViewFromUrl === 'allocate' && !showAllocateAction) {
      setActiveView('overview');
    }
    if (planViewFromUrl === 'reconcile' && !showReconcileWorkbench) {
      setActiveView('overview');
    }
    if (planViewFromUrl === 'org' && !canViewFullOrg) {
      setActiveView('overview');
    }
  }, [
    planViewFromUrl,
    showProposalsWorkbench,
    showAllocateAction,
    showReconcileWorkbench,
    canViewFullOrg,
    setActiveView,
  ]);

  const enabled = Boolean(planId && currencyId);
  const { data: dashboard, isLoading: dashboardLoading } =
    useGetPlanningDashboard(planId, scopeParams, enabled);
  const needsHierarchy =
    isOverviewMode ||
    activeView === 'org' ||
    (activeView === 'requests' && showProposalsWorkbench);
  const { data: hierarchy, isLoading: hierarchyLoading } =
    useGetPlanningHierarchy(planId, scopeParams, enabled && needsHierarchy);
  const { data: eligibility } = useGetPlanningEligibility(
    planId,
    scopeParams,
    enabled && isOverviewMode,
  );

  // ── Selected period (quarter) — the overview shows Annual + one period ──
  const sortedSessions = useMemo(
    () => sortSessionsByStart(sessions),
    [sessions],
  );
  const { activeSessionId: settingsActiveSessionId } = useOrgFiscalSettings();
  const [sessionChoice, setSessionChoice] = useState<string | null>(null);
  const defaultSessionId = useMemo(() => {
    if (
      settingsActiveSessionId &&
      sortedSessions.some((session) => session.id === settingsActiveSessionId)
    ) {
      return settingsActiveSessionId;
    }
    const now = Date.now();
    const current = sortedSessions.find(
      (session) =>
        now >= new Date(session.startDate).getTime() &&
        now <= new Date(session.endDate).getTime(),
    );
    return (current ?? sortedSessions[0])?.id ?? null;
  }, [sortedSessions, settingsActiveSessionId]);
  const selectedSessionId =
    sessionChoice && sortedSessions.some((s) => s.id === sessionChoice)
      ? sessionChoice
      : defaultSessionId;
  const selectedSession =
    sortedSessions.find((session) => session.id === selectedSessionId) ?? null;

  const sessionScopeParams = useMemo(
    () => ({
      currencyId: currencyId ?? '',
      horizon: 'session' as const,
      sessionId: selectedSessionId,
    }),
    [currencyId, selectedSessionId],
  );
  const sessionEnabled =
    enabled && isOverviewMode && Boolean(selectedSessionId);

  const [scopeHorizon, setScopeHorizon] = useState<'annual' | 'period'>(
    'annual',
  );
  const scopeShowsPeriod =
    scopeHorizon === 'period' && Boolean(selectedSession);
  const allocationMethod = usesAllocationWorkbench(planMethod);

  const {
    data: sessionDashboard,
    isLoading: sessionDashboardLoading,
    isError: sessionDashboardError,
    refetch: refetchSessionDashboard,
  } = useGetPlanningDashboard(planId, sessionScopeParams, sessionEnabled);
  const { data: sessionHierarchy, isLoading: sessionHierarchyLoading } =
    useGetPlanningHierarchy(
      planId,
      sessionScopeParams,
      sessionEnabled && (allocationMethod || scopeShowsPeriod),
    );
  const { data: sessionEligibility } = useGetPlanningEligibility(
    planId,
    sessionScopeParams,
    sessionEnabled,
  );

  const [prerequisitesHorizon, setPrerequisitesHorizon] = useState<
    'annual' | 'period' | null
  >(null);

  const ownPersonNode = useMemo(() => {
    if (!hierarchy?.root || !currentUserId) return null;
    return findPersonNodeForUser(hierarchy.root, currentUserId);
  }, [hierarchy?.root, currentUserId]);

  const annualBlockedCount = useMemo(() => {
    if (eligibility) {
      return eligibility.entities.filter((row) => !row.eligible).length;
    }
    return dashboard?.completionSummary.blockedEntities ?? 0;
  }, [eligibility, dashboard?.completionSummary.blockedEntities]);

  const periodBlockedCount = useMemo(() => {
    if (sessionEligibility) {
      return sessionEligibility.entities.filter((row) => !row.eligible).length;
    }
    return sessionDashboard?.completionSummary.blockedEntities ?? 0;
  }, [sessionEligibility, sessionDashboard?.completionSummary.blockedEntities]);

  const memberParentRequestId = useMemo(() => {
    if (
      ownPersonNode?.scopeLevel !== 'person' ||
      !ownPersonNode.parentScopeId ||
      !hierarchy?.root
    ) {
      return null;
    }
    const teamNode = findHierarchyNode(
      hierarchy.root,
      'team',
      ownPersonNode.parentScopeId,
    );
    return teamNode?.requestId ?? null;
  }, [ownPersonNode, hierarchy?.root]);

  const workbenchOptions = useMemo(() => {
    const options: Array<{
      id: Exclude<PlanningSubView, 'overview'>;
      label: string;
    }> = [];
    if (showProposalsWorkbench) {
      options.push({ id: 'requests', label: 'Proposals' });
    }
    if (showAllocateWorkbench) {
      options.push({ id: 'allocate', label: 'Allocate' });
    }
    if (showReconcileWorkbench) {
      options.push({ id: 'reconcile', label: 'Reconcile' });
    }
    return options;
  }, [showProposalsWorkbench, showAllocateWorkbench, showReconcileWorkbench]);

  if (!planId || !currencyId) {
    return <TargetOverviewDesignMock />;
  }

  if (dashboardLoading || !dashboard) {
    if (dashboardLoading) {
      return <TabContentSkeleton tab="overview" />;
    }
    return <TargetOverviewDesignMock />;
  }

  const methodLabel = formatTargetSettingMethod(planMethod);
  const planTitle =
    dashboard.planName
      ?.trim()
      .replace(new RegExp(`\\s*\\(${methodLabel}\\)\\s*$`, 'i'), '') ||
    dashboard.planName;

  const annualSummary = buildHorizonSummary({
    method: planMethod,
    dashboard,
    root: hierarchy?.root,
    currencyCode: activeCurrencyCode,
  });
  const periodSummary = sessionDashboard
    ? buildHorizonSummary({
        method: planMethod,
        dashboard: sessionDashboard,
        root: sessionHierarchy?.root,
        currencyCode: activeCurrencyCode,
      })
    : null;

  const buildHorizonActions = (
    horizon: 'annual' | 'session',
    sessionId: string | null,
  ): HorizonCardAction[] => {
    const isAnnual = horizon === 'annual';
    const actions: HorizonCardAction[] = [];
    if (showAllocateAction && isAnnual) {
      actions.push({
        id: 'allocate',
        label: 'Allocate',
        onClick: () => setActiveView('allocate', { horizon, sessionId }),
      });
    }
    if (isAnnual && showReconcileWorkbench) {
      actions.push({
        id: 'reconcile',
        label: 'Reconcile',
        onClick: () => setActiveView('reconcile'),
      });
    }
    if (canAccessForecast()) {
      actions.push({
        id: 'forecast',
        label: 'View Forecast',
        onClick: () => router.push('/sales-targeting/forecast'),
      });
    }
    return actions;
  };

  const scopeRoot = scopeShowsPeriod ? sessionHierarchy?.root : hierarchy?.root;
  const scopeLoading = scopeShowsPeriod
    ? sessionHierarchyLoading || !sessionHierarchy?.root
    : hierarchyLoading || !hierarchy?.root;

  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      {!isOverviewMode ? (
        <PlanningWorkbenchHeader
          options={workbenchOptions.filter(
            (option) => option.id === activeView,
          )}
          activeView={activeView}
          onBack={() => setActiveView('overview')}
          onChangeView={(view) => setActiveView(view)}
          allocateDescription={allocateAttentionDescription}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isOverviewMode ? (
          <div
            className={cn(
              TARGETS_PAGE_PADDING_CLASS,
              'w-full space-y-5 bg-white pb-8 sm:px-6 sm:py-6',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
                    {planTitle}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full border-brand/30 bg-brand/5 px-2.5 py-0.5 text-[11px] font-medium text-brand"
                  >
                    {formatTargetSettingMethod(planMethod)}
                  </Badge>
                </div>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                  {describeTargetSettingMethod(planMethod)}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] font-medium text-muted-foreground">
                  <span>{formatFiscalYearLabel(fiscalCalendar)}</span>
                  <span aria-hidden>·</span>
                  <span>{activeCurrencyCode}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <SalesTargetingCurrencyToolbar
                  variant="inline"
                  showModuleContext={false}
                />
                {sortedSessions.length > 1 ? (
                  <PlanningPeriodSelector
                    sessions={sortedSessions}
                    value={selectedSessionId}
                    onChange={setSessionChoice}
                  />
                ) : null}
                <PlanningPhaseControl
                  planId={planId}
                  planningPhase={dashboard.planningPhase}
                  allowedTransitions={dashboard.allowedPhaseTransitions}
                  planStatus={dashboard.planStatus}
                  canManage={canEditCompanyTargets()}
                />
              </div>
            </div>

            {/* ── KPI summary cards ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryKpiCard
                label="Official target"
                value={
                  (dashboard.metrics.officialTarget ?? dashboard.metrics.strategicTarget) != null
                    ? formatCompactMoney(
                        (dashboard.metrics.officialTarget ?? dashboard.metrics.strategicTarget)!,
                        activeCurrencyCode,
                      )
                    : '—'
                }
                hint={`${dashboard.completionSummary.teamsApproved}/${dashboard.completionSummary.totalTeams} teams approved`}
                icon={<Target size={16} />}
              />
              <SummaryKpiCard
                label={usesRequestWorkflow ? 'Proposed' : 'Forecast'}
                value={
                  usesRequestWorkflow
                    ? (dashboard.metrics.proposedTarget != null
                        ? formatCompactMoney(dashboard.metrics.proposedTarget, activeCurrencyCode)
                        : '—')
                    : (dashboard.metrics.currentForecast != null
                        ? formatCompactMoney(dashboard.metrics.currentForecast, activeCurrencyCode)
                        : '—')
                }
                hint={
                  usesRequestWorkflow
                    ? `${dashboard.completionSummary.teamsWithProposal}/${dashboard.completionSummary.totalTeams} teams proposed`
                    : 'Click to view pipeline forecast'
                }
                icon={<Users size={16} />}
                onClick={
                  !usesRequestWorkflow && canAccessForecast()
                    ? () => router.push('/sales-targeting/forecast')
                    : undefined
                }
              />
              <SummaryKpiCard
                label="Planning progress"
                value={`${Math.round(dashboard.completionSummary.completionPercent)}%`}
                hint={dashboard.completionSummary.bottleneckLabel ?? 'On track'}
                icon={<TrendingUp size={16} />}
              />
              <SummaryKpiCard
                label="Pending approvals"
                value={String(dashboard.completionSummary.membersPending)}
                hint={`${dashboard.completionSummary.membersWithProposal}/${dashboard.completionSummary.membersTotal} member proposals`}
                icon={<Clock size={16} />}
              />
            </div>

            <PlanningDeferredAttention
              showProposalsWorkbench={showProposalsWorkbench}
              showApproverInbox={showApproverInbox}
              showReconcileWorkbench={showReconcileWorkbench}
              ownPersonNode={ownPersonNode}
              hybridGap={dashboard.metrics.gap}
              currencyCode={activeCurrencyCode}
              onOpenWorkbench={(view) => setActiveView(view)}
            />

            {canAccessForecast() ? (
              <button
                type="button"
                onClick={() => router.push('/sales-targeting/forecast')}
                className={cn(
                  TARGETS_CARD_CLASS,
                  'flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:border-brand/40',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <LineChart size={16} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Forecast
                    </span>
                    <span className="block text-[15px] font-semibold text-foreground">
                      View pipeline forecast
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                      Opportunities, forecast value, and forecast rules for{' '}
                      {formatFiscalYearLabel(fiscalCalendar)}.
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-right sm:block">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Annual forecast
                    </span>
                    <span className="block text-[18px] font-semibold tabular-nums text-foreground">
                      {dashboard.metrics.currentForecast == null
                        ? '—'
                        : formatCompactMoney(
                            dashboard.metrics.currentForecast,
                            activeCurrencyCode,
                          )}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-muted-foreground"
                    aria-hidden
                  />
                </span>
              </button>
            ) : null}

            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <PlanningHorizonCard
                variant="annual"
                eyebrow="Annual"
                title={formatFiscalYearLabel(fiscalCalendar)}
                subtitle="Full-year target"
                summary={annualSummary}
                loading={allocationMethod && hierarchyLoading}
                blockedCount={annualBlockedCount}
                onViewBlocked={() => setPrerequisitesHorizon('annual')}
                actions={buildHorizonActions('annual', null)}
                openLabel="View annual targets"
                onOpen={() => navigateToAnnual(currencyId)}
              />

              {selectedSession ? (
                <PlanningHorizonCard
                  variant="period"
                  eyebrow="Period"
                  title={selectedSession.name}
                  subtitle={formatOverviewDateRange(
                    selectedSession.startDate,
                    selectedSession.endDate,
                  )}
                  headerExtra={
                    sortedSessions.length > 1 ? (
                      <PlanningPeriodSelector
                        sessions={sortedSessions}
                        value={selectedSessionId}
                        onChange={setSessionChoice}
                      />
                    ) : null
                  }
                  summary={periodSummary}
                  loading={
                    sessionDashboardLoading ||
                    (allocationMethod && sessionHierarchyLoading)
                  }
                  error={sessionDashboardError}
                  onRetry={() => void refetchSessionDashboard()}
                  blockedCount={periodBlockedCount}
                  onViewBlocked={() => setPrerequisitesHorizon('period')}
                  actions={buildHorizonActions('session', selectedSession.id)}
                  openLabel="View period targets"
                  onOpen={() =>
                    navigateToPeriod(currencyId, selectedSession.id)
                  }
                />
              ) : (
                <section
                  className={cn(
                    TARGETS_CARD_CLASS,
                    'flex flex-col items-center justify-center gap-2 border-dashed px-6 py-12 text-center',
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-elevated text-muted-foreground">
                    <CalendarRange size={18} aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    No fiscal periods yet
                  </p>
                  <p className="max-w-xs text-[12px] text-muted-foreground">
                    Add periods to the fiscal calendar to plan targets by
                    quarter. Only the annual target is shown for now.
                  </p>
                </section>
              )}
            </div>

            <PlanningMyScopePanel
              scopeLevel={targetScope.level}
              root={scopeRoot}
              currencyCode={activeCurrencyCode}
              currentUserId={currentUserId}
              ownPersonNode={ownPersonNode}
              managedTeamIds={approvalWorkspaceAccess?.managedTeamIds ?? []}
              leadTeamIds={leadTeamIds}
              managedDepartmentIds={
                approvalWorkspaceAccess?.managedDepartmentIds ?? []
              }
              eligibility={scopeShowsPeriod ? sessionEligibility : eligibility}
              method={planMethod}
              showProposalsAction={showProposalsWorkbench}
              onOpenProposals={() => setActiveView('requests')}
              onViewFullOrg={
                canViewFullOrg ? () => setActiveView('org') : undefined
              }
              loading={scopeLoading}
              headerAction={
                selectedSession ? (
                  <PlanningSegmentedControl
                    ariaLabel="Planning scope horizon"
                    value={scopeShowsPeriod ? 'period' : 'annual'}
                    onChange={(id) =>
                      setScopeHorizon(id === 'period' ? 'period' : 'annual')
                    }
                    options={[
                      { id: 'annual', label: 'Annual' },
                      { id: 'period', label: selectedSession.name },
                    ]}
                  />
                ) : undefined
              }
            />
          </div>
        ) : (
          <div
            className={cn(
              TARGETS_PAGE_PADDING_CLASS,
              'flex min-h-0 flex-col pb-6 pt-4',
            )}
          >
            {activeView === 'requests' && showProposalsWorkbench ? (
              <PlanningProposalsPanel
                showApproverInbox={showApproverInbox}
                ownPersonNode={ownPersonNode}
                usesMemberProposals={usesMemberProposals}
                planId={planId}
                currencyId={currencyId}
                currencyCode={activeCurrencyCode}
                memberParentRequestId={memberParentRequestId}
              />
            ) : activeView === 'allocate' && showAllocateWorkbench ? (
              <div
                className={cn(
                  TARGETS_CARD_CLASS,
                  'flex min-h-[480px] flex-col p-4',
                )}
              >
                {isTopToBottomMethod(planMethod) ? (
                  <TopDownAllocationWorkbench />
                ) : null}
              </div>
            ) : activeView === 'reconcile' && showReconcileWorkbench ? (
              <div
                className={cn(
                  TARGETS_CARD_CLASS,
                  'flex min-h-[480px] flex-col p-4',
                )}
              >
                <ReconciliationWorkbench
                  planId={planId}
                  currencyId={currencyId}
                  currencyCode={activeCurrencyCode}
                />
              </div>
            ) : activeView === 'org' && canViewFullOrg ? (
              hierarchy?.root ? (
                <PlanningOrgExplorer
                  root={hierarchy.root}
                  currencyCode={activeCurrencyCode}
                  method={planMethod}
                  showProposalsAction={showProposalsWorkbench}
                  onOpenProposals={() => setActiveView('requests')}
                />
              ) : (
                <OrgExplorerSkeleton />
              )
            ) : null}
          </div>
        )}
      </div>

      <PlanningPrerequisitesModal
        open={prerequisitesHorizon != null}
        onOpenChange={(open) => {
          if (!open) setPrerequisitesHorizon(null);
        }}
        eligibility={
          prerequisitesHorizon === 'period' ? sessionEligibility : eligibility
        }
        horizonLabel={
          prerequisitesHorizon === 'period'
            ? (selectedSession?.name ?? 'Period')
            : 'Annual'
        }
        onOpenWorkbench={(view) => setActiveView(view)}
      />
    </div>
  );
}
