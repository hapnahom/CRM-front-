'use client';

import { useMemo, useState } from 'react';
import { BottomUpTargetingWorkspace } from '@/components/sales-targeting/BottomUpTargetingWorkspace';
import { MemberPlanningPanel } from '@/components/sales-targeting/planning/MemberPlanningPanel';
import { PlanningMyProposalsHistory } from '@/components/sales-targeting/planning/PlanningMyProposalsHistory';
import { PlanningSegmentedControl } from '@/components/sales-targeting/planning/PlanningPeriodSelector';
import {
  ModuleEmptyState,
  TARGETS_CARD_CLASS,
} from '@/components/sales-targeting/ui-kit';
import {
  useGetMemberTargetRequests,
  useGetTargetApprovalWorkspaceAccess,
} from '@/store/server/features/salesTargeting/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { cn } from '@/lib/utils';

type ProposalTab = 'mine' | 'approve' | 'history';

type Props = {
  showApproverInbox: boolean;
  ownPersonNode: TargetPlanningHierarchyNode | null;
  usesMemberProposals: boolean;
  planId: string;
  currencyId: string;
  currencyCode: string;
  memberParentRequestId: string | null;
};

function buildSyntheticPersonNode(
  userId: string,
  teamId: string,
  requestStatus?: TargetPlanningHierarchyNode['requestStatus'],
): TargetPlanningHierarchyNode {
  return {
    scopeLevel: 'person',
    scopeId: userId,
    parentScopeId: teamId,
    scopeName: 'Your target',
    requestStatus: requestStatus ?? null,
    children: [],
  } as TargetPlanningHierarchyNode;
}

export function PlanningProposalsPanel({
  showApproverInbox,
  ownPersonNode,
  usesMemberProposals,
  planId,
  currencyId,
  currencyCode,
  memberParentRequestId,
}: Props) {
  const currentUserId = useAuthenticationStore((state) => state.userId);
  const { data: workspaceAccess } = useGetTargetApprovalWorkspaceAccess(
    planId,
    Boolean(planId),
  );

  const { data: memberRequests = [] } = useGetMemberTargetRequests(
    planId,
    { currencyId, userId: currentUserId ?? undefined },
    usesMemberProposals && Boolean(currentUserId),
  );

  const resolvedPersonNode = useMemo(() => {
    if (
      ownPersonNode?.scopeLevel === 'person' &&
      ownPersonNode.parentScopeId &&
      ownPersonNode.scopeId
    ) {
      return ownPersonNode;
    }
    if (!currentUserId || !usesMemberProposals) return null;
    const myRequest = memberRequests.find(
      (row) => row.userId === currentUserId && row.targetLevel === 'person',
    );
    if (!myRequest?.teamId) return null;
    return buildSyntheticPersonNode(
      currentUserId,
      myRequest.teamId,
      myRequest.status as TargetPlanningHierarchyNode['requestStatus'],
    );
  }, [ownPersonNode, currentUserId, usesMemberProposals, memberRequests]);

  const canUseMineTab = Boolean(resolvedPersonNode);
  const canUseApproveTab =
    showApproverInbox ||
    (workspaceAccess?.showApprovalsTab ?? false) ||
    (workspaceAccess?.teamInbox ?? false) ||
    (workspaceAccess?.departmentInbox ?? false) ||
    (workspaceAccess?.companyInbox ?? false);

  const defaultTab: ProposalTab = canUseMineTab
    ? 'mine'
    : canUseApproveTab
      ? 'approve'
      : 'history';

  const [tab, setTab] = useState<ProposalTab>(defaultTab);

  const tabOptions = useMemo(() => {
    const options: Array<{ id: ProposalTab; label: string }> = [];
    if (canUseMineTab) options.push({ id: 'mine', label: 'My proposal' });
    if (canUseApproveTab)
      options.push({ id: 'approve', label: 'For approval' });
    options.push({ id: 'history', label: 'History' });
    return options;
  }, [canUseApproveTab, canUseMineTab]);

  const activeTab = tabOptions.some((option) => option.id === tab)
    ? tab
    : defaultTab;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-white">
      {tabOptions.length > 1 ? (
        <div className="flex items-center gap-1 border-b border-border bg-white px-4">
          {tabOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTab(opt.id)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-medium transition-colors cursor-pointer',
                activeTab === opt.id
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === 'mine' && canUseMineTab && resolvedPersonNode ? (
        <MemberPlanningPanel
          planId={planId}
          currencyId={currencyId}
          currencyCode={currencyCode}
          node={resolvedPersonNode}
          teamId={resolvedPersonNode.parentScopeId!}
          userId={resolvedPersonNode.scopeId!}
          parentRequestId={memberParentRequestId}
        />
      ) : null}

      {activeTab === 'approve' && canUseApproveTab ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <BottomUpTargetingWorkspace embedded />
        </div>
      ) : null}

      {activeTab === 'approve' && !canUseApproveTab ? (
        <div className={cn(TARGETS_CARD_CLASS, 'flex min-h-0 flex-1 flex-col')}>
          <ModuleEmptyState
            title="Nothing to approve"
            description="Proposals waiting on your approval will appear here."
          />
        </div>
      ) : null}

      {activeTab === 'mine' && !canUseMineTab ? (
        <div className={cn(TARGETS_CARD_CLASS, 'flex min-h-0 flex-1 flex-col')}>
          <ModuleEmptyState
            title="No personal proposal"
            description="Personal target proposals are not available for your role on this plan yet."
          />
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <PlanningMyProposalsHistory
          planId={planId}
          currencyId={currencyId}
          currencyCode={currencyCode}
          usesMemberProposals={usesMemberProposals}
        />
      ) : null}
    </div>
  );
}
