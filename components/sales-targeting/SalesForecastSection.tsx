'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, LockOpen } from 'lucide-react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import { SalesTargetingSettingsPanel } from '@/components/sales-targeting/SalesTargetingSettingsPanel';
import {
  FORECAST_CONTENT_CLASS,
  ForecastKpiGrid,
  ForecastOpportunitiesTable,
  ForecastToolbar,
  type ForecastTableRow,
  type ForecastViewMode,
} from '@/components/sales-targeting/forecastLayout';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';
import type { PipelineFilterSelection } from '@/modules/sales-pipeline/pipeline-filter';
import { usePipelineFilterTree } from '@/store/server/features/deals/pipeline/filter-tree-queries';
import {
  findUserOrgContext,
  maxScopeFilterSelection,
} from '@/modules/sales-pipeline/report/scope-filters';
import { useReportExportScope } from '@/hooks/useReportExportScope';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { isLeadsEnabled } from '@/config/salesWorkflow';
import {
  ForecastPeriodDefinition,
  ForecastPeriodStatus,
  buildFiscalMonthlyPeriods,
  calculateTargetingForecastSummary,
  defaultMonthlyPeriodId,
  findSessionForDateRange,
  formatMoneyInCurrency,
  getDefaultTargetingForecastConfig,
  mergeServerSettingsIntoForecastConfig,
  syncFiscalYearIntoDateConfig,
  TargetingForecastConfig,
} from '@/components/sales-targeting/targetingUtils';
import {
  ModuleEmptyState,
  TARGETS_PAGE_PADDING_CLASS,
  SALES_TARGETING_PAGE_CLASS,
  ForecastTabSkeleton,
} from '@/components/sales-targeting/ui-kit';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import {
  useGetSalesForecast,
  useGetSalesTargetingSettings,
  useGetWorkingForecast,
} from '@/store/server/features/salesTargeting/queries';
import { useUpsertWorkingForecast } from '@/store/server/features/salesTargeting/mutations';
import type {
  ForecastOpportunityRow,
  ForecastQueryParams,
} from '@/store/server/features/salesTargeting/types';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { canAccessForecast, canEditForecast } from '@/utils/dataScope';

function forecastScopeFromOrgFilter(filter: PipelineFilterSelection): {
  queryDepartmentId?: string;
  querySalesTeamId?: string;
  querySalespersonId?: string;
} {
  if (filter.type === 'department') {
    return { queryDepartmentId: filter.departmentId };
  }
  if (filter.type === 'team') {
    return { querySalesTeamId: filter.teamId };
  }
  if (filter.type === 'member') {
    return {
      querySalesTeamId: filter.teamId,
      querySalespersonId: filter.memberId,
    };
  }
  return {};
}

function formatDateRange(startDate: string, endDate: string) {
  return `${startDate.slice(0, 10)} — ${endDate.slice(0, 10)}`;
}

function isVisibleForecastOpportunity(
  opportunityType: string | null | undefined,
) {
  if (opportunityType === 'lead') return isLeadsEnabled();
  return opportunityType === 'deal' || opportunityType === 'custom';
}

function forecastLineKey(
  opportunityType: string | null | undefined,
  opportunityId: string | null | undefined,
) {
  return `${opportunityType ?? 'unknown'}:${opportunityId ?? ''}`;
}

function asWorkingLines(
  rows: Array<ForecastOpportunityRow | Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map((row) => ({ ...row }));
}

