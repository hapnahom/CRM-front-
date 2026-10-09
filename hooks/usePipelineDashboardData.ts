'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { dealUiLabel } from '@/config/salesWorkflow';
import { usePipelineDashboardScope } from '@/hooks/usePipelineDashboardScope';
import {
  chartCurrencyForPipeline,
  isAllCurrencies,
  type PipelineFilterSelection,
} from '@/modules/sales-pipeline/pipeline-filter';
import {
  useOptionalPipelineWorkspaceFilters,
  usePipelineOrgListParams,
} from '@/modules/sales-pipeline/pipeline-filters';
import { usePipelineCurrencies } from '@/store/server/features/deals/pipeline/currency-queries';
import { usePipelineModuleDashboard } from '@/store/server/features/pipeline/dashboard/queries';
import type {
  PipelineDashboardCurrency,
  PipelineDashboardHighValueRecord,
  PipelineModuleDashboardParams,
} from '@/store/server/features/pipeline/dashboard/types';
import {
  commercialMemberAssignmentId,
  commercialMemberLabel,
  useGetCommercialSalesTeamMembers,
  useGetCommercialSalesTeams,
  useGetMySalesTeamMembers,
} from '@/store/server/features/orgStructure/commercialQueries';
import { type Solution } from '@/store/server/features/leads/solution/queries';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type {
  DashboardCurrency,
  DashboardFilters,
  DashboardPeriod,
  DashboardScope,
  HighValueRecord,
  MockRepresentative,
  MockTeam,
  PeriodTotals,
  PeriodValueTotals,
} from '@/modules/pipeline/dashboard-mock-data';
import { formatDashboardValue } from '@/modules/pipeline/dashboard-mock-data';
import type { SalesTeam } from '@/store/server/features/salesTargeting/types';
import type { CommercialTeamMember } from '@/store/server/features/salesTargeting/types';

export type PipelineModule = 'leads' | 'deals';

export type FilterChip =
  | {
      id: string;
      kind: 'team';
      role: 'Team';
      team: MockTeam;
      onClear: () => void;
    }
  | {
      id: string;
      kind: 'person';
      role: 'Responsible';
      person: MockRepresentative;
      onClear: () => void;
    }
  | {
      id: string;
      kind: 'solution';
      label: string;
      onClear: () => void;
    };

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

const EMPTY_PERIOD_TOTALS: PeriodTotals = {
  daily: 0,
  weekly: 0,
  monthly: 0,
  quarter: 0,
};

function toMockTeam(team: SalesTeam): MockTeam {
  return {
    id: team.id,
    name: team.name,
    description: team.parentDepartmentName || '',
  };
}

function toMockRep(
  member: CommercialTeamMember,
  teamId: string,
): MockRepresentative | null {
  const id = commercialMemberAssignmentId(member);
  if (!id) return null;
  return {
    id,
    name: commercialMemberLabel(member),
    teamId,
  };
}

function mapHighValueRecord(
  record: PipelineDashboardHighValueRecord,
  currency: string,
  useRecordCurrency = false,
): HighValueRecord {
  const recordCurrency =
    record.currency === 'USD' ? 'USD' : ('ETB' as DashboardCurrency);
  const displayCurrency = useRecordCurrency ? recordCurrency : currency;
  return {
    id: record.id,
    name: record.name,
    customer: record.customer,
    value: formatDashboardValue(Number(record.value ?? 0), displayCurrency),
    valueAmount: Number(record.value ?? 0),
    currency: recordCurrency,
    stage: record.stage,
    owner: record.owner,
    teamId: '',
    teamName: record.owner,
    repId: record.responsibleUserId ?? '',
    presalesTeamIds: [],
    presalesRepIds: [],
    channelRepIds: [],
    solutionId: record.solutionCategory ?? undefined,
  };
}

function activeFilterLabel(
  filters: DashboardFilters,
  salesTeams: MockTeam[],
  salesReps: MockRepresentative[],
): string {
  if (filters.salesRepId) {
    return (
      salesReps.find((r) => r.id === filters.salesRepId)?.name ?? 'Responsible'
    );
  }
  if (filters.salesTeamId) {
    return salesTeams.find((t) => t.id === filters.salesTeamId)?.name ?? 'Team';
  }
  return 'All teams';
}

function orgFilterScopeLabel(filter: PipelineFilterSelection): string {
  if (filter.type === 'all') return 'All teams & owners';
  if (filter.type === 'department') return filter.departmentName;
  if (filter.type === 'team') return filter.teamName;
  return filter.memberName;
}

