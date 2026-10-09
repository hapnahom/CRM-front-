import { useMutation, useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { invalidateSalesTargetProgressQueries } from './invalidateProgress';
import type {
  AllocationUpdateItem,
  CommitCompanyAnnualDto,
  CommitCompanySessionDto,
  CommitSessionFromForecastDto,
  CommitSessionManualDto,
  CommitPersonSessionDto,
  CommitTeamAnnualDto,
  CommitDepartmentAnnualDto,
  CreateManualPlanDto,
  CreatePlanFromForecastDto,
  CreateSalesTargetPlanDto,
  CustomForecast,
  PersonAllocationItem,
  PlanCurrencyUpdateItem,
  PlanSessionAllocationItem,
  SalesTargetPlan,
  SalesTargetingSettings,
  SalesTargetRequest,
  SalesTargetReviewDecision,
  SalesTargetReviewLevel,
  SalesTargetOpportunityType,
  TeamAnnualAllocationItem,
  TeamSessionAllocationItem,
  WorkingForecast,
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

const syncSalesTargetPlanCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  plan: SalesTargetPlan,
) => {
  queryClient.setQueryData(['sales-target-plan', plan.id], plan);
  queryClient.invalidateQueries({ queryKey: ['sales-target-plans'] });
};

const invalidatePlanDependentQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
) => {
  queryClient.invalidateQueries({
    queryKey: ['sales-target-progress', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-person-progress', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['my-team-sales-target-progress'],
  });
  queryClient.invalidateQueries({ queryKey: ['my-team-sales-target-plan'] });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-plan-commit', planId],
  });
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'home'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'executive'] });
};

const invalidatePlanQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  planId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ['sales-target-plans'] });
  if (planId) {
    queryClient.invalidateQueries({ queryKey: ['sales-target-plan', planId] });
    invalidatePlanDependentQueries(queryClient, planId);
  }
};

const syncPlanQueryCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  plan: SalesTargetPlan,
) => {
  syncSalesTargetPlanCaches(queryClient, plan);
  invalidatePlanDependentQueries(queryClient, plan.id);
};

export const useCreateSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreateSalesTargetPlanDto) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

/** Team/dept proposers on bottom-to-top or hybrid (does not require edit-company-targets). */
export const useEnsureRequestWorkflowPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreateSalesTargetPlanDto) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/ensure-request-workflow`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useCreatePlanFromForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreatePlanFromForecastDto) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/from-forecast`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useCommitSessionFromForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      sessionId,
      ...payload
    }: CommitSessionFromForecastDto & {
      planId: string;
      sessionId: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/sessions/${sessionId}/from-forecast`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        invalidatePlanQueries(queryClient, plan.id);
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCommitSessionManual = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      sessionId,
      ...payload
    }: CommitSessionManualDto & { planId: string; sessionId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/sessions/${sessionId}/manual`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        invalidatePlanQueries(queryClient, plan.id);
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCommitPersonSession = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      sessionId,
      ...payload
    }: CommitPersonSessionDto & { planId: string; sessionId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/sessions/${sessionId}/person-commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        invalidatePlanQueries(queryClient, plan.id);
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
        queryClient.invalidateQueries({
          queryKey: ['sales-target-person-progress'],
        });
      },
    },
  );
};

export const useCommitCompanyAnnual = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      ...payload
    }: CommitCompanyAnnualDto & { planId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/currency-targets/commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCommitCompanySession = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      sessionId,
      ...payload
    }: CommitCompanySessionDto & { planId: string; sessionId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/sessions/${sessionId}/company-commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
      },
    },
  );
};

export const useRecalculateForecastFromPipeline = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ planId, commitId }: { planId: string; commitId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/commits/${commitId}/recalculate-from-pipeline`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
      },
    },
  );
};

export const useCommitTeamAnnual = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      ...payload
    }: CommitTeamAnnualDto & { planId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/team-annual-allocations/commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCommitDepartmentAnnual = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      ...payload
    }: CommitDepartmentAnnualDto & { planId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/department-annual-allocations/commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCommitDepartmentSession = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      sessionId,
      ...payload
    }: CommitDepartmentAnnualDto & { planId: string; sessionId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/sessions/${sessionId}/department-allocations/commit`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        queryClient.invalidateQueries({
          queryKey: ['sales-target-plan-commit'],
        });
      },
    },
  );
};

export const useCreateManualPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: CreateManualPlanDto) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/manual`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useArchiveSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (planId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/archive`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useDuplicateSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({ planId, name }: { planId: string; name?: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/duplicate`,
        method: 'POST',
        headers,
        data: name != null ? { name } : {},
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useDeleteSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (planId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}`,
        method: 'DELETE',
        headers,
      }) as Promise<{ deleted: true }>;
    },
    {
      onSuccess: (deleted, planId) => {
        void deleted;
        invalidatePlanQueries(queryClient, planId);
      },
    },
  );
};

