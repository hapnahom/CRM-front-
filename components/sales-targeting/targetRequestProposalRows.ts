import type {
  ForecastOpportunityRow,
  SalesTargetRequest,
  SalesTargetRequestStatus,
  TargetReconciliationTeamRow,
} from '@/store/server/features/salesTargeting/types';
import { opportunityKey } from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import {
  isCompanyApprovedTargetRequestStatus,
  isHybridVisibleAwaitingCompanyApproval,
  isVisibleOnDepartmentTargetDetails,
} from '@/components/sales-targeting/hybridTargetApprovalWorkflow';

const REJECTED: SalesTargetRequestStatus[] = [
  'DEPARTMENT_REJECTED',
  'COMPANY_REJECTED',
];

const APPROVAL_RANK: Record<string, number> = {
  OFFICIAL: 100,
  RECONCILED: 95,
  COMPANY_APPROVED: 90,
  PENDING_RECONCILIATION: 85,
  PENDING_COMPANY: 80,
  DEPARTMENT_APPROVED: 70,
  PENDING_DEPARTMENT: 40,
  DRAFT: 0,
};

export function proposalApprovalLabel(
  status: SalesTargetRequestStatus | string | null | undefined,
): string {
  switch (status) {
    case 'PENDING_DEPARTMENT':
      return 'Pending dept';
    case 'DEPARTMENT_APPROVED':
      return 'Dept approved';
    case 'PENDING_COMPANY':
      return 'Pending company';
    case 'COMPANY_APPROVED':
    case 'PENDING_RECONCILIATION':
    case 'RECONCILED':
      return 'Company approved';
    case 'OFFICIAL':
      return 'Official';
    default:
      return status ? String(status).replace(/_/g, ' ').toLowerCase() : '—';
  }
}

/** Department Details status column: company snapshot or dept-approved (step 1). */
export function departmentDetailsProposalApprovalLabel(
  status: SalesTargetRequestStatus | string | null | undefined,
): string {
  if (isCompanyApprovedTargetRequestStatus(status)) {
    return 'Company approved';
  }
  const normalized = String(status ?? '').toUpperCase();
  if (
    normalized === 'DEPARTMENT_APPROVED' ||
    normalized === 'PENDING_COMPANY'
  ) {
    return 'Dept approved';
  }
  return proposalApprovalLabel(status);
}

/** Company Details: approved snapshot rows always read as company-approved. */
export function companyDetailsProposalApprovalLabel(
  status: SalesTargetRequestStatus | string | null | undefined,
): string {
  if (isCompanyApprovedTargetRequestStatus(status)) {
    return 'Company approved';
  }
  return proposalApprovalLabel(status);
}

function approvalRank(status: string | null | undefined): number {
  if (!status) return -1;
  if (REJECTED.includes(status as SalesTargetRequestStatus)) return -1;
  return APPROVAL_RANK[status] ?? 0;
}

/** Locked in dept Details merge once forwarded to company or company-approved. */
function isMergeLockedForDisplay(status: string | null | undefined): boolean {
  const rank = approvalRank(status);
  return rank >= APPROVAL_RANK.PENDING_COMPANY;
}

function requestSortTime(request: SalesTargetRequest): number {
  return new Date(
    request.createdAt ?? request.submittedAt ?? request.updatedAt ?? 0,
  ).getTime();
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
  return targetRequests
    .filter((row) => {
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
      if (row.status === 'DRAFT') return false;
      if (REJECTED.includes(row.status as SalesTargetRequestStatus))
        return false;
      return true;
    })
    .sort((a, b) => requestSortTime(a) - requestSortTime(b));
}

/**
 * Merge requests for one team (oldest → newest): newer replaces older until
 * company forward/approval; dept-approved rows stay visible and can be replaced
 * by a later dept-approved cycle before company lock.
 */
