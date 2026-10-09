'use client';

import { useMemo } from 'react';
import { useGetSalesTargetingSettings } from '@/store/server/features/salesTargeting/queries';
import { useApprovalWorkflow } from '@/store/server/features/pipeline/workflows';
import {
  firstLevelTargetApprovalLabel,
  resolveCompanyOnlyTargetApproval,
} from '@/components/sales-targeting/hybridTargetApprovalWorkflow';

/** Target Settings → assigned team target approval workflow (step 1 = dept or company). */
export function useHybridTargetApprovalWorkflow() {
  const { data: targetingSettings } = useGetSalesTargetingSettings(true);
  const workflowId = targetingSettings?.teamTargetApprovalWorkflowId;
  const workflowsEnabled = targetingSettings?.enableApprovalWorkflows ?? true;

  const { data: teamApprovalWorkflow } = useApprovalWorkflow(
    workflowId,
    Boolean(workflowsEnabled && workflowId),
  );

  const workflowStepCount = teamApprovalWorkflow?.version?.steps?.length ?? 0;

  const companyOnly = useMemo(
    () =>
      resolveCompanyOnlyTargetApproval({
        enableApprovalWorkflows: workflowsEnabled,
        teamTargetApprovalWorkflowId: workflowId,
        workflowStepCount,
      }),
    [workflowsEnabled, workflowId, workflowStepCount],
  );

  const firstLevelLabel = useMemo(
    () => firstLevelTargetApprovalLabel(companyOnly),
    [companyOnly],
  );

  return {
    companyOnly,
    workflowStepCount,
    workflowsEnabled,
    workflowId,
    firstLevelLabel,
    workflowName: teamApprovalWorkflow?.name,
  };
}