function orgParamsForModuleDashboard(
  orgParams: Record<string, string | undefined>,
  highValueLimit = 6,
): PipelineModuleDashboardParams {
  const {
    affectedUserId,
    currency,
    departmentId,
    teamId,
    responsibleUserId,
    sessionId,
    sessionIds,
  } = orgParams;

  const params: PipelineModuleDashboardParams = { highValueLimit };
  if (departmentId) params.departmentId = departmentId;
  if (teamId) params.teamId = teamId;
  if (responsibleUserId) params.responsibleUserId = responsibleUserId;
  if (sessionId) params.sessionId = sessionId;
  if (sessionIds) params.sessionIds = sessionIds;
  if (affectedUserId) params.affectedUserIds = [affectedUserId];
  if (currency && !isAllCurrencies(currency)) params.currency = currency;
  return params;
}

export function usePipelineDashboardData(module: PipelineModule) {
  const scope = usePipelineDashboardScope();
  const orgFilters = useOptionalPipelineWorkspaceFilters();
  const orgParams = usePipelineOrgListParams();
  const { data: tenantCurrencies } = usePipelineCurrencies();
  const [period, setPeriod] = useState<DashboardPeriod>('quarter');
  const [currency, setCurrency] = useState<DashboardCurrency>('ETB');
  const usesSharedFilters = Boolean(orgFilters);
  const activeCurrency = usesSharedFilters
    ? ((chartCurrencyForPipeline(orgFilters!.currency, tenantCurrencies) ??
        'ETB') as DashboardCurrency)
    : ((orgFilters?.currency ?? currency) as DashboardCurrency);
  const useRecordCurrency =
    usesSharedFilters && isAllCurrencies(orgFilters!.currency);
  const [filterSalesTeamId, setFilterSalesTeamId] = useState('all');
  const [filterSalesRepId, setFilterSalesRepId] = useState('all');
  const [filterSolutionId, setFilterSolutionId] = useState('all');

  const entityLabel =
    module === 'leads'
      ? 'leads'
      : dealUiLabel({ plural: true, lowercase: true });
  const entitySingular = module === 'leads' ? 'Lead' : dealUiLabel();

  const showSalesTeamFilter = scope === 'executive';
  const showSalesRepFilter =
    scope === 'executive' || scope === 'team' || scope === 'member';
  const showSolutionFilter =
    module === 'deals' && (scope === 'team' || scope === 'member');

  const { data: apiSalesTeams = [] } =
    useGetCommercialSalesTeams(showSalesTeamFilter);

  const { data: solutions = [] } = useQuery<Solution[]>(
    ['pipeline-dashboard-solutions'],
    async () => {
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;
      const { userId } = useAuthenticationStore.getState();
      const headers = {
        Authorization: `Bearer ${token}`,
        requestedBy: userId != null && userId !== '' ? String(userId) : '',
        createdBy: userId != null && userId !== '' ? String(userId) : '',
        ...tenantHeadersFromStoreTenantId(tenantId),
      };
      const response = await crudRequest({
        url: `${CRM_URL}/solution`,
        method: 'GET',
        headers,
      });
      return (response?.data as Solution[]) || [];
    },
    {
      enabled: showSolutionFilter,
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  const salesTeamIdForMembers =
    filterSalesTeamId !== 'all' ? filterSalesTeamId : undefined;
  const { data: salesTeamMembers = [] } = useGetCommercialSalesTeamMembers(
    showSalesTeamFilter ? salesTeamIdForMembers : undefined,
  );
  const { data: mySalesTeamMembers = [] } = useGetMySalesTeamMembers(
    !showSalesTeamFilter && showSalesRepFilter,
  );

  const salesTeams = useMemo(
    () => apiSalesTeams.map(toMockTeam),
    [apiSalesTeams],
  );

  const salesRepsForTeam = useMemo(() => {
    const source = showSalesTeamFilter ? salesTeamMembers : mySalesTeamMembers;
    const teamId = salesTeamIdForMembers ?? 'my-team';
    return source
      .map((m) => toMockRep(m, teamId))
      .filter((r): r is MockRepresentative => Boolean(r));
  }, [
    showSalesTeamFilter,
    salesTeamMembers,
    mySalesTeamMembers,
    salesTeamIdForMembers,
  ]);

  const solutionOptions = useMemo(
    () =>
      solutions.map((s) => ({
        value: s.id,
        label: s.name,
        category: s.name,
      })),
    [solutions],
  );

  const selectedSolution = useMemo(
    () => solutionOptions.find((s) => s.value === filterSolutionId),
    [solutionOptions, filterSolutionId],
  );

  const dashboardParams = useMemo<PipelineModuleDashboardParams>(() => {
    if (usesSharedFilters) {
      return orgParamsForModuleDashboard(orgParams);
    }

    const params: PipelineModuleDashboardParams = {
      highValueLimit: 6,
      ...orgParams,
    };
    if (!orgParams.currency && !orgFilters) {
      params.currency = currency as PipelineDashboardCurrency;
    }
    if (!orgParams.teamId && filterSalesTeamId !== 'all') {
      params.teamId = filterSalesTeamId;
    }
    if (!orgParams.affectedUserId && filterSalesRepId !== 'all') {
      params.responsibleUserId = filterSalesRepId;
    }
    if (selectedSolution?.category) {
      params.solutionCategory = selectedSolution.category;
    }
    return params;
  }, [
    currency,
    filterSalesTeamId,
    filterSalesRepId,
    selectedSolution,
    orgFilters,
    orgParams,
    usesSharedFilters,
  ]);

  const dashboardQuery = usePipelineModuleDashboard(module, dashboardParams);

  const filters = useMemo<DashboardFilters>(() => {
    const active: DashboardFilters = {
      currency: activeCurrency as DashboardCurrency,
    };
    if (filterSalesTeamId !== 'all') active.salesTeamId = filterSalesTeamId;
    if (filterSalesRepId !== 'all') active.salesRepId = filterSalesRepId;
    if (filterSolutionId !== 'all') active.solutionId = filterSolutionId;
    return active;
  }, [activeCurrency, filterSalesTeamId, filterSalesRepId, filterSolutionId]);

  const emptyTotals = EMPTY_PERIOD_TOTALS;
  const periodTotals = dashboardQuery.data?.periodTotals ?? emptyTotals;
  const periodValueTotals =
    dashboardQuery.data?.periodValueTotals ?? emptyTotals;
  const selectedCount = periodTotals[period];
  const selectedValue = periodValueTotals[period];

  const highValueRecords = useMemo(
    () =>
      (dashboardQuery.data?.highValueRecords ?? []).map((record) =>
        mapHighValueRecord(record, activeCurrency, useRecordCurrency),
      ),
    [dashboardQuery.data?.highValueRecords, activeCurrency, useRecordCurrency],
  );

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? 'Quarter';

  const activeScopeLabel = usesSharedFilters
    ? orgFilterScopeLabel(orgFilters!.filter)
    : activeFilterLabel(filters, salesTeams, salesRepsForTeam);

  const scopeViewLabel =
    scope === 'executive'
      ? 'Executive view'
      : scope === 'team'
        ? 'Team view'
        : 'My view';

  const activeFilterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];

    if (filterSalesTeamId !== 'all') {
      const team = salesTeams.find((t) => t.id === filterSalesTeamId);
      if (team) {
        chips.push({
          id: 'sales-team',
          kind: 'team',
          role: 'Team',
          team,
          onClear: () => {
            setFilterSalesTeamId('all');
            setFilterSalesRepId('all');
          },
        });
      }
    }

    if (filterSalesRepId !== 'all') {
      const person = salesRepsForTeam.find((r) => r.id === filterSalesRepId);
      if (person) {
        chips.push({
          id: 'sales-rep',
          kind: 'person',
          role: 'Responsible',
          person,
          onClear: () => setFilterSalesRepId('all'),
        });
      }
    }

    if (filterSolutionId !== 'all' && selectedSolution) {
      chips.push({
        id: 'solution',
        kind: 'solution',
        label: selectedSolution.label,
        onClear: () => setFilterSolutionId('all'),
      });
    }

    return chips;
  }, [
    filterSalesTeamId,
    filterSalesRepId,
    filterSolutionId,
    salesTeams,
    salesRepsForTeam,
    selectedSolution,
  ]);

  const clearAllFilters = () => {
    setFilterSalesTeamId('all');
    setFilterSalesRepId('all');
    setFilterSolutionId('all');
  };

  return {
    module,
    entityLabel,
    entitySingular,
    scope: scope as DashboardScope,
    scopeViewLabel,
    period,
    setPeriod,
    currency: activeCurrency as DashboardCurrency,
    setCurrency,
    periodTotals: periodTotals as PeriodTotals,
    periodValueTotals: periodValueTotals as PeriodValueTotals,
    filterSalesTeamId,
    setFilterSalesTeamId,
    filterSalesRepId,
    setFilterSalesRepId,
    filterSolutionId,
    setFilterSolutionId,
    salesTeams,
    salesRepsForTeam,
    solutionOptions,
    selectedCount,
    selectedValue,
    highValueRecords,
    showSalesTeamFilter,
    showSalesRepFilter,
    showSolutionFilter,
    periodLabel,
    activeScopeLabel,
    activeFilterChips,
    clearAllFilters,
    periodOptions: PERIOD_OPTIONS,
    isLoading:
      dashboardQuery.isLoading ||
      (!dashboardQuery.data && dashboardQuery.isFetching),
    isError: dashboardQuery.isError,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}

export type PipelineDashboardData = ReturnType<typeof usePipelineDashboardData>;
