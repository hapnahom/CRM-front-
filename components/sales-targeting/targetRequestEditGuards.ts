import { opportunityKey } from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import { pickCompanyDetailsDisplayRequest } from '@/components/sales-targeting/targetRequestProposalRows';
import type {
  ForecastOpportunityRow,
  SalesTargetRequest,
  SalesTargetRequestStatus,
} from '@/store/server/features/salesTargeting/types';

export type TeamTargetRequestScope = {
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
};

/** Department or higher has approved — approved proposal is immutable for the team. */
export function isDepartmentOrHigherApproved(
  status: SalesTargetRequestStatus | string | null | undefined,
): boolean {
  return (
    status === 'DEPARTMENT_APPROVED' ||
    status === 'PENDING_COMPANY' ||
    status === 'COMPANY_APPROVED' ||
    status === 'PENDING_RECONCILIATION' ||
    status === 'RECONCILED' ||
    status === 'OFFICIAL'
  );
}

/** Team can edit proposal content (Save) until company has approved. */
export function isTeamProposalEditable(
  status: SalesTargetRequestStatus | string | null | undefined,
): boolean {
  if (isCompanyOrOfficial(status) || status === 'OFFICIAL') return false;
  return (
    status === 'DRAFT' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_REJECTED' ||
    status === 'COMPANY_REJECTED' ||
    !status
  );
}

/** Company has approved — department becomes view-only. */
export function isCompanyOrOfficial(
  status: SalesTargetRequestStatus | string | null | undefined,
): boolean {
  return (
    status === 'COMPANY_APPROVED' ||
    status === 'OFFICIAL' ||
    status === 'PENDING_RECONCILIATION' ||
    status === 'RECONCILED'
  );
}

/**
 * @param actor 'team' may edit until company approval (same request upsert).
 *              'department' can edit until company approval.
 */
export function teamProposalBlockedReason(
  status: SalesTargetRequestStatus | string | null | undefined,
  actor: 'team' | 'department' = 'team',
): string | null {
  if (!status) return null;
  if (status === 'OFFICIAL') {
    return 'Official targets cannot be edited from proposal Details.';
  }
  if (actor === 'department') {
    if (isCompanyOrOfficial(status)) {
      return 'Company approved — department can only view this proposal.';
    }
    return null;
  }
  if (isTeamProposalEditable(status)) return null;
  if (isCompanyOrOfficial(status)) {
    // Team Details: Save creates the next approval cycle (no separate “new proposal” step).
    return null;
  }
  if (status === 'DEPARTMENT_APPROVED' || status === 'PENDING_COMPANY') {
    return null;
  }
  return 'This proposal cannot be edited in its current status.';
}

export function canEditTeamProposal(
  status: SalesTargetRequestStatus | string | null | undefined,
  actor: 'team' | 'department' = 'team',
): boolean {
  return !teamProposalBlockedReason(status, actor);
}

/** @deprecated Prefer findTeamProposalUpsertTarget for Save routing. */
export function isTeamUpsertableProposalStatus(
  status: SalesTargetRequestStatus | string | null | undefined,
): boolean {
  if (isCompanyOrOfficial(status) || status === 'OFFICIAL') return false;
  return (
    status === 'DRAFT' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_REJECTED' ||
    status === 'COMPANY_REJECTED' ||
    !status
  );
}

/** Reused after a prior company-approved cycle (one pre-approval row per scope). */
export function isPreApprovalScopedUniqueStatus(
  status: SalesTargetRequestStatus | string | null | undefined,
): boolean {
  return (
    status === 'DRAFT' ||
    status === 'PENDING_TEAM' ||
    status === 'TEAM_REJECTED' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_REJECTED' ||
    status === 'COMPANY_REJECTED'
  );
}

