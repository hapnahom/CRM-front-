'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useCreateTargetRequest,
  useReviseTargetRequest,
  useSubmitTargetRequest,
} from '@/store/server/features/salesTargeting/mutations';
import {
  useGetMemberTargetRequests,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { persistMemberTargetProposal } from '@/components/sales-targeting/memberTargetProposalSave';
import {
  TeamProposalOpportunityPicker,
  collapseDuplicateOpportunityLines,
  linesFromRequestOpportunities,
  normalizeOpportunityLinesForTargetRequestApi,
  opportunityKey,
  sumAllocated,
  validateOpportunitySplitAllocations,
  type OpportunityClaimHint,
  type ProposalOpportunityLine,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import {
  PrimaryButton,
  MemberPlanningPanelSkeleton,
  StickyActionBar,
  TARGETS_CARD_CLASS,
  TARGETS_KPI_VALUE_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type {
  SalesTargetRequest,
  TargetPlanningHierarchyNode,
} from '@/store/server/features/salesTargeting/types';
import { isDepartmentOrHigherApproved } from '@/components/sales-targeting/targetRequestEditGuards';
import { PlanningStatusBadge } from '@/components/sales-targeting/planning/planningStatusDisplay';
import { PlanningPersonCell } from '@/components/sales-targeting/planning/PlanningPersonCell';
import { usePlanningPersonProfiles } from '@/components/sales-targeting/planning/planningPersonProfiles';
import { cn } from '@/lib/utils';

const NOTES_MAX_LENGTH = 500;

type Props = {
  planId: string;
  currencyId: string;
  currencyCode: string;
  node: TargetPlanningHierarchyNode;
  teamId: string;
  userId: string;
  /** Optional team-level request to link as parent aggregation reference. */
  parentRequestId?: string | null;
};

function buildMemberPeerClaimHints(
  teamId: string,
  userId: string,
  excludeRequestId: string | null | undefined,
  currencyId: string,
  requests: SalesTargetRequest[],
): Map<string, OpportunityClaimHint> {
  const hints = new Map<string, OpportunityClaimHint>();
  for (const request of requests) {
    if (request.teamId !== teamId) continue;
    if (request.currencyId !== currencyId) continue;
    if (request.id === excludeRequestId) continue;
    if (request.targetLevel === 'person' && request.userId === userId) continue;

    const label =
      request.targetLevel === 'person' ? 'Another member' : 'Team proposal';
    const revision = request.revisions?.find(
      (row) => row.id === request.currentRevisionId,
    );
    for (const opp of revision?.opportunities ?? []) {
      const key = opportunityKey(opp.opportunityType, opp.opportunityId);
      const allocated = Number(opp.allocatedAmount) || 0;
      const pending = !isDepartmentOrHigherApproved(request.status);
      const existing = hints.get(key);
      if (existing) {
        const labels = existing.teamLabel.split(' · ');
        if (!labels.includes(label)) labels.push(label);
        hints.set(key, {
          teamLabel: labels.join(' · '),
          pending: existing.pending || pending,
          peerAllocatedTotal:
            Math.round((existing.peerAllocatedTotal + allocated) * 100) / 100,
        });
      } else {
        hints.set(key, {
          teamLabel: label,
          pending,
          peerAllocatedTotal: allocated,
        });
      }
    }
  }
  return hints;
}

export function MemberPlanningPanel({
  planId,
  currencyId,
  currencyCode,
  node,
  teamId,
  userId,
  parentRequestId = null,
}: Props) {
  const { plan, fiscalCalendar } = useSalesTargeting();
  const currentUserId = useAuthenticationStore((state) => state.userId);

  const {
    data: memberRequests = [],
    isLoading,
    refetch,
  } = useGetMemberTargetRequests(
    planId,
    { currencyId, horizon: 'annual', teamId, userId },
    Boolean(planId && currencyId && teamId && userId),
  );
  const { data: allTargetRequests = [], refetch: refetchAllRequests } =
    useGetTargetRequests(planId, Boolean(planId));

  const activeRequest = memberRequests[0] ?? null;

  const createRequest = useCreateTargetRequest();
  const reviseRequest = useReviseTargetRequest();
  const submitRequest = useSubmitTargetRequest();

  const [description, setDescription] = useState('');
  const [opportunities, setOpportunities] = useState<ProposalOpportunityLine[]>(
    [],
  );
  const [seededRequestId, setSeededRequestId] = useState<string | null>(null);

  const isOwnProposal = Boolean(
    currentUserId && String(currentUserId) === userId,
  );

  useEffect(() => {
    if (!activeRequest?.id) {
      setSeededRequestId(null);
      setDescription('');
      setOpportunities([]);
      return;
    }
    if (seededRequestId === activeRequest.id) return;
    const revision = activeRequest.revisions?.find(
      (row) => row.id === activeRequest.currentRevisionId,
    );
    setDescription(revision?.description ?? '');
    setOpportunities(
      collapseDuplicateOpportunityLines(
        linesFromRequestOpportunities(revision?.opportunities),
      ),
    );
    setSeededRequestId(activeRequest.id);
  }, [activeRequest, seededRequestId]);

  const canEdit = useMemo(() => {
    if (!isOwnProposal) return false;
    if (!activeRequest) return true;
    return (
      activeRequest.status === 'DRAFT' ||
      activeRequest.status === 'TEAM_REJECTED' ||
      activeRequest.status === 'DEPARTMENT_REJECTED' ||
      activeRequest.status === 'COMPANY_REJECTED'
    );
  }, [activeRequest, isOwnProposal]);

  const allocatedTotal = useMemo(
    () => sumAllocated(opportunities),
    [opportunities],
  );

  const opportunityClaimHints = useMemo(
    () =>
      buildMemberPeerClaimHints(
        teamId,
        userId,
        activeRequest?.id,
        currencyId,
        allTargetRequests,
      ),
    [teamId, userId, activeRequest?.id, currencyId, allTargetRequests],
  );

  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | null>(
    null,
  );

  const saveDraft = async (): Promise<string | null> => {
    const splitError = validateOpportunitySplitAllocations(
      opportunities,
      opportunityClaimHints,
    );
    if (splitError) {
      NotificationMessage.error({ message: splitError });
      return null;
    }

    const normalized = normalizeOpportunityLinesForTargetRequestApi(
      collapseDuplicateOpportunityLines(opportunities),
    );
    const amount = allocatedTotal;

    setLoadingAction((current) => current ?? 'save');
    try {
      const { saved } = await persistMemberTargetProposal({
        planId,
        currencyId,
        teamId,
        userId,
        parentRequestId,
        memberDisplayName: node.scopeName,
        horizon: 'annual',
        amount,
        description: description.trim() || `${node.scopeName} target proposal`,
        opportunities: normalized.map((line) => ({
          ...line,
          ownerId: line.ownerId ?? userId,
          teamId: line.teamId ?? teamId,
        })),
        targetRequests: allTargetRequests,
        refetchTargetRequests: async () => {
          const member = await refetch();
          await refetchAllRequests();
          return { data: member.data ?? [] };
        },
        createTargetRequest: (payload) => createRequest.mutateAsync(payload),
        reviseTargetRequest: (payload) => reviseRequest.mutateAsync(payload),
      });
      await refetch();
      await refetchAllRequests();
      NotificationMessage.success({ message: 'Member proposal saved' });
      return saved.id;
    } catch (error) {
      NotificationMessage.error({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save member proposal',
      });
      return null;
    } finally {
      setLoadingAction((current) => (current === 'save' ? null : current));
    }
  };

  const submitProposal = async () => {
    setLoadingAction('submit');
    try {
      const savedId = await saveDraft();
      const requestId =
        savedId ?? (await refetch()).data?.[0]?.id ?? activeRequest?.id ?? null;
      if (!requestId) {
        throw new Error('No member request to submit');
      }
      await submitRequest.mutateAsync({ planId, requestId });
      await refetch();
      await refetchAllRequests();
      NotificationMessage.success({
        message: 'Member proposal submitted for team lead review',
      });
    } catch (error) {
      NotificationMessage.error({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to submit member proposal',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const saving = loadingAction === 'save';
  const submitting = loadingAction === 'submit';
  const actionBusy = loadingAction != null;
  const profiles = usePlanningPersonProfiles([userId]);

  return (
    <section
      className={cn(
        TARGETS_CARD_CLASS,
        'flex h-full min-h-0 flex-col overflow-hidden',
      )}
    >
      <div className="border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <PlanningPersonCell
              node={node}
              profiles={profiles}
              nameClassName="text-[17px] font-semibold"
            />
          </div>
          {activeRequest?.status ? (
            <PlanningStatusBadge status={activeRequest.status} />
          ) : (
            <PlanningStatusBadge status="DRAFT" />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <MemberPlanningPanelSkeleton />
        ) : !isOwnProposal ? (
          <p className="text-sm text-muted-foreground">
            View-only. Sign in as this member to build and submit a proposal.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-3.5 shadow-xs">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Proposal Total
                </p>
                <p className={cn('mt-1 text-2xl font-bold tracking-tight text-foreground')}>
                  {formatCompactMoney(allocatedTotal, currencyCode)}
                </p>
              </div>
              {node.proposedTarget != null &&
              node.proposedTarget !== allocatedTotal ? (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Saved Amount</p>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {formatCompactMoney(node.proposedTarget, currencyCode)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <TeamProposalOpportunityPicker
                planId={planId}
                calendarId={plan?.calendarId ?? fiscalCalendar?.id}
                currencyCode={currencyCode}
                currencyId={currencyId}
                salesTeamId={teamId}
                ownerId={userId}
                horizon="annual"
                selected={opportunities}
                onChange={setOpportunities}
                disabled={!canEdit || saving}
                allowCustomAdd={canEdit}
                opportunityClaimHints={opportunityClaimHints}
                customOpportunityHint="Custom opportunities you add here are included in your member proposal."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="member-target-description"
                  className="text-[12px] font-semibold text-foreground"
                >
                  Notes
                </Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {description.length}/{NOTES_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="member-target-description"
                rows={2}
                maxLength={NOTES_MAX_LENGTH}
                value={description}
                disabled={!canEdit || saving}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add proposal notes..."
                className="resize-none text-xs"
              />
            </div>

            {!canEdit ? (
              <p className="text-[12px] text-muted-foreground">
                This proposal is locked while it is in review or approved.
              </p>
            ) : null}
          </>
        )}
      </div>

      {canEdit && isOwnProposal && !isLoading ? (
        <StickyActionBar className="justify-end gap-3 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            disabled={actionBusy}
            onClick={() => void saveDraft()}
          >
            {saving ? (
              <>
                <Loader2
                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
                Saving…
              </>
            ) : (
              'Save draft'
            )}
          </Button>
          <PrimaryButton
            type="button"
            className="h-9 gap-1.5 px-4"
            disabled={actionBusy}
            onClick={() => void submitProposal()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              'Submit to team lead'
            )}
          </PrimaryButton>
        </StickyActionBar>
      ) : null}
    </section>
  );
}