export const useUpsertPlanSessionAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      allocations,
    }: {
      planId: string;
      allocations: PlanSessionAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/session-allocations`,
        method: 'PATCH',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useUpsertPersonAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      allocations,
    }: {
      planId: string;
      allocations: PersonAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/person-allocations`,
        method: 'PATCH',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useEqualSplitPersonAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      planCurrencyId,
      sessionId,
      orgDepartmentId,
      userIds,
    }: {
      planId: string;
      planCurrencyId: string;
      sessionId: string;
      orgDepartmentId: string;
      userIds: string[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/person-allocations/equal-split`,
        method: 'POST',
        headers,
        data: { planCurrencyId, sessionId, orgDepartmentId, userIds },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useUpsertTeamAnnualTargets = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      allocations,
    }: {
      planId: string;
      allocations: TeamAnnualAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/team-annual-allocations`,
        method: 'PATCH',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidateAllocationQueries(queryClient, plan.id),
    },
  );
};

export const useDistributeTeamAnnualTargets = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      allocations,
    }: {
      planId: string;
      allocations: TeamAnnualAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/distribute`,
        method: 'POST',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidateAllocationQueries(queryClient, plan.id),
    },
  );
};

export const useUpsertTeamSessionAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      teamId,
      allocations,
    }: {
      planId: string;
      teamId: string;
      allocations: TeamSessionAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/teams/${teamId}/session-allocations`,
        method: 'PATCH',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useSetTeamSessionAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      teamId,
      allocations,
    }: {
      planId: string;
      teamId: string;
      allocations: TeamSessionAllocationItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/teams/${teamId}/session-allocations`,
        method: 'POST',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useUpdateAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      allocations,
    }: {
      planId: string;
      allocations: AllocationUpdateItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/allocations`,
        method: 'PATCH',
        headers,
        data: { allocations },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useUpdatePlanCurrencyTargets = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      targets,
    }: {
      planId: string;
      targets: PlanCurrencyUpdateItem[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/currency-targets`,
        method: 'PATCH',
        headers,
        data: { targets },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useAddPlanCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      currencyId,
      annualAmount = 0,
    }: {
      planId: string;
      currencyId: string;
      annualAmount?: number;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/currency-targets`,
        method: 'POST',
        headers,
        data: { currencyId, annualAmount },
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
        invalidatePlanQueries(queryClient, plan.id);
      },
    },
  );
};

export const useRemovePlanCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async ({
      planId,
      planCurrencyId,
    }: {
      planId: string;
      planCurrencyId: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/currency-targets/${planCurrencyId}`,
        method: 'DELETE',
        headers,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => {
        syncPlanQueryCache(queryClient, plan);
      },
    },
  );
};

export const usePublishSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (planId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/publish`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useLockSalesTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (planId: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/lock`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidatePlanQueries(queryClient, plan.id),
    },
  );
};

export const useUpdateSalesTargetingSettings = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: Partial<SalesTargetingSettings>) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/settings`,
        method: 'PATCH',
        headers,
        data: payload,
      }) as Promise<SalesTargetingSettings>;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['sales-targeting-settings'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
        invalidateSalesTargetProgressQueries(queryClient);
      },
    },
  );
};

export const useCreateCustomForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId: string;
      sessionId?: string | null;
      groupId?: string;
      opportunityName: string;
      forecastValue: number;
      salesTeamId: string;
      department?: string | null;
      ownerName?: string | null;
      notes?: string | null;
      periodLabel?: string | null;
      isActive?: boolean;
      assignees?: Array<{ userId: string; amount: number }>;
      solutions?: Array<{
        productFamilyId: string;
        amount: number;
        teamIds: string[];
        memberIds: string[];
      }>;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/custom-forecasts`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<CustomForecast>;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['sales-target-custom-forecasts'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
      },
    },
  );
};

export const useUpdateCustomForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      id: string;
      opportunityName?: string;
      forecastValue?: number;
      salesTeamId?: string;
      department?: string | null;
      ownerName?: string | null;
      notes?: string | null;
      periodLabel?: string | null;
      sessionId?: string | null;
      currencyId?: string;
      isActive?: boolean;
    }) => {
      const headers = await authHeaders();
      const { id, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/custom-forecasts/${id}`,
        method: 'PATCH',
        headers,
        data,
      }) as Promise<CustomForecast>;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['sales-target-custom-forecasts'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
      },
    },
  );
};

