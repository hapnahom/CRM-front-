import { findTeamProposalUpsertTarget } from '@/components/sales-targeting/targetRequestEditGuards';
import type {
  SalesTargetRequest,
  SalesTargetReviewLevel,
} from '@/store/server/features/salesTargeting/types';

export type TargetRejectionFeedbackEntry = {
  label?: string;
  comment: string;
  decidedAt?: string;
};

function listTeamScopedRequests(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest[] {
  return targetRequests.filter((row) => {
    if (row.teamId !== teamId) return false;
    if (row.horizon !== scope.horizon) return false;
    if (scope.horizon === 'session') {
      if ((row.sessionId ?? null) !== (scope.sessionId ?? null)) return false;
    } else if (row.sessionId) {
      return false;
    }
    if (
      scope.currencyId?.trim() &&
      row.currencyId !== scope.currencyId.trim()
    ) {
      return false;
    }
    return true;
  });
}

export function latestRejectedReviewForRequest(
  request: SalesTargetRequest | null | undefined,
  reviewLevel: SalesTargetReviewLevel,
): { comment: string | null; createdAt: string } | null {
  if (!request?.reviews?.length) return null;
  const matches = request.reviews
    .filter(
      (row) =>
        row.reviewLevel === reviewLevel &&
        (row.decision ?? '').toUpperCase() === 'REJECTED',
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const latest = matches[0];
  if (!latest) return null;
  return {
    comment: latest.comment?.trim() || null,
    createdAt: latest.createdAt,
  };
}

function hasCompanyRejectionPendingDepartmentResubmit(
  request: SalesTargetRequest,
): boolean {
  if (request.status !== 'PENDING_DEPARTMENT') return false;
  return latestRejectedReviewForRequest(request, 'COMPANY') != null;
}

/** Team Details — department approver rejected this proposal (B2T / Hybrid). */
export function teamDepartmentRejectionFeedback(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): TargetRejectionFeedbackEntry | null {
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  const rejectedRow =
    scoped.find((row) => row.status === 'DEPARTMENT_REJECTED') ??
    findTeamProposalUpsertTarget(targetRequests, teamId, scope);
  if (!rejectedRow || rejectedRow.status !== 'DEPARTMENT_REJECTED') {
    return null;
  }
  const review = latestRejectedReviewForRequest(rejectedRow, 'DEPARTMENT');
  if (!review) return null;
  return {
    comment: review.comment?.trim() || 'Rejected by department approver.',
    decidedAt: review.createdAt,
  };
}

/** Department Details — company approver sent a team row back to department review. */
export function departmentCompanyRejectionFeedbacks(
  targetRequests: SalesTargetRequest[],
  teamIds: string[],
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
  teamNameById: Map<string, string> | ReadonlyMap<string, string>,
): TargetRejectionFeedbackEntry[] {
  const entries: TargetRejectionFeedbackEntry[] = [];
  for (const teamId of teamIds) {
    const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
    const row = scoped.find(hasCompanyRejectionPendingDepartmentResubmit);
    if (!row) continue;
    const review = latestRejectedReviewForRequest(row, 'COMPANY');
    if (!review) continue;
    entries.push({
      label: teamNameById.get(teamId) ?? 'Team',
      comment: review.comment?.trim() || 'Rejected by company approver.',
      decidedAt: review.createdAt,
    });
  }
  entries.sort(
    (a, b) =>
      new Date(b.decidedAt ?? 0).getTime() -
      new Date(a.decidedAt ?? 0).getTime(),
  );
  return entries;
}
