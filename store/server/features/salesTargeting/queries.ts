import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { fiscalYearToOrgCalendar } from '@/lib/orgFiscalSettings';
import type { FiscalYear } from '@/store/server/features/organizationStructure/fiscalYear/interface';
import { useGetActiveFiscalYears } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { canViewCompanyTargets, canViewSettings } from '@/utils/dataScope';
import { isLeadsEnabled } from '@/config/salesWorkflow';
import type {
  CommercialTeamMember,
  CustomForecast,
  ForecastQueryParams,
  ForecastResponse,
  ForecastSnapshot,
  MyTeamSalesTargetPlan,
  OrgFiscalCalendar,
  OrgFiscalSession,
  PersonProgressNode,
  PlanProgressSummary,
  SalesTargetPlan,
  SalesTargetRequest,
  SalesTargetReviewLevel,
  SalesTargetingSettings,
  SalesTeam,
  TargetReconciliationView,
  WorkingForecast,
  PlanningDashboardView,
  PlanningHierarchyView,
  PlanningEligibilityView,
  TargetRequestHistoryView,
  AllocationSuggestionView,
  SalesTargetLevel,
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

const retryUnlessUnauthorized = (failureCount: number, err: unknown) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 3;
};

export const fetchSalesTargetingSettings =
  async (): Promise<SalesTargetingSettings> => {
    const headers = await authHeaders();
    return crudRequest({
      url: `${CRM_URL}/sales-targets/settings`,
      method: 'GET',
      headers,
    });
  };

export const fetchSalesTargetPlans = async (
  calendarId?: string,
  options?: { includeArchived?: boolean },
): Promise<SalesTargetPlan[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans`,
    method: 'GET',
    headers,
    params: {
      ...(calendarId ? { calendarId } : {}),
      ...(options?.includeArchived ? { includeArchived: 'true' } : {}),
    },
  });
};

export const fetchSalesTargetPlan = async (
  id: string,
): Promise<SalesTargetPlan> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${id}`,
    method: 'GET',
    headers,
  });
};

export const fetchSalesForecast = async (
  params?: ForecastQueryParams,
): Promise<ForecastResponse> => {
  const headers = await authHeaders();
  const response = (await crudRequest({
    url: `${CRM_URL}/sales-targets/forecast`,
    method: 'GET',
    headers,
    params,
  })) as ForecastResponse;
  if (isLeadsEnabled() || !response?.rows) return response;
  return {
    ...response,
    rows: response.rows.filter((row) => row.opportunityType !== 'lead'),
  };
};

export const fetchPlanCommit = async (
  planId: string,
  commitId: string,
): Promise<ForecastSnapshot> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/commits/${commitId}`,
    method: 'GET',
    headers,
  });
};

function normalizeFiscalCalendars(response: unknown): OrgFiscalCalendar[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as OrgFiscalCalendar[];
  const payload = response as {
    items?: OrgFiscalCalendar[];
    data?: OrgFiscalCalendar[];
  };
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export const fetchActiveFiscalYear = async (): Promise<OrgFiscalCalendar> => {
  const headers = await authHeaders();
  const fiscalYear = (await crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years/active`,
    method: 'GET',
    headers,
  })) as FiscalYear;
  return fiscalYearToOrgCalendar(fiscalYear);
};

export const fetchFiscalCalendars = async (): Promise<OrgFiscalCalendar[]> => {
  const headers = await authHeaders();
  const response = await crudRequest({
    url: `${CRM_URL}/org-structure/calendars`,
    method: 'GET',
    headers,
    params: { limit: 100, page: 1 },
  });
  return normalizeFiscalCalendars(response);
};

export const fetchFiscalYearById = async (
  calendarId: string,
): Promise<OrgFiscalCalendar> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years/${calendarId}`,
    method: 'GET',
    headers,
  });
};

export const fetchFiscalSessions = async (
  calendarId: string,
): Promise<OrgFiscalSession[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/org-structure/fiscal-years/${calendarId}/sessions`,
    method: 'GET',
    headers,
  });
};

import {
  fetchCommercialTeams,
  fetchCommercialTeamMembers,
} from '@/store/server/features/orgStructure/commercialQueries';