function listPersonScopedRequests(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  userId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest[] {
  return targetRequests.filter((row) => {
    if (row.targetLevel !== 'person') return false;
    if (row.teamId !== teamId) return false;
    if (row.userId !== userId) return false;
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

/** B2T / Hybrid member Save — one open pre-approval row per person scope. */
export function findMemberProposalUpsertTarget(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  userId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | null {
  const scoped = listPersonScopedRequests(
    targetRequests,
    teamId,
    userId,
    scope,
  );
  const hasCompanyApprovedInScope = scoped.some((row) =>
    isCompanyOrOfficial(row.status),
  );
  const preApproval = scoped.find((row) =>
    isPreApprovalScopedUniqueStatus(row.status),
  );

  if (preApproval) return preApproval;

  if (hasCompanyApprovedInScope) {
    return (
      scoped.find((row) => isPreApprovalScopedUniqueStatus(row.status)) ?? null
    );
  }

  return null;
}

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

/**
 * B2T / Hybrid team Save — matches backend pickTeamProposalUpsertTargetForTeamSave.
 */
export function findTeamProposalUpsertTarget(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | null {
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  const hasCompanyApprovedInScope = scoped.some((row) =>
    isCompanyOrOfficial(row.status),
  );

  const hasDeptApprovedOrCompanyPending = scoped.some(
    (row) =>
      row.status === 'DEPARTMENT_APPROVED' || row.status === 'PENDING_COMPANY',
  );
  const preApproval = scoped.find((row) =>
    isPreApprovalScopedUniqueStatus(row.status),
  );

  if (hasDeptApprovedOrCompanyPending) {
    return preApproval ?? null;
  }
  if (preApproval) return preApproval;

  if (hasCompanyApprovedInScope) {
    return (
      scoped.find((row) => isPreApprovalScopedUniqueStatus(row.status)) ?? null
    );
  }

  return null;
}

/** Team Details display / preselect — open pre-approval row wins over dept-approved package. */
export function pickTeamDetailsDisplayRequest(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | undefined {
  const upsert = findTeamProposalUpsertTarget(targetRequests, teamId, scope);
  if (upsert) return upsert;
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  const sorted = [...scoped].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.submittedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.submittedAt ?? a.createdAt ?? 0).getTime(),
  );
  return sorted[0];
}

export function teamHasCompanyApprovedRequestInScope(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: TeamTargetRequestScope,
): boolean {
  return listTeamScopedRequests(targetRequests, teamId, scope).some((row) =>
    isCompanyOrOfficial(row.status),
  );
}

function currentRevisionForRequest(request?: SalesTargetRequest) {
  if (!request) return undefined;
  return (
    request.revisions?.find((r) => r.id === request.currentRevisionId) ??
    request.revisions?.[0]
  );
}

function opportunityKeysFromRequest(request?: SalesTargetRequest): string[] {
  const rev = currentRevisionForRequest(request);
  return (rev?.opportunities ?? []).map((opp) =>
    opportunityKey(opp.opportunityType, opp.opportunityId),
  );
}

function allocatedAmountsFromRequest(
  request?: SalesTargetRequest,
): Record<string, number> {
  const rev = currentRevisionForRequest(request);
  const amounts: Record<string, number> = {};
  for (const opp of rev?.opportunities ?? []) {
    amounts[opportunityKey(opp.opportunityType, opp.opportunityId)] =
      Number(opp.allocatedAmount ?? opp.forecastValue) || 0;
  }
  return amounts;
}

/** Company-approved snapshot lines for B2T/Hybrid team Details defaults. */
export function companyApprovedForecastRowsForTeam(input: {
  targetRequests: SalesTargetRequest[];
  teamId: string;
  scope: TeamTargetRequestScope;
  currencyCode: string;
}): ForecastOpportunityRow[] {
  const request = pickCompanyDetailsDisplayRequest(
    input.targetRequests,
    input.teamId,
    input.scope,
  );
  const rev = currentRevisionForRequest(request);
  return (rev?.opportunities ?? []).map((opp) => ({
    opportunityType:
      opp.opportunityType as ForecastOpportunityRow['opportunityType'],
    opportunityId: opp.opportunityId,
    opportunityName: opp.opportunityName ?? opp.opportunityId,
    customerId: null,
    customerName: null,
    ownerId: opp.ownerId ?? null,
    ownerName: null,
    stageId: null,
    stageName: null,
    stageCategory: null,
    forecastCategory: null,
    salesTeamId: opp.teamId ?? input.teamId,
    department: null,
    opportunityValue: Number(opp.opportunityValue) || 0,
    probability: Number(opp.probability) || 0,
    forecastValue: Number(opp.forecastValue) || 0,
    expectedCloseDate: opp.expectedCloseDate ?? null,
    currency: input.currencyCode,
    status: opp.opportunityType === 'custom' ? 'custom' : 'open',
    sessionId: input.scope.horizon === 'session' ? input.scope.sessionId : null,
  }));
}

/**
 * B2T/Hybrid team Details — after company approval, default-check the locked
 * company-approved snapshot (not other in-flight requests). Saved lines on the
 * current open pre-approval request override only that same request.
 */
export function resolveWorkflowTeamPreferredSelectedKeys(input: {
  targetRequests: SalesTargetRequest[];
  teamId: string;
  scope: TeamTargetRequestScope;
}): string[] {
  const { targetRequests, teamId, scope } = input;

  const upsert = findTeamProposalUpsertTarget(targetRequests, teamId, scope);
  const display = pickTeamDetailsDisplayRequest(targetRequests, teamId, scope);

  if (!teamHasCompanyApprovedRequestInScope(targetRequests, teamId, scope)) {
    return opportunityKeysFromRequest(display);
  }

  const companyApprovedKeys = opportunityKeysFromRequest(
    pickCompanyDetailsDisplayRequest(targetRequests, teamId, scope),
  );

  const openPreApproval =
    upsert != null && isPreApprovalScopedUniqueStatus(upsert.status);
  if (openPreApproval && upsert) {
    const upsertKeys = opportunityKeysFromRequest(upsert);
    if (upsertKeys.length > 0) {
      return upsertKeys;
    }
  }

  if (companyApprovedKeys.length > 0) {
    return companyApprovedKeys;
  }
  return opportunityKeysFromRequest(display);
}

export function resolveWorkflowTeamPreferredAllocatedAmounts(input: {
  targetRequests: SalesTargetRequest[];
  teamId: string;
  scope: TeamTargetRequestScope;
}): Record<string, number> {
  const { targetRequests, teamId, scope } = input;

  const upsert = findTeamProposalUpsertTarget(targetRequests, teamId, scope);
  const display = pickTeamDetailsDisplayRequest(targetRequests, teamId, scope);

  if (!teamHasCompanyApprovedRequestInScope(targetRequests, teamId, scope)) {
    return allocatedAmountsFromRequest(display);
  }

  const companyApprovedAmounts = allocatedAmountsFromRequest(
    pickCompanyDetailsDisplayRequest(targetRequests, teamId, scope),
  );

  const openPreApproval =
    upsert != null && isPreApprovalScopedUniqueStatus(upsert.status);
  if (openPreApproval && upsert) {
    const upsertAmounts = allocatedAmountsFromRequest(upsert);
    if (Object.keys(upsertAmounts).length > 0) {
      return upsertAmounts;
    }
  }

  if (Object.keys(companyApprovedAmounts).length > 0) {
    return companyApprovedAmounts;
  }
  return allocatedAmountsFromRequest(display);
}

/** Team edit pool: live forecast plus company-approved snapshot rows. */
export function resolveWorkflowTeamDetailForecastRows(input: {
  targetRequests: SalesTargetRequest[];
  teamId: string;
  scope: TeamTargetRequestScope;
  liveTeamRows: ForecastOpportunityRow[];
  currencyCode: string;
}): ForecastOpportunityRow[] {
  const { targetRequests, teamId, scope, liveTeamRows, currencyCode } = input;

  if (!teamHasCompanyApprovedRequestInScope(targetRequests, teamId, scope)) {
    return liveTeamRows;
  }

  const byKey = new Map<string, ForecastOpportunityRow>();
  for (const row of companyApprovedForecastRowsForTeam({
    targetRequests,
    teamId,
    scope,
    currencyCode,
  })) {
    byKey.set(opportunityKey(row.opportunityType, row.opportunityId), row);
  }
  for (const row of liveTeamRows) {
    byKey.set(opportunityKey(row.opportunityType, row.opportunityId), row);
  }
  return [...byKey.values()];
}