export function mergedOpportunitiesForTeam(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): Array<{
  request: SalesTargetRequest;
  opp: NonNullable<
    NonNullable<SalesTargetRequest['revisions']>[number]['opportunities']
  >[number];
}> {
  const byOpp = new Map<
    string,
    {
      request: SalesTargetRequest;
      opp: NonNullable<
        NonNullable<SalesTargetRequest['revisions']>[number]['opportunities']
      >[number];
    }
  >();

  for (const request of listTeamScopedRequests(targetRequests, teamId, scope)) {
    const rev =
      request.revisions?.find((r) => r.id === request.currentRevisionId) ??
      request.revisions?.[0];
    for (const opp of rev?.opportunities ?? []) {
      const key = opportunityKey(opp.opportunityType, opp.opportunityId);
      const prev = byOpp.get(key);
      if (!prev) {
        byOpp.set(key, { request, opp });
        continue;
      }
      const prevRank = approvalRank(prev.request.status);
      const nextRank = approvalRank(request.status);
      if (!isMergeLockedForDisplay(prev.request.status)) {
        byOpp.set(key, { request, opp });
      } else if (nextRank > prevRank) {
        byOpp.set(key, { request, opp });
      } else if (
        nextRank === prevRank &&
        requestSortTime(request) > requestSortTime(prev.request)
      ) {
        byOpp.set(key, { request, opp });
      }
    }
  }

  return [...byOpp.values()];
}

export function pickWinningTeamTargetRequest(
  requests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | undefined {
  const candidates = requests.filter((row) => {
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
    if (row.status === 'DRAFT') return false;
    if (REJECTED.includes(row.status as SalesTargetRequestStatus)) return false;
    return true;
  });

  if (!candidates.length) return undefined;

  return [...candidates].sort((a, b) => {
    const rankDiff = approvalRank(b.status) - approvalRank(a.status);
    if (rankDiff !== 0) return rankDiff;
    return (
      new Date(b.updatedAt ?? b.submittedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.submittedAt ?? a.createdAt ?? 0).getTime()
    );
  })[0];
}

function pickNewestRequestByApprovalRank(
  candidates: SalesTargetRequest[],
): SalesTargetRequest | undefined {
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => {
    const rankDiff = approvalRank(b.status) - approvalRank(a.status);
    if (rankDiff !== 0) return rankDiff;
    return (
      new Date(b.updatedAt ?? b.submittedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.submittedAt ?? a.createdAt ?? 0).getTime()
    );
  })[0];
}

function isB2TOpenApprovalCycleStatus(
  status: string | null | undefined,
): boolean {
  const normalized = String(status ?? '').toUpperCase();
  return (
    normalized === 'PENDING_DEPARTMENT' ||
    normalized === 'DEPARTMENT_APPROVED' ||
    normalized === 'PENDING_COMPANY'
  );
}

function requestLifecycleTime(request: SalesTargetRequest): number {
  const submitted = request.submittedAt
    ? new Date(request.submittedAt).getTime()
    : 0;
  if (submitted > 0) return submitted;
  return requestSortTime(request);
}

function pickLockedCompanyApprovedDisplayRequest(
  scoped: SalesTargetRequest[],
): SalesTargetRequest | undefined {
  const companyApproved = scoped.filter((row) =>
    isCompanyApprovedTargetRequestStatus(row.status),
  );
  const openCycle = scoped.filter((row) =>
    isB2TOpenApprovalCycleStatus(row.status),
  );

  const newestCompany = companyApproved.length
    ? pickNewestRequestByApprovalRank(companyApproved)
    : undefined;

  if (openCycle.length && newestCompany) {
    const newCycleStart = Math.min(...openCycle.map(requestLifecycleTime));
    const newestCompanyTime = requestLifecycleTime(newestCompany);
    if (newestCompanyTime >= newCycleStart) {
      return newestCompany;
    }
  }

  if (openCycle.length && companyApproved.length) {
    const newCycleStart = Math.min(...openCycle.map(requestLifecycleTime));
    const lockedCompany = [...companyApproved]
      .filter((row) => requestLifecycleTime(row) < newCycleStart)
      .sort((a, b) => {
        const rankDiff = approvalRank(b.status) - approvalRank(a.status);
        if (rankDiff !== 0) return rankDiff;
        return requestLifecycleTime(b) - requestLifecycleTime(a);
      })[0];
    if (lockedCompany) {
      return lockedCompany;
    }
  }

  return newestCompany;
}

/**
 * Company Details & company card totals — company-approved snapshot only.
 * During a new in-flight cycle, keep the prior company-approved row until the
 * new request is company-approved.
 */
