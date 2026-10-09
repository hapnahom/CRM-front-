import { findMemberProposalUpsertTarget } from '@/components/sales-targeting/targetRequestEditGuards';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';
import type { TeamProposalOpportunityPayload } from '@/components/sales-targeting/teamTargetProposalSave';

export async function persistMemberTargetProposal(input: {
  planId: string;
  currencyId: string;
  teamId: string;
  userId: string;
  parentRequestId?: string | null;
  memberDisplayName?: string | null;
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  amount: number;
  description: string;
  opportunities: TeamProposalOpportunityPayload[];
  targetRequests: SalesTargetRequest[];
  refetchTargetRequests: () => Promise<{ data?: SalesTargetRequest[] }>;
  createTargetRequest: (payload: {
    planId: string;
    currencyId: string;
    targetLevel: 'person';
    teamId: string;
    userId: string;
    parentRequestId?: string | null;
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    amount: number;
    description?: string | null;
    opportunities: TeamProposalOpportunityPayload[];
  }) => Promise<SalesTargetRequest>;
  reviseTargetRequest: (payload: {
    planId: string;
    requestId: string;
    amount: number;
    description?: string | null;
    revisionReason?: string | null;
    opportunities: TeamProposalOpportunityPayload[];
  }) => Promise<SalesTargetRequest>;
  /** When set, draft / team-rejected proposals are submitted for team lead review after save. */
  submitTargetRequest?: (payload: {
    planId: string;
    requestId: string;
  }) => Promise<SalesTargetRequest>;
}): Promise<{ saved: SalesTargetRequest; updatedExisting: boolean }> {
  const { data: refreshed = input.targetRequests } =
    await input.refetchTargetRequests();
  const scope = {
    horizon: input.horizon,
    sessionId: input.sessionId,
    currencyId: input.currencyId,
  };

  const upsertTarget = findMemberProposalUpsertTarget(
    refreshed,
    input.teamId,
    input.userId,
    scope,
  );

  const createPayload = {
    planId: input.planId,
    currencyId: input.currencyId,
    targetLevel: 'person' as const,
    teamId: input.teamId,
    userId: input.userId,
    parentRequestId: input.parentRequestId ?? null,
    horizon: input.horizon,
    sessionId: input.sessionId,
    amount: input.amount,
    description: input.description,
    opportunities: input.opportunities,
    metadata: input.memberDisplayName?.trim()
      ? { memberDisplayName: input.memberDisplayName.trim() }
      : null,
  };

  const revisePayload = {
    planId: input.planId,
    requestId: upsertTarget?.id ?? '',
    amount: input.amount,
    description: input.description,
    revisionReason: 'Member updated proposal before team approval',
    opportunities: input.opportunities,
  };

  let saved: SalesTargetRequest;
  let updatedExisting = Boolean(upsertTarget);

  if (upsertTarget) {
    saved = await input.reviseTargetRequest(revisePayload);
  } else {
    saved = await input.createTargetRequest(createPayload);
    updatedExisting = false;
  }

  if (
    input.submitTargetRequest &&
    (saved.status === 'DRAFT' || saved.status === 'TEAM_REJECTED')
  ) {
    saved = await input.submitTargetRequest({
      planId: input.planId,
      requestId: saved.id,
    });
  }

  return { saved, updatedExisting };
}