export const fetchSalesTeams = fetchCommercialTeams;
export const fetchSalesTeamMembers = fetchCommercialTeamMembers;

export const fetchPlanProgress = async (
  planId: string,
  params?: { sessionId?: string; currencyId?: string; salesTeamId?: string },
): Promise<PlanProgressSummary[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/progress`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchPersonProgress = async (
  planId: string,
  params?: { sessionId?: string; currencyId?: string; salesTeamId?: string },
): Promise<PersonProgressNode[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/progress/persons`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchMyTeamSalesTargetPlan = async (
  planId?: string,
): Promise<MyTeamSalesTargetPlan> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/my-team/plan`,
    method: 'GET',
    headers,
    params: planId ? { planId } : undefined,
  });
};

export const fetchMyTeamPlanProgress = async (
  planId: string,
  params?: { sessionId?: string; currencyId?: string },
): Promise<PlanProgressSummary[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/my-team/progress`,
    method: 'GET',
    headers,
    params: { planId, ...params },
  });
};

/** Tenant settings — readable by target editors and settings viewers. */
export const useGetSalesTargetingSettings = (enabled?: boolean) => {
  const canFetch = enabled ?? (canViewCompanyTargets() || canViewSettings());
  return useQuery<SalesTargetingSettings>(
    ['sales-targeting-settings'],
    fetchSalesTargetingSettings,
    {
      enabled: canFetch,
      staleTime: 60_000,
      retry: retryUnlessUnauthorized,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
};

export const useGetSalesTargetPlans = (
  calendarId?: string,
  enabled = true,
  options?: { includeArchived?: boolean },
) =>
  useQuery<SalesTargetPlan[]>(
    ['sales-target-plans', calendarId, options?.includeArchived ?? false],
    () => fetchSalesTargetPlans(calendarId, options),
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetSalesTargetPlan = (planId?: string) =>
  useQuery<SalesTargetPlan>(
    ['sales-target-plan', planId],
    () => fetchSalesTargetPlan(planId!),
    {
      enabled: Boolean(planId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetSalesForecast = (
  params?: ForecastQueryParams,
  enabled = true,
) =>
  useQuery<ForecastResponse>(
    ['sales-target-forecast', params],
    () => fetchSalesForecast(params),
    {
      enabled,
      staleTime: 15_000,
      keepPreviousData: true,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetPlanCommit = (
  planId?: string,
  commitId?: string,
  enabled = true,
) =>
  useQuery<ForecastSnapshot>(
    ['sales-target-plan-commit', planId, commitId],
    () => fetchPlanCommit(planId!, commitId!),
    {
      enabled: enabled && Boolean(planId) && Boolean(commitId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetMyTeamSalesTargetPlan = (enabled = true, planId?: string) =>
  useQuery<MyTeamSalesTargetPlan>(
    ['my-team-sales-target-plan', planId],
    () => fetchMyTeamSalesTargetPlan(planId),
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetMyTeamPlanProgress = (
  planId?: string,
  params?: { sessionId?: string; currencyId?: string },
  enabled = true,
) =>
  useQuery<PlanProgressSummary[]>(
    ['my-team-sales-target-progress', planId, params],
    () => fetchMyTeamPlanProgress(planId!, params),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

/** Same active fiscal year as Account Settings (`fiscalActiveYear` query cache). */
export function useGetActiveFiscalYearForTargeting() {
  const query = useGetActiveFiscalYears();
  const data = useMemo(
    () => (query.data ? fiscalYearToOrgCalendar(query.data) : undefined),
    [query.data],
  );
  return { ...query, data };
}

export const useGetFiscalCalendars = () =>
  useQuery<OrgFiscalCalendar[]>(
    ['sales-targeting-calendars'],
    fetchFiscalCalendars,
    {
      staleTime: 5 * 60_000,
      cacheTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetFiscalSessions = (calendarId?: string) =>
  useQuery<OrgFiscalSession[]>(
    ['sales-targeting-sessions', calendarId],
    () => fetchFiscalSessions(calendarId!),
    {
      enabled: Boolean(calendarId),
      staleTime: 60_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetSalesTeams = (enabled = true) =>
  useQuery<SalesTeam[]>(['sales-teams'], fetchSalesTeams, {
    enabled,
    staleTime: 60_000,
    retry: retryUnlessUnauthorized,
  });

export const useGetSalesTeamMembers = (salesTeamId?: string) =>
  useQuery<CommercialTeamMember[]>(
    ['sales-team-members', salesTeamId],
    () => fetchSalesTeamMembers(salesTeamId!),
    {
      enabled: Boolean(salesTeamId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetPlanProgress = (
  planId?: string,
  params?: { sessionId?: string; currencyId?: string; salesTeamId?: string },
  enabled = true,
) =>
  useQuery<PlanProgressSummary[]>(
    ['sales-target-progress', planId, params],
    () => fetchPlanProgress(planId!, params),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetPersonProgress = (
  planId?: string,
  params?: { sessionId?: string; currencyId?: string; salesTeamId?: string },
  enabled = true,
) =>
  useQuery<PersonProgressNode[]>(
    ['sales-target-person-progress', planId, params],
    () => fetchPersonProgress(planId!, params),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchCustomForecasts = async (params: {
  planId: string;
  currencyId?: string;
  sessionId?: string;
}): Promise<CustomForecast[]> => {
  const headers = await authHeaders();
  const search = new URLSearchParams({ planId: params.planId });
  if (params.currencyId) search.set('currencyId', params.currencyId);
  if (params.sessionId) search.set('sessionId', params.sessionId);
  return crudRequest({
    url: `${CRM_URL}/sales-targets/custom-forecasts?${search.toString()}`,
    method: 'GET',
    headers,
  });
};

export const useGetCustomForecasts = (
  params?: { planId?: string; currencyId?: string; sessionId?: string },
  enabled = true,
) =>
  useQuery<CustomForecast[]>(
    ['sales-target-custom-forecasts', params],
    () =>
      fetchCustomForecasts({
        planId: params!.planId!,
        currencyId: params?.currencyId,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(params?.planId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchWorkingForecast = async (params: {
  planId: string;
  periodKey: string;
  currencyId?: string;
  departmentId?: string;
  salesTeamId?: string;
  salespersonId?: string;
}): Promise<WorkingForecast | null> => {
  const headers = await authHeaders();
  const search = new URLSearchParams({
    planId: params.planId,
    periodKey: params.periodKey,
  });
  if (params.currencyId) search.set('currencyId', params.currencyId);
  if (params.departmentId) search.set('departmentId', params.departmentId);
  if (params.salesTeamId) search.set('salesTeamId', params.salesTeamId);
  if (params.salespersonId) search.set('salespersonId', params.salespersonId);
  return crudRequest({
    url: `${CRM_URL}/sales-targets/working-forecasts?${search.toString()}`,
    method: 'GET',
    headers,
  });
};

export const useGetWorkingForecast = (
  params?: {
    planId?: string;
    periodKey?: string;
    currencyId?: string;
    departmentId?: string;
    salesTeamId?: string;
    salespersonId?: string;
  },
  enabled = true,
) =>
  useQuery<WorkingForecast | null>(
    ['sales-target-working-forecast', params],
    () =>
      fetchWorkingForecast({
        planId: params!.planId!,
        periodKey: params!.periodKey!,
        currencyId: params?.currencyId,
        departmentId: params?.departmentId,
        salesTeamId: params?.salesTeamId,
        salespersonId: params?.salespersonId,
      }),
    {
      enabled: enabled && Boolean(params?.planId && params?.periodKey),
      staleTime: 10_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchTargetRequests = async (
  planId: string,
): Promise<SalesTargetRequest[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests`,
    method: 'GET',
    headers,
  });
};

export const useGetTargetRequests = (planId?: string, enabled = true) =>
  useQuery<SalesTargetRequest[]>(
    ['sales-target-requests', planId],
    () => fetchTargetRequests(planId!),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 10_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchTargetRequestReviewQueue = async (
  planId: string,
  params?: {
    reviewLevel?: SalesTargetReviewLevel;
    departmentId?: string;
    teamId?: string;
    currencyId?: string;
    horizon?: string;
    sessionId?: string;
  },
): Promise<SalesTargetRequest[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests/review-queue`,
    method: 'GET',
    headers,
    params,
  });
};

export type TargetApprovalWorkspaceAccess = {
  showApprovalsTab: boolean;
  teamInbox: boolean;
  departmentInbox: boolean;
  companyInbox: boolean;
  departmentConsolidation: boolean;
  companyFinalize: boolean;
  managedDepartmentIds: string[];
  managedTeamIds: string[];
};

export const fetchTargetApprovalWorkspaceAccess = async (planId: string) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/approval-workspace-access`,
    method: 'GET',
    headers,
  }) as Promise<TargetApprovalWorkspaceAccess>;
};

export const useGetTargetApprovalWorkspaceAccess = (
  planId?: string,
  enabled = true,
) =>
  useQuery<TargetApprovalWorkspaceAccess>(
    ['sales-target-approval-workspace-access', planId],
    () => fetchTargetApprovalWorkspaceAccess(planId!),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 60_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchMemberTargetRequests = async (
  planId: string,
  params: {
    currencyId: string;
    horizon?: string;
    sessionId?: string | null;
    teamId?: string;
    userId?: string;
  },
): Promise<SalesTargetRequest[]> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests/member-requests`,
    method: 'GET',
    headers,
    params,
  });
};

export const useGetMemberTargetRequests = (
  planId?: string,
  params?: {
    currencyId: string;
    horizon?: string;
    sessionId?: string | null;
    teamId?: string;
    userId?: string;
  },
  enabled = true,
) =>
  useQuery<SalesTargetRequest[]>(
    ['sales-target-member-requests', planId, params],
    () => fetchMemberTargetRequests(planId!, params!),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetTargetRequestReviewQueue = (
  planId?: string,
  params?: {
    reviewLevel?: SalesTargetReviewLevel;
    departmentId?: string;
    teamId?: string;
    currencyId?: string;
    horizon?: string;
    sessionId?: string;
  },
  enabled = true,
) =>
  useQuery<SalesTargetRequest[]>(
    ['sales-target-review-queue', planId, params],
    () => fetchTargetRequestReviewQueue(planId!, params),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchDepartmentConsolidation = async (
  planId: string,
  departmentId: string,
  params: { currencyId?: string; horizon?: string; sessionId?: string },
) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/departments/${departmentId}/target-consolidation`,
    method: 'GET',
    headers,
    params,
  });
};

export const useGetDepartmentConsolidation = (
  planId?: string,
  departmentId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string },
  enabled = true,
) =>
  useQuery(
    ['sales-target-consolidation', planId, departmentId, params],
    () => fetchDepartmentConsolidation(planId!, departmentId!, params ?? {}),
    {
      enabled: enabled && Boolean(planId && departmentId && params?.currencyId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchCompanyReview = async (
  planId: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string },
) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/company-review`,
    method: 'GET',
    headers,
    params,
  });
};

export const useGetCompanyReview = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string },
  enabled = true,
) =>
  useQuery(
    ['sales-target-company-review', planId, params],
    () => fetchCompanyReview(planId!, params),
    {
      enabled: enabled && Boolean(planId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const fetchReconciliation = async (
  planId: string,
  params: { currencyId: string; horizon?: string; sessionId?: string },
): Promise<TargetReconciliationView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/reconciliation`,
    method: 'GET',
    headers,
    params,
  }) as Promise<TargetReconciliationView>;
};

export const fetchReconciliationMatrix = async (
  planId: string,
  params: { currencyId: string; horizon?: string; sessionId?: string },
) => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/reconciliation/matrix`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchTargetRequestAllowedActions = async (
  requestId: string,
): Promise<{
  requestId: string;
  actions: {
    reviewLevel: SalesTargetReviewLevel;
    allowedDecisions: string[];
    mayModifyContent: boolean;
    advancesWorkflow: boolean;
  } | null;
  currentStatus: string;
  currentReviewLevel: string | null;
  currentStepOrder: number | null;
}> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/target-requests/${requestId}/allowed-actions`,
    method: 'GET',
    headers,
  });
};

export const fetchPlanningDashboard = async (
  planId: string,
  params: { currencyId: string; horizon?: string; sessionId?: string | null },
): Promise<PlanningDashboardView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/planning-dashboard`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchPlanningHierarchy = async (
  planId: string,
  params: { currencyId: string; horizon?: string; sessionId?: string | null },
): Promise<PlanningHierarchyView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/planning-hierarchy`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchPlanningEligibility = async (
  planId: string,
  params: { currencyId: string; horizon?: string; sessionId?: string | null },
): Promise<PlanningEligibilityView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/planning-eligibility`,
    method: 'GET',
    headers,
    params,
  });
};

export const fetchTargetRequestHistory = async (
  planId: string,
  requestId: string,
): Promise<TargetRequestHistoryView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests/${requestId}/history`,
    method: 'GET',
    headers,
  });
};

export const useGetPlanningDashboard = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string | null },
  enabled = true,
) =>
  useQuery(
    ['sales-target-planning-dashboard', planId, params],
    () =>
      fetchPlanningDashboard(planId!, {
        currencyId: params!.currencyId!,
        horizon: params?.horizon,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 10_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetPlanningHierarchy = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string | null },
  enabled = true,
) =>
  useQuery(
    ['sales-target-planning-hierarchy', planId, params],
    () =>
      fetchPlanningHierarchy(planId!, {
        currencyId: params!.currencyId!,
        horizon: params?.horizon,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 10_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetPlanningEligibility = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string | null },
  enabled = true,
) =>
  useQuery(
    ['sales-target-planning-eligibility', planId, params],
    () =>
      fetchPlanningEligibility(planId!, {
        currencyId: params!.currencyId!,
        horizon: params?.horizon,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetTargetRequestHistory = (
  planId?: string,
  requestId?: string | null,
  enabled = true,
) =>
  useQuery(
    ['sales-target-request-history', planId, requestId],
    () => fetchTargetRequestHistory(planId!, requestId!),
    {
      enabled: enabled && Boolean(planId && requestId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetReconciliation = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string },
  enabled = true,
  options?: { refetchInterval?: number | false },
) =>
  useQuery(
    ['sales-target-reconciliation', planId, params],
    () =>
      fetchReconciliation(planId!, {
        currencyId: params!.currencyId!,
        horizon: params?.horizon,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 5_000,
      refetchInterval: options?.refetchInterval,
      retry: retryUnlessUnauthorized,
    },
  );

export const useGetReconciliationMatrix = (
  planId?: string,
  params?: { currencyId?: string; horizon?: string; sessionId?: string },
  enabled = true,
) =>
  useQuery(
    ['sales-target-reconciliation-matrix', planId, params],
    () =>
      fetchReconciliationMatrix(planId!, {
        currencyId: params!.currencyId!,
        horizon: params?.horizon,
        sessionId: params?.sessionId,
      }),
    {
      enabled: enabled && Boolean(planId && params?.currencyId),
      staleTime: 5_000,
      retry: retryUnlessUnauthorized,
    },
  );

export type AllocationScopeParams = {
  currencyId: string;
  horizon?: string;
  sessionId?: string | null;
  scopeLevel: SalesTargetLevel;
  orgUnitId?: string | null;
};

export const fetchAllocationSuggestions = async (
  planId: string,
  params: AllocationScopeParams,
): Promise<AllocationSuggestionView> => {
  const headers = await authHeaders();
  return crudRequest({
    url: `${CRM_URL}/sales-targets/plans/${planId}/allocation-suggestions`,
    method: 'GET',
    headers,
    params,
  });
};

export const useGetAllocationSuggestions = (
  planId?: string,
  params?: AllocationScopeParams,
  enabled = true,
) =>
  useQuery(
    ['sales-target-allocation-suggestions', planId, params],
    () => fetchAllocationSuggestions(planId!, params!),
    {
      enabled:
        enabled && Boolean(planId && params?.currencyId && params.scopeLevel),
      staleTime: 10_000,
      retry: retryUnlessUnauthorized,
    },
  );