export function pickCompanyDetailsDisplayRequest(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | undefined {
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  return pickLockedCompanyApprovedDisplayRequest(scoped);
}

/**
 * B2T & Hybrid — department Details display (read-only):
 * - Per team: company-approved replaces dept-approved when present.
 * - If no company-approved yet, show dept-approved / pending-company (step 1 complete).
 * - Pending dept / draft never appear here (My approvals only until step 1).
 * - New cycle: keep prior company-approved until the new request is company-approved.
 * (TTB does not use target-request workflow — unchanged.)
 */
export function pickB2TDepartmentDisplayRequest(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
  companyOnlyApproval: boolean,
): SalesTargetRequest | undefined {
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  const companyLocked = pickLockedCompanyApprovedDisplayRequest(scoped);
  if (companyLocked) {
    return companyLocked;
  }

  const deptLevel = scoped.filter((row) =>
    isVisibleOnDepartmentTargetDetails(row.status, companyOnlyApproval),
  );
  return pickNewestRequestByApprovalRank(deptLevel);
}

/** Alias — department Details per-team snapshot (B2T & Hybrid). */
export const pickDepartmentDetailsDisplayRequest =
  pickB2TDepartmentDisplayRequest;

/** Alias — same per-team display rules for Hybrid and B2T dept totals. */
export const pickDepartmentWorkflowDisplayRequest =
  pickB2TDepartmentDisplayRequest;

/**
 * My Approvals → Submitted tab (dept / non-final step): latest package at company
 * review only — never the company-approved snapshot.
 */
export function pickMyApprovalsSubmittedToCompanyRequest(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | undefined {
  const scoped = listTeamScopedRequests(targetRequests, teamId, scope);
  const atCompany = scoped.filter((row) => row.status === 'PENDING_COMPANY');
  if (!atCompany.length) return undefined;
  return [...atCompany].sort(
    (a, b) => requestLifecycleTime(b) - requestLifecycleTime(a),
  )[0];
}

/**
 * My Approvals → Approved tab (company / final step): latest company-approved
 * snapshot per team (same lock rules as company Details).
 */
export function pickMyApprovalsCompanyApprovedTrackingRequest(
  targetRequests: SalesTargetRequest[],
  teamId: string,
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  },
): SalesTargetRequest | undefined {
  return pickCompanyDetailsDisplayRequest(targetRequests, teamId, scope);
}

/**
 * Company Details (embedded): one display request per team — company-approved
 * replaces dept-approved; during a new cycle keep prior company-approved until
 * the new request is company-approved (same rules as dept Details).
 */
type CompanyDetailsTeamCatalogEntry = {
  id: string;
  name: string;
  parentDepartmentId?: string | null;
  parentDepartmentName?: string | null;
};

function displayRowFromTargetRequest(
  request: SalesTargetRequest,
  team: CompanyDetailsTeamCatalogEntry,
): TargetReconciliationTeamRow {
  const rev =
    request.revisions?.find((r) => r.id === request.currentRevisionId) ??
    request.revisions?.[0];
  return {
    requestId: request.id,
    teamId: team.id,
    teamName: team.name,
    departmentId: team.parentDepartmentId ?? null,
    departmentName: team.parentDepartmentName ?? null,
    status: request.status,
    amount: Number(rev?.amount ?? 0),
    currentRevisionId: request.currentRevisionId ?? null,
    opportunities: rev?.opportunities ?? [],
  };
}

export function partitionCompanyDetailsTeamsByDisplayRequest(input: {
  targetRequests: SalesTargetRequest[];
  reconciliationTeams: TargetReconciliationTeamRow[];
  scope: {
    horizon: 'annual' | 'session';
    sessionId?: string | null;
    currencyId?: string | null;
  };
  companyOnlyApproval: boolean;
  /** When reconciliation rows are missing, build display rows from requests + org teams. */
  teamCatalog?: CompanyDetailsTeamCatalogEntry[];
}): {
  awaitingCompany: TargetReconciliationTeamRow[];
  companyApproved: TargetReconciliationTeamRow[];
} {
  const rowByRequestId = new Map(
    input.reconciliationTeams
      .filter((row) => row.requestId)
      .map((row) => [row.requestId, row] as const),
  );

  const teamIds = new Set<string>();
  for (const row of input.reconciliationTeams) {
    if (row.teamId) teamIds.add(row.teamId);
  }
  for (const team of input.teamCatalog ?? []) {
    teamIds.add(team.id);
  }
  const teamById = new Map(
    (input.teamCatalog ?? []).map((team) => [team.id, team] as const),
  );
  for (const request of input.targetRequests) {
    if (!request.teamId) continue;
    const horizon = request.horizon === 'session' ? 'session' : 'annual';
    if (horizon !== input.scope.horizon) continue;
    if (
      input.scope.horizon === 'session' &&
      request.sessionId !== input.scope.sessionId
    ) {
      continue;
    }
    if (
      input.scope.currencyId &&
      request.currencyId !== input.scope.currencyId
    ) {
      continue;
    }
    teamIds.add(request.teamId);
  }

  const awaitingCompany: TargetReconciliationTeamRow[] = [];
  const companyApproved: TargetReconciliationTeamRow[] = [];

  for (const teamId of teamIds) {
    const companyRequest = pickCompanyDetailsDisplayRequest(
      input.targetRequests,
      teamId,
      input.scope,
    );
    if (companyRequest?.id) {
      const catalogTeam = teamById.get(teamId);
      const reconciliationRow = rowByRequestId.get(companyRequest.id);
      const displayRow: TargetReconciliationTeamRow | null = reconciliationRow
        ? {
            ...reconciliationRow,
            requestId: companyRequest.id,
            status: companyRequest.status,
          }
        : catalogTeam
          ? displayRowFromTargetRequest(companyRequest, catalogTeam)
          : null;
      if (displayRow) {
        companyApproved.push(displayRow);
      }
    }

    const awaitingRequest = pickB2TDepartmentDisplayRequest(
      input.targetRequests,
      teamId,
      input.scope,
      input.companyOnlyApproval,
    );
    if (!awaitingRequest?.id) continue;
    if (isCompanyApprovedTargetRequestStatus(awaitingRequest.status)) {
      continue;
    }

    if (
      isHybridVisibleAwaitingCompanyApproval(
        awaitingRequest.status,
        input.companyOnlyApproval,
      )
    ) {
      const catalogTeam = teamById.get(teamId);
      const reconciliationRow = rowByRequestId.get(awaitingRequest.id);
      const displayRow: TargetReconciliationTeamRow | null = reconciliationRow
        ? {
            ...reconciliationRow,
            requestId: awaitingRequest.id,
            status: awaitingRequest.status,
          }
        : catalogTeam
          ? displayRowFromTargetRequest(awaitingRequest, catalogTeam)
          : null;
      if (displayRow) {
        awaitingCompany.push(displayRow);
      }
    }
  }

  return { awaitingCompany, companyApproved };
}

export function buildB2TDepartmentDetailsDisplayRows(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  departmentName: string;
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  currencyCode: string;
  companyOnlyApproval?: boolean;
}): ForecastOpportunityRow[] {
  const {
    targetRequests,
    teamIds,
    departmentName,
    horizon,
    sessionId,
    currencyId,
    currencyCode,
    companyOnlyApproval = false,
  } = input;
  const scope = { horizon, sessionId, currencyId };
  const rows: ForecastOpportunityRow[] = [];

  for (const teamId of teamIds) {
    const request = pickB2TDepartmentDisplayRequest(
      targetRequests,
      teamId,
      scope,
      companyOnlyApproval,
    );
    if (!request) continue;
    const rev =
      request.revisions?.find((r) => r.id === request.currentRevisionId) ??
      request.revisions?.[0];
    for (const opp of rev?.opportunities ?? []) {
      rows.push({
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
        salesTeamId: opp.teamId ?? teamId,
        department: departmentName,
        opportunityValue: Number(opp.opportunityValue) || 0,
        probability: Number(opp.probability) || 0,
        forecastValue: Number(opp.allocatedAmount ?? opp.forecastValue) || 0,
        expectedCloseDate: opp.expectedCloseDate ?? null,
        currency: currencyCode,
        status: opp.opportunityType === 'custom' ? 'custom' : 'open',
        proposalApprovalLabel: departmentDetailsProposalApprovalLabel(
          request.status,
        ),
        proposalRequestId: request.id,
      });
    }
  }

  return rows;
}