export const useDeleteCustomForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (id: string) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/custom-forecasts/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['sales-target-custom-forecasts'],
        });
        queryClient.invalidateQueries({ queryKey: ['sales-target-forecast'] });
      },
    },
  );
};

export const useUpsertWorkingForecast = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId?: string | null;
      horizon: 'annual' | 'session';
      sessionId?: string | null;
      departmentId?: string | null;
      salesTeamId?: string | null;
      salespersonId?: string | null;
      periodKey: string;
      periodLabel: string;
      dateRangeLabel?: string | null;
      periodStart?: string | null;
      periodEnd?: string | null;
      status: 'generated' | 'locked';
      totalPipelineValue: number;
      totalForecastValue: number;
      expectedRevenue: number;
      opportunityCount: number;
      methodBreakdown?: {
        stage: number;
        value: number;
        date: number;
        manual: number;
      } | null;
      lines?: Array<Record<string, unknown>> | null;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/working-forecasts`,
        method: 'POST',
        headers,
        data: payload,
      }) as Promise<WorkingForecast>;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['sales-target-working-forecast'],
        });
      },
    },
  );
};

const patchTargetRequestInPlanCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
  updated: SalesTargetRequest,
) => {
  queryClient.setQueryData<SalesTargetRequest[]>(
    ['sales-target-requests', planId],
    (prev: SalesTargetRequest[] | undefined) => {
      const list = prev ?? [];
      if (!list.length) {
        return [updated];
      }
      const idx = list.findIndex((row) => row.id === updated.id);
      if (idx === -1) {
        return [updated, ...list];
      }
      const next = [...list];
      next[idx] = { ...next[idx], ...updated };
      return next;
    },
  );
};

const invalidateWorkflowQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
) => {
  queryClient.invalidateQueries({
    queryKey: ['sales-target-requests', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-review-queue', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-member-requests', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-reconciliation-matrix', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-consolidation', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-company-review', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-reconciliation', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-dashboard', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-hierarchy', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-eligibility', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-request-history'],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-allocation-suggestions', planId],
  });
  invalidatePlanQueries(queryClient, planId);
};

const invalidateAllocationQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string,
) => {
  queryClient.invalidateQueries({
    queryKey: ['sales-target-allocation-suggestions', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-dashboard', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-hierarchy', planId],
  });
  queryClient.invalidateQueries({
    queryKey: ['sales-target-planning-eligibility', planId],
  });
  invalidatePlanQueries(queryClient, planId);
};

export const useCreateTargetRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId: string;
      targetLevel?: 'team' | 'person' | 'department';
      teamId?: string;
      userId?: string;
      orgUnitId?: string;
      parentRequestId?: string | null;
      horizon: 'annual' | 'session';
      sessionId?: string | null;
      amount: number;
      description?: string | null;
      metadata?: Record<string, unknown> | null;
      opportunities?: Array<{
        opportunityType: SalesTargetOpportunityType;
        opportunityId: string;
        opportunityName?: string | null;
        opportunityValue?: number;
        forecastValue?: number;
        allocatedAmount: number;
      }>;
    }) => {
      const headers = await authHeaders();
      const { planId, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests`,
        method: 'POST',
        headers,
        data,
      }) as Promise<SalesTargetRequest>;
    },
    {
      onSuccess: (mutationResult, vars) => {
        void mutationResult;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useSubmitTargetRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: { planId: string; requestId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${payload.planId}/target-requests/${payload.requestId}/submit`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetRequest>;
    },
    {
      onSuccess: (data, vars) => {
        patchTargetRequestInPlanCache(queryClient, vars.planId, data);
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useReviseTargetRequest = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      requestId: string;
      amount: number;
      description?: string | null;
      revisionReason?: string | null;
      expectedRevisionNumber?: number;
      asReviewer?: boolean;
      opportunities?: Array<{
        opportunityType: SalesTargetOpportunityType;
        opportunityId: string;
        opportunityName?: string | null;
        opportunityValue?: number;
        forecastValue?: number;
        allocatedAmount: number;
        probability?: number | null;
        expectedCloseDate?: string | null;
        ownerId?: string | null;
        teamId?: string | null;
        departmentId?: string | null;
      }>;
    }) => {
      const headers = await authHeaders();
      const { planId, requestId, asReviewer, ...data } = payload;
      const qs = asReviewer ? '?asReviewer=true' : '';
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/target-requests/${requestId}/revise${qs}`,
        method: 'POST',
        headers,
        data,
      }) as Promise<SalesTargetRequest>;
    },
    {
      onSuccess: (data, vars) => {
        patchTargetRequestInPlanCache(queryClient, vars.planId, data);
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useCreateTargetReview = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      requestId: string;
      reviewLevel: SalesTargetReviewLevel;
      decision: SalesTargetReviewDecision;
      expectedRevisionId: string;
      comment?: string | null;
      modifiedAmount?: number;
      modifiedDescription?: string | null;
      modifiedOpportunityLines?: Array<{
        opportunityType: SalesTargetOpportunityType;
        opportunityId: string;
        opportunityName?: string | null;
        opportunityValue?: number;
        forecastValue?: number;
        allocatedAmount: number;
        probability?: number | null;
        expectedCloseDate?: string | null;
        ownerId?: string | null;
        teamId?: string | null;
        departmentId?: string | null;
      }>;
    }) => {
      const headers = await authHeaders();
      const { requestId, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/target-requests/${requestId}/reviews`,
        method: 'POST',
        headers,
        data,
      }) as Promise<SalesTargetRequest>;
    },
    {
      onSuccess: (data) => invalidateWorkflowQueries(queryClient, data.planId),
    },
  );
};

export const useWithdrawTargetFromCompanyForward = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: { requestId: string; planId: string }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/target-requests/${payload.requestId}/withdraw-company-forward`,
        method: 'POST',
        headers,
      }) as Promise<SalesTargetRequest>;
    },
    {
      onSuccess: (data) => invalidateWorkflowQueries(queryClient, data.planId),
    },
  );
};

