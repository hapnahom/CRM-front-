'use client';

import { useMemo } from 'react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { planUsesTargetRequestWorkflow } from '@/components/sales-targeting/targetSettingMethod';
import { resolveCompanyOnlyTargetApproval } from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import { useApprovalWorkflow } from '@/store/server/features/pipeline/workflows';
import {
  useGetSalesTargetingSettings,
  useGetTargetApprovalWorkspaceAccess,
  useGetTargetRequestReviewQueue,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { countWaitingApprovalActions } from '@/components/sales-targeting/waitingApprovalActionCount';

/**
 * Overview → Requests pending count (same as inner “Waiting approval (n)”).
 * Pass `active` false to skip heavy review-queue queries until overview is visible.
 */
export function useMyApprovalsTabPendingCount(active = true): number {
  const {
    plan,
    selectedPlanId,
    orgTargetSettingMethod,
    activePlanCurrency,
    salesTeams,
    sessions,
  } = useSalesTargeting();
  const planId = selectedPlanId ?? plan?.id;
  const currencyId = activePlanCurrency?.currencyId;
  const enabled = Boolean(
    active &&
      planId &&
      planUsesTargetRequestWorkflow(plan, orgTargetSettingMethod),
  );

  const { data: targetingSettings } = useGetSalesTargetingSettings(enabled);
  const { data: teamApprovalWorkflow } = useApprovalWorkflow(
    targetingSettings?.teamTargetApprovalWorkflowId,
    Boolean(
      enabled &&
        targetingSettings?.enableApprovalWorkflows &&
        targetingSettings?.teamTargetApprovalWorkflowId,
    ),
  );
  const companyOnlyApproval = useMemo(
    () =>
      resolveCompanyOnlyTargetApproval({
        enableApprovalWorkflows: targetingSettings?.enableApprovalWorkflows,
        teamTargetApprovalWorkflowId:
          targetingSettings?.teamTargetApprovalWorkflowId,
        workflowStepCount: teamApprovalWorkflow?.version?.steps?.length,
      }),
    [
      targetingSettings?.enableApprovalWorkflows,
      targetingSettings?.teamTargetApprovalWorkflowId,
      teamApprovalWorkflow?.version?.steps?.length,
    ],
  );

  const { data: workspaceAccess } = useGetTargetApprovalWorkspaceAccess(
    planId,
    enabled,
  );

  const showTeamInbox = workspaceAccess?.teamInbox ?? false;
  const showDepartmentInbox =
    (workspaceAccess?.departmentInbox ?? false) && !companyOnlyApproval;
  const showCompanyInbox = workspaceAccess?.companyInbox ?? false;
  const showDepartmentConsolidation =
    workspaceAccess?.departmentConsolidation ?? false;
  const managedDepartmentIds = workspaceAccess?.managedDepartmentIds ?? [];

  const needsAllRequests =
    enabled &&
    (showTeamInbox ||
      showDepartmentInbox ||
      showDepartmentConsolidation ||
      showCompanyInbox);
  const { data: allRequests = [] } = useGetTargetRequests(
    planId,
    needsAllRequests,
  );

  const { data: teamQueue = [] } = useGetTargetRequestReviewQueue(
    planId,
    { reviewLevel: 'TEAM', currencyId },
    enabled && showTeamInbox,
  );
  const { data: departmentQueue = [] } = useGetTargetRequestReviewQueue(
    planId,
    { reviewLevel: 'DEPARTMENT', currencyId },
    enabled && showDepartmentInbox,
  );
  const { data: companyQueue = [] } = useGetTargetRequestReviewQueue(
    planId,
    { reviewLevel: 'COMPANY', currencyId },
    enabled && showCompanyInbox,
  );

  return useMemo(
    () =>
      countWaitingApprovalActions({
        currencyId,
        reviewQueue: departmentQueue,
        teamQueue,
        companyQueue,
        allRequests,
        showTeamInbox,
        showDepartmentInbox,
        showCompanyInbox,
        showDepartmentConsolidation,
        managedDepartmentIds,
        salesTeams,
        companyOnlyApproval,
        sessions,
      }),
    [
      allRequests,
      companyOnlyApproval,
      companyQueue,
      currencyId,
      departmentQueue,
      teamQueue,
      managedDepartmentIds,
      salesTeams,
      sessions,
      showCompanyInbox,
      showDepartmentConsolidation,
      showDepartmentInbox,
      showTeamInbox,
    ],
  );
}