export function sumB2TDepartmentDetailsDisplayAmount(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  companyOnlyApproval?: boolean;
}): number {
  let sum = 0;
  const scope = {
    horizon: input.horizon,
    sessionId: input.sessionId,
    currencyId: input.currencyId,
  };
  for (const teamId of input.teamIds) {
    const request = pickB2TDepartmentDisplayRequest(
      input.targetRequests,
      teamId,
      scope,
      input.companyOnlyApproval ?? false,
    );
    if (!request) continue;
    const rev =
      request.revisions?.find((r) => r.id === request.currentRevisionId) ??
      request.revisions?.[0];
    sum += Number(rev?.amount ?? 0);
  }
  return Math.round(sum * 100) / 100;
}

/** Dept card / Details totals — per-team workflow display (B2T & Hybrid). */
export const sumDepartmentWorkflowDisplayAmount =
  sumB2TDepartmentDetailsDisplayAmount;

/** Dept tiles & distribution — workflow rollup when B2T/Hybrid, else dept commit. */
export function resolveDepartmentWorkflowOrCommitAmount(input: {
  commitAmount: number;
  useWorkflowDisplay: boolean;
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  companyOnlyApproval?: boolean;
}): number {
  const commit = Number(input.commitAmount) || 0;
  if (!input.useWorkflowDisplay || input.teamIds.length === 0) {
    return commit;
  }
  const workflow = sumDepartmentWorkflowDisplayAmount({
    targetRequests: input.targetRequests,
    teamIds: input.teamIds,
    horizon: input.horizon,
    sessionId: input.sessionId,
    currencyId: input.currencyId,
    companyOnlyApproval: input.companyOnlyApproval,
  });
  return workflow > 0 ? workflow : commit;
}

