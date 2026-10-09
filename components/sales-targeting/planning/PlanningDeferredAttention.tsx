'use client';

import { PlanningAttentionCards } from '@/components/sales-targeting/planning/PlanningAttentionCards';
import { useMyApprovalsTabPendingCount } from '@/components/sales-targeting/useMyApprovalsTabPendingCount';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import type { PlanningWorkbenchView } from '@/components/sales-targeting/planning/planningTypes';

type Props = {
  showProposalsWorkbench: boolean;
  showApproverInbox: boolean;
  showReconcileWorkbench: boolean;
  ownPersonNode?: TargetPlanningHierarchyNode | null;
  hybridGap?: number | null;
  currencyCode: string;
  onOpenWorkbench: (view: PlanningWorkbenchView) => void;
};

/** Mount after dashboard data is visible so approval-queue queries do not block first paint. */
export function PlanningDeferredAttention(props: Props) {
  const pendingRequestCount = useMyApprovalsTabPendingCount(true);

  return (
    <PlanningAttentionCards
      {...props}
      pendingRequestCount={pendingRequestCount}
    />
  );
}
