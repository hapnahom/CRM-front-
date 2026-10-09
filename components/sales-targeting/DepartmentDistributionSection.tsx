'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { alignedOpportunitiesFootnote } from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import {
  bottomUpStartsFromTeamsDescription,
  isBottomToTopMethod,
  isDownstreamDetailsReadOnly,
  isHybridMethod,
  isRequestWorkflowMethod,
  isTopToBottomMethod,
  WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL,
} from '@/components/sales-targeting/targetSettingMethod';
import {
  TargetAmountField,
  draftCustomCommitLines,
  draftCustomCreateExtras,
  draftCustomTotalAmount,
  type TargetSelectionSavePayload,
} from '@/components/sales-targeting/shared';
import {
  useCreateCustomForecast,
  useCreateTargetRequest,
  useReviseTargetRequest,
  useSubmitTargetRequest,
  useUpsertStrategicTarget,
} from '@/store/server/features/salesTargeting/mutations';
import type { SalesTargetOpportunityType } from '@/store/server/features/salesTargeting/types';
import {
  DepartmentTargetPanel,
  DepartmentTargetTile,
  PeriodTargetsBar,
  ScopeTargetCard,
  segmentColor,
  TARGET_OVERVIEW_CARD_HEIGHT,
  TARGETS_CONTENT_CLASS,
  TargetDetailsButton,
  TargetDistributionCard,
  TargetsSectionHeading,
  MissingDepartmentAssignmentHint,
  TeamTargetCard,
} from '@/components/sales-targeting/targetLayout';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import {
  ModuleEmptyState,
  SALES_TARGETING_PAGE_CLASS,
  SessionTabSkeleton,
  TARGETS_PAGE_PADDING_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { formatTargetPercent, targetSharePercent } from '@/lib/target-format';
import {
  buildSessionPoolLines,
  buildTargetingTeamGroups,
  companyDirectTeamIds,
  companyDirectTeams,
  findLatestCompanySessionCommit,
  findLatestDepartmentSessionCommit,
  findLatestTeamSessionCommit,
  departmentOrgUnitId,
  buildTtbDepartmentRollupRowsByLabel,
  rowsForDepartment,
  rowsForTtbDepartmentFromDepartmentCommit,
  rowsForTtbTeamFromTeamCommit,
  countUniqueSnapshotOpportunities,
  rowsForTeam,
  getCompanySessionTarget,
  getTeamSessionTarget,
  opportunityKey,
  companyTargetSourceBadge,
  sessionTargetSourceBadge,
  snapshotLineToForecastRow,
  teamHasDepartmentAssignment,
  teamsForDepartment,
} from '@/components/sales-targeting/targetingSectionHelpers';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import {
  useGetReconciliation,
  useGetSalesForecast,
  useGetSalesTargetingSettings,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { useApprovalWorkflow } from '@/store/server/features/pipeline/workflows';
import { resolveCompanyOnlyTargetApproval } from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import { useCommitSessionFromForecast } from '@/store/server/features/salesTargeting/mutations';
import type {
  ForecastOpportunityRow,
  ForecastSnapshotLine,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';
import { useManualTargetGuards } from '@/components/sales-targeting/useManualTargetGuards';
import { HybridCompanyStrategicDetailsModal } from '@/components/sales-targeting/HybridCompanyStrategicDetailsModal';
import {
  isConfirmReseatRequiredError,
  planHasDownstreamSeats,
} from '@/components/sales-targeting/confirmReseat';
import {
  getHybridCompanyCardRollup,
  HybridReconciliationSummary,
} from '@/components/sales-targeting/HybridReconciliationSummary';
import {
  resolveWorkflowTeamDetailForecastRows,
  resolveWorkflowTeamPreferredAllocatedAmounts,
  resolveWorkflowTeamPreferredSelectedKeys,
  teamHasCompanyApprovedRequestInScope,
  teamProposalBlockedReason,
} from '@/components/sales-targeting/targetRequestEditGuards';
import { persistTeamTargetProposal } from '@/components/sales-targeting/teamTargetProposalSave';
import {
  collapseDuplicateOpportunityLines,
  teamTargetOpportunityFromForecastRow,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import {
  buildB2TDepartmentDetailsDisplayRows,
  buildDepartmentProposalForecastRows,
  sumB2TCompanyDetailsDisplayAmount,
  sumB2TDepartmentDetailsDisplayAmount,
  resolveDepartmentWorkflowOrCommitAmount,
  sumDepartmentWorkflowDisplayAmount,
} from '@/components/sales-targeting/targetRequestProposalRows';

const EMPTY_FORECAST_ROWS: ForecastOpportunityRow[] = [];

function formatSessionRange(startDate: string, endDate: string) {
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  return `${start} — ${end}`;
}

function formatFiscalYearLabel(
  calendar: { startDate: string; endDate: string } | null,
) {
  if (!calendar) return 'FY';
  const startYear = new Date(calendar.startDate).getFullYear();
  const endYear = new Date(calendar.endDate).getFullYear();
  if (endYear > startYear) {
    return `FY ${startYear}/${String(endYear).slice(-2)}`;
  }
  return `FY ${startYear}`;
}

export function DepartmentDistributionSection() {
  const {
    plan,
    selectedPlanId,
    setSelectedPlanId,
    sessions,
    fiscalCalendar,
    activeCurrencyCode,
    activeCurrencyId,
    setActiveCurrencyId,
    currencyOptions,
    activePlanCurrency,
    salesTeams,
    departmentOptions,
    teamOptions,
    canManageCompany,
    canManageCompanyAnnual,
    canManageDepartmentAnnual,
    canManageTeamAnnual,
    canManageTeamSessions,
    isPlanEditable,
    isLoading,
    refetchAll,
    commitCompanySession,
    commitDepartmentSession,
    orgTargetSettingMethod,
    bottomUpProposerBlockedReason,
    findOrCreateRequestWorkflowPlan,
  } = useSalesTargeting();

  /** Save/create follows org Settings; display uses the open plan's method. */
  const useForecastProposalDetails = isRequestWorkflowMethod(
    orgTargetSettingMethod,
  );
  const planWorkflowMethod =
    plan?.targetSettingMethod ?? orgTargetSettingMethod;
  const viewRequestWorkflow = isRequestWorkflowMethod(planWorkflowMethod);
  const isHybrid = isHybridMethod(planWorkflowMethod);
  const isB2T = isBottomToTopMethod(planWorkflowMethod);
  const isTTB = isTopToBottomMethod(planWorkflowMethod);
  const downstreamDetailsReadOnly =
    isDownstreamDetailsReadOnly(planWorkflowMethod);

  const createTargetRequest = useCreateTargetRequest();
  const reviseTargetRequest = useReviseTargetRequest();
  const submitTargetRequest = useSubmitTargetRequest();
  const createCustomForecast = useCreateCustomForecast();
  const upsertStrategicTarget = useUpsertStrategicTarget();
  const showHybridCompanyCard = isHybrid;
  const showCompanyTargetWorkflowDetails =
    viewRequestWorkflow && (isHybrid || isB2T);
  const { data: targetingSettings } = useGetSalesTargetingSettings(
    useForecastProposalDetails,
  );
  const { data: teamApprovalWorkflow } = useApprovalWorkflow(
    targetingSettings?.teamTargetApprovalWorkflowId,
    Boolean(
      useForecastProposalDetails &&
        targetingSettings?.enableApprovalWorkflows &&
        targetingSettings?.teamTargetApprovalWorkflowId,
    ),
  );
  const companyOnlyApproval =
    useForecastProposalDetails &&
    resolveCompanyOnlyTargetApproval({
      enableApprovalWorkflows: targetingSettings?.enableApprovalWorkflows,
      teamTargetApprovalWorkflowId:
        targetingSettings?.teamTargetApprovalWorkflowId,
      workflowStepCount: teamApprovalWorkflow?.version?.steps?.length,
    });
  const ensureHybridPlanId = useCallback(async () => {
    const hybridPlan = await findOrCreateRequestWorkflowPlan();
    return hybridPlan?.id ?? null;
  }, [findOrCreateRequestWorkflowPlan]);
  const { data: targetRequests = [], refetch: refetchTargetRequests } =
    useGetTargetRequests(selectedPlanId || plan?.id, viewRequestWorkflow);
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams?.get('sessionId') ?? null;
  const [sessionOverride, setSessionOverride] = useState<string | null>(null);
  const [activeDepartment, setActiveDepartment] = useState(
    () => departmentOptions[0] ?? '',
  );
  const [distributionDeptFilter, setDistributionDeptFilter] = useState(
    () => departmentOptions[0] ?? '',
  );
  const [teamOppCeilings, setTeamOppCeilings] = useState<
    Record<string, number>
  >({});
  /** Ceilings are always rebuilt for the active session — never reused across periods. */
  const ceilingsSessionRef = useRef<string>('');
  const commitSessionFromForecast = useCommitSessionFromForecast();

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    [sessions],
  );

  const defaultSessionId = useMemo(() => {
    if (!sortedSessions.length) return '';
    if (
      sessionIdFromUrl &&
      sortedSessions.some((session) => session.id === sessionIdFromUrl)
    ) {
      return sessionIdFromUrl;
    }
    const now = Date.now();
    const active =
      sortedSessions.find((session) => {
        const start = new Date(session.startDate).getTime();
        const end = new Date(session.endDate).getTime();
        return now >= start && now <= end;
      }) ?? sortedSessions[0];
    return active?.id ?? '';
  }, [sortedSessions, sessionIdFromUrl]);

  const sessionId = useMemo(() => {
    if (
      sessionOverride &&
      sortedSessions.some((session) => session.id === sessionOverride)
    ) {
      return sessionOverride;
    }
    return defaultSessionId;
  }, [sessionOverride, sortedSessions, defaultSessionId]);

  useEffect(() => {
    if (
      sessionOverride &&
      !sortedSessions.some((session) => session.id === sessionOverride)
    ) {
      setSessionOverride(null);
    }
  }, [sessionOverride, sortedSessions]);

  const { departmentSessionReason, teamSessionReason } =
    useManualTargetGuards(sessionId);

  const teamProposalReason = (teamId: string) => {
    if (useForecastProposalDetails) {
      const mainDeptBlock = bottomUpProposerBlockedReason(teamId);
      if (mainDeptBlock) return mainDeptBlock;
    }
    if (!useForecastProposalDetails) return teamSessionReason(teamId);
    const matches = targetRequests.filter(
      (row) =>
        row.teamId === teamId &&
        row.horizon === 'session' &&
        row.sessionId === sessionId &&
        (!activePlanCurrency?.currencyId ||
          row.currencyId === activePlanCurrency.currencyId),
    );
    const editable = matches.find((row) =>
      [
        'DRAFT',
        'PENDING_DEPARTMENT',
        'DEPARTMENT_REJECTED',
        'COMPANY_REJECTED',
      ].includes(row.status),
    );
    const match =
      editable ??
      [...matches].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )[0];
    return teamProposalBlockedReason(match?.status);
  };

  useEffect(() => {
    if (!departmentOptions.length) {
      setActiveDepartment((prev) => (prev === '' ? prev : ''));
      setDistributionDeptFilter((prev) => (prev === '' ? prev : ''));
      return;
    }
    setActiveDepartment((prev) =>
      departmentOptions.includes(prev) ? prev : departmentOptions[0]!,
    );
    setDistributionDeptFilter((prev) =>
      departmentOptions.includes(prev) ? prev : departmentOptions[0]!,
    );
  }, [departmentOptions]);

  const selectedSession = useMemo(
    () => sortedSessions.find((s) => s.id === sessionId) ?? null,
    [sortedSessions, sessionId],
  );

  const companyPeriodTargetFromPlan =
    plan && activePlanCurrency && sessionId
      ? getCompanySessionTarget(plan, activePlanCurrency.id, sessionId)
      : 0;

  const workflowPlanId = selectedPlanId || plan?.id;
  const {
    data: hybridReconciliation,
    isLoading: hybridReconciliationLoading,
    refetch: refetchHybridReconciliation,
  } = useGetReconciliation(
    workflowPlanId,
    {
      currencyId: activePlanCurrency?.currencyId ?? '',
      horizon: 'session',
      sessionId: sessionId || undefined,
    },
    Boolean(
      showCompanyTargetWorkflowDetails &&
        workflowPlanId &&
        activePlanCurrency?.currencyId &&
        sessionId,
    ),
  );
  const strategicPeriod = Number(hybridReconciliation?.strategicTarget ?? 0);
  const b2tCompanyPeriodDisplayTotal = useMemo(() => {
    if (!isB2T || !viewRequestWorkflow || !sessionId) return 0;
    return sumB2TCompanyDetailsDisplayAmount({
      targetRequests,
      teamIds: salesTeams.map((team) => team.id),
      horizon: 'session',
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    });
  }, [
    isB2T,
    viewRequestWorkflow,
    sessionId,
    targetRequests,
    salesTeams,
    activePlanCurrency?.currencyId,
    companyOnlyApproval,
  ]);
  const companyPeriodTarget =
    isHybrid && strategicPeriod > 0
      ? strategicPeriod
      : isB2T && viewRequestWorkflow
        ? b2tCompanyPeriodDisplayTotal
        : companyPeriodTargetFromPlan;

  const { data: departmentsData } = useGetDepartments();
  const { data: crmTeamsData } = useGetCrmTeams();

  const teamLeadById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const team of crmTeamsData?.data ?? []) {
      map.set(team.id, team.teamLead?.name ?? null);
    }
    return map;
  }, [crmTeamsData?.data]);

  const deptManagerByName = useMemo(() => {
    const map = new Map<
      string,
      { name: string | null; avatarUrl: string | null }
    >();
    for (const dept of departmentsData?.data ?? []) {
      const key = dept.name.trim().toLowerCase();
      map.set(key, {
        name: dept.manager?.name ?? null,
        avatarUrl: dept.manager?.avatarUrl ?? null,
      });
    }
    return map;
  }, [departmentsData?.data]);

  const getTeamPeriod = (teamId: string) =>
    plan && activePlanCurrency && sessionId
      ? getTeamSessionTarget(plan, activePlanCurrency.id, sessionId, teamId)
      : 0;

  const departmentRows = useMemo(
    () =>
      departmentOptions.map((deptName) => {
        const deptTeams = teamsForDepartment(salesTeams, deptName);
        const deptId = departmentOrgUnitId(deptTeams, deptName);
        const deptCommit = findLatestDepartmentSessionCommit(
          plan,
          sessionId,
          deptId,
          activePlanCurrency?.currencyId,
        );
        const period = resolveDepartmentWorkflowOrCommitAmount({
          commitAmount: Number(deptCommit?.committedAmount) || 0,
          useWorkflowDisplay:
            viewRequestWorkflow && !isTTB && Boolean(sessionId),
          targetRequests,
          teamIds: deptTeams.map((t) => t.id),
          horizon: 'session',
          sessionId,
          currencyId: activePlanCurrency?.currencyId,
          companyOnlyApproval: Boolean(companyOnlyApproval),
        });
        const manager = deptManagerByName.get(deptName.trim().toLowerCase());
        return {
          deptName,
          deptId,
          deptTeams,
          period,
          managerName: manager?.name ?? null,
          managerAvatarUrl: manager?.avatarUrl ?? null,
        };
      }),
    [
      departmentOptions,
      salesTeams,
      deptManagerByName,
      plan,
      activePlanCurrency,
      sessionId,
      viewRequestWorkflow,
      isTTB,
      targetRequests,
      companyOnlyApproval,
    ],
  );

  const distributionDeptRow = useMemo(
    () =>
      departmentRows.find((row) => row.deptName === distributionDeptFilter) ??
      null,
    [departmentRows, distributionDeptFilter],
  );

  const companyDirectTeamRows = useMemo(
    () => companyDirectTeams(salesTeams),
    [salesTeams],
  );

  const filteredTeamDistribution = useMemo(() => {
    if (distributionDeptFilter === 'all' || !distributionDeptFilter) {
      const deptSlices = departmentRows.map((dept) => ({
        name: dept.deptName,
        annual: dept.period,
      }));
      const directSlices = companyDirectTeamRows.map((team) => ({
        name: `${team.name} (company)`,
        annual:
          plan && activePlanCurrency && sessionId
            ? getTeamSessionTarget(
                plan,
                activePlanCurrency.id,
                sessionId,
                team.id,
              )
            : 0,
      }));
      return [...deptSlices, ...directSlices];
    }
    if (!distributionDeptRow) return [];
    return distributionDeptRow.deptTeams.map((team) => ({
      name: team.name,
      annual:
        plan && activePlanCurrency && sessionId
          ? getTeamSessionTarget(
              plan,
              activePlanCurrency.id,
              sessionId,
              team.id,
            )
          : 0,
    }));
  }, [
    distributionDeptFilter,
    departmentRows,
    distributionDeptRow,
    companyDirectTeamRows,
    plan,
    activePlanCurrency,
    sessionId,
  ]);

  const distributionDeptOptions = useMemo(
    () =>
      departmentOptions.map((name) => ({
        value: name,
        label: name,
      })),
    [departmentOptions],
  );

  const activeDeptRow = useMemo(
    () =>
      departmentRows.find((row) => row.deptName === activeDepartment) ?? null,
    [departmentRows, activeDepartment],
  );

  const canEdit =
    (canManageCompanyAnnual ||
      canManageCompany ||
      canManageDepartmentAnnual ||
      canManageTeamAnnual ||
      canManageTeamSessions) &&
    isPlanEditable;
  const canEditCompanyTarget =
    (canManageCompanyAnnual || canManageCompany) && isPlanEditable;
  const ttbDistributionReadOnly = downstreamDetailsReadOnly;

  const forecastParams = useMemo(
    () => ({
      calendarId: plan?.calendarId ?? fiscalCalendar?.id,
      currency: activeCurrencyCode || undefined,
      horizon: 'session' as const,
      sessionId: sessionId || undefined,
    }),
    [plan?.calendarId, fiscalCalendar?.id, activeCurrencyCode, sessionId],
  );

  const { data: forecastData } = useGetSalesForecast(
    forecastParams,
    Boolean((plan?.calendarId ?? fiscalCalendar?.id) && sessionId),
  );

  // Ignore previous period's rows while the session forecast is refetching.
  const liveSessionForecastRows = useMemo(() => {
    const rows = forecastData?.rows ?? EMPTY_FORECAST_ROWS;
    if (!sessionId) return EMPTY_FORECAST_ROWS;
    if (
      forecastData?.summary?.sessionId &&
      forecastData.summary.sessionId !== sessionId
    ) {
      return EMPTY_FORECAST_ROWS;
    }
    return rows;
  }, [forecastData, sessionId]);

  const latestCompanySessionCommit = useMemo(
    () =>
      sessionId
        ? findLatestCompanySessionCommit(
            plan,
            sessionId,
            activePlanCurrency?.currencyId,
          )
        : undefined,
    [plan, sessionId, activePlanCurrency?.currencyId],
  );

  /**
   * Company period Edit pool = this period’s Forecast only (deals/leads + annual
   * customs with createdAt in the period). Period-created customs are not on
   * Forecast; keep them re-editable from the period commit. allowCustomAdd
   * still lets the user add new period customs on save.
   */
  const companyPickerRows = useMemo(() => {
    const byKey = new Map<string, ForecastOpportunityRow>();

    for (const row of liveSessionForecastRows) {
      byKey.set(opportunityKey(row.opportunityType, row.opportunityId), row);
    }

    // Period-scoped customs (not in Forecast) stay re-editable from this commit.
    for (const line of latestCompanySessionCommit?.lines ?? []) {
      if (line.opportunityType !== 'custom') continue;
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      if (!byKey.has(key)) {
        byKey.set(key, snapshotLineToForecastRow(line, activeCurrencyCode));
      }
    }

    return [...byKey.values()];
  }, [latestCompanySessionCommit, liveSessionForecastRows, activeCurrencyCode]);

  const companySessionLines = useMemo(
    () =>
      plan && sessionId
        ? buildSessionPoolLines(plan, sessionId, activePlanCurrency?.currencyId)
        : [],
    [plan, sessionId, activePlanCurrency?.currencyId],
  );

  const hasCompanySessionCommit = Boolean(
    latestCompanySessionCommit?.lines?.length,
  );

  const companyTargetBadge = useMemo(() => {
    if (isHybrid) {
      return companyTargetSourceBadge(undefined, companyPeriodTarget > 0, {
        targetSettingMethod: 'HYBRID',
      });
    }
    return sessionTargetSourceBadge(
      companyPeriodTarget > 0,
      hasCompanySessionCommit ||
        salesTeams.some(
          (team) =>
            findLatestTeamSessionCommit(
              plan,
              sessionId,
              team.id,
              activePlanCurrency?.currencyId,
            )?.lines?.length,
        ),
    );
  }, [
    isHybrid,
    companyPeriodTarget,
    hasCompanySessionCommit,
    plan,
    sessionId,
    salesTeams,
    activePlanCurrency?.currencyId,
  ]);

  /**
   * Department EDIT pool = company-included opportunities with live values.
   * Empty when company has none. Display value / Show opportunities stay on
   * the department's own saved commit until department manually re-edits.
   */
  const companyPoolRows = useMemo(() => {
    if (!companySessionLines.length) return EMPTY_FORECAST_ROWS;

    const liveByKey = new Map(
      liveSessionForecastRows.map(
        (row) =>
          [
            opportunityKey(row.opportunityType, row.opportunityId),
            row,
          ] as const,
      ),
    );

    const rows: ForecastOpportunityRow[] = [];
    const seen = new Set<string>();
    for (const line of companySessionLines) {
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      if (seen.has(key)) continue;
      seen.add(key);
      const live = liveByKey.get(key);
      // Live-only for pipeline opps; customs (not on Forecast) keep commit values.
      if (line.opportunityType === 'custom') {
        rows.push(snapshotLineToForecastRow(line, activeCurrencyCode));
        continue;
      }
      if (!live) continue;
      rows.push({
        ...live,
        salesTeamId: live.salesTeamId ?? line.salesTeamId,
        department: live.department ?? line.department ?? null,
      });
    }
    return rows;
  }, [companySessionLines, liveSessionForecastRows, activeCurrencyCode]);

  const teamGroups = useMemo(
    (): TeamSelectGroup[] => buildTargetingTeamGroups(salesTeams),
    [salesTeams],
  );

  const directTeamIds = useMemo(
    () => companyDirectTeamIds(salesTeams),
    [salesTeams],
  );

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const ttbDepartmentRollupRowsByLabel = useMemo(() => {
    if (!isTTB || !sessionId) return undefined;
    return buildTtbDepartmentRollupRowsByLabel({
      plan,
      teamGroups,
      salesTeams,
      companyPoolRows,
      horizon: 'session',
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
      currencyCode: activeCurrencyCode,
    });
  }, [
    isTTB,
    sessionId,
    plan,
    teamGroups,
    salesTeams,
    companyPoolRows,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  const departmentPoolRows = useMemo(() => {
    if (!activeDeptRow) return EMPTY_FORECAST_ROWS;
    if (isTTB && sessionId) {
      return rowsForTtbDepartmentFromDepartmentCommit({
        plan,
        departmentId: activeDeptRow.deptId,
        horizon: 'session',
        sessionId,
        currencyId: activePlanCurrency?.currencyId,
        currencyCode: activeCurrencyCode,
      });
    }
    const teamIds = new Set(activeDeptRow.deptTeams.map((t) => t.id));
    return rowsForDepartment(companyPoolRows, activeDeptRow.deptId, teamIds);
  }, [
    activeDeptRow,
    companyPoolRows,
    isTTB,
    sessionId,
    plan,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  const b2tDeptDetailsViewOnly = isB2T && viewRequestWorkflow;
  const distributionDetailsReadOnly =
    b2tDeptDetailsViewOnly || ttbDistributionReadOnly;
  const canEditDepartmentTarget = canEdit && !distributionDetailsReadOnly;
  const canEditTeamTarget = canEdit && !ttbDistributionReadOnly;
  const teamWorkflowCustomAddAllowed = (teamId: string) => {
    if (!canEditTeamTarget || !viewRequestWorkflow || !sessionId) return false;
    if (isB2T) return true;
    if (isHybrid) {
      return !teamHasCompanyApprovedRequestInScope(targetRequests, teamId, {
        horizon: 'session',
        sessionId,
        currencyId: activePlanCurrency?.currencyId,
      });
    }
    return false;
  };

  const departmentProposalRows = useMemo(() => {
    if (!activeDeptRow || !viewRequestWorkflow || !sessionId) {
      return EMPTY_FORECAST_ROWS;
    }
    const teamIds = activeDeptRow.deptTeams.map((t) => t.id);
    const common = {
      targetRequests,
      teamIds,
      departmentName: activeDeptRow.deptName,
      horizon: 'session' as const,
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
      currencyCode: activeCurrencyCode,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    };
    return isB2T
      ? buildB2TDepartmentDetailsDisplayRows(common)
      : buildDepartmentProposalForecastRows({ ...common, teamNameById });
  }, [
    activeDeptRow,
    viewRequestWorkflow,
    isB2T,
    sessionId,
    targetRequests,
    teamNameById,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
    companyOnlyApproval,
  ]);

  const departmentDetailsRows = viewRequestWorkflow
    ? departmentProposalRows
    : departmentPoolRows;

  const departmentWorkflowDisplayAmount = useMemo(() => {
    if (!viewRequestWorkflow || !activeDeptRow || !sessionId || isTTB) {
      return 0;
    }
    return sumDepartmentWorkflowDisplayAmount({
      targetRequests,
      teamIds: activeDeptRow.deptTeams.map((t) => t.id),
      horizon: 'session',
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    });
  }, [
    viewRequestWorkflow,
    isTTB,
    activeDeptRow,
    sessionId,
    targetRequests,
    activePlanCurrency?.currencyId,
    companyOnlyApproval,
  ]);

  const departmentB2TDisplayAmount = useMemo(() => {
    if (!b2tDeptDetailsViewOnly || !activeDeptRow || !sessionId) return 0;
    return sumB2TDepartmentDetailsDisplayAmount({
      targetRequests,
      teamIds: activeDeptRow.deptTeams.map((t) => t.id),
      horizon: 'session',
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    });
  }, [
    b2tDeptDetailsViewOnly,
    activeDeptRow,
    sessionId,
    targetRequests,
    activePlanCurrency?.currencyId,
    companyOnlyApproval,
  ]);

  /**
   * Team EDIT pool only = latest department-saved lines for that team.
   * Does not drive the displayed team amount or "opportunities used" — those
   * stay on the team commit until the team manually edits & saves against
   * this updated department pool.
   */
  const teamPoolRowsById = useMemo(() => {
    const map = new Map<string, ForecastOpportunityRow[]>();
    for (const team of salesTeams) {
      map.set(
        team.id,
        rowsForTtbTeamFromTeamCommit({
          plan,
          team,
          companyPoolRows,
          horizon: 'session',
          sessionId,
          currencyId: activePlanCurrency?.currencyId,
          currencyCode: activeCurrencyCode,
        }),
      );
    }
    return map;
  }, [
    plan,
    sessionId,
    salesTeams,
    companyPoolRows,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  const teamLiveForecastRowsById = useMemo(() => {
    const map = new Map<string, ForecastOpportunityRow[]>();
    for (const team of salesTeams) {
      map.set(team.id, rowsForTeam(liveSessionForecastRows, team.id));
    }
    return map;
  }, [salesTeams, liveSessionForecastRows]);

  const teamWorkflowEditRowsById = useMemo(() => {
    const map = new Map<string, ForecastOpportunityRow[]>();
    if (!sessionId) return map;
    const scope = {
      horizon: 'session' as const,
      sessionId,
      currencyId: activePlanCurrency?.currencyId,
    };
    for (const team of salesTeams) {
      map.set(
        team.id,
        resolveWorkflowTeamDetailForecastRows({
          targetRequests,
          teamId: team.id,
          scope,
          liveTeamRows: teamLiveForecastRowsById.get(team.id) ?? [],
          currencyCode: activeCurrencyCode,
        }),
      );
    }
    return map;
  }, [
    salesTeams,
    sessionId,
    targetRequests,
    activePlanCurrency?.currencyId,
    teamLiveForecastRowsById,
    activeCurrencyCode,
  ]);

  const teamDetailsRowsById = useForecastProposalDetails
    ? teamWorkflowEditRowsById
    : teamPoolRowsById;

  /** Saved team opportunities (display / Show) — never rewritten by department saves. */
  const teamOpportunitiesUsedById = useMemo(() => {
    const map = new Map<string, ForecastSnapshotLine[]>();
    for (const team of salesTeams) {
      map.set(
        team.id,
        findLatestTeamSessionCommit(
          plan,
          sessionId,
          team.id,
          activePlanCurrency?.currencyId,
        )?.lines ?? [],
      );
    }
    return map;
  }, [plan, salesTeams, sessionId, activePlanCurrency?.currencyId]);

  /** Preselect only team-saved keys that still exist in the current department edit pool. */
  const teamPreferredKeysById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const team of salesTeams) {
      if (useForecastProposalDetails && sessionId) {
        map.set(
          team.id,
          resolveWorkflowTeamPreferredSelectedKeys({
            targetRequests,
            teamId: team.id,
            scope: {
              horizon: 'session',
              sessionId,
              currencyId: activePlanCurrency?.currencyId,
            },
          }),
        );
        continue;
      }
      const poolKeys = new Set(
        (teamPoolRowsById.get(team.id) ?? []).map((row) =>
          opportunityKey(row.opportunityType, row.opportunityId),
        ),
      );
      map.set(
        team.id,
        (teamOpportunitiesUsedById.get(team.id) ?? [])
          .map((line) =>
            opportunityKey(line.opportunityType, line.opportunityId),
          )
          .filter((key) => poolKeys.has(key)),
      );
    }
    return map;
  }, [
    salesTeams,
    teamPoolRowsById,
    teamOpportunitiesUsedById,
    useForecastProposalDetails,
    sessionId,
    targetRequests,
    activePlanCurrency?.currencyId,
  ]);

  // Seed ceilings only from this period's department commits (never other periods).
  useEffect(() => {
    const scopeKey = `${activePlanCurrency?.currencyId ?? ''}:${sessionId}`;
    ceilingsSessionRef.current = scopeKey;

    const next: Record<string, number> = {};
    if (!sessionId) {
      setTeamOppCeilings((prev) =>
        Object.keys(prev).length === 0 ? prev : next,
      );
      return;
    }

    for (const row of departmentRows) {
      const deptCommit = findLatestDepartmentSessionCommit(
        plan,
        sessionId,
        row.deptId,
        activePlanCurrency?.currencyId,
      );
      for (const line of deptCommit?.lines ?? []) {
        if (!line.salesTeamId) continue;
        const key = `${line.salesTeamId}:${opportunityKey(
          line.opportunityType,
          line.opportunityId,
        )}`;
        next[key] = Number(line.forecastValue) || 0;
      }
    }

    setTeamOppCeilings((prev) => {
      const unchanged =
        Object.keys(prev).length === Object.keys(next).length &&
        Object.keys(next).every(
          (key) => (prev[key] ?? undefined) === (next[key] ?? undefined),
        );
      return unchanged ? prev : next;
    });
  }, [plan, departmentRows, sessionId, activePlanCurrency?.currencyId]);

  const companyPreferredKeys = useMemo(() => {
    if (!latestCompanySessionCommit) return undefined;
    const poolKeys = new Set(
      companyPickerRows.map((row) =>
        opportunityKey(row.opportunityType, row.opportunityId),
      ),
    );
    return (latestCompanySessionCommit.lines ?? [])
      .map((line) => opportunityKey(line.opportunityType, line.opportunityId))
      .filter((key) => poolKeys.has(key));
  }, [latestCompanySessionCommit, companyPickerRows]);

  /**
   * Opportunities used = this period's company session commit only.
   */
  const companyOpportunitiesUsed = useMemo(
    () => latestCompanySessionCommit?.lines ?? [],
    [latestCompanySessionCommit],
  );

  const departmentPreferredKeys = useMemo(() => {
    if (!activeDeptRow) return [];
    const poolKeys = new Set(
      departmentPoolRows.map((row) =>
        opportunityKey(row.opportunityType, row.opportunityId),
      ),
    );
    const deptCommit = findLatestDepartmentSessionCommit(
      plan,
      sessionId,
      activeDeptRow.deptId,
      activePlanCurrency?.currencyId,
    );
    if (deptCommit) {
      return (deptCommit.lines ?? [])
        .map((line) => opportunityKey(line.opportunityType, line.opportunityId))
        .filter((key) => poolKeys.has(key));
    }
    // No department save yet — empty preferred selection (do not inherit team saves).
    return [];
  }, [
    activeDeptRow,
    plan,
    sessionId,
    activePlanCurrency?.currencyId,
    departmentPoolRows,
  ]);

  const departmentPreferredAmounts = useMemo(() => {
    if (!activeDeptRow) return {} as Record<string, number>;
    const amounts: Record<string, number> = {};
    const deptCommit = findLatestDepartmentSessionCommit(
      plan,
      sessionId,
      activeDeptRow.deptId,
      activePlanCurrency?.currencyId,
    );
    if (!deptCommit) return amounts;
    for (const line of deptCommit.lines ?? []) {
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      amounts[key] = (amounts[key] ?? 0) + (Number(line.forecastValue) || 0);
    }
    return amounts;
  }, [activeDeptRow, plan, sessionId, activePlanCurrency?.currencyId]);

  const teamPreferredAmountsById = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const team of salesTeams) {
      const amounts: Record<string, number> =
        useForecastProposalDetails && sessionId
          ? resolveWorkflowTeamPreferredAllocatedAmounts({
              targetRequests,
              teamId: team.id,
              scope: {
                horizon: 'session',
                sessionId,
                currencyId: activePlanCurrency?.currencyId,
              },
            })
          : Object.fromEntries(
              (
                findLatestTeamSessionCommit(
                  plan,
                  sessionId,
                  team.id,
                  activePlanCurrency?.currencyId,
                )?.lines ?? []
              ).map((line) => [
                opportunityKey(line.opportunityType, line.opportunityId),
                Number(line.forecastValue) || 0,
              ]),
            );
      map.set(team.id, amounts);
    }
    return map;
  }, [
    plan,
    salesTeams,
    sessionId,
    activePlanCurrency?.currencyId,
    useForecastProposalDetails,
    targetRequests,
  ]);

  const showError = (error: unknown) => {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Something went wrong';
    NotificationMessage.error({ message: 'Error', description: message });
  };

  const commitTeamSessionSelection = async (
    teamId: string,
    teamRows: ForecastOpportunityRow[],
    teamAmount: number,
    overrides: TargetSelectionSavePayload['overrides'],
  ) => {
    if (!plan || !activePlanCurrency || !sessionId) return;
    await commitSessionFromForecast.mutateAsync({
      planId: plan.id,
      sessionId,
      planCurrencyId: activePlanCurrency.id,
      orgDepartmentId: teamId,
      sourceType: 'edited_forecast',
      targetValue: teamAmount,
      opportunityRefs: teamRows.map((row) => ({
        opportunityType: row.opportunityType,
        opportunityId: row.opportunityId,
      })),
      overrides:
        overrides ??
        teamRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
          forecastValue: Number(row.forecastValue) || 0,
        })),
    });
  };

  const saveCompanySelection = async (
    payload: TargetSelectionSavePayload,
    options?: { reseatConfirmed?: boolean },
  ) => {
    try {
      if (isHybrid) {
        const hybridPlan = await findOrCreateRequestWorkflowPlan();
        if (!hybridPlan || !activePlanCurrency?.currencyId || !sessionId) {
          NotificationMessage.error({
            message: 'Could not save strategic target',
            description:
              'Open or create a Hybrid plan, select a period and currency.',
          });
          return;
        }
        await upsertStrategicTarget.mutateAsync({
          planId: hybridPlan.id,
          currencyId: activePlanCurrency.currencyId,
          horizon: 'session',
          sessionId,
          amount: Number(payload.amount) || 0,
          description: 'Company strategic target (Period)',
        });
        await refetchHybridReconciliation();
        NotificationMessage.success({
          message: 'Strategic company period target saved',
          description: `Independent strategic amount set to ${formatCompactMoney(payload.amount, activeCurrencyCode)}.`,
        });
        return;
      }

      if (!plan || !activePlanCurrency || !sessionId) return;

      const reseatAlreadyConfirmed = options?.reseatConfirmed === true;
      const downstreamSeatsExist = planHasDownstreamSeats(plan.allocations, {
        planCurrencyId: activePlanCurrency.id,
        sessionId,
      });
      if (isTTB && downstreamSeatsExist && !reseatAlreadyConfirmed) {
        return 'confirm-reseat';
      }

      if (isB2T) {
        NotificationMessage.info({
          message: 'Start from team targets',
          description: bottomUpStartsFromTeamsDescription(planWorkflowMethod),
        });
        return;
      }

      if (payload.sourceType === 'manual') {
        NotificationMessage.error({
          message: 'Select opportunities',
          description:
            'Set the target from forecast opportunities, or add a custom forecast and choose the responsible team.',
        });
        return;
      }

      const opportunityRefs = payload.rows.map((row) => ({
        opportunityType: row.opportunityType,
        opportunityId: row.opportunityId,
      }));
      const customOpportunities = [
        ...payload.selectedCustomRows.map((row) => ({
          id: row.opportunityId,
          opportunityName: row.opportunityName,
          forecastValue: Number(row.forecastValue) || 0,
          salesTeamId: row.salesTeamId || teamOptions[0]?.value || '',
        })),
        ...payload.draftCustoms.flatMap((row) => draftCustomCommitLines(row)),
      ].filter((row) => row.salesTeamId && row.opportunityName);

      const opportunityCount =
        payload.rows.filter((row) => row.opportunityType !== 'custom').length +
        customOpportunities.length;

      await commitCompanySession(sessionId, {
        sourceType: 'edited_forecast',
        targetValue: payload.amount,
        confirmReseat: reseatAlreadyConfirmed ? true : undefined,
        opportunityRefs,
        customOpportunities,
        overrides: payload.overrides,
      });

      // Same cascade as Annual: company save updates the department edit pool
      // only. Do not overwrite team saved targets; clear local team ceilings so
      // teams wait for department to include opportunities again.
      setTeamOppCeilings({});

      NotificationMessage.success({
        message: 'Company period target saved',
        description: isTTB
          ? `Set from ${opportunityCount} opportunit${
              opportunityCount === 1 ? 'y' : 'ies'
            }. Department, team, and person targets were seated automatically.`
          : `Set from ${opportunityCount} opportunit${
              opportunityCount === 1 ? 'y' : 'ies'
            }. Department can include from this pool; team saved targets stay until each team edits and saves.`,
      });
      refetchAll();
    } catch (error) {
      if (isConfirmReseatRequiredError(error) && !options?.reseatConfirmed) {
        return 'confirm-reseat';
      }
      return false;
    }
  };

  const saveDepartmentSelection = async (
    deptName: string,
    deptTeams: SalesTeam[],
    deptId: string,
    payload: TargetSelectionSavePayload,
  ) => {
    if (!deptTeams.length) return;
    try {
      if (isTTB) {
        NotificationMessage.info({
          message: 'Read-only on department Details',
          description:
            'Top to Bottom: set the company period target from Forecast. Department amounts are seated automatically.',
        });
        return;
      }
      if (useForecastProposalDetails) {
        NotificationMessage.info({
          message: 'Start from team targets',
          description: bottomUpStartsFromTeamsDescription(
            orgTargetSettingMethod,
          ),
        });
        return;
      }

      if (payload.sourceType === 'manual') {
        NotificationMessage.error({
          message: 'Select opportunities',
          description:
            'Set the target from forecast opportunities, or add a custom forecast and choose the responsible team.',
        });
        return;
      }

      const rows = payload.rows;
      const nextCeilings: Record<string, number> = {};
      for (const row of rows) {
        if (!row.salesTeamId) continue;
        nextCeilings[
          `${row.salesTeamId}:${opportunityKey(row.opportunityType, row.opportunityId)}`
        ] = Number(row.forecastValue) || 0;
      }

      await commitDepartmentSession(sessionId, deptId, {
        sourceType: 'edited_forecast',
        targetValue: payload.amount,
        opportunityRefs: rows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
        })),
        overrides: rows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
          forecastValue: Number(row.forecastValue) || 0,
        })),
      });

      setTeamOppCeilings((prev) => {
        const next = { ...prev };
        for (const team of deptTeams) {
          for (const key of Object.keys(next)) {
            if (key.startsWith(`${team.id}:`)) delete next[key];
          }
        }
        return { ...next, ...nextCeilings };
      });

      NotificationMessage.success({
        message: 'Department period target saved',
        description: `${deptName} updated from ${rows.length} selected opportunit${rows.length === 1 ? 'y' : 'ies'}. Team saved targets are unchanged until each team edits and saves.`,
      });
    } catch (error) {
      showError(error);
    }
  };

  const saveTeamSelection = async (
    teamId: string,
    teamName: string,
    payload: TargetSelectionSavePayload,
  ) => {
    if (!plan || !activePlanCurrency || !sessionId) return;
    try {
      if (isTTB) {
        NotificationMessage.info({
          message: 'Read-only on team Details',
          description:
            'Top to Bottom: set the company period target from Forecast. Team amounts are seated automatically.',
        });
        return;
      }
      if (useForecastProposalDetails) {
        const hasCustoms =
          (payload.draftCustoms?.length ?? 0) > 0 ||
          (payload.selectedCustomRows?.length ?? 0) > 0;
        if (
          !payload.rows.length &&
          !hasCustoms &&
          payload.sourceType !== 'manual'
        ) {
          NotificationMessage.error({
            message: 'Opportunities required',
            description:
              'Select at least one forecast opportunity or add a custom opportunity for this team proposal.',
          });
          return;
        }
        const workflowPlan = await findOrCreateRequestWorkflowPlan();
        if (!workflowPlan) return;
        const currencyId =
          workflowPlan.currencyTargets.find(
            (c) => c.currencyId === activePlanCurrency.currencyId,
          )?.currencyId ?? workflowPlan.currencyTargets[0]?.currencyId;
        if (!currencyId) {
          NotificationMessage.error({
            message: 'Currency required',
            description: 'The proposal plan has no currency configured.',
          });
          return;
        }

        const customFromDraft: Array<{
          opportunityType: SalesTargetOpportunityType;
          opportunityId: string;
          opportunityName: string;
          opportunityValue: number;
          forecastValue: number;
          allocatedAmount: number;
          probability: number | null;
          expectedCloseDate: string | null;
          ownerId: string | null;
          teamId: string;
          departmentId: string | null;
        }> = [];
        for (const draft of payload.draftCustoms ?? []) {
          const teamRows =
            draft.teams?.length > 0
              ? draft.teams.filter((t) => t.salesTeamId === teamId)
              : [
                  {
                    salesTeamId: teamId,
                    amount: draftCustomTotalAmount(draft) || 0,
                  },
                ];
          for (const [index, team] of teamRows.entries()) {
            const created = await createCustomForecast.mutateAsync({
              planId: workflowPlan.id,
              currencyId,
              sessionId,
              groupId: draft.groupId,
              opportunityName: draft.opportunityName,
              forecastValue: Number(team.amount) || 0,
              salesTeamId: team.salesTeamId,
              ...draftCustomCreateExtras(draft, index),
            });
            customFromDraft.push({
              opportunityType: 'custom',
              opportunityId: created.id,
              opportunityName: created.opportunityName ?? draft.opportunityName,
              opportunityValue: Number(team.amount) || 0,
              forecastValue: Number(team.amount) || 0,
              allocatedAmount: Number(team.amount) || 0,
              probability: null,
              expectedCloseDate: null,
              ownerId: null,
              teamId: team.salesTeamId,
              departmentId: null,
            });
          }
        }
        for (const row of payload.selectedCustomRows ?? []) {
          customFromDraft.push({
            opportunityType: 'custom',
            opportunityId: row.opportunityId,
            opportunityName: row.opportunityName,
            opportunityValue: Number(row.forecastValue) || 0,
            forecastValue: Number(row.forecastValue) || 0,
            allocatedAmount: Number(row.forecastValue) || 0,
            probability: null,
            expectedCloseDate: null,
            ownerId: null,
            teamId: row.salesTeamId || teamId,
            departmentId: null,
          });
        }

        const opportunities = collapseDuplicateOpportunityLines([
          ...payload.rows
            .filter((row) => row.opportunityType !== 'custom')
            .map((row) => teamTargetOpportunityFromForecastRow(row, teamId)),
          ...customFromDraft.map((row) =>
            teamTargetOpportunityFromForecastRow(
              {
                opportunityType: row.opportunityType,
                opportunityId: row.opportunityId,
                opportunityName: row.opportunityName,
                opportunityValue: row.opportunityValue,
                forecastValue: row.forecastValue,
                allocatedAmount: row.allocatedAmount,
                probability: row.probability,
                expectedCloseDate: row.expectedCloseDate,
                ownerId: row.ownerId,
                salesTeamId: row.teamId,
                customerId: null,
                customerName: null,
                ownerName: null,
                stageId: null,
                stageName: null,
                stageCategory: null,
                forecastCategory: null,
                department: null,
                currency: activeCurrencyCode,
                status: 'open',
                sessionId,
              },
              teamId,
            ),
          ),
        ]);

        const proposalAmount =
          opportunities.reduce((s, o) => s + Number(o.allocatedAmount), 0) ||
          Number(payload.amount) ||
          0;

        const { updatedExisting } = await persistTeamTargetProposal({
          planId: workflowPlan.id,
          currencyId,
          teamId,
          horizon: 'session',
          sessionId,
          amount: proposalAmount,
          description: `${teamName} period target proposal from forecast`,
          opportunities,
          targetRequests,
          refetchTargetRequests: () => refetchTargetRequests(),
          createTargetRequest: (payload) =>
            createTargetRequest.mutateAsync(payload),
          reviseTargetRequest: (payload) =>
            reviseTargetRequest.mutateAsync(payload),
          submitTargetRequest: (payload) =>
            submitTargetRequest.mutateAsync(payload),
        });
        setSelectedPlanId(workflowPlan.id);
        NotificationMessage.success({
          message: updatedExisting
            ? 'Proposal updated'
            : 'Target submitted for approval',
          description: updatedExisting
            ? `${teamName} period proposal was updated on the existing request.`
            : `${teamName} period proposal sent for department approval.`,
        });
        return;
      }

      if (payload.sourceType === 'manual') {
        NotificationMessage.error({
          message: 'Select opportunities',
          description:
            'Set the target from forecast opportunities, or add a custom forecast and choose the responsible team.',
        });
        return;
      }

      const clampedRows = payload.rows
        .map((row) => {
          const key = opportunityKey(row.opportunityType, row.opportunityId);
          const ceiling = teamOppCeilings[`${teamId}:${key}`];
          if (ceiling === undefined) return null;
          const forecastValue = Math.min(
            Math.max(0, Number(row.forecastValue) || 0),
            Math.max(0, Number(ceiling) || 0),
          );
          return { ...row, forecastValue };
        })
        .filter((row): row is ForecastOpportunityRow => row != null);

      const amount =
        Math.round(
          clampedRows.reduce(
            (sum, row) => sum + (Number(row.forecastValue) || 0),
            0,
          ) * 100,
        ) / 100;

      await commitTeamSessionSelection(
        teamId,
        clampedRows,
        amount,
        clampedRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
          forecastValue: Number(row.forecastValue) || 0,
        })),
      );
      NotificationMessage.success({
        message: 'Team period target saved',
        description: `${teamName} set from ${clampedRows.length} selected opportunit${clampedRows.length === 1 ? 'y' : 'ies'}.`,
      });
      refetchAll();
    } catch (error) {
      showError(error);
    }
  };

  if (isLoading) {
    return <SessionTabSkeleton />;
  }

  if (!plan) {
    return (
      <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
        <ModuleEmptyState
          title="No annual target yet"
          description="Set a company or team annual target on the Annual tab, then define period targets here."
        />
      </div>
    );
  }

  const activeDeptShare =
    activeDeptRow && companyPeriodTarget > 0
      ? targetSharePercent(activeDeptRow.period, companyPeriodTarget)
      : 0;

  const periodLabel = selectedSession?.name ?? 'Period';
  const periodRange =
    selectedSession != null
      ? formatSessionRange(selectedSession.startDate, selectedSession.endDate)
      : null;
  const fiscalYearLabel = formatFiscalYearLabel(fiscalCalendar);
  const isWholeCompanyView =
    distributionDeptFilter === 'all' || !distributionDeptFilter;
  const companyOpportunityCount =
    latestCompanySessionCommit?.opportunityCount ??
    countUniqueSnapshotOpportunities(companyOpportunitiesUsed);
  const sessionOptions = sortedSessions.map((session) => ({
    value: session.id,
    label: session.name,
  }));
  const distributionSegments = filteredTeamDistribution.map((item) => ({
    name: item.name,
    amount: item.annual,
  }));
  const distributionLabel = isWholeCompanyView
    ? `Team distribution of company period (${periodLabel})`
    : 'Team distribution of department target';

  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <SalesTargetingCurrencyToolbar periodSegment={periodLabel} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            TARGETS_CONTENT_CLASS,
            TARGETS_PAGE_PADDING_CLASS,
            'space-y-6',
          )}
        >
          <PeriodTargetsBar
            label="Period targets"
            periodName={periodLabel}
            periodRange={periodRange}
            options={sessionOptions}
            value={sessionId}
            onChange={(nextSessionId) => {
              setSessionOverride(nextSessionId);
            }}
          />

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <TargetDistributionCard
              label={distributionLabel}
              total={
                isWholeCompanyView
                  ? companyPeriodTarget
                  : (distributionDeptRow?.period ?? 0)
              }
              totalLabel={
                isWholeCompanyView
                  ? 'total company period target'
                  : 'total department target'
              }
              currency={activeCurrencyCode}
              centerLabel={isWholeCompanyView ? 'Company period' : 'Dept teams'}
              segments={distributionSegments}
              className={TARGET_OVERVIEW_CARD_HEIGHT}
              filter={
                distributionDeptOptions.length > 0
                  ? {
                      value: distributionDeptFilter,
                      options: distributionDeptOptions,
                      onChange: setDistributionDeptFilter,
                    }
                  : undefined
              }
            />

            <ScopeTargetCard
              label={
                isHybrid
                  ? 'Company strategic period target'
                  : 'Company period target'
              }
              badge={companyTargetBadge}
              amount={companyPeriodTarget}
              currency={activeCurrencyCode}
              meta={
                showHybridCompanyCard
                  ? `${fiscalYearLabel} · ${periodLabel} period target`
                  : undefined
              }
              count={companyOpportunityCount}
              countLabel={
                companyOpportunityCount === 1
                  ? '1 Opportunity in period'
                  : `${companyOpportunityCount} Opportunities in ${periodLabel}`
              }
              countMeta={`${formatCompactMoney(companyPeriodTarget, activeCurrencyCode)} period target total`}
              hybridAccounting={
                showHybridCompanyCard
                  ? (() => {
                      const rollup = getHybridCompanyCardRollup(
                        hybridReconciliation,
                        companyPeriodTarget,
                      );
                      return {
                        proposalAmount: rollup.proposalAmount,
                        remainingGap: rollup.remainingGap,
                      };
                    })()
                  : undefined
              }
              showZeroAmount={showHybridCompanyCard}
              className={TARGET_OVERVIEW_CARD_HEIGHT}
              action={
                showCompanyTargetWorkflowDetails ? (
                  <HybridCompanyStrategicDetailsModal
                    planId={workflowPlanId ?? null}
                    currencyId={activePlanCurrency?.currencyId ?? ''}
                    currencyCode={activeCurrencyCode}
                    strategicAmount={companyPeriodTarget}
                    periodLabel={`${fiscalYearLabel} ${periodLabel}`}
                    canEdit={canEditCompanyTarget}
                    horizon="session"
                    sessionId={sessionId}
                    isHybrid={isHybrid}
                    ensureHybridPlan={ensureHybridPlanId}
                    onSaved={() => {
                      void refetchHybridReconciliation();
                    }}
                  />
                ) : (
                  <TargetAmountField
                    key={`company-session-${sessionId}`}
                    value={companyPeriodTarget}
                    currency={activeCurrencyCode}
                    editable={canEditCompanyTarget}
                    savedSourceType={latestCompanySessionCommit?.sourceType}
                    forecastRows={companyPickerRows}
                    groupedForecastRows={isTTB ? companyPoolRows : undefined}
                    departmentRollupRowsByLabel={ttbDepartmentRollupRowsByLabel}
                    readOnlyTeamGroupedView={isTTB}
                    groupReadOnlyByDepartment={isTTB}
                    companyDirectTeamIds={[...directTeamIds]}
                    allowCustomAdd={canEditCompanyTarget}
                    allowPartialAllocation
                    requireManualEdit
                    teamOptions={teamOptions}
                    teamGroups={teamGroups}
                    preferredSelectedKeys={companyPreferredKeys}
                    preferredAllocatedAmounts={Object.fromEntries(
                      (latestCompanySessionCommit?.lines ?? []).map((line) => [
                        opportunityKey(
                          line.opportunityType,
                          line.opportunityId,
                        ),
                        Number(line.forecastValue) || 0,
                      ]),
                    )}
                    currencyOptions={currencyOptions}
                    activeCurrencyId={activeCurrencyId}
                    onCurrencyChange={setActiveCurrencyId}
                    modalTitle="Company Details & Target Management"
                    modalDescription={
                      isTTB
                        ? `Forecast opportunities for ${fiscalYearLabel} ${periodLabel}, grouped by department and team.`
                        : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel} ${periodLabel}.`
                    }
                    hideSummaryAmount
                    renderTrigger={(openEditor) => (
                      <TargetDetailsButton
                        onClick={openEditor}
                        label="Details"
                      />
                    )}
                    onSaveSelection={
                      canEditCompanyTarget ? saveCompanySelection : undefined
                    }
                    emptyMessage="No company annual opportunities with createdAt in this period yet. Update the annual target, or add a custom forecast for this period."
                  />
                )
              }
            />
          </div>

          {isHybrid && isWholeCompanyView ? (
            <HybridReconciliationSummary
              data={hybridReconciliation}
              currencyCode={activeCurrencyCode}
              isLoading={hybridReconciliationLoading}
              compact
            />
          ) : null}

          {companyDirectTeamRows.length > 0 ? (
            <section className="space-y-4">
              <TargetsSectionHeading
                title="Company-direct team period targets"
                description="These teams report period targets directly to the company pool and are excluded from department allocation math."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {companyDirectTeamRows.map((team, index) => {
                  const teamPeriod =
                    plan && activePlanCurrency && sessionId
                      ? getTeamSessionTarget(
                          plan,
                          activePlanCurrency.id,
                          sessionId,
                          team.id,
                        )
                      : 0;
                  const teamRows =
                    teamDetailsRowsById.get(team.id) ?? EMPTY_FORECAST_ROWS;
                  const alignedDeals = (
                    teamOpportunitiesUsedById.get(team.id) ?? []
                  ).length;
                  return (
                    <TeamTargetCard
                      key={team.id}
                      name={team.name}
                      amount={teamPeriod}
                      currency={activeCurrencyCode}
                      color={segmentColor(index, teamPeriod)}
                      managerName={teamLeadById.get(team.id) ?? null}
                      targetLabel="Company-direct period target"
                      footnote={alignedOpportunitiesFootnote(alignedDeals)}
                      action={
                        <TargetAmountField
                          key={`company-session-${sessionId}-${team.id}`}
                          value={teamPeriod}
                          currency={activeCurrencyCode}
                          editable={canEditTeamTarget}
                          savedSourceType={
                            findLatestTeamSessionCommit(
                              plan,
                              sessionId,
                              team.id,
                              activePlanCurrency?.currencyId,
                            )?.sourceType
                          }
                          forecastRows={teamRows}
                          allowCustomAdd={teamWorkflowCustomAddAllowed(team.id)}
                          customAddTriggerLabel={
                            WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL
                          }
                          customAddFormHeading={
                            WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL
                          }
                          customDefaultTeamId={team.id}
                          customOpportunityHint={
                            teamWorkflowCustomAddAllowed(team.id)
                              ? 'Custom opportunities are part of this team proposal. The department manager approves it.'
                              : null
                          }
                          allowPartialAllocation
                          requireManualEdit
                          preferredSelectedKeys={
                            teamPreferredKeysById.get(team.id) ?? []
                          }
                          preferredAllocatedAmounts={teamPreferredAmountsById.get(
                            team.id,
                          )}
                          currencyOptions={currencyOptions}
                          activeCurrencyId={activeCurrencyId}
                          onCurrencyChange={setActiveCurrencyId}
                          groupedModalScope="team"
                          workflowTeamFlatOpportunityList={
                            useForecastProposalDetails
                          }
                          readOnlyTeamGroupedView={ttbDistributionReadOnly}
                          modalTitle={`${team.name} Details & Target Management`}
                          modalDescription={
                            ttbDistributionReadOnly
                              ? `Seated team period target for ${fiscalYearLabel} ${periodLabel} (view only). Set the company target from Forecast to update amounts.`
                              : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel} ${periodLabel}. Targets roll up directly to the company.`
                          }
                          hideSummaryAmount
                          renderTrigger={(openEditor) => (
                            <TargetDetailsButton
                              onClick={openEditor}
                              label="Details"
                              tone="outline"
                            />
                          )}
                          emptyMessage={
                            useForecastProposalDetails
                              ? 'No forecast opportunities for this team in this period yet.'
                              : 'No company-included opportunities for this team in this period yet.'
                          }
                          targetBlockedReason={teamProposalReason(team.id)}
                          onSaveSelection={
                            canEditTeamTarget && !teamProposalReason(team.id)
                              ? (payload) =>
                                  saveTeamSelection(team.id, team.name, payload)
                              : undefined
                          }
                        />
                      }
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <TargetsSectionHeading
              title="Department & team period targets"
              description={`Quotas and opportunity allocations for ${fiscalYearLabel} ${periodLabel}.`}
            />

            {departmentRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
                No departments configured.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {departmentRows.map(
                    ({
                      deptName,
                      deptTeams,
                      period,
                      managerName,
                      managerAvatarUrl,
                    }) => {
                      const selected = deptName === activeDepartment;
                      const sharePct =
                        companyPeriodTarget > 0
                          ? targetSharePercent(period, companyPeriodTarget)
                          : 0;
                      return (
                        <DepartmentTargetTile
                          key={deptName}
                          name={deptName}
                          amount={period}
                          currency={activeCurrencyCode}
                          managerName={managerName}
                          managerAvatarUrl={managerAvatarUrl}
                          meta={`${deptTeams.length} team${deptTeams.length === 1 ? '' : 's'} · ${formatTargetPercent(sharePct)} of period`}
                          selected={selected}
                          onSelect={() => setActiveDepartment(deptName)}
                        />
                      );
                    },
                  )}
                </div>

                {activeDeptRow ? (
                  <DepartmentTargetPanel
                    label="Department period target"
                    name={activeDeptRow.deptName}
                    meta={`${formatCompactMoney(activeDeptRow.period, activeCurrencyCode)} · ${activeDeptRow.deptTeams.length} team${activeDeptRow.deptTeams.length === 1 ? '' : 's'} · ${formatTargetPercent(activeDeptShare)} of period`}
                    teamsLabel={`Teams in ${activeDeptRow.deptName} & period targets`}
                    action={
                      <TargetAmountField
                        key={`dept-session-${sessionId}-${activeDeptRow.deptName}`}
                        value={
                          viewRequestWorkflow &&
                          !isTTB &&
                          departmentWorkflowDisplayAmount > 0
                            ? departmentWorkflowDisplayAmount
                            : b2tDeptDetailsViewOnly &&
                                departmentB2TDisplayAmount > 0
                              ? departmentB2TDisplayAmount
                              : activeDeptRow.period
                        }
                        currency={activeCurrencyCode}
                        editable={canEditDepartmentTarget}
                        savedSourceType={
                          b2tDeptDetailsViewOnly
                            ? undefined
                            : findLatestDepartmentSessionCommit(
                                plan,
                                sessionId,
                                activeDeptRow.deptId,
                                activePlanCurrency?.currencyId,
                              )?.sourceType
                        }
                        forecastRows={departmentDetailsRows}
                        allowPartialAllocation
                        requireManualEdit
                        teamOptions={teamOptions}
                        teamGroups={teamGroups}
                        preferredSelectedKeys={departmentPreferredKeys}
                        preferredAllocatedAmounts={departmentPreferredAmounts}
                        currencyOptions={currencyOptions}
                        activeCurrencyId={activeCurrencyId}
                        onCurrencyChange={setActiveCurrencyId}
                        modalTitle={`${activeDeptRow.deptName} Details & Target Management`}
                        modalDescription={
                          ttbDistributionReadOnly
                            ? `Seated period targets for ${fiscalYearLabel} ${periodLabel} (read-only). Set the company period target from Forecast to update department and team amounts.`
                            : b2tDeptDetailsViewOnly
                              ? `Approved team period targets for ${fiscalYearLabel} ${periodLabel} (read-only). Dept-approved until company approves; then company-approved replaces it. Edit in Requests only.`
                              : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel} ${periodLabel}.`
                        }
                        hideSummaryAmount
                        hideProposalStatusColumn={ttbDistributionReadOnly}
                        readOnlyTeamGroupedView={distributionDetailsReadOnly}
                        groupedModalScope="department"
                        departmentGroupLabel={activeDeptRow.deptName}
                        renderTrigger={(openEditor) => (
                          <TargetDetailsButton
                            onClick={openEditor}
                            label="Details"
                          />
                        )}
                        emptyMessage={
                          b2tDeptDetailsViewOnly
                            ? companyOnlyApproval
                              ? `No company-approved team period targets for ${activeDeptRow.deptName} yet.`
                              : `No step-1-approved team proposals for ${activeDeptRow.deptName} in this period yet.`
                            : useForecastProposalDetails
                              ? companyOnlyApproval
                                ? `No team proposals at company review yet for ${activeDeptRow.deptName} in this period.`
                                : `No department-approved team proposals yet for ${activeDeptRow.deptName} in this period. Complete step 1 in Requests first.`
                              : `Company target does not include opportunities for ${activeDeptRow.deptName}.`
                        }
                        targetBlockedReason={
                          ttbDistributionReadOnly
                            ? 'Top to Bottom: view only. Set the company target from Forecast to seat department and team amounts.'
                            : b2tDeptDetailsViewOnly
                              ? 'Bottom to Top: view only here. Use Requests to act on pending steps.'
                              : useForecastProposalDetails
                                ? companyOnlyApproval
                                  ? 'Company-only workflow — department does not edit proposals here.'
                                  : null
                                : departmentSessionReason(activeDeptRow.deptId)
                        }
                        onSaveSelection={
                          canEditDepartmentTarget
                            ? (payload) =>
                                saveDepartmentSelection(
                                  activeDeptRow.deptName,
                                  activeDeptRow.deptTeams,
                                  activeDeptRow.deptId,
                                  payload,
                                )
                            : undefined
                        }
                      />
                    }
                  >
                    {activeDeptRow.deptTeams.length === 0 ? (
                      <p className="col-span-full rounded-lg border border-dashed border-border px-4 py-6 text-center text-[12px] text-muted-foreground">
                        No teams in this department yet.
                      </p>
                    ) : (
                      activeDeptRow.deptTeams.map((team, index) => {
                        const teamPeriod = getTeamPeriod(team.id);
                        const teamRows =
                          teamDetailsRowsById.get(team.id) ??
                          EMPTY_FORECAST_ROWS;
                        const alignedDeals = (
                          teamOpportunitiesUsedById.get(team.id) ?? []
                        ).length;
                        return (
                          <TeamTargetCard
                            key={team.id}
                            name={team.name}
                            amount={teamPeriod}
                            currency={activeCurrencyCode}
                            color={segmentColor(index, teamPeriod)}
                            managerName={teamLeadById.get(team.id) ?? null}
                            targetLabel="Team Target"
                            footnote={alignedOpportunitiesFootnote(
                              alignedDeals,
                            )}
                            notice={
                              teamHasDepartmentAssignment(team) ? null : (
                                <MissingDepartmentAssignmentHint />
                              )
                            }
                            action={
                              <TargetAmountField
                                key={`team-session-${sessionId}-${team.id}`}
                                value={teamPeriod}
                                currency={activeCurrencyCode}
                                editable={canEditTeamTarget}
                                savedSourceType={
                                  findLatestTeamSessionCommit(
                                    plan,
                                    sessionId,
                                    team.id,
                                    activePlanCurrency?.currencyId,
                                  )?.sourceType
                                }
                                forecastRows={teamRows}
                                allowCustomAdd={teamWorkflowCustomAddAllowed(
                                  team.id,
                                )}
                                customAddTriggerLabel={
                                  WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL
                                }
                                customAddFormHeading={
                                  WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL
                                }
                                customDefaultTeamId={team.id}
                                customOpportunityHint={
                                  teamWorkflowCustomAddAllowed(team.id)
                                    ? 'Custom opportunities are part of this team proposal. The department manager approves it.'
                                    : null
                                }
                                allowPartialAllocation
                                requireManualEdit
                                preferredSelectedKeys={
                                  teamPreferredKeysById.get(team.id) ?? []
                                }
                                preferredAllocatedAmounts={teamPreferredAmountsById.get(
                                  team.id,
                                )}
                                currencyOptions={currencyOptions}
                                activeCurrencyId={activeCurrencyId}
                                onCurrencyChange={setActiveCurrencyId}
                                groupedModalScope="team"
                                workflowTeamFlatOpportunityList={
                                  useForecastProposalDetails
                                }
                                readOnlyTeamGroupedView={
                                  ttbDistributionReadOnly
                                }
                                modalTitle={`${team.name} Details & Target Management`}
                                modalDescription={
                                  ttbDistributionReadOnly
                                    ? `Seated team period target for ${fiscalYearLabel} ${periodLabel} (view only). Set the company target from Forecast to update amounts.`
                                    : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel} ${periodLabel}.`
                                }
                                hideSummaryAmount
                                renderTrigger={(openEditor) => (
                                  <TargetDetailsButton
                                    onClick={openEditor}
                                    label="Details"
                                    tone="outline"
                                  />
                                )}
                                emptyMessage={
                                  useForecastProposalDetails
                                    ? 'No forecast opportunities for this team in this period yet.'
                                    : 'No department-included opportunities for this team yet.'
                                }
                                targetBlockedReason={teamProposalReason(
                                  team.id,
                                )}
                                onSaveSelection={
                                  canEditTeamTarget &&
                                  !teamProposalReason(team.id)
                                    ? (payload) =>
                                        saveTeamSelection(
                                          team.id,
                                          team.name,
                                          payload,
                                        )
                                    : undefined
                                }
                              />
                            }
                          />
                        );
                      })
                    )}
                  </DepartmentTargetPanel>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
