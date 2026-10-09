import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';

/** Snapshotted at submit — stable when Settings → Approvals change later. */
export function resolveSnapshottedApprovalSubjectUserId(
  request: SalesTargetRequest,
  planCreatedBy?: string | null,
): string | null {
  const meta = request.metadata as
    | { approvalSubjectUserId?: string }
    | undefined;
  const fromMeta = meta?.approvalSubjectUserId?.trim();
  if (fromMeta) return fromMeta;
  const fromPlan = planCreatedBy?.trim();
  return fromPlan || null;
}

export function isPlanCreatorSubmitter(
  planCreatedBy: string | null | undefined,
  request: SalesTargetRequest,
): boolean {
  const creator = resolveSnapshottedApprovalSubjectUserId(
    request,
    planCreatedBy,
  );
  const submitter = request.submittedBy?.trim();
  return Boolean(creator && submitter && creator === submitter);
}

/** Updated/resubmitted proposals need a manual department approval. */
export function blocksPlanCreatorSelfDeptAutoSkip(
  request: SalesTargetRequest,
): boolean {
  const current = request.revisions?.find(
    (row) => row.id === request.currentRevisionId,
  );
  if (!current) return false;

  const source = current.revisionSource ?? '';
  if (source && source !== 'TEAM_SUBMISSION') {
    return true;
  }

  for (const review of request.reviews ?? []) {
    const level = (review.reviewLevel ?? '').toUpperCase();
    if (level !== 'DEPARTMENT') continue;
    const decision = (review.decision ?? '').toUpperCase();
    if (
      decision === 'MODIFIED' ||
      decision === 'REJECTED' ||
      decision === 'RETURNED'
    ) {
      return true;
    }
  }

  return false;
}