export function SalesForecastSection() {
  const {
    fiscalCalendar,
    sessions,
    activeCurrencyCode,
    activePlanCurrency,
    plan,
    canManageCompany,
    canManageCompanyAnnual,
    isCompanyScope,
    salesTeams,
  } = useSalesTargeting();

  const router = useRouter();
  const searchParams = useSearchParams();
  const forecastView = searchParams?.get('forecastView');
  const showRulesView = forecastView === 'rules';

  const orgScope = useReportExportScope();
  const userId = useAuthenticationStore((state) => state.userId);
  const { data: filterDepartments = [] } = usePipelineFilterTree();
  const userOrg = useMemo(
    () => findUserOrgContext(filterDepartments, userId),
    [filterDepartments, userId],
  );
  const filterInitializedRef = useRef(false);

  const forecastEnabled = canAccessForecast();

  const currencyCode = activeCurrencyCode || 'ETB';
  const currencyId = activePlanCurrency?.currencyId;
  const canManage =
    isCompanyScope || canManageCompany || canManageCompanyAnnual;
  const canEditWorkingForecast = canEditForecast() || canManage;
  const canRemoveFromForecast = canEditWorkingForecast;

  const [viewMode, setViewMode] = useState<ForecastViewMode>('annual');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedMonthId, setSelectedMonthId] = useState('');
  const [removingRowKey, setRemovingRowKey] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState<PipelineFilterSelection>({
    type: 'all',
  });

  const [config, setConfig] = useState<TargetingForecastConfig>(
    getDefaultTargetingForecastConfig(),
  );
  const [isRecalculateDialogOpen, setIsRecalculateDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [isOpenForecastDialogOpen, setIsOpenForecastDialogOpen] =
    useState(false);

  const { data: serverSettings } =
    useGetSalesTargetingSettings(forecastEnabled);
  const upsertWorking = useUpsertWorkingForecast();

  useEffect(() => {
    if (filterInitializedRef.current || !filterDepartments.length) return;
    const next = maxScopeFilterSelection(orgScope.level, {
      ...userOrg,
      memberId: userId ?? null,
    });
    setOrgFilter(next);
    filterInitializedRef.current = true;
  }, [filterDepartments, orgScope.level, userId, userOrg]);

  const { queryDepartmentId, querySalesTeamId, querySalespersonId } = useMemo(
    () => forecastScopeFromOrgFilter(orgFilter),
    [orgFilter],
  );

  const openForecastRules = useCallback(() => {
    try {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('tab');
      params.set('forecastView', 'rules');
      router.replace(`/sales-targeting/forecast?${params.toString()}`, {
        scroll: false,
      });
    } catch {
      // optional
    }
  }, [router, searchParams]);

  const closeForecastRules = useCallback(() => {
    try {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('tab');
      params.delete('forecastView');
      const query = params.toString();
      router.replace(
        query
          ? `/sales-targeting/forecast?${query}`
          : '/sales-targeting/forecast',
        { scroll: false },
      );
    } catch {
      // optional
    }
  }, [router, searchParams]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    [sessions],
  );

  useEffect(() => {
    if (!selectedSessionId && sortedSessions[0]?.id) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  }, [sortedSessions, selectedSessionId]);

  const annualPeriod: ForecastPeriodDefinition = useMemo(() => {
    if (!fiscalCalendar) {
      return {
        id: 'fy-default',
        type: 'annual',
        label: 'Annual',
        dateRangeLabel: '—',
        startDate: '',
        endDate: '',
      };
    }
    const label = formatFiscalYearLabel(fiscalCalendar);
    return {
      id: `fy-${fiscalCalendar.id}`,
      type: 'annual',
      label,
      dateRangeLabel: formatDateRange(
        fiscalCalendar.startDate,
        fiscalCalendar.endDate,
      ),
      startDate: fiscalCalendar.startDate.slice(0, 10),
      endDate: fiscalCalendar.endDate.slice(0, 10),
    };
  }, [fiscalCalendar]);

  const sessionPeriods = useMemo(
    () =>
      sortedSessions.map((session) => ({
        id: session.id,
        type: 'quarterly' as const,
        label: session.name,
        dateRangeLabel: formatDateRange(session.startDate, session.endDate),
        startDate: session.startDate.slice(0, 10),
        endDate: session.endDate.slice(0, 10),
      })),
    [sortedSessions],
  );

  const monthlyPeriods = useMemo(
    () => buildFiscalMonthlyPeriods(fiscalCalendar),
    [fiscalCalendar],
  );

  useEffect(() => {
    if (!selectedMonthId && monthlyPeriods.length > 0) {
      setSelectedMonthId(defaultMonthlyPeriodId(monthlyPeriods));
    }
  }, [monthlyPeriods, selectedMonthId]);

  const currentPeriod = useMemo(() => {
    if (viewMode === 'annual') return annualPeriod;
    if (viewMode === 'monthly') {
      return (
        monthlyPeriods.find((period) => period.id === selectedMonthId) ||
        monthlyPeriods[0] ||
        annualPeriod
      );
    }
    return (
      sessionPeriods.find((p) => p.id === selectedSessionId) ||
      sessionPeriods[0] ||
      annualPeriod
    );
  }, [
    viewMode,
    annualPeriod,
    sessionPeriods,
    monthlyPeriods,
    selectedSessionId,
    selectedMonthId,
  ]);

  const monthlySessionId = useMemo(() => {
    if (viewMode !== 'monthly') return undefined;
    return findSessionForDateRange(
      sortedSessions,
      currentPeriod.startDate,
      currentPeriod.endDate,
    );
  }, [
    viewMode,
    sortedSessions,
    currentPeriod.startDate,
    currentPeriod.endDate,
  ]);

  useEffect(() => {
    let loaded = getDefaultTargetingForecastConfig();
    loaded = mergeServerSettingsIntoForecastConfig(loaded, serverSettings);
    loaded = syncFiscalYearIntoDateConfig(loaded, fiscalCalendar);
    setConfig(loaded);
  }, [serverSettings, fiscalCalendar]);

  const { data: workingForecast, refetch: refetchWorking } =
    useGetWorkingForecast(
      {
        planId: plan?.id,
        periodKey: currentPeriod.id,
        currencyId,
        departmentId: queryDepartmentId,
        salesTeamId: querySalesTeamId,
        salespersonId: querySalespersonId,
      },
      Boolean(plan?.id && currentPeriod.id && forecastEnabled),
    );

  const snapshot = workingForecast ?? null;
  const currentStatus: ForecastPeriodStatus = snapshot?.status || 'draft';
  const isLocked = currentStatus === 'locked';

  const queryParams: ForecastQueryParams = useMemo(
    () => ({
      calendarId: fiscalCalendar?.id,
      currency: currencyCode || undefined,
      horizon: viewMode === 'annual' ? 'annual' : 'session',
      sessionId:
        viewMode === 'period'
          ? selectedSessionId
          : viewMode === 'monthly'
            ? (monthlySessionId ?? undefined)
            : undefined,
      periodStart: currentPeriod.startDate || undefined,
      periodEnd: currentPeriod.endDate || undefined,
      departmentId: queryDepartmentId,
      salesTeamId: querySalesTeamId,
      salespersonId: querySalespersonId,
    }),
    [
      fiscalCalendar?.id,
      currencyCode,
      viewMode,
      selectedSessionId,
      monthlySessionId,
      currentPeriod,
      queryDepartmentId,
      querySalesTeamId,
      querySalespersonId,
    ],
  );

  const forecastQueryEnabled =
    forecastEnabled &&
    Boolean(fiscalCalendar?.id) &&
    (viewMode !== 'monthly' || Boolean(monthlySessionId));

  const {
    data: forecastData,
    isLoading,
    isError,
    refetch: refetchForecast,
  } = useGetSalesForecast(queryParams, forecastQueryEnabled);

  const { data: leadStages = [] } = useLeadStages();
  const { data: dealStages = [] } = useDealStages();

  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>();
    leadStages.forEach((s) => map.set(s.id, s.name));
    dealStages.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [leadStages, dealStages]);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const money = useCallback(
    (amount: number) => formatMoneyInCurrency(amount, currencyCode),
    [currencyCode],
  );

  const pipelineRows = useMemo(() => {
    return (forecastData?.rows ?? []).filter((row) =>
      isVisibleForecastOpportunity(row.opportunityType),
    );
  }, [forecastData?.rows]);

  // Generated/locked forecasts use curated working lines so removals persist until recalculate.
  const activeLines = useMemo((): Array<
    ForecastOpportunityRow | Record<string, unknown>
  > => {
    if (
      snapshot?.lines &&
      Array.isArray(snapshot.lines) &&
      (currentStatus === 'generated' || currentStatus === 'locked')
    ) {
      return snapshot.lines.filter((line) =>
        isVisibleForecastOpportunity(
          (line as { opportunityType?: string }).opportunityType,
        ),
      );
    }
    return pipelineRows;
  }, [snapshot?.lines, currentStatus, pipelineRows]);

  const totalsFromLines = useMemo(() => {
    let pipelineTotal = 0;
    let customTotal = 0;
    let pipelineForecast = 0;
    let customForecast = 0;

    for (const row of activeLines) {
      const r = row as ForecastOpportunityRow;
      const oppValue = Number(r.opportunityValue) || 0;
      const forecastValue =
        Number(r.forecastValue) || Number(r.opportunityValue) || 0;
      if (r.opportunityType === 'custom') {
        customTotal += oppValue;
        customForecast += forecastValue;
      } else {
        pipelineTotal += oppValue;
        pipelineForecast += forecastValue;
      }
    }

    return {
      totalPipelineValue: pipelineTotal + customTotal,
      totalForecastValue: pipelineForecast + customForecast,
      expectedRevenue: pipelineForecast,
      customForecast,
      opportunityCount: activeLines.length,
    };
  }, [activeLines]);

  const totalPipelineValue = useMemo(() => {
    if (!isLeadsEnabled()) return totalsFromLines.totalPipelineValue;
    if (isLocked && snapshot) return Number(snapshot.totalPipelineValue) || 0;
    if (currentStatus === 'generated' && snapshot) {
      return (
        Number(snapshot.totalPipelineValue) ||
        totalsFromLines.totalPipelineValue
      );
    }
    return totalsFromLines.totalPipelineValue;
  }, [isLocked, snapshot, currentStatus, totalsFromLines.totalPipelineValue]);

  const displayedForecastValue = useMemo(() => {
    if (!isLeadsEnabled()) return totalsFromLines.totalForecastValue;
    if (isLocked && snapshot) return Number(snapshot.totalForecastValue) || 0;
    if (currentStatus === 'generated' && snapshot) {
      return (
        Number(snapshot.totalForecastValue) ||
        totalsFromLines.totalForecastValue
      );
    }
    return totalsFromLines.totalForecastValue;
  }, [isLocked, snapshot, currentStatus, totalsFromLines.totalForecastValue]);

  const displayedExpectedRevenue = useMemo(() => {
    if (!isLeadsEnabled()) return totalsFromLines.expectedRevenue;
    if (isLocked && snapshot) return Number(snapshot.expectedRevenue) || 0;
    if (currentStatus === 'generated' && snapshot) {
      return (
        Number(snapshot.expectedRevenue) || totalsFromLines.expectedRevenue
      );
    }
    return totalsFromLines.expectedRevenue;
  }, [isLocked, snapshot, currentStatus, totalsFromLines.expectedRevenue]);

  const buildWorkingPayload = (
    status: 'generated' | 'locked',
    lines: Array<ForecastOpportunityRow | Record<string, unknown>>,
  ) => {
    let pipelineTotal = 0;
    let customTotal = 0;
    let pipelineForecast = 0;
    let customForecast = 0;
    const pipelineForSummary: Array<{
      id: string;
      name: string;
      value: number;
      type: 'lead' | 'deal';
      stageId: string;
      expectedCloseDate?: string | null;
      createdAt?: string | null;
    }> = [];

    for (const row of lines) {
      const r = row as ForecastOpportunityRow;
      const oppValue = Number(r.opportunityValue) || 0;
      const forecastValue =
        Number(r.forecastValue) || Number(r.opportunityValue) || 0;
      if (r.opportunityType === 'custom') {
        customTotal += oppValue;
        customForecast += forecastValue;
      } else {
        pipelineTotal += oppValue;
        pipelineForecast += forecastValue;
        if (r.opportunityType === 'lead' || r.opportunityType === 'deal') {
          pipelineForSummary.push({
            id: String(r.opportunityId ?? ''),
            name: String(r.opportunityName ?? ''),
            value: oppValue,
            type: r.opportunityType,
            stageId: String(r.stageId ?? ''),
            expectedCloseDate: r.expectedCloseDate ?? null,
            createdAt: r.createdAt ?? null,
          });
        }
      }
    }

    const summary = calculateTargetingForecastSummary(
      pipelineForSummary,
      config,
      0,
      currencyCode,
    );

    return {
      planId: plan!.id,
      currencyId: currencyId ?? null,
      horizon:
        viewMode === 'annual' ? ('annual' as const) : ('session' as const),
      sessionId:
        viewMode === 'period'
          ? selectedSessionId
          : viewMode === 'monthly'
            ? (monthlySessionId ?? null)
            : null,
      departmentId: queryDepartmentId ?? null,
      salesTeamId: querySalesTeamId ?? null,
      salespersonId: querySalespersonId ?? null,
      periodKey: currentPeriod.id,
      periodLabel: currentPeriod.label,
      dateRangeLabel: currentPeriod.dateRangeLabel,
      periodStart: currentPeriod.startDate || null,
      periodEnd: currentPeriod.endDate || null,
      status,
      totalPipelineValue: pipelineTotal + customTotal,
      totalForecastValue: pipelineForecast + customForecast,
      expectedRevenue: pipelineForecast,
      opportunityCount: lines.length,
      methodBreakdown: {
        stage: summary.stageForecast,
        value: summary.valueForecast,
        date: summary.dateForecast,
        manual: config.manual.enabled ? customForecast : 0,
      },
      lines: asWorkingLines(lines),
    };
  };

  const handleGenerateForecast = async () => {
    if (!plan?.id) {
      NotificationMessage.error({
        message: 'Plan required',
        description: 'Create a sales target plan before generating a forecast.',
      });
      return;
    }
    try {
      await upsertWorking.mutateAsync(
        buildWorkingPayload('generated', pipelineRows),
      );
      await refetchWorking();
      NotificationMessage.success({
        message: 'Forecast Generated',
        description: `Saved forecast for ${currentPeriod.label}.`,
      });
    } catch {
      NotificationMessage.error({
        message: 'Generate Failed',
        description: 'Could not save the working forecast.',
      });
    }
  };

  const handleRecalculateForecast = async () => {
    if (!plan?.id || isRecalculating) return;
    setIsRecalculating(true);
    try {
      const { data: freshForecast } = await refetchForecast();
      const freshRows = (freshForecast?.rows ?? []).filter((row) =>
        isVisibleForecastOpportunity(row.opportunityType),
      );
      await upsertWorking.mutateAsync(
        buildWorkingPayload('generated', freshRows),
      );
      await refetchWorking();
      setIsRecalculateDialogOpen(false);
      NotificationMessage.success({
        message: 'Forecast Recalculated',
        description: `Restored live pipeline for ${currentPeriod.label}.`,
      });
    } catch (err) {
      NotificationMessage.error({
        message: 'Recalculate Failed',
        description:
          (err as { message?: string })?.message ||
          'Could not recalculate the forecast.',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleLockForecast = async () => {
    if (!plan?.id) return;
    try {
      // Preserve curated removals — lock the current working lines, not a fresh live pull.
      await upsertWorking.mutateAsync(
        buildWorkingPayload('locked', activeLines),
      );
      await refetchWorking();
      setIsLockDialogOpen(false);
      NotificationMessage.success({
        message: 'Forecast Locked',
        description: `Snapshot for ${currentPeriod.label} is locked.`,
      });
    } catch {
      NotificationMessage.error({
        message: 'Lock Failed',
        description: 'Could not lock the forecast.',
      });
    }
  };

  const handleOpenForecast = async () => {
    if (!plan?.id || !snapshot) return;
    try {
      await upsertWorking.mutateAsync({
        ...buildWorkingPayload('generated', activeLines),
        totalPipelineValue: Number(snapshot.totalPipelineValue) || 0,
        totalForecastValue: Number(snapshot.totalForecastValue) || 0,
        expectedRevenue: Number(snapshot.expectedRevenue) || 0,
        opportunityCount: snapshot.opportunityCount,
        methodBreakdown: snapshot.methodBreakdown,
        lines: snapshot.lines,
      });
      await refetchWorking();
      setIsOpenForecastDialogOpen(false);
      NotificationMessage.success({
        message: 'Forecast Opened',
        description: `Forecast for ${currentPeriod.label} is editable again.`,
      });
    } catch {
      NotificationMessage.error({
        message: 'Open Failed',
        description: 'Could not unlock the forecast.',
      });
    }
  };

  const handleRemoveOpportunity = async (row: ForecastTableRow) => {
    if (!plan?.id) {
      NotificationMessage.error({
        message: 'Plan required',
        description: 'Create a sales target plan before editing the forecast.',
      });
      return;
    }
    if (isLocked) {
      NotificationMessage.error({
        message: 'Forecast locked',
        description: 'Open the forecast before removing opportunities.',
      });
      return;
    }
    if (!canRemoveFromForecast) return;

    const nextLines = activeLines.filter((line) => {
      const r = line as ForecastOpportunityRow;
      return forecastLineKey(r.opportunityType, r.opportunityId) !== row.rowKey;
    });

    setRemovingRowKey(row.rowKey);
    try {
      await upsertWorking.mutateAsync(
        buildWorkingPayload('generated', nextLines),
      );
      await refetchWorking();
      NotificationMessage.success({
        message: 'Opportunity removed',
        description:
          'Removed from this forecast. Recalculate to restore the live pipeline.',
      });
    } catch (err) {
      NotificationMessage.error({
        message: 'Remove failed',
        description:
          (err as { message?: string })?.message ||
          'Could not remove the opportunity from the forecast.',
      });
    } finally {
      setRemovingRowKey(null);
    }
  };

  const tableRows: ForecastTableRow[] = useMemo(() => {
    return activeLines.map((row) => {
      const r = row as ForecastOpportunityRow;
      const opportunityType = String(r.opportunityType ?? '');
      const isCustom = opportunityType === 'custom';
      const opportunityId = String(r.opportunityId ?? '');
      return {
        id: opportunityId,
        rowKey: forecastLineKey(opportunityType, opportunityId),
        opportunityType,
        name: String(r.opportunityName ?? ''),
        isCustom,
        definition: isCustom ? 'Custom' : null,
        customerName: String(r.customerName || '—'),
        ownerName: String(r.ownerName || '—'),
        teamName: String(
          r.department ||
            (r.salesTeamId ? teamNameMap.get(String(r.salesTeamId)) : null) ||
            '—',
        ),
        stageName: String(
          r.stageName ||
            stageNameMap.get(String(r.stageId ?? '')) ||
            (isCustom ? 'Custom' : '—'),
        ),
        opportunityValue: Number(r.opportunityValue) || 0,
        forecastValue:
          Number(r.forecastValue) || Number(r.opportunityValue) || 0,
        expectedCloseDate: (r.expectedCloseDate as string | null) ?? null,
        isEligible: true,
        solutions: r.solutions?.map((solution) => ({
          name: solution.name,
          amount: solution.amount,
          assigneeNames: solution.assigneeNames,
        })),
      };
    });
  }, [activeLines, stageNameMap, teamNameMap]);

  const displayedOpportunityCount = useMemo(() => {
    if (
      (currentStatus === 'generated' || currentStatus === 'locked') &&
      snapshot
    ) {
      return snapshot.opportunityCount ?? tableRows.length;
    }
    return tableRows.length;
  }, [currentStatus, snapshot, tableRows]);

  const showRemoveActions =
    canRemoveFromForecast && !isLocked && Boolean(plan?.id);

  if (showRulesView) {
    return (
      <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
        <SalesTargetingSettingsPanel
          panelMode="forecast"
          onBack={closeForecastRules}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
        <ForecastTabSkeleton />
      </div>
    );
  }

  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <div className="flex-shrink-0 border-b border-border px-4 py-2 md:hidden">
        <SalesTargetingCurrencyToolbar />
      </div>

      <ForecastToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        periodOptions={sessionPeriods.map((p) => ({
          id: p.id,
          label: p.label,
        }))}
        selectedPeriodId={selectedSessionId}
        onPeriodChange={setSelectedSessionId}
        monthOptions={monthlyPeriods.map((period) => ({
          id: period.id,
          label: period.label,
        }))}
        selectedMonthId={selectedMonthId}
        onMonthChange={setSelectedMonthId}
        orgFilter={orgFilter}
        onOrgFilterChange={setOrgFilter}
        status={currentStatus}
        onGenerate={() => void handleGenerateForecast()}
        onRecalculate={() => setIsRecalculateDialogOpen(true)}
        onLock={() => setIsLockDialogOpen(true)}
        onOpenForecast={() => setIsOpenForecastDialogOpen(true)}
        onOpenRules={openForecastRules}
        canManage={canEditWorkingForecast}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            FORECAST_CONTENT_CLASS,
            TARGETS_PAGE_PADDING_CLASS,
            'space-y-4',
          )}
        >
          <ForecastKpiGrid
            currencyCode={currencyCode}
            totalPipelineValue={totalPipelineValue}
            forecastValue={displayedForecastValue}
            expectedRevenue={displayedExpectedRevenue}
            opportunityCount={displayedOpportunityCount}
          />

          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {viewMode === 'annual' ? 'FY range:' : 'Date range:'}
            </span>{' '}
            {currentPeriod.dateRangeLabel}
          </p>

          {isError ? (
            <ModuleEmptyState
              title="Unable to load sales forecast"
              description="Check your connection and permissions, then refresh."
            />
          ) : (
            <ForecastOpportunitiesTable
              currencyCode={currencyCode}
              rows={tableRows}
              canRemove={showRemoveActions}
              removingRowKey={removingRowKey}
              onRemove={(row) => void handleRemoveOpportunity(row)}
            />
          )}
        </div>
      </div>

      <Dialog
        open={isRecalculateDialogOpen}
        onOpenChange={(open) => {
          if (isRecalculating) return;
          setIsRecalculateDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Refresh from pipeline?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rebuild the forecast for <strong>{currentPeriod.label}</strong>{' '}
              from the live pipeline and forecast rules. Manually removed
              opportunities will be restored if they still match inclusion
              rules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRecalculating}
              onClick={() => setIsRecalculateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-brand text-white hover:bg-brand-hover"
              disabled={isRecalculating}
              onClick={() => void handleRecalculateForecast()}
            >
              {isRecalculating ? 'Refreshing…' : 'Refresh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="size-4 text-brand" />
              Lock forecast?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Once locked, the forecast for{' '}
              <strong>{currentPeriod.label}</strong> (
              {money(displayedForecastValue)}) cannot be changed until opened
              again. It will be used for target planning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLockDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1 bg-brand text-white hover:bg-brand-hover"
              onClick={() => void handleLockForecast()}
            >
              <Lock className="size-3.5" />
              Lock forecast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOpenForecastDialogOpen}
        onOpenChange={setIsOpenForecastDialogOpen}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <LockOpen className="size-4 text-brand" />
              Unlock for editing?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Unlocking allows removing opportunities and refreshing from the
              pipeline. The locked snapshot will no longer be treated as final.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpenForecastDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-brand text-white hover:bg-brand-hover"
              onClick={() => void handleOpenForecast()}
            >
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
