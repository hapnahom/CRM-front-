'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from 'react-query';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { isConfirmReseatRequiredError } from '@/components/sales-targeting/confirmReseat';
import {
  emptyQuarterlyTargets,
  formatFiscalYearQuartersSummary,
  sessionsToQuarterDefinitions,
  type FiscalQuarterDefinition,
} from '@/components/sales-targeting/targetingUtils';
import {
  useCreateSalesTargetPlan,
  useEnsureRequestWorkflowPlan,
  useCommitCompanyAnnual,
  useCommitCompanySession,
  useCommitTeamAnnual,
  useCommitDepartmentAnnual,
  useCommitDepartmentSession,
  useDistributeTeamAnnualTargets,
  useAddPlanCurrency,
  useRemovePlanCurrency,
  useRecalculateForecastFromPipeline,
} from '@/store/server/features/salesTargeting/mutations';
import { useOrgFiscalSettings } from '@/providers/OrgFiscalSettingsProvider';
import {
  buildTeamAllocationsForCurrency,
  fiscalYearLabel,
  getCurrencyCode,
  getDistributedTeamAnnualTotal,
  isPlanEditable,
  isPlanLocked,
  memberDisplayName,
  teamAnnualAmount,
} from '@/store/server/features/salesTargeting/mappers';
import {
  useGetFiscalSessions,
  useGetMyTeamPlanProgress,
  useGetMyTeamSalesTargetPlan,
  useGetPlanProgress,
  useGetSalesTargetPlan,
  useGetSalesTargetPlans,
  useGetSalesTeams,
} from '@/store/server/features/salesTargeting/queries';
import type {
  OrgFiscalCalendar,
  OrgFiscalSession,
  PlanCurrency,
  PlanProgressSummary,
  SalesTargetOpportunityType,
  SalesTargetPlan,
  SalesTargetSourceType,
  SalesTeam,
  TargetSettingMethod,
} from '@/store/server/features/salesTargeting/types';
import {
  readLastPlanByMethod,
  writeLastPlanForMethod,
} from '@/components/sales-targeting/planSelectionMemory';
import {
  bottomUpStartsFromTeamsDescription,
  formatTargetSettingMethod,
  isHybridMethod,
  isRequestWorkflowMethod,
} from '@/components/sales-targeting/targetSettingMethod';
import {
  useGetEnabledCurrencies,
  useGetTenantCurrencies,
} from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { resolveSalesTargetPermissions } from '@/components/sales-targeting/permissions';
import {
  findLatestCompanyAnnualCommit,
  resolveCompanyAnnualAmount,
} from '@/components/sales-targeting/targetingSectionHelpers';
import { useGetSalesTargetingSettings } from '@/store/server/features/salesTargeting/queries';
import { useGetMyTeam } from '@/store/server/features/orgStructure/commercialQueries';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import {
  bottomUpProposerBlockedReason,
  bottomUpProposingTeams,
} from '@/lib/mainDepartmentProposals';

type SalesTargetingContextValue = {
  isLoading: boolean;
  isError: boolean;
  plan: SalesTargetPlan | null;
  plans: SalesTargetPlan[];
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string | null) => void;
  fiscalCalendar: OrgFiscalCalendar | null;
  sessions: OrgFiscalSession[];
  quarterDefinitions: FiscalQuarterDefinition[];
  fiscalYearSummary: string;
  salesTeams: SalesTeam[];
  /** User management → Teams: department that may propose in B2T/Hybrid. */
  mainDepartmentId: string | null;
  mainDepartmentName: string | null;
  bottomUpProposingTeams: SalesTeam[];
  bottomUpProposerBlockedReason: (teamId?: string) => string | null;
  planCurrencies: PlanCurrency[];
  currencyOptions: { value: string; label: string }[];
  teamOptions: { value: string; label: string }[];
  departmentOptions: string[];
  departmentSelectOptions: { value: string; label: string }[];
  currencyCodes: string[];
  activeCurrencyId: string;
  activeCurrencyCode: string;
  activePlanCurrency: PlanCurrency | null;
  setActiveCurrencyId: (id: string) => void;
  selectCurrencyByCode: (code: string) => void;
  progress: PlanProgressSummary[];
  isPlanLocked: boolean;
  isPlanEditable: boolean;
  canManageCompany: boolean;
  canManageCompanyAnnual: boolean;
  canManageDepartmentAnnual: boolean;
  canManageTeamAnnual: boolean;
  canManageTeamSessions: boolean;
  canManageOwnTargets: boolean;
  canViewCompany: boolean;
  isCompanyScope: boolean;
  canViewAny: boolean;
  myTeamSalesTeamId: string | null;
  myTeamSalesTeamName: string | null;
  createPlan: (
    currencyTargets: { currencyId: string; annualAmount: number }[],
    options?: { name?: string; description?: string },
  ) => Promise<SalesTargetPlan | null>;
  /**
   * Find an existing Bottom-to-Top / Hybrid plan for the active FY, or create
   * one from current org settings. Never mutates existing Top-to-Bottom plans.
   */
  findOrCreateRequestWorkflowPlan: () => Promise<SalesTargetPlan | null>;
  orgTargetSettingMethod: TargetSettingMethod;
  /**
   * Set/derive the company annual target, freezing the matching forecast
   * opportunities (or nothing, for manual entries) into a commit snapshot
   * that "Details" can drill into.
   */
  commitCompanyAnnual: (input: AnnualCommitInput) => Promise<void>;
  /** Same as `commitCompanyAnnual` but scoped to a single sales team. */
  commitTeamAnnual: (teamId: string, input: AnnualCommitInput) => Promise<void>;
  /**
   * Save department opportunity selection as the edit pool for its teams.
   * Does not change company or team saved targets.
   */
  commitDepartmentAnnual: (
    departmentId: string,
    input: AnnualCommitInput,
  ) => Promise<void>;
  /** Period variant of `commitDepartmentAnnual`. */
  commitDepartmentSession: (
    sessionId: string,
    departmentId: string,
    input: AnnualCommitInput,
  ) => Promise<void>;
  /** Commit company period target (customs + snapshot) for a fiscal session. */
  commitCompanySession: (
    sessionId: string,
    input: AnnualCommitInput,
  ) => Promise<void>;
  /** Refresh snapshot line values from pipeline; keeps committed amount. */
  recalculateFromPipeline: (commitId: string) => Promise<void>;
  distributeTeamsEvenly: () => Promise<void>;
  getTeamAnnual: (teamId: string) => number;
  getCompanyAnnual: () => number;
  getTeamQuarters: (
    teamId: string,
  ) => ReturnType<typeof buildTeamAllocationsForCurrency>[number];
  teamAllocationsForActiveCurrency: ReturnType<
    typeof buildTeamAllocationsForCurrency
  >;
  availableCurrencyCodes: string[];
  addPlanCurrency: (currencyCode: string) => Promise<void>;
  removePlanCurrency: (currencyCode: string) => Promise<void>;
  refetchAll: () => void;
};

