'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useCreateTargetRequest,
  useSubmitTargetRequest,
  useCreateCustomForecast,
  useReviseTargetRequest,
  useUpsertStrategicTarget,
} from '@/store/server/features/salesTargeting/mutations';
import type { SalesTargetOpportunityType } from '@/store/server/features/salesTargeting/types';
import {
  DepartmentTargetPanel,
  DepartmentTargetTile,
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
import { findRelevantCommits } from '@/components/sales-targeting/TargetOpportunityDetails';
import { snapshotMatchesCurrency } from '@/components/sales-targeting/targetCurrencyUtils';
import {
  buildTargetingTeamGroups,
  companyDirectTeamIds,
  companyDirectTeams,
  buildTtbDepartmentRollupRowsByLabel,
  rowsForTtbDepartmentFromDepartmentCommit,
  rowsForTtbTeamFromTeamCommit,
  countUniqueSnapshotOpportunities,
  departmentOrgUnitId,
  rowsForDepartment,
  rowsForTeam,
  findLatestDepartmentAnnualCommit,
  companyTargetSourceBadge,
  findLatestCompanyAnnualCommit,
  teamHasDepartmentAssignment,
  teamsForDepartment,
} from '@/components/sales-targeting/targetingSectionHelpers';
import {
  AnnualTabSkeleton,
  ModuleEmptyState,
  SALES_TARGETING_PAGE_CLASS,
  TARGETS_PAGE_PADDING_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { formatTargetPercent, targetSharePercent } from '@/lib/target-format';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import {
  useGetReconciliation,
  useGetSalesForecast,
  useGetSalesTargetingSettings,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { useApprovalWorkflow } from '@/store/server/features/pipeline/workflows';
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
import { resolveCompanyOnlyTargetApproval } from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import {
  canEditTeamProposal,
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
  proposalForecastRowKey,
  sumB2TCompanyDetailsDisplayAmount,
  resolveDepartmentWorkflowOrCommitAmount,
  sumDepartmentWorkflowDisplayAmount,
} from '@/components/sales-targeting/targetRequestProposalRows';

const EMPTY_FORECAST_ROWS: ForecastOpportunityRow[] = [];

function formatFiscalYearLabel(
  calendar: { startDate: string; endDate: string } | null,
  fallbackYear: number,
) {
  if (!calendar) return `FY ${fallbackYear}`;
  const startYear = new Date(calendar.startDate).getFullYear();
  const endYear = new Date(calendar.endDate).getFullYear();
  if (endYear > startYear) {
    return `FY ${startYear}/${String(endYear).slice(-2)}`;
  }
  return `FY ${startYear}`;
}

function snapshotLineToForecastRow(
  line: ForecastSnapshotLine,
  currency: string,
): ForecastOpportunityRow {
  return {
    opportunityType: line.opportunityType,
    opportunityId: line.opportunityId,
    opportunityName: line.opportunityName,
    customerId: line.customerId,
    customerName: line.customerName,
    ownerId: line.ownerId,
    ownerName: line.ownerName,
    stageId: line.stageId,
    stageName: line.stageName,
    stageCategory: null,
    forecastCategory: null,
    salesTeamId: line.salesTeamId,
    department: line.department,
    opportunityValue: Number(line.opportunityValue) || 0,
    probability: Number(line.probability) || 0,
    forecastValue: Number(line.forecastValue) || 0,
    expectedCloseDate: line.expectedCloseDate,
    currency,
    status: line.opportunityType === 'custom' ? 'custom' : 'open',
    sessionId: line.sessionId ?? null,
  };
}

/** Latest team-scoped annual commit (excludes company-level snapshots). */
function findLatestTeamAnnualCommit(
  plan: Parameters<typeof findRelevantCommits>[0],
  teamId: string,
  currencyId?: string,
) {
  return findRelevantCommits(plan, {
    horizon: 'annual',
    teamId,
    currencyId,
  }).find(
    (snap) =>
      snap.orgUnitId === teamId &&
      !snap.userId &&
      snapshotMatchesCurrency(snap.currencyId, currencyId),
  );
}

function opportunityKey(opportunityType: string, opportunityId: string) {
  return `${opportunityType}:${opportunityId}`;
}

export function TargetDefinitionSection() {
  const {
    plan,
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
    isPlanEditable,
    isLoading,
    commitCompanyAnnual,
    commitTeamAnnual,
    commitDepartmentAnnual,
    getTeamAnnual,
    getCompanyAnnual,
    orgTargetSettingMethod,
    findOrCreateRequestWorkflowPlan,
    setSelectedPlanId,
    selectedPlanId,
    bottomUpProposerBlockedReason,
  } = useSalesTargeting();

  /**
   * Save/create follows org Settings. Display for the open plan uses the plan's
   * snapshotted method (Bottom to Top vs Hybrid vs Top to Bottom).
   */
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
  const submitTargetRequest = useSubmitTargetRequest();
  const createCustomForecast = useCreateCustomForecast();
  const reviseTargetRequest = useReviseTargetRequest();
  const upsertStrategicTarget = useUpsertStrategicTarget();
  const showHybridCompanyCard = isHybrid;
  const showCompanyTargetWorkflowDetails =
    viewRequestWorkflow && (isHybrid || isB2T);
  const workflowPlanId = selectedPlanId || plan?.id;
  const ensureHybridPlanId = useCallback(async () => {
    const hybridPlan = await findOrCreateRequestWorkflowPlan();
    return hybridPlan?.id ?? null;
  }, [findOrCreateRequestWorkflowPlan]);
  const {
    data: hybridReconciliation,
    isLoading: hybridReconciliationLoading,
    refetch: refetchHybridReconciliation,
  } = useGetReconciliation(
    workflowPlanId,
    {
      currencyId: activePlanCurrency?.currencyId ?? '',
      horizon: 'annual',
    },
    Boolean(
      showCompanyTargetWorkflowDetails &&
        workflowPlanId &&
        activePlanCurrency?.currencyId,
    ),
  );
  const { data: targetRequests = [], refetch: refetchTargetRequests } =
    useGetTargetRequests(selectedPlanId || plan?.id, viewRequestWorkflow);
  const [activeDepartment, setActiveDepartment] = useState(
    () => departmentOptions[0] ?? '',
  );
  const [distributionDeptFilter, setDistributionDeptFilter] = useState(
    () => departmentOptions[0] ?? '',
  );
  /**
   * Max amount a team may take per opportunity, set when the department
   * includes it. Survives team edits that lower the taken amount.
   * Key: `${teamId}:${opportunityType}:${opportunityId}`
   */
  const [teamOppCeilings, setTeamOppCeilings] = useState<
    Record<string, number>
  >({});
  const { departmentAnnualReason, teamAnnualReason } = useManualTargetGuards();

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

  const proposalActor: 'team' | 'department' =
    !companyOnlyApproval &&
    (canManageDepartmentAnnual || canManageCompanyAnnual || canManageCompany)
      ? 'department'
      : 'team';

  const teamProposalReason = (teamId: string) => {
    if (useForecastProposalDetails) {
      const mainDeptBlock = bottomUpProposerBlockedReason(teamId);
      if (mainDeptBlock) return mainDeptBlock;
    }
    if (!useForecastProposalDetails) return teamAnnualReason(teamId);
    const matches = targetRequests.filter(
      (row) =>
        row.teamId === teamId &&
        row.horizon === 'annual' &&
        !row.sessionId &&
        (!activePlanCurrency?.currencyId ||
          row.currencyId === activePlanCurrency.currencyId),
    );
    // Prefer an editable open request over an older approved one.
    const editable = matches.find((row) =>
      canEditTeamProposal(row.status, 'team'),
    );
    const match =
      editable ??
      [...matches].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )[0];
    return teamProposalBlockedReason(match?.status, 'team');
  };

  const findTeamAnnualRequest = (teamId: string) => {
    const matches = targetRequests.filter(
      (row) =>
        row.teamId === teamId &&
        row.horizon === 'annual' &&
        !row.sessionId &&
        (!activePlanCurrency?.currencyId ||
          row.currencyId === activePlanCurrency.currencyId),
    );
    const editable = matches.find((row) =>
      canEditTeamProposal(row.status, proposalActor),
    );
    return (
      editable ??
      [...matches].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )[0] ??
      null
    );
  };
  const ceilingsCurrencyIdRef = useRef<string | undefined>(undefined);

  const companyAnnualFromPlan = getCompanyAnnual();
  const strategicAnnual = Number(hybridReconciliation?.strategicTarget ?? 0);
  const b2tCompanyDisplayTotal = useMemo(() => {
    if (!isB2T || !viewRequestWorkflow) return 0;
    return sumB2TCompanyDetailsDisplayAmount({
      targetRequests,
      teamIds: salesTeams.map((team) => team.id),
      horizon: 'annual',
      currencyId: activePlanCurrency?.currencyId,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    });
  }, [
    isB2T,
    viewRequestWorkflow,
    targetRequests,
    salesTeams,
    activePlanCurrency?.currencyId,
    companyOnlyApproval,
  ]);
  const companyAnnual =
    isHybrid && strategicAnnual > 0
      ? strategicAnnual
      : isB2T && viewRequestWorkflow
        ? b2tCompanyDisplayTotal
        : companyAnnualFromPlan;

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

  const departmentRows = useMemo(
    () =>
      departmentOptions.map((deptName) => {
        const deptTeams = teamsForDepartment(salesTeams, deptName);
        const deptId = departmentOrgUnitId(deptTeams, deptName);
        const deptCommit = findLatestDepartmentAnnualCommit(
          plan,
          deptId,
          activePlanCurrency?.currencyId,
        );
        const annual = resolveDepartmentWorkflowOrCommitAmount({
          commitAmount: Number(deptCommit?.committedAmount) || 0,
          useWorkflowDisplay: viewRequestWorkflow && !isTTB,
          targetRequests,
          teamIds: deptTeams.map((t) => t.id),
          horizon: 'annual',
          currencyId: activePlanCurrency?.currencyId,
          companyOnlyApproval: Boolean(companyOnlyApproval),
        });
        const manager = deptManagerByName.get(deptName.trim().toLowerCase());
        return {
          deptName,
          deptId,
          deptTeams,
          annual,
          managerName: manager?.name ?? null,
          managerAvatarUrl: manager?.avatarUrl ?? null,
        };
      }),
    [
      departmentOptions,
      salesTeams,
      deptManagerByName,
      plan,
      activePlanCurrency?.currencyId,
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

  const distributionDeptOptions = useMemo(
    () =>
      departmentOptions.map((name) => ({
        value: name,
        label: name,
      })),
    [departmentOptions],
  );

  const companyDirectTeamRows = useMemo(
    () => companyDirectTeams(salesTeams),
    [salesTeams],
  );

  const filteredTeamDistribution = useMemo(() => {
    if (distributionDeptFilter === 'all' || !distributionDeptFilter) {
      const deptSlices = departmentRows.map((dept) => ({
        name: dept.deptName,
        annual: dept.annual,
      }));
      const directSlices = companyDirectTeamRows.map((team) => ({
        name: `${team.name} (company)`,
        annual: getTeamAnnual(team.id),
      }));
      return [...deptSlices, ...directSlices];
    }
    if (!distributionDeptRow) return [];
    return distributionDeptRow.deptTeams.map((team) => ({
      name: team.name,
      annual: getTeamAnnual(team.id),
    }));
  }, [
    distributionDeptFilter,
    departmentRows,
    distributionDeptRow,
    companyDirectTeamRows,
    getTeamAnnual,
  ]);

  const teamGroups = useMemo(
    (): TeamSelectGroup[] => buildTargetingTeamGroups(salesTeams),
    [salesTeams],
  );

  const directTeamIds = useMemo(
    () => companyDirectTeamIds(salesTeams),
    [salesTeams],
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
      canManageTeamAnnual) &&
    isPlanEditable;
  const canEditCompanyTarget =
    (canManageCompanyAnnual || canManageCompany) && isPlanEditable;
  const ttbDistributionReadOnly = downstreamDetailsReadOnly;
  const fiscalYear = fiscalCalendar
    ? new Date(fiscalCalendar.startDate).getFullYear()
    : new Date().getFullYear();

  const forecastParams = useMemo(
    () => ({
      calendarId: fiscalCalendar?.id,
      currency: activeCurrencyCode || undefined,
      horizon: 'annual' as const,
    }),
    [fiscalCalendar?.id, activeCurrencyCode],
  );

  const { data: forecastData } = useGetSalesForecast(
    forecastParams,
    Boolean(fiscalCalendar?.id),
  );

  const companyForecastRows = forecastData?.rows ?? EMPTY_FORECAST_ROWS;

  /** Latest company annual commit — cascade source for dept/team and source badge. */
  const latestCompanyAnnualCommit = useMemo(
    () => findLatestCompanyAnnualCommit(plan, activePlanCurrency?.currencyId),
    [plan, activePlanCurrency?.currencyId],
  );

  const companyCommitLines = useMemo(
    () => latestCompanyAnnualCommit?.lines ?? [],
    [latestCompanyAnnualCommit],
  );

  const companyTargetBadge = useMemo(
    () =>
      companyTargetSourceBadge(latestCompanyAnnualCommit, companyAnnual > 0, {
        targetSettingMethod: isHybrid ? 'HYBRID' : orgTargetSettingMethod,
      }),
    [
      latestCompanyAnnualCommit,
      companyAnnual,
      isHybrid,
      orgTargetSettingMethod,
    ],
  );

  /**
   * Department EDIT pool = company-included opportunities with live values.
   * Empty when company has none. Saved department display is unchanged until
   * department manually re-edits against this pool.
   */
  const companyPoolRows = useMemo(() => {
    if (!companyCommitLines.length) return EMPTY_FORECAST_ROWS;

    const liveByKey = new Map(
      companyForecastRows.map(
        (row) =>
          [
            opportunityKey(row.opportunityType, row.opportunityId),
            row,
          ] as const,
      ),
    );

    const rows: ForecastOpportunityRow[] = [];
    const seen = new Set<string>();
    for (const line of companyCommitLines) {
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      if (seen.has(key)) continue;
      seen.add(key);
      if (line.opportunityType === 'custom') {
        rows.push(snapshotLineToForecastRow(line, activeCurrencyCode));
        continue;
      }
      const live = liveByKey.get(key);
      if (!live) continue;
      rows.push({
        ...live,
        salesTeamId: live.salesTeamId ?? line.salesTeamId,
        department: live.department ?? line.department ?? null,
      });
    }
    return rows;
  }, [companyCommitLines, companyForecastRows, activeCurrencyCode]);

  /**
   * Edit picker: always show latest live forecast values. Merge in commit-only
   * rows (e.g. customs) so previously used opportunities remain visible/checkable.
   */
  const companyEditorRows = useMemo(() => {
    const byKey = new Map(
      companyForecastRows.map(
        (row) =>
          [
            opportunityKey(row.opportunityType, row.opportunityId),
            row,
          ] as const,
      ),
    );
    for (const line of companyCommitLines) {
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      if (!byKey.has(key)) {
        byKey.set(key, snapshotLineToForecastRow(line, activeCurrencyCode));
      }
    }
    return [...byKey.values()];
  }, [companyForecastRows, companyCommitLines, activeCurrencyCode]);

  const departmentPoolRows = useMemo(() => {
    if (!activeDeptRow) return EMPTY_FORECAST_ROWS;
    if (isTTB) {
      return rowsForTtbDepartmentFromDepartmentCommit({
        plan,
        departmentId: activeDeptRow.deptId,
        horizon: 'annual',
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
    plan,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const ttbDepartmentRollupRowsByLabel = useMemo(() => {
    if (!isTTB) return undefined;
    return buildTtbDepartmentRollupRowsByLabel({
      plan,
      teamGroups,
      salesTeams,
      companyPoolRows,
      horizon: 'annual',
      currencyId: activePlanCurrency?.currencyId,
      currencyCode: activeCurrencyCode,
    });
  }, [
    isTTB,
    plan,
    teamGroups,
    salesTeams,
    companyPoolRows,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  const b2tDeptDetailsViewOnly = isB2T && viewRequestWorkflow;
  const distributionDetailsReadOnly =
    b2tDeptDetailsViewOnly || ttbDistributionReadOnly;
  /** Department Details only (B2T snapshots / TTB seated — not team proposals). */
  const canEditDepartmentTarget = canEdit && !distributionDetailsReadOnly;
  /** Team Details: editable on B2T and Hybrid; view-only on TTB. */
  const canEditTeamTarget = canEdit && !ttbDistributionReadOnly;
  /** B2T: custom add on team Details. Hybrid: only before company approval (reconcile at company Details). */
  const teamWorkflowCustomAddAllowed = (teamId: string) => {
    if (!canEditTeamTarget || !viewRequestWorkflow) return false;
    if (isB2T) return true;
    if (isHybrid) {
      return !teamHasCompanyApprovedRequestInScope(targetRequests, teamId, {
        horizon: 'annual',
        currencyId: activePlanCurrency?.currencyId,
      });
    }
    return false;
  };

  /** B2T: read-only Details; company-approved per team replaces dept-approved when present. Hybrid: editable merge pool. */
  const departmentProposalRows = useMemo(() => {
    if (!activeDeptRow || !viewRequestWorkflow) return EMPTY_FORECAST_ROWS;
    const teamIds = activeDeptRow.deptTeams.map((t) => t.id);
    const common = {
      targetRequests,
      teamIds,
      departmentName: activeDeptRow.deptName,
      horizon: 'annual' as const,
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
    targetRequests,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
    teamNameById,
    companyOnlyApproval,
  ]);

  const departmentDetailsRows = viewRequestWorkflow
    ? departmentProposalRows
    : departmentPoolRows;

  const departmentProposalAmount = useMemo(() => {
    if (!viewRequestWorkflow || !activeDeptRow || isTTB) return 0;
    const teamIds = activeDeptRow.deptTeams.map((t) => t.id);
    return sumDepartmentWorkflowDisplayAmount({
      targetRequests,
      teamIds,
      horizon: 'annual',
      currencyId: activePlanCurrency?.currencyId,
      companyOnlyApproval: Boolean(companyOnlyApproval),
    });
  }, [
    viewRequestWorkflow,
    isTTB,
    activeDeptRow,
    targetRequests,
    activePlanCurrency?.currencyId,
    companyOnlyApproval,
  ]);

  /**
   * Team EDIT pool only = latest department-saved lines for that team.
   * Displayed team amount / opportunities used stay on the team commit until
   * the team manually edits & saves against this updated department pool.
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
          horizon: 'annual',
          currencyId: activePlanCurrency?.currencyId,
          currencyCode: activeCurrencyCode,
        }),
      );
    }
    return map;
  }, [
    plan,
    salesTeams,
    companyPoolRows,
    activePlanCurrency?.currencyId,
    activeCurrencyCode,
  ]);

  /** Live forecast rows for Bottom-to-Top team Details (same modal, different pool). */
  const teamLiveForecastRowsById = useMemo(() => {
    const map = new Map<string, ForecastOpportunityRow[]>();
    for (const team of salesTeams) {
      map.set(team.id, rowsForTeam(companyForecastRows, team.id));
    }
    return map;
  }, [salesTeams, companyForecastRows]);

  const teamWorkflowEditRowsById = useMemo(() => {
    const map = new Map<string, ForecastOpportunityRow[]>();
    const scope = {
      horizon: 'annual' as const,
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
    targetRequests,
    activePlanCurrency?.currencyId,
    teamLiveForecastRowsById,
    activeCurrencyCode,
  ]);

  const teamDetailsRowsById = useForecastProposalDetails
    ? teamWorkflowEditRowsById
    : teamPoolRowsById;
  /** Saved team opportunities (display / Details) — never rewritten by department saves. */
  const teamOpportunitiesUsedById = useMemo(() => {
    const map = new Map<string, ForecastSnapshotLine[]>();
    for (const team of salesTeams) {
      map.set(
        team.id,
        findLatestTeamAnnualCommit(
          plan,
          team.id,
          activePlanCurrency?.currencyId,
        )?.lines ?? [],
      );
    }
    return map;
  }, [plan, salesTeams, activePlanCurrency?.currencyId]);

  /** Preselect only team-saved keys that still exist in the current department edit pool. */
  const teamPreferredKeysById = useMemo(() => {
    const map = new Map<string, string[]>();
    const scope = {
      horizon: 'annual' as const,
      currencyId: activePlanCurrency?.currencyId,
    };
    for (const team of salesTeams) {
      if (useForecastProposalDetails) {
        map.set(
          team.id,
          resolveWorkflowTeamPreferredSelectedKeys({
            targetRequests,
            teamId: team.id,
            scope,
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
    targetRequests,
    activePlanCurrency?.currencyId,
  ]);

  // Seed team edit-pool ceilings from department commits (not team saves).
  useEffect(() => {
    const currencyId = activePlanCurrency?.currencyId;
    const currencyChanged = ceilingsCurrencyIdRef.current !== currencyId;
    ceilingsCurrencyIdRef.current = currencyId;

    setTeamOppCeilings((prev) => {
      const next: Record<string, number> = {};

      for (const row of departmentRows) {
        const deptCommit = findLatestDepartmentAnnualCommit(
          plan,
          row.deptId,
          currencyId,
        );
        if (deptCommit) {
          for (const line of deptCommit.lines ?? []) {
            if (!line.salesTeamId) continue;
            const key = `${line.salesTeamId}:${opportunityKey(
              line.opportunityType,
              line.opportunityId,
            )}`;
            const fromDept = Number(line.forecastValue) || 0;
            const prevAmount = currencyChanged ? undefined : prev[key];
            next[key] =
              prevAmount !== undefined
                ? Math.max(prevAmount, fromDept)
                : fromDept;
          }
        } else if (!currencyChanged) {
          // Legacy: keep in-memory ceilings for this dept's teams
          for (const team of row.deptTeams) {
            const prefix = `${team.id}:`;
            for (const [key, amount] of Object.entries(prev)) {
              if (!key.startsWith(prefix)) continue;
              next[key] = Number(amount) || 0;
            }
          }
        }
      }

      const unchanged =
        Object.keys(prev).length === Object.keys(next).length &&
        Object.keys(next).every(
          (key) => (prev[key] ?? undefined) === (next[key] ?? undefined),
        );
      return unchanged ? prev : next;
    });
  }, [plan, departmentRows, activePlanCurrency?.currencyId]);

  const companyPreferredKeys = useMemo(
    () =>
      latestCompanyAnnualCommit
        ? companyCommitLines.map((line) =>
            opportunityKey(line.opportunityType, line.opportunityId),
          )
        : undefined,
    [latestCompanyAnnualCommit, companyCommitLines],
  );

  const companyAssigneeOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of companyEditorRows) {
      const id = row.ownerId?.trim();
      if (!id) continue;
      if (!byId.has(id)) {
        byId.set(id, row.ownerName?.trim() || id);
      }
    }
    return [...byId.entries()].map(([value, label]) => ({ value, label }));
  }, [companyEditorRows]);

  /** Keys from the last department save / B2T team proposals. */
  const departmentPreferredKeys = useMemo(() => {
    if (!activeDeptRow) return [];
    if (useForecastProposalDetails) {
      return departmentDetailsRows.map((row) => proposalForecastRowKey(row));
    }
    const poolKeys = new Set(
      departmentPoolRows.map((row) =>
        opportunityKey(row.opportunityType, row.opportunityId),
      ),
    );
    const deptCommit = findLatestDepartmentAnnualCommit(
      plan,
      activeDeptRow.deptId,
      activePlanCurrency?.currencyId,
    );
    if (deptCommit) {
      return (deptCommit.lines ?? [])
        .map((line) => opportunityKey(line.opportunityType, line.opportunityId))
        .filter((key) => poolKeys.has(key));
    }
    return [];
  }, [
    activeDeptRow,
    plan,
    activePlanCurrency?.currencyId,
    departmentPoolRows,
    departmentDetailsRows,
    useForecastProposalDetails,
  ]);

  const departmentPreferredAmounts = useMemo(() => {
    if (!activeDeptRow) return {} as Record<string, number>;
    if (useForecastProposalDetails) {
      const amounts: Record<string, number> = {};
      for (const row of departmentDetailsRows) {
        const key = proposalForecastRowKey(row);
        amounts[key] = Number(row.forecastValue) || 0;
      }
      return amounts;
    }
    const amounts: Record<string, number> = {};
    const deptCommit = findLatestDepartmentAnnualCommit(
      plan,
      activeDeptRow.deptId,
      activePlanCurrency?.currencyId,
    );
    if (!deptCommit) return amounts;
    for (const line of deptCommit.lines ?? []) {
      const key = opportunityKey(line.opportunityType, line.opportunityId);
      amounts[key] = (amounts[key] ?? 0) + (Number(line.forecastValue) || 0);
    }
    return amounts;
  }, [
    activeDeptRow,
    plan,
    activePlanCurrency?.currencyId,
    useForecastProposalDetails,
    departmentDetailsRows,
  ]);

  const teamPreferredAmountsById = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const scope = {
      horizon: 'annual' as const,
      currencyId: activePlanCurrency?.currencyId,
    };
    for (const team of salesTeams) {
      const amounts: Record<string, number> = useForecastProposalDetails
        ? resolveWorkflowTeamPreferredAllocatedAmounts({
            targetRequests,
            teamId: team.id,
            scope,
          })
        : Object.fromEntries(
            (
              findLatestTeamAnnualCommit(
                plan,
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

  const saveCompanySelection = async (
    payload: TargetSelectionSavePayload,
    options?: { reseatConfirmed?: boolean },
  ) => {
    try {
      // Hybrid: company Annual Details sets the independent strategic amount
      // anytime (before or after team proposals). Not a top-down commit.
      if (isHybrid) {
        const hybridPlan = await findOrCreateRequestWorkflowPlan();
        if (!hybridPlan || !activePlanCurrency?.currencyId) {
          NotificationMessage.error({
            message: 'Could not save strategic target',
            description: 'Open or create a Hybrid plan and select a currency.',
          });
          return;
        }
        await upsertStrategicTarget.mutateAsync({
          planId: hybridPlan.id,
          currencyId: activePlanCurrency.currencyId,
          horizon: 'annual',
          amount: Number(payload.amount) || 0,
          description: 'Company strategic target (Annual)',
        });
        await refetchHybridReconciliation();
        NotificationMessage.success({
          message: 'Strategic company target saved',
          description: `Independent strategic amount set to ${formatCompactMoney(payload.amount, activeCurrencyCode)}. Team proposals still move through Requests, then reconciliation.`,
        });
        return;
      }

      // B2T: same Details UI, but workflow starts from teams — no top-down.
      if (isB2T) {
        NotificationMessage.info({
          message: 'Start from team targets',
          description: bottomUpStartsFromTeamsDescription(planWorkflowMethod),
        });
        return;
      }

      const reseatAlreadyConfirmed = options?.reseatConfirmed === true;
      const downstreamSeatsExist = planHasDownstreamSeats(plan?.allocations, {
        planCurrencyId: activePlanCurrency?.id,
        sessionId: null,
      });
      if (isTTB && downstreamSeatsExist && !reseatAlreadyConfirmed) {
        return 'confirm-reseat';
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

      await commitCompanyAnnual({
        sourceType: 'edited_forecast',
        targetValue: payload.amount,
        confirmReseat: reseatAlreadyConfirmed ? true : undefined,
        // Keep custom refs so the backend can resolve existing customs from the
        // live feed / prior commit even when customOpportunities is empty.
        opportunityRefs,
        customOpportunities,
        overrides: payload.overrides,
      });
      // Company include/exclude cascades on the backend; reset local ceilings.
      setTeamOppCeilings({});
      NotificationMessage.success({
        message: 'Company target saved',
        description: isTTB
          ? `Set from ${opportunityCount} opportunit${
              opportunityCount === 1 ? 'y' : 'ies'
            }. Department, team, and person targets were seated automatically.`
          : `Set from ${opportunityCount} opportunit${
              opportunityCount === 1 ? 'y' : 'ies'
            }.`,
      });
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
            'Top to Bottom: set the company target from Forecast. Department amounts are seated automatically.',
        });
        return;
      }
      if (useForecastProposalDetails) {
        if (isB2T) {
          NotificationMessage.info({
            message: 'Read-only on department Details',
            description:
              'Bottom to Top: approve, modify, and add custom opportunities in Requests only.',
          });
          return;
        }
        if (companyOnlyApproval) {
          NotificationMessage.info({
            message: 'Company-only approval',
            description:
              'Department does not edit proposals when the workflow is company-only. Open each team Details instead.',
          });
          return;
        }

        const workflowPlan = await findOrCreateRequestWorkflowPlan();
        if (!workflowPlan) return;
        const currencyId =
          workflowPlan.currencyTargets.find(
            (c) => c.currencyId === activePlanCurrency?.currencyId,
          )?.currencyId ?? workflowPlan.currencyTargets[0]?.currencyId;
        if (!currencyId) {
          NotificationMessage.error({
            message: 'Currency required',
            description: 'The proposal plan has no currency configured.',
          });
          return;
        }

        // Create draft customs once, then attach to each editable team request.
        const customLines: Array<{
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
              ? draft.teams
              : deptTeams.map((t) => ({
                  salesTeamId: t.id,
                  amount: draftCustomTotalAmount(draft) || 0,
                }));
          for (const [index, team] of teamRows.entries()) {
            const created = await createCustomForecast.mutateAsync({
              planId: workflowPlan.id,
              currencyId,
              groupId: draft.groupId,
              opportunityName: draft.opportunityName,
              forecastValue: Number(team.amount) || 0,
              salesTeamId: team.salesTeamId,
              ...draftCustomCreateExtras(draft, index),
            });
            customLines.push({
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
              departmentId: deptId,
            });
          }
        }
        for (const row of payload.selectedCustomRows ?? []) {
          customLines.push({
            opportunityType: 'custom',
            opportunityId: row.opportunityId,
            opportunityName: row.opportunityName,
            opportunityValue: Number(row.forecastValue) || 0,
            forecastValue: Number(row.forecastValue) || 0,
            allocatedAmount: Number(row.forecastValue) || 0,
            probability: null,
            expectedCloseDate: null,
            ownerId: null,
            teamId: row.salesTeamId || deptTeams[0]!.id,
            departmentId: deptId,
          });
        }

        let updatedCount = 0;
        for (const team of deptTeams) {
          const openRequest = findTeamAnnualRequest(team.id);
          if (openRequest && !canEditTeamProposal(openRequest.status, 'team')) {
            continue;
          }
          if (!openRequest && teamProposalReason(team.id)) {
            continue;
          }
          const forecastRowsForTeam = payload.rows.filter(
            (row) =>
              row.opportunityType !== 'custom' &&
              (!row.salesTeamId || row.salesTeamId === team.id),
          );
          const customForTeam = customLines.filter(
            (row) => row.teamId === team.id,
          );
          if (
            !forecastRowsForTeam.length &&
            !customForTeam.length &&
            payload.sourceType !== 'manual'
          ) {
            continue;
          }

          const opportunities = collapseDuplicateOpportunityLines([
            ...forecastRowsForTeam.map((row) =>
              teamTargetOpportunityFromForecastRow(row, team.id, deptId),
            ),
            ...customForTeam.map((row) =>
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
                  status: 'custom',
                  sessionId: null,
                },
                team.id,
                deptId,
              ),
            ),
          ]);

          const amount =
            opportunities.reduce((s, o) => s + Number(o.allocatedAmount), 0) ||
            Number(payload.amount) ||
            0;

          await persistTeamTargetProposal({
            planId: workflowPlan.id,
            currencyId,
            teamId: team.id,
            horizon: 'annual',
            amount,
            description: `${team.name} target proposal from ${deptName} Details`,
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
          updatedCount += 1;
        }

        setSelectedPlanId(workflowPlan.id);
        if (updatedCount === 0) {
          NotificationMessage.info({
            message: 'Nothing to update',
            description:
              'No editable team proposals for this department yet (or all are already company-approved).',
          });
          return;
        }
        NotificationMessage.success({
          message: 'Department proposals updated',
          description: `${updatedCount} team request(s) updated for the next approval step.`,
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

      await commitDepartmentAnnual(deptId, {
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
        message: 'Department target saved',
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
    try {
      if (isTTB) {
        NotificationMessage.info({
          message: 'Read-only on team Details',
          description:
            'Top to Bottom: set the company target from Forecast. Team amounts are seated automatically.',
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
            (c) => c.currencyId === activePlanCurrency?.currencyId,
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
              ? draft.teams
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
                sessionId: null,
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
          horizon: 'annual',
          amount: proposalAmount,
          description: `${teamName} target proposal from forecast`,
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
            ? `${teamName} proposal was updated on the existing request.`
            : `${teamName} proposal sent for department approval (prior dept-approved package stays until you submit it to company).`,
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

      // Clamp to department-included ceilings so teams cannot exceed what the
      // department allocated for each opportunity.
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

      await commitTeamAnnual(teamId, {
        sourceType: 'edited_forecast',
        targetValue: amount,
        opportunityRefs: clampedRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
        })),
        overrides: clampedRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
          forecastValue: Number(row.forecastValue) || 0,
        })),
      });
      NotificationMessage.success({
        message: 'Team target saved',
        description: `${teamName} set from ${clampedRows.length} selected opportunit${clampedRows.length === 1 ? 'y' : 'ies'}.`,
      });
    } catch (error) {
      showError(error);
    }
  };

  if (isLoading) {
    return <AnnualTabSkeleton />;
  }

  if (!fiscalCalendar) {
    return (
      <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
        <ModuleEmptyState
          title="No active fiscal year"
          description="Configure a fiscal calendar before setting targets."
        />
      </div>
    );
  }

  const activeDeptShare =
    activeDeptRow && companyAnnual > 0
      ? targetSharePercent(activeDeptRow.annual, companyAnnual)
      : 0;

  const fiscalYearLabel = formatFiscalYearLabel(fiscalCalendar, fiscalYear);
  const isWholeCompanyView =
    distributionDeptFilter === 'all' || !distributionDeptFilter;
  const companyOpportunityCount =
    latestCompanyAnnualCommit?.opportunityCount ??
    countUniqueSnapshotOpportunities(latestCompanyAnnualCommit?.lines ?? []);

  const distributionSegments = filteredTeamDistribution.map((item) => ({
    name: item.name,
    amount: item.annual,
  }));

  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <SalesTargetingCurrencyToolbar />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            TARGETS_CONTENT_CLASS,
            TARGETS_PAGE_PADDING_CLASS,
            'space-y-6',
          )}
        >
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <TargetDistributionCard
              label={
                isWholeCompanyView
                  ? 'Company target distribution'
                  : 'Team distribution of department target'
              }
              total={
                isWholeCompanyView
                  ? companyAnnual
                  : (distributionDeptRow?.annual ?? 0)
              }
              totalLabel={
                isWholeCompanyView
                  ? 'total company target'
                  : 'total department target'
              }
              currency={activeCurrencyCode}
              centerLabel={isWholeCompanyView ? 'Company all' : 'Dept teams'}
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
                isHybrid ? 'Company strategic target' : 'Company annual target'
              }
              badge={companyTargetBadge}
              amount={companyAnnual}
              currency={activeCurrencyCode}
              meta={
                showHybridCompanyCard
                  ? `${fiscalYearLabel} company target`
                  : undefined
              }
              count={companyOpportunityCount}
              countLabel={
                companyOpportunityCount === 1
                  ? '1 Contributing Opportunity'
                  : `${companyOpportunityCount} Contributing Opportunities`
              }
              countMeta={`${formatCompactMoney(companyAnnual, activeCurrencyCode)} configured target quota`}
              hybridAccounting={
                showHybridCompanyCard
                  ? (() => {
                      const rollup = getHybridCompanyCardRollup(
                        hybridReconciliation,
                        companyAnnual,
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
                    strategicAmount={companyAnnual}
                    periodLabel={fiscalYearLabel}
                    canEdit={canEditCompanyTarget}
                    horizon="annual"
                    isHybrid={isHybrid}
                    ensureHybridPlan={ensureHybridPlanId}
                    onSaved={() => {
                      void refetchHybridReconciliation();
                    }}
                  />
                ) : (
                  <TargetAmountField
                    key={`company`}
                    value={companyAnnual}
                    currency={activeCurrencyCode}
                    editable={canEditCompanyTarget}
                    savedSourceType={latestCompanyAnnualCommit?.sourceType}
                    forecastRows={companyEditorRows}
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
                    assigneeOptions={companyAssigneeOptions}
                    preferredSelectedKeys={companyPreferredKeys}
                    preferredAllocatedAmounts={Object.fromEntries(
                      (latestCompanyAnnualCommit?.lines ?? []).map((line) => [
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
                        ? `Forecast opportunities for ${fiscalYearLabel}, grouped by department and team.`
                        : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel}.`
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
                    emptyMessage="No live forecast opportunities for this currency yet. Add a custom forecast below to set a target."
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
                title="Company-direct team targets"
                description="These teams report targets directly to the company pool. They are excluded from department allocation math."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {companyDirectTeamRows.map((team, index) => {
                  const teamAnnual = getTeamAnnual(team.id);
                  const teamRows =
                    teamDetailsRowsById.get(team.id) ?? EMPTY_FORECAST_ROWS;
                  const alignedDeals = (
                    teamOpportunitiesUsedById.get(team.id) ?? []
                  ).length;
                  return (
                    <TeamTargetCard
                      key={team.id}
                      name={team.name}
                      amount={teamAnnual}
                      currency={activeCurrencyCode}
                      color={segmentColor(index, teamAnnual)}
                      managerName={teamLeadById.get(team.id) ?? null}
                      targetLabel="Company-direct target"
                      footnote={alignedOpportunitiesFootnote(alignedDeals)}
                      action={
                        <TargetAmountField
                          key={`company-team-${team.id}`}
                          value={teamAnnual}
                          currency={activeCurrencyCode}
                          editable={canEditTeamTarget}
                          savedSourceType={
                            findLatestTeamAnnualCommit(
                              plan,
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
                          teamOptions={teamOptions}
                          teamGroups={teamGroups}
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
                              ? `Seated team target for ${fiscalYearLabel} (view only). Set the company target from Forecast to update amounts.`
                              : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel}. Targets roll up directly to the company.`
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
                              ? 'No forecast opportunities for this team yet.'
                              : 'No company-included opportunities for this team yet.'
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
              title="Department & team annual targets"
              description="Choose a department and set its target from company-selected opportunities for that department's teams. Teams only see an opportunity after this department includes it."
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
                      annual,
                      managerName,
                      managerAvatarUrl,
                    }) => {
                      const selected = deptName === activeDepartment;
                      const sharePct =
                        companyAnnual > 0
                          ? targetSharePercent(annual, companyAnnual)
                          : 0;
                      return (
                        <DepartmentTargetTile
                          key={deptName}
                          name={deptName}
                          amount={annual}
                          currency={activeCurrencyCode}
                          managerName={managerName}
                          managerAvatarUrl={managerAvatarUrl}
                          meta={`${deptTeams.length} team${deptTeams.length === 1 ? '' : 's'} · ${formatTargetPercent(sharePct)} of company`}
                          selected={selected}
                          onSelect={() => setActiveDepartment(deptName)}
                        />
                      );
                    },
                  )}
                </div>

                {activeDeptRow ? (
                  <DepartmentTargetPanel
                    label="Department target"
                    name={activeDeptRow.deptName}
                    meta={
                      useForecastProposalDetails
                        ? `${formatCompactMoney(
                            departmentProposalAmount || activeDeptRow.annual,
                            activeCurrencyCode,
                          )} · ${activeDeptRow.deptTeams.length} team${
                            activeDeptRow.deptTeams.length === 1 ? '' : 's'
                          } · from team proposals`
                        : `${formatCompactMoney(activeDeptRow.annual, activeCurrencyCode)} · ${activeDeptRow.deptTeams.length} team${activeDeptRow.deptTeams.length === 1 ? '' : 's'} · ${formatTargetPercent(activeDeptShare)} of company`
                    }
                    teamsLabel={`Teams in ${activeDeptRow.deptName} & target allocations`}
                    action={
                      <TargetAmountField
                        key={`dept-${activeDeptRow.deptName}`}
                        value={
                          useForecastProposalDetails
                            ? departmentProposalAmount || activeDeptRow.annual
                            : activeDeptRow.annual
                        }
                        currency={activeCurrencyCode}
                        editable={canEditDepartmentTarget}
                        savedSourceType={
                          useForecastProposalDetails
                            ? undefined
                            : findLatestDepartmentAnnualCommit(
                                plan,
                                activeDeptRow.deptId,
                                activePlanCurrency?.currencyId,
                              )?.sourceType
                        }
                        forecastRows={departmentDetailsRows}
                        allowCustomAdd={
                          canEditDepartmentTarget &&
                          useForecastProposalDetails &&
                          !companyOnlyApproval
                        }
                        customOpportunityHint={
                          useForecastProposalDetails && !b2tDeptDetailsViewOnly
                            ? "Adds a custom opportunity to this department's team proposals. Saving updates requests that are not yet company-approved."
                            : null
                        }
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
                          b2tDeptDetailsViewOnly
                            ? `Approved team targets for ${fiscalYearLabel} (read-only). You see dept-approved until company approves; then company-approved replaces it per team. Edit only in Requests.`
                            : useForecastProposalDetails
                              ? `Review and adjust opportunities from team proposals for ${fiscalYearLabel}. Saving updates open approval requests before the next step.`
                              : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel}.`
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
                              ? `No company-approved team targets for ${activeDeptRow.deptName} yet.`
                              : `No step-1-approved team proposals for ${activeDeptRow.deptName} yet. Use Requests to review pending submissions.`
                            : useForecastProposalDetails
                              ? companyOnlyApproval
                                ? `No team proposals at company review yet for ${activeDeptRow.deptName}. Submit from team Details, then company approves in Requests.`
                                : `No department-approved team proposals yet for ${activeDeptRow.deptName}. Complete step 1 in Requests first.`
                              : `Company target does not include opportunities for ${activeDeptRow.deptName}.`
                        }
                        targetBlockedReason={
                          ttbDistributionReadOnly
                            ? 'Top to Bottom: view only. Set the company target from Forecast to seat department and team amounts.'
                            : b2tDeptDetailsViewOnly
                              ? 'Bottom to Top: view only here. Approve, modify, and add custom opportunities in Requests.'
                              : useForecastProposalDetails
                                ? companyOnlyApproval
                                  ? 'Company-only workflow — department does not edit proposals here.'
                                  : null
                                : departmentAnnualReason(activeDeptRow.deptId)
                        }
                        onSaveSelection={
                          canEditDepartmentTarget &&
                          !(useForecastProposalDetails && companyOnlyApproval)
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
                        const teamAnnual = getTeamAnnual(team.id);
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
                            amount={teamAnnual}
                            currency={activeCurrencyCode}
                            color={segmentColor(index, teamAnnual)}
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
                                key={`team-${team.id}`}
                                value={teamAnnual}
                                currency={activeCurrencyCode}
                                editable={canEditTeamTarget}
                                savedSourceType={
                                  findLatestTeamAnnualCommit(
                                    plan,
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
                                teamOptions={teamOptions}
                                teamGroups={teamGroups}
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
                                    ? `Seated team target for ${fiscalYearLabel} (view only). Set the company target from Forecast to update amounts.`
                                    : `Select contributing opportunities or override target amount and quota strategy for ${fiscalYearLabel}.`
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
                                    ? 'No forecast opportunities for this team yet.'
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
