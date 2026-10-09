import { findTeamProposalUpsertTarget } from '@/components/sales-targeting/targetRequestEditGuards';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';
import type { SalesTargetOpportunityType } from '@/store/server/features/salesTargeting/types';

export type TeamProposalOpportunityPayload = {
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
};

function apiErrorMessage(error: unknown): string {
  const raw = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join(' ');
  return '';
}

function isTeamProposalLockedForTeamReviseError(error: unknown): boolean {
  return apiErrorMessage(error).includes('Department has already approved');
}

/** Team Details Save — fresh list, new cycle when dept already approved. */
export async function persistTeamTargetProposal(input: {
  planId: string;
  currencyId: string;
  teamId: string;
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
    teamId: string;
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
  submitTargetRequest: (payload: {
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

  const upsertTarget = findTeamProposalUpsertTarget(
    refreshed,
    input.teamId,
    scope,
  );

  const createPayload = {
    planId: input.planId,
    currencyId: input.currencyId,
    teamId: input.teamId,
    horizon: input.horizon,
    sessionId: input.sessionId,
    amount: input.amount,
    description: input.description,
    opportunities: input.opportunities,
  };

  const revisePayload = {
    planId: input.planId,
    requestId: upsertTarget?.id ?? '',
    amount: input.amount,
    description: input.description,
    revisionReason: 'Team updated proposal before department approval',
    opportunities: input.opportunities,
  };

  let saved: SalesTargetRequest;
  let updatedExisting = Boolean(upsertTarget);

  if (upsertTarget) {
    try {
      saved = await input.reviseTargetRequest(revisePayload);
    } catch (error: unknown) {
      if (!isTeamProposalLockedForTeamReviseError(error)) {
        throw error;
      }
      saved = await input.createTargetRequest(createPayload);
      updatedExisting = false;
    }
  } else {
    saved = await input.createTargetRequest(createPayload);
    updatedExisting = false;
  }

  if (
    saved.status === 'DRAFT' ||
    saved.status === 'DEPARTMENT_REJECTED' ||
    saved.status === 'COMPANY_REJECTED'
  ) {
    saved = await input.submitTargetRequest({
      planId: input.planId,
      requestId: saved.id,
    });
  }

  return { saved, updatedExisting };
}