export type AnnualCommitInput = {
  sourceType: SalesTargetSourceType;
  targetValue?: number;
  confirmReseat?: boolean;
  opportunityRefs?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
  }>;
  customOpportunities?: Array<{
    id?: string;
    groupId?: string;
    opportunityName: string;
    forecastValue: number;
    salesTeamId: string;
    assignees?: Array<{ userId: string; amount: number }>;
  }>;
  overrides?: Array<{
    opportunityType: SalesTargetOpportunityType;
    opportunityId: string;
    forecastValue?: number;
    probability?: number;
  }>;
};

const SalesTargetingContext = createContext<SalesTargetingContextValue | null>(
  null,
);

export function useSalesTargeting() {
  const ctx = useContext(SalesTargetingContext);
  if (!ctx) {
    throw new Error(
      'useSalesTargeting must be used within SalesTargetingProvider',
    );
  }
  return ctx;
}

export function SalesTargetingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeCurrencyId, setActiveCurrencyId] = useState('');
  const [draftCurrencyIds, setDraftCurrencyIds] = useState<string[] | null>(
    null,
  );

  const dedupeCurrencyIds = useCallback((currencyIds: string[]) => {
    return [...new Set(currencyIds.filter(Boolean))];
  }, []);

  const {
    canManageCompanyAnnual,
    canManageDepartmentAnnual,
    canManageTeamAnnual,
    canManageTeamSessions,
    canManageOwnTargets,
    canManageCompany,
    canViewCompany,
    isCompanyScope,
    canViewAny,
  } = resolveSalesTargetPermissions();

  const {
    fiscalCalendar,
    isLoading: fyLoading,
    quarterDefinitions: orgQuarterDefinitions,
    sessions: orgFiscalSessions,
  } = useOrgFiscalSettings();
  const { data: plans = [], isLoading: plansLoading } = useGetSalesTargetPlans(
    fiscalCalendar?.id,
    isCompanyScope,
    { includeArchived: true },
  );
  const [selectedPlanId, setSelectedPlanIdState] = useState<string | null>(
    null,
  );

  const {
    data: myTeamContext,
    isLoading: myTeamPlanLoading,
    isError: myTeamPlanError,
  } = useGetMyTeamSalesTargetPlan(!isCompanyScope);
  const { data: salesTeamsFromApi = [], isLoading: teamsLoading } =
    useGetSalesTeams(true);
  const { data: departmentsList } = useGetDepartments();
  const { data: myTeamRecord } = useGetMyTeam(
    !isCompanyScope && salesTeamsFromApi.length === 0,
  );
  const { data: tenantCurrencies = [], isLoading: tenantCurrenciesLoading } =
    useGetTenantCurrencies();
  const { data: targetingSettings } = useGetSalesTargetingSettings(true);

  const orgTargetSettingMethod: TargetSettingMethod =
    targetingSettings?.targetSettingMethod ?? 'TOP_TO_BOTTOM';

  const setSelectedPlanId = useCallback(
    (planId: string | null) => {
      if (planId && isCompanyScope && fiscalCalendar) {
        const row = plans.find((p) => p.id === planId);
        if (
          row &&
          row.calendarId === fiscalCalendar.id &&
          row.targetSettingMethod !== orgTargetSettingMethod
        ) {
          return;
        }
      }
      setSelectedPlanIdState(planId);
      if (!planId || !fiscalCalendar) return;
      const row = plans.find((p) => p.id === planId);
      if (row?.targetSettingMethod) {
        writeLastPlanForMethod(
          fiscalCalendar.id,
          row.targetSettingMethod as TargetSettingMethod,
          planId,
        );
      }
    },
    [fiscalCalendar, plans, isCompanyScope, orgTargetSettingMethod],
  );

  // Latest plan for the saved Settings method (Hybrid ≠ Bottom-to-Top ≠ Top-to-Bottom).
  const preferredPlanForOrgMethod = useMemo(() => {
    if (!fiscalCalendar) return null;
    const preferRequest = isRequestWorkflowMethod(orgTargetSettingMethod);
    return (
      plans
        .filter(
          (p) =>
            p.calendarId === fiscalCalendar.id &&
            p.status !== 'archived' &&
            (preferRequest
              ? p.targetSettingMethod === orgTargetSettingMethod
              : !isRequestWorkflowMethod(p.targetSettingMethod)),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0] ?? null
    );
  }, [fiscalCalendar, plans, orgTargetSettingMethod]);

  const resolvePlanIdForOrgMethod = useCallback((): string | null => {
    if (!fiscalCalendar) return null;
    const fyPlans = plans.filter(
      (p) => p.calendarId === fiscalCalendar.id && p.status !== 'archived',
    );
    const memory = readLastPlanByMethod(fiscalCalendar.id);
    const remembered = memory[orgTargetSettingMethod];
    const rememberedPlan = remembered
      ? fyPlans.find((p) => p.id === remembered)
      : null;
    if (
      rememberedPlan &&
      rememberedPlan.targetSettingMethod === orgTargetSettingMethod
    ) {
      return rememberedPlan.id;
    }
    if (preferredPlanForOrgMethod?.id) {
      return preferredPlanForOrgMethod.id;
    }
    return null;
  }, [
    fiscalCalendar,
    plans,
    orgTargetSettingMethod,
    preferredPlanForOrgMethod,
  ]);

  // Open the latest plan for the saved Settings method; other methods stay in DB.
  useEffect(() => {
    if (!isCompanyScope) {
      if (myTeamContext?.plan?.id) {
        setSelectedPlanIdState(myTeamContext.plan.id);
      }
      return;
    }
    if (!fiscalCalendar) return;

    const fyPlans = plans.filter(
      (p) => p.calendarId === fiscalCalendar.id && p.status !== 'archived',
    );
    const fyPlanIds = new Set(fyPlans.map((p) => p.id));

    const selected = selectedPlanId
      ? fyPlans.find((p) => p.id === selectedPlanId)
      : null;

    if (
      selected &&
      fyPlanIds.has(selected.id) &&
      selected.targetSettingMethod === orgTargetSettingMethod
    ) {
      return;
    }

    const nextId = resolvePlanIdForOrgMethod();
    if (nextId) {
      setSelectedPlanIdState(nextId);
      writeLastPlanForMethod(fiscalCalendar.id, orgTargetSettingMethod, nextId);
      return;
    }

    if (selected && selected.targetSettingMethod !== orgTargetSettingMethod) {
      setSelectedPlanIdState(null);
      return;
    }

    if (selectedPlanId && !fyPlanIds.has(selectedPlanId)) {
      setSelectedPlanIdState(null);
    }
  }, [
    isCompanyScope,
    myTeamContext?.plan?.id,
    fiscalCalendar,
    plans,
    selectedPlanId,
    orgTargetSettingMethod,
    resolvePlanIdForOrgMethod,
  ]);

  const resolvedPlanId = isCompanyScope
    ? selectedPlanId
    : myTeamContext?.plan?.id;

  const {
    data: companyPlan,
    isLoading: companyPlanLoading,
    isError: companyPlanError,
  } = useGetSalesTargetPlan(
    isCompanyScope ? (resolvedPlanId ?? undefined) : undefined,
  );

  const plan = isCompanyScope ? companyPlan : myTeamContext?.plan;
  const planError = isCompanyScope ? companyPlanError : myTeamPlanError;

  const salesTeams = useMemo(() => {
    const source =
      salesTeamsFromApi.length > 0
        ? salesTeamsFromApi
        : myTeamContext
          ? [
              {
                id: myTeamContext.salesTeamId,
                name: myTeamContext.salesTeamName,
                parentDepartmentId: myTeamRecord?.parentDepartmentId ?? '',
                parentDepartmentName:
                  myTeamRecord?.parentDepartmentName ?? 'Sales',
                teamLeadId: myTeamRecord?.teamLeadId ?? null,
                targetParentLevel: myTeamRecord?.targetParentLevel,
              },
            ]
          : [];
    if (!isCompanyScope && Array.isArray(myTeamContext?.scopeTeamIds)) {
      const allowed = new Set(myTeamContext.scopeTeamIds);
      return source.filter((team) => allowed.has(team.id));
    }
    return source;
  }, [salesTeamsFromApi, myTeamContext, myTeamRecord, isCompanyScope]);

  const mainDepartmentId = useMemo(() => {
    const fromSettings = targetingSettings?.mainDepartmentId?.trim();
    if (fromSettings) return fromSettings;
    const main = departmentsList?.data?.find((d) => d.isMain === true);
    return main?.id?.trim() ?? null;
  }, [targetingSettings?.mainDepartmentId, departmentsList?.data]);

  const mainDepartmentName = useMemo(() => {
    if (!mainDepartmentId) return null;
    const fromSettings = targetingSettings?.mainDepartmentName?.trim();
    if (fromSettings) return fromSettings;
    const main = departmentsList?.data?.find((d) => d.id === mainDepartmentId);
    return main?.name?.trim() ?? null;
  }, [
    departmentsList?.data,
    mainDepartmentId,
    targetingSettings?.mainDepartmentName,
  ]);

  const bottomUpProposingTeamsList = useMemo(
    () => bottomUpProposingTeams(salesTeams, mainDepartmentId),
    [salesTeams, mainDepartmentId],
  );

  const resolveBottomUpProposerBlockedReason = useCallback(
    (teamId?: string) => {
      const team = teamId
        ? salesTeams.find((row) => row.id === teamId)
        : undefined;
      return bottomUpProposerBlockedReason(mainDepartmentId, team);
    },
    [mainDepartmentId, salesTeams],
  );

  const departmentOptions = useMemo(() => {
    const byName = new Map<string, string | null>();
    for (const team of salesTeams) {
      const name = team.parentDepartmentName?.trim();
      if (!name) continue;
      const id = team.parentDepartmentId?.trim() || null;
      const existing = byName.get(name);
      if (existing == null && id) {
        byName.set(name, id);
      } else if (!byName.has(name)) {
        byName.set(name, id);
      }
    }

    const withIds = [...byName.entries()]
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([name, id]) => ({ id, name }));
    const withoutIds = [...byName.entries()]
      .filter(([, id]) => !id)
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b));

    const sorted = [...withIds].sort((a, b) => a.name.localeCompare(b.name));

    return [...sorted.map((department) => department.name), ...withoutIds];
  }, [salesTeams]);

  const { data: sessions = [], isLoading: sessionsLoading } =
    useGetFiscalSessions(plan?.calendarId ?? fiscalCalendar?.id);

  const safeSessions = useMemo(() => {
    const planUsesOrgCalendar =
      Boolean(fiscalCalendar?.id) &&
      (!plan?.calendarId || plan.calendarId === fiscalCalendar?.id);
    if (planUsesOrgCalendar && orgFiscalSessions.length > 0) {
      return orgFiscalSessions;
    }
    return sessions ?? [];
  }, [fiscalCalendar?.id, orgFiscalSessions, plan?.calendarId, sessions]);

  const { data: companyProgress = [] } = useGetPlanProgress(
    plan?.id,
    undefined,
    isCompanyScope && Boolean(plan?.id),
  );
  const { data: myTeamProgress = [] } = useGetMyTeamPlanProgress(
    plan?.id,
    undefined,
    !isCompanyScope && Boolean(plan?.id),
  );
  const progress = isCompanyScope ? companyProgress : myTeamProgress;

  const createPlanMutation = useCreateSalesTargetPlan();
  const ensureRequestWorkflowPlanMutation = useEnsureRequestWorkflowPlan();
  const addPlanCurrencyMutation = useAddPlanCurrency();
  const removePlanCurrencyMutation = useRemovePlanCurrency();
  const distributeMutation = useDistributeTeamAnnualTargets();
  const commitCompanyAnnualMutation = useCommitCompanyAnnual();
  const commitCompanySessionMutation = useCommitCompanySession();
  const recalculateFromPipelineMutation = useRecalculateForecastFromPipeline();
  const commitTeamAnnualMutation = useCommitTeamAnnual();
  const commitDepartmentAnnualMutation = useCommitDepartmentAnnual();
  const commitDepartmentSessionMutation = useCommitDepartmentSession();

  const currencyById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; description?: string }
    >();
    for (const tc of tenantCurrencies) {
      if (tc.currency) map.set(tc.currencyId, tc.currency);
    }
    return map;
  }, [tenantCurrencies]);

  const enrichPlanCurrency = useCallback(
    (entry: PlanCurrency): PlanCurrency => ({
      ...entry,
      currency: entry.currency ?? currencyById.get(entry.currencyId),
    }),
    [currencyById],
  );

  const defaultCurrencyIds = useMemo(() => {
    const fromTenant = dedupeCurrencyIds(tenantCurrencies.map((tc) => tc.currencyId));
    if (fromTenant.length > 0) return fromTenant;
    return ['ETB'];
  }, [tenantCurrencies, dedupeCurrencyIds]);

  const effectiveDraftCurrencyIds = draftCurrencyIds ?? defaultCurrencyIds;

  const planCurrencies = useMemo(() => {
    if (plan && plan.currencyTargets && plan.currencyTargets.length > 0) {
      return plan.currencyTargets.map(enrichPlanCurrency);
    }

    const tenantCurrencyById = new Map(
      tenantCurrencies.map((tc) => [tc.currencyId, tc.currency]),
    );

    return effectiveDraftCurrencyIds.map((currencyId) => {
      const currency =
        tenantCurrencyById.get(currencyId) ??
        currencyById.get(currencyId) ?? {
          id: currencyId,
          name: currencyId,
          description: currencyId,
        };
      return {
        id: `pending-${currencyId}`,
        planId: plan?.id ?? '',
        currencyId,
        annualAmount: 0,
        tenantId: '',
        currency,
        allocations: [],
      } as PlanCurrency;
    });
  }, [
    plan,
    tenantCurrencies,
    effectiveDraftCurrencyIds,
    currencyById,
    enrichPlanCurrency,
  ]);

  const planCurrencyKey = useMemo(
    () =>
      plan?.currencyTargets
        ?.map((entry) => entry.id)
        .sort()
        .join(',') ?? '',
    [plan?.currencyTargets],
  );

  useEffect(() => {
    if (!plan?.currencyTargets?.length) return;
    const nextIds = plan.currencyTargets.map((entry) => entry.currencyId);
    setDraftCurrencyIds((current) => {
      if (
        current &&
        current.length === nextIds.length &&
        current.every((id, index) => id === nextIds[index])
      ) {
        return current;
      }
      return nextIds;
    });
  }, [plan?.id, planCurrencyKey]);

  const availableCurrencyCodes = useMemo(() => {
    const codes = tenantCurrencies
      .map((tc) => tc.currency?.name?.trim())
      .filter((name): name is string => Boolean(name));
    return [...new Set(codes)].sort();
  }, [tenantCurrencies]);

  const currencyCodes = planCurrencies.map(getCurrencyCode);

  const currencyOptions = useMemo(
    () =>
      planCurrencies.map((entry) => ({
        value: entry.id,
        label: getCurrencyCode(entry),
      })),
    [planCurrencies],
  );

  const teamOptions = useMemo(
    () =>
      salesTeams.map((team) => ({
        value: team.id,
        label: team.name,
      })),
    [salesTeams],
  );

  const departmentSelectOptions = useMemo(
    () =>
      departmentOptions.map((name) => ({
        value: name,
        label: name,
      })),
    [departmentOptions],
  );

  useEffect(() => {
    if (!planCurrencies.length) return;
    const fallbackId = planCurrencies[0]?.id ?? '';
    if (!fallbackId) return;
    setActiveCurrencyId((current) => {
      if (current && planCurrencies.some((c) => c.id === current)) {
        return current;
      }
      return fallbackId;
    });
  }, [planCurrencies]);

  const activePlanCurrency = useMemo(
    () =>
      planCurrencies.find((c) => c.id === activeCurrencyId) ??
      planCurrencies[0] ??
      null,
    [planCurrencies, activeCurrencyId],
  );

  const activeCurrencyCode = activePlanCurrency
    ? getCurrencyCode(activePlanCurrency)
    : (currencyCodes[0] ?? '');

  const quarterDefinitions = useMemo(() => {
    if (orgQuarterDefinitions.length > 0) return orgQuarterDefinitions;
    return sessionsToQuarterDefinitions(safeSessions);
  }, [orgQuarterDefinitions, safeSessions]);

  const fiscalYearSummary = useMemo(() => {
    if (!fiscalCalendar) return 'Quarter periods not configured';
    return formatFiscalYearQuartersSummary(quarterDefinitions);
  }, [fiscalCalendar, quarterDefinitions]);

  const teamAllocationsForActiveCurrency = useMemo(() => {
    if (!activePlanCurrency) return [];
    if (!plan) {
      return salesTeams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        quarters: emptyQuarterlyTargets(),
      }));
    }
    return buildTeamAllocationsForCurrency(
      plan,
      activePlanCurrency,
      salesTeams,
      safeSessions,
    );
  }, [plan, activePlanCurrency, salesTeams, safeSessions]);

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sales-target-plans'] });
    queryClient.invalidateQueries({ queryKey: ['my-team-sales-target-plan'] });
    if (plan?.id) {
      queryClient.invalidateQueries({
        queryKey: ['sales-target-plan', plan.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales-target-progress', plan.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['my-team-sales-target-progress', plan.id],
      });
    }
  }, [queryClient, plan?.id]);

  const showError = (error: unknown) => {
    const raw = (error as { response?: { data?: { message?: unknown } } })
      ?.response?.data?.message;
    const nested =
      raw && typeof raw === 'object'
        ? (raw as { message?: unknown }).message
        : undefined;
    const description =
      typeof raw === 'string'
        ? raw
        : typeof nested === 'string'
          ? nested
          : 'Something went wrong';
    NotificationMessage.error({ message: 'Error', description });
  };

  const createPlan = useCallback(
    async (
      currencyTargets: { currencyId: string; annualAmount: number }[],
      options?: { name?: string; description?: string },
    ): Promise<SalesTargetPlan | null> => {
      if (!fiscalCalendar) {
        NotificationMessage.error({
          message: 'Error',
          description: 'No active fiscal year configured.',
        });
        return null;
      }
      try {
        const created = await createPlanMutation.mutateAsync({
          calendarId: fiscalCalendar.id,
          currencyTargets,
          name: options?.name,
          description: options?.description,
        });
        NotificationMessage.success({
          message: 'Plan created',
          description: `Created with ${formatTargetSettingMethod(
            created.targetSettingMethod,
          )} workflow.`,
        });
        return created;
      } catch (error) {
        showError(error);
        throw error;
      }
    },
    [createPlanMutation, fiscalCalendar],
  );

  const findOrCreateRequestWorkflowPlan = useCallback(async () => {
    if (!fiscalCalendar) {
      NotificationMessage.error({
        message: 'Error',
        description: 'No active fiscal year configured.',
      });
      return null;
    }
    if (!isRequestWorkflowMethod(orgTargetSettingMethod)) {
      NotificationMessage.error({
        message: 'Wrong org method',
        description:
          'Set Target Settings to Bottom to Top or Hybrid before submitting team proposals for approval.',
      });
      return null;
    }

    const existing =
      preferredPlanForOrgMethod &&
      preferredPlanForOrgMethod.targetSettingMethod === orgTargetSettingMethod
        ? preferredPlanForOrgMethod
        : plans
            .filter(
              (p) =>
                p.calendarId === fiscalCalendar.id &&
                p.status !== 'archived' &&
                p.targetSettingMethod === orgTargetSettingMethod,
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            )[0];
    if (existing) {
      setSelectedPlanId(existing.id);
      return existing;
    }

    const currencyIds =
      planCurrencies.length > 0
        ? dedupeCurrencyIds(planCurrencies.map((c) => c.currencyId))
        : dedupeCurrencyIds(tenantCurrencies.map((c) => c.currencyId));

    if (!currencyIds.length) {
      NotificationMessage.error({
        message: 'Currency required',
        description: isHybridMethod(orgTargetSettingMethod)
          ? 'Add a tenant currency before creating a Hybrid plan.'
          : 'Add a tenant currency before creating a Bottom-to-Top plan.',
      });
      return null;
    }

    const methodLabel = formatTargetSettingMethod(orgTargetSettingMethod);
    try {
      const created = await ensureRequestWorkflowPlanMutation.mutateAsync({
        calendarId: fiscalCalendar.id,
        currencyTargets: currencyIds.map((currencyId) => ({
          currencyId,
          annualAmount: 0,
        })),
        name: `${fiscalYearLabel(fiscalCalendar)} (${methodLabel})`,
        description: `Created for team forecast proposals (${methodLabel}).`,
      });
      setSelectedPlanId(created.id);
      return created;
    } catch (error) {
      showError(error);
      return null;
    }
  }, [
    fiscalCalendar,
    orgTargetSettingMethod,
    plans,
    planCurrencies,
    tenantCurrencies,
    dedupeCurrencyIds,
    ensureRequestWorkflowPlanMutation,
    preferredPlanForOrgMethod,
  ]);

  const resolvePlanCurrency = useCallback(
    (targetPlan: SalesTargetPlan, currencyId: string) =>
      targetPlan.currencyTargets.find((c) => c.currencyId === currencyId) ??
      targetPlan.currencyTargets[0] ??
      null,
    [],
  );

  // Bridges the gap between creating a plan and react-query catching up with
  // the new plan, so a burst of commits (e.g. "Derive from forecast" looping
  // over every team) all land on the same freshly-created plan instead of
  // each creating their own.
  const pendingPlanRef = useRef<SalesTargetPlan | null>(null);
  useEffect(() => {
    if (plan) pendingPlanRef.current = null;
  }, [plan]);

  const ensurePlan = useCallback(async (): Promise<SalesTargetPlan | null> => {
    if (!fiscalCalendar) {
      NotificationMessage.error({
        message: 'Error',
        description: 'No active fiscal year configured.',
      });
      return null;
    }

    // Top-down commits are not used for B2T/Hybrid — workflow starts from teams.
    if (isRequestWorkflowMethod(orgTargetSettingMethod)) {
      NotificationMessage.info({
        message: 'Start from team targets',
        description: bottomUpStartsFromTeamsDescription(orgTargetSettingMethod),
      });
      return null;
    }

    const isTopDownPlan = (p: SalesTargetPlan) =>
      !isRequestWorkflowMethod(p.targetSettingMethod) &&
      p.status !== 'archived';

    if (pendingPlanRef.current && isTopDownPlan(pendingPlanRef.current)) {
      return pendingPlanRef.current;
    }

    if (plan && isTopDownPlan(plan)) {
      return plan;
    }

    const existingTopDown =
      preferredPlanForOrgMethod && isTopDownPlan(preferredPlanForOrgMethod)
        ? preferredPlanForOrgMethod
        : plans
            .filter(
              (p) =>
                p.calendarId === fiscalCalendar.id &&
                p.status !== 'archived' &&
                !isRequestWorkflowMethod(p.targetSettingMethod),
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            )[0];

    if (existingTopDown) {
      if (plan?.id !== existingTopDown.id) {
        setSelectedPlanId(existingTopDown.id);
      }
      return existingTopDown;
    }

    const currencyIds =
      planCurrencies.length > 0
        ? dedupeCurrencyIds(planCurrencies.map((c) => c.currencyId))
        : dedupeCurrencyIds(tenantCurrencies.map((c) => c.currencyId));

    if (!currencyIds.length) {
      NotificationMessage.error({
        message: 'Currency required',
        description:
          'Add a tenant currency before creating a Top to Bottom plan.',
      });
      return null;
    }

    const created = await createPlan(
      currencyIds.map((currencyId) => ({ currencyId, annualAmount: 0 })),
      {
        name: `${fiscalYearLabel(fiscalCalendar)} (Top to Bottom)`,
        description:
          'Created for top-down company / team targets matching current Settings.',
      },
    );
    if (created) {
      setSelectedPlanId(created.id);
      pendingPlanRef.current = created;
    }
    return created;
  }, [
    plan,
    plans,
    fiscalCalendar,
    planCurrencies,
    tenantCurrencies,
    createPlan,
    dedupeCurrencyIds,
    orgTargetSettingMethod,
    preferredPlanForOrgMethod,
  ]);

  const commitCompanyAnnual = useCallback(
    async (input: AnnualCommitInput) => {
      if (!activePlanCurrency) return;
      const targetPlan = await ensurePlan();
      if (!targetPlan) return;

      const planCurrency = resolvePlanCurrency(
        targetPlan,
        activePlanCurrency.currencyId,
      );
      if (!planCurrency) return;

      try {
        await commitCompanyAnnualMutation.mutateAsync({
          planId: targetPlan.id,
          planCurrencyId: planCurrency.id,
          ...input,
        });
        refetchAll();
      } catch (error) {
        if (!isConfirmReseatRequiredError(error)) showError(error);
        throw error;
      }
    },
    [
      activePlanCurrency,
      ensurePlan,
      resolvePlanCurrency,
      commitCompanyAnnualMutation,
      refetchAll,
    ],
  );

  const commitCompanySession = useCallback(
    async (sessionId: string, input: AnnualCommitInput) => {
      if (!activePlanCurrency || !sessionId) return;
      const targetPlan = await ensurePlan();
      if (!targetPlan) return;

      const planCurrency = resolvePlanCurrency(
        targetPlan,
        activePlanCurrency.currencyId,
      );
      if (!planCurrency) return;

      try {
        await commitCompanySessionMutation.mutateAsync({
          planId: targetPlan.id,
          sessionId,
          planCurrencyId: planCurrency.id,
          ...input,
        });
        refetchAll();
      } catch (error) {
        if (!isConfirmReseatRequiredError(error)) showError(error);
        throw error;
      }
    },
    [
      activePlanCurrency,
      ensurePlan,
      resolvePlanCurrency,
      commitCompanySessionMutation,
      refetchAll,
    ],
  );

  const recalculateFromPipeline = useCallback(
    async (commitId: string) => {
      const targetPlan = plan ?? pendingPlanRef.current;
      if (!targetPlan?.id || !commitId) return;
      try {
        await recalculateFromPipelineMutation.mutateAsync({
          planId: targetPlan.id,
          commitId,
        });
        refetchAll();
      } catch (error) {
        showError(error);
        throw error;
      }
    },
    [plan, recalculateFromPipelineMutation, refetchAll],
  );

  const commitTeamAnnual = useCallback(
    async (teamId: string, input: AnnualCommitInput) => {
      if (!activePlanCurrency) return;
      const targetPlan = await ensurePlan();
      if (!targetPlan) return;

      const planCurrency = resolvePlanCurrency(
        targetPlan,
        activePlanCurrency.currencyId,
      );
      if (!planCurrency) return;

      try {
        await commitTeamAnnualMutation.mutateAsync({
          planId: targetPlan.id,
          planCurrencyId: planCurrency.id,
          orgDepartmentId: teamId,
          ...input,
        });
        refetchAll();
      } catch (error) {
        showError(error);
        throw error;
      }
    },
    [
      activePlanCurrency,
      ensurePlan,
      resolvePlanCurrency,
      commitTeamAnnualMutation,
      refetchAll,
    ],
  );

  const commitDepartmentAnnual = useCallback(
    async (departmentId: string, input: AnnualCommitInput) => {
      if (!activePlanCurrency) return;
      const targetPlan = await ensurePlan();
      if (!targetPlan) return;
      const planCurrency = resolvePlanCurrency(
        targetPlan,
        activePlanCurrency.currencyId,
      );
      if (!planCurrency) return;
      try {
        await commitDepartmentAnnualMutation.mutateAsync({
          planId: targetPlan.id,
          planCurrencyId: planCurrency.id,
          orgUnitId: departmentId,
          ...input,
        });
        refetchAll();
      } catch (error) {
        showError(error);
        throw error;
      }
    },
    [
      activePlanCurrency,
      ensurePlan,
      resolvePlanCurrency,
      commitDepartmentAnnualMutation,
      refetchAll,
    ],
  );

  const commitDepartmentSession = useCallback(
    async (
      sessionId: string,
      departmentId: string,
      input: AnnualCommitInput,
    ) => {
      if (!activePlanCurrency || !sessionId) return;
      const targetPlan = await ensurePlan();
      if (!targetPlan) return;
      const planCurrency = resolvePlanCurrency(
        targetPlan,
        activePlanCurrency.currencyId,
      );
      if (!planCurrency) return;
      try {
        await commitDepartmentSessionMutation.mutateAsync({
          planId: targetPlan.id,
          sessionId,
          planCurrencyId: planCurrency.id,
          orgUnitId: departmentId,
          ...input,
        });
        refetchAll();
      } catch (error) {
        showError(error);
        throw error;
      }
    },
    [
      activePlanCurrency,
      ensurePlan,
      resolvePlanCurrency,
      commitDepartmentSessionMutation,
      refetchAll,
    ],
  );

  const distributeTeamsEvenly = useCallback(async () => {
    if (!plan || !activePlanCurrency || !salesTeams.length) return;
    const companyAnnual = Number(activePlanCurrency.annualAmount);
    const perTeam = Math.floor(companyAnnual / salesTeams.length);
    let remainder = companyAnnual;
    const allocations = salesTeams.map((team, index) => {
      const amount = index === salesTeams.length - 1 ? remainder : perTeam;
      remainder -= amount;
      return {
        planCurrencyId: activePlanCurrency.id,
        orgDepartmentId: team.id,
        amount,
      };
    });
    try {
      await distributeMutation.mutateAsync({ planId: plan.id, allocations });
    } catch (error) {
      showError(error);
      throw error;
    }
  }, [plan, activePlanCurrency, salesTeams, distributeMutation]);

  const selectCurrencyByCode = useCallback(
    (code: string) => {
      const match = planCurrencies.find((c) => getCurrencyCode(c) === code);
      if (match) setActiveCurrencyId(match.id);
    },
    [planCurrencies],
  );

  const addPlanCurrency = useCallback(
    async (currencyCode: string) => {
      const match = tenantCurrencies.find(
        (tc) => tc.currency?.name === currencyCode,
      )?.currency;
      if (!match) return;

      if (plan) {
        if (!isPlanEditable(plan) || !canManageCompany) return;
        if (
          plan.currencyTargets.some((entry) => entry.currencyId === match.id)
        ) {
          const existing = plan.currencyTargets.find(
            (entry) => entry.currencyId === match.id,
          );
          if (existing) setActiveCurrencyId(existing.id);
          return;
        }
        try {
          const updated = await addPlanCurrencyMutation.mutateAsync({
            planId: plan.id,
            currencyId: match.id,
          });
          setDraftCurrencyIds(
            (updated.currencyTargets ?? []).map((entry) => entry.currencyId),
          );
          const added = updated.currencyTargets.find(
            (entry) => entry.currencyId === match.id,
          );
          if (added) setActiveCurrencyId(added.id);
        } catch (error) {
          showError(error);
        }
        return;
      }

      setDraftCurrencyIds((current) => {
        const base = current ?? defaultCurrencyIds;
        if (base.includes(match.id)) return base;
        return [...base, match.id];
      });
      setActiveCurrencyId(`pending-${match.id}`);
    },
    [
      plan,
      tenantCurrencies,
      defaultCurrencyIds,
      addPlanCurrencyMutation,
      canManageCompany,
    ],
  );

  const removePlanCurrency = useCallback(
    async (currencyCode: string) => {
      const target = planCurrencies.find(
        (c) => getCurrencyCode(c) === currencyCode,
      );
      if (!target || planCurrencies.length <= 1) return;

      if (plan) {
        if (!isPlanEditable(plan) || !canManageCompany) return;
        if (target.id.startsWith('pending-')) {
          showError(new Error('Save the plan before removing currencies.'));
          return;
        }
        if (!plan.currencyTargets.some((entry) => entry.id === target.id)) {
          return;
        }
        try {
          const updated = await removePlanCurrencyMutation.mutateAsync({
            planId: plan.id,
            planCurrencyId: target.id,
          });

          const remaining = updated.currencyTargets ?? [];
          setDraftCurrencyIds(remaining.map((entry) => entry.currencyId));

          if (!remaining.some((entry) => entry.id === activeCurrencyId)) {
            const next = remaining[0];
            if (next) setActiveCurrencyId(next.id);
          }

          NotificationMessage.success({
            message: 'Currency removed',
            description: `${currencyCode} was removed from this sales target plan.`,
          });
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          if (plan && (status === 404 || status === 410)) {
            const remaining = plan.currencyTargets.filter(
              (entry) => entry.id !== target.id,
            );
            queryClient.setQueryData(['sales-target-plan', plan.id], {
              ...plan,
              currencyTargets: remaining,
            });
            setDraftCurrencyIds(remaining.map((entry) => entry.currencyId));
            if (!remaining.some((entry) => entry.id === activeCurrencyId)) {
              const next = remaining[0];
              if (next) setActiveCurrencyId(next.id);
            }
            refetchAll();
          }
          showError(error);
          throw error;
        }
        return;
      }

      setDraftCurrencyIds((current) => {
        const base = current ?? defaultCurrencyIds;
        if (base.length <= 1) return base;
        return base.filter((id) => id !== target.currencyId);
      });
      if (activeCurrencyId === target.id) {
        const remaining = planCurrencies.filter((c) => c.id !== target.id);
        setActiveCurrencyId(remaining[0]?.id ?? '');
      }

      NotificationMessage.success({
        message: 'Currency removed',
        description: `${currencyCode} was removed from the currency list.`,
      });
    },
    [
      plan,
      planCurrencies,
      activeCurrencyId,
      defaultCurrencyIds,
      removePlanCurrencyMutation,
      canManageCompany,
      queryClient,
      refetchAll,
    ],
  );

  const value: SalesTargetingContextValue = {
    isLoading: false,
    isError: planError,
    plan: plan ?? null,
    plans: isCompanyScope ? plans : plan ? [plan] : [],
    selectedPlanId: selectedPlanId ?? plan?.id ?? null,
    setSelectedPlanId,
    fiscalCalendar: fiscalCalendar ?? null,
    sessions: safeSessions,
    quarterDefinitions,
    fiscalYearSummary,
    salesTeams,
    mainDepartmentId,
    mainDepartmentName,
    bottomUpProposingTeams: bottomUpProposingTeamsList,
    bottomUpProposerBlockedReason: resolveBottomUpProposerBlockedReason,
    planCurrencies,
    currencyOptions,
    teamOptions,
    departmentOptions,
    departmentSelectOptions,
    currencyCodes,
    activeCurrencyId,
    activeCurrencyCode,
    activePlanCurrency,
    setActiveCurrencyId,
    selectCurrencyByCode,
    progress,
    isPlanLocked: isPlanLocked(plan),
    isPlanEditable:
      isPlanEditable(plan) &&
      (canManageCompanyAnnual ||
        canManageDepartmentAnnual ||
        canManageTeamAnnual ||
        canManageTeamSessions ||
        canManageOwnTargets),
    canManageCompany,
    canManageCompanyAnnual,
    canManageDepartmentAnnual,
    canManageTeamAnnual,
    canManageTeamSessions,
    canManageOwnTargets,
    canViewCompany,
    isCompanyScope,
    canViewAny,
    myTeamSalesTeamId: myTeamContext?.salesTeamId ?? null,
    myTeamSalesTeamName: myTeamContext?.salesTeamName ?? null,
    createPlan,
    findOrCreateRequestWorkflowPlan,
    orgTargetSettingMethod,
    commitCompanyAnnual,
    commitCompanySession,
    recalculateFromPipeline,
    commitTeamAnnual,
    commitDepartmentAnnual,
    commitDepartmentSession,
    distributeTeamsEvenly,
    getTeamAnnual: (teamId) =>
      plan && activePlanCurrency
        ? teamAnnualAmount(plan, activePlanCurrency.id, teamId)
        : 0,
    getCompanyAnnual: () =>
      resolveCompanyAnnualAmount(
        Number(activePlanCurrency?.annualAmount ?? 0),
        findLatestCompanyAnnualCommit(plan, activePlanCurrency?.currencyId),
      ),
    getTeamQuarters: (teamId) =>
      teamAllocationsForActiveCurrency.find((t) => t.teamId === teamId) ?? {
        teamId,
        teamName: salesTeams.find((t) => t.id === teamId)?.name ?? '',
        quarters: emptyQuarterlyTargets(),
      },
    teamAllocationsForActiveCurrency,
    availableCurrencyCodes,
    addPlanCurrency,
    removePlanCurrency,
    refetchAll,
  };

  return (
    <SalesTargetingContext.Provider value={value}>
      {children}
    </SalesTargetingContext.Provider>
  );
}

export function usePlanSetupOptions() {
  const { data: currencies = [] } = useGetEnabledCurrencies();
  return currencies;
}

export { memberDisplayName, fiscalYearLabel, getDistributedTeamAnnualTotal };