export const useSubmitDepartmentConsolidation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      departmentId: string;
      currencyId: string;
      horizon?: string;
      sessionId?: string;
      requestIds?: string[];
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${payload.planId}/departments/${payload.departmentId}/submit`,
        method: 'POST',
        headers,
        params: {
          currencyId: payload.currencyId,
          horizon: payload.horizon,
          sessionId: payload.sessionId,
        },
        data: payload.requestIds?.length
          ? { requestIds: payload.requestIds }
          : undefined,
      });
    },
    {
      onSuccess: (mutationResult, vars) => {
        void mutationResult;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useCompanyFinalize = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId?: string;
      horizon?: 'annual' | 'session';
      sessionId?: string | null;
    }) => {
      const headers = await authHeaders();
      const { planId, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/company-finalize`,
        method: 'POST',
        headers,
        data,
      }) as Promise<SalesTargetPlan>;
    },
    {
      onSuccess: (plan) => invalidateWorkflowQueries(queryClient, plan.id),
    },
  );
};

export const useUpsertStrategicTarget = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId: string;
      horizon: 'annual' | 'session';
      sessionId?: string | null;
      amount: number;
      description?: string | null;
    }) => {
      const headers = await authHeaders();
      const { planId, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/strategic-target`,
        method: 'POST',
        headers,
        data,
      });
    },
    {
      onSuccess: (mutationResult, vars) => {
        void mutationResult;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useFinalizeReconciliation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId: string;
      horizon?: string;
      sessionId?: string;
    }) => {
      const headers = await authHeaders();
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${payload.planId}/reconciliation/finalize`,
        method: 'POST',
        headers,
        params: {
          currencyId: payload.currencyId,
          horizon: payload.horizon,
          sessionId: payload.sessionId,
        },
      });
    },
    {
      onSuccess: (mutationResult, vars) => {
        void mutationResult;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useApplyReconciliationAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      currencyId: string;
      horizon?: 'annual' | 'session';
      sessionId?: string | null;
      requestId?: string;
      modifiedAmount?: number;
      modifiedDescription?: string | null;
      modifiedOpportunityLines?: Array<{
        opportunityType: SalesTargetOpportunityType;
        opportunityId: string;
        opportunityName?: string | null;
        opportunityValue?: number;
        forecastValue?: number;
        allocatedAmount: number;
      }>;
      strategicAmount?: number;
      comment?: string | null;
      expectedRevisionId?: string;
    }) => {
      const headers = await authHeaders();
      const { planId, currencyId, horizon, sessionId, ...data } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/reconciliation`,
        method: 'POST',
        headers,
        params: { currencyId, horizon, sessionId },
        data,
      });
    },
    {
      onSuccess: (mutationResult, vars) => {
        void mutationResult;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};

export const useUpdatePlanningPhase = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (payload: {
      planId: string;
      planningPhase:
        | 'NOT_STARTED'
        | 'OPEN'
        | 'IN_PROGRESS'
        | 'RECONCILIATION'
        | 'FINALIZING'
        | 'FINALIZED'
        | 'LOCKED';
    }) => {
      const headers = await authHeaders();
      const { planId, planningPhase } = payload;
      return crudRequest({
        url: `${CRM_URL}/sales-targets/plans/${planId}/planning-phase`,
        method: 'PATCH',
        headers,
        data: { planningPhase },
      });
    },
    {
      onSuccess: (result, vars) => {
        void result;
        invalidateWorkflowQueries(queryClient, vars.planId);
      },
    },
  );
};