/** B2T & Hybrid company card + Details: sum each team's display snapshot (company over dept). */
export function sumB2TCompanyDetailsDisplayAmount(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  companyOnlyApproval?: boolean;
}): number {
  let sum = 0;
  const scope = {
    horizon: input.horizon,
    sessionId: input.sessionId,
    currencyId: input.currencyId,
  };
  for (const teamId of input.teamIds) {
    const request = pickCompanyDetailsDisplayRequest(
      input.targetRequests,
      teamId,
      scope,
    );
    if (!request) continue;
    const rev =
      request.revisions?.find((r) => r.id === request.currentRevisionId) ??
      request.revisions?.[0];
    sum += Number(rev?.amount ?? 0);
  }
  return Math.round(sum * 100) / 100;
}

/** Department Details (Hybrid editable pool): merged per team, one row per team+opportunity. */
export function buildDepartmentProposalForecastRows(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  teamNameById?: Map<string, string>;
  departmentName: string;
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  currencyCode: string;
  /** Target Settings: one-step company workflow vs dept then company. */
  companyOnlyApproval?: boolean;
}): ForecastOpportunityRow[] {
  const {
    targetRequests,
    teamIds,
    departmentName,
    horizon,
    sessionId,
    currencyId,
    currencyCode,
    companyOnlyApproval = false,
  } = input;

  return buildB2TDepartmentDetailsDisplayRows({
    targetRequests,
    teamIds,
    departmentName,
    horizon,
    sessionId,
    currencyId,
    currencyCode,
    companyOnlyApproval,
  });
}

export function proposalForecastRowKey(row: ForecastOpportunityRow): string {
  if (row.proposalApprovalLabel && row.salesTeamId) {
    return `${row.salesTeamId}:${opportunityKey(row.opportunityType, row.opportunityId)}`;
  }
  return opportunityKey(row.opportunityType, row.opportunityId);
}

export function isWinningTargetRequest(
  request: SalesTargetRequest,
  pool: SalesTargetRequest[],
): boolean {
  if (!request.teamId) return false;
  const horizon = request.horizon === 'session' ? 'session' : 'annual';
  const winning = pickWinningTeamTargetRequest(pool, request.teamId, {
    horizon,
    sessionId: request.sessionId,
    currencyId: request.currencyId,
  });
  return winning?.id === request.id;
}

export function sumWinningTeamProposalAmounts(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
}): number {
  let sum = 0;
  for (const teamId of input.teamIds) {
    const request = pickWinningTeamTargetRequest(
      input.targetRequests,
      teamId,
      input,
    );
    if (!request) continue;
    const rev =
      request.revisions?.find((r) => r.id === request.currentRevisionId) ??
      request.revisions?.[0];
    sum += Number(rev?.amount ?? 0);
  }
  return Math.round(sum * 100) / 100;
}

/** Amount rollup from merged opps (allocated lines) per team. */
export function sumMergedTeamProposalAmounts(input: {
  targetRequests: SalesTargetRequest[];
  teamIds: string[];
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
  companyOnlyApproval?: boolean;
}): number {
  let sum = 0;
  const scope = {
    horizon: input.horizon,
    sessionId: input.sessionId,
    currencyId: input.currencyId,
  };
  for (const teamId of input.teamIds) {
    for (const { request, opp } of mergedOpportunitiesForTeam(
      input.targetRequests,
      teamId,
      scope,
    )) {
      if (
        !isVisibleOnDepartmentTargetDetails(
          request.status,
          input.companyOnlyApproval ?? false,
        )
      ) {
        continue;
      }
      sum += Number(opp.allocatedAmount ?? opp.forecastValue) || 0;
    }
  }
  return Math.round(sum * 100) / 100;
}
