import { pickDepartmentWorkflowDisplayRequest } from '@/components/sales-targeting/targetRequestProposalRows';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';

export type DepartmentTeamRow = {
  requestId: string;
  teamId: string;
  teamName: string;
  status: string;
  amount: number;
  request: SalesTargetRequest;
};

export type DepartmentConsolidationScopeGroup = {
  key: string;
  scopeLabel: string;
  horizon: 'annual' | 'session';
  sessionId?: string;
  sortKey: number;
  teamRows: DepartmentTeamRow[];
  allTeamsDeptReadyForScope: boolean;
  canSubmit: boolean;
};

function requestScopeKey(request: SalesTargetRequest): string {
  if (request.horizon === 'session' && request.sessionId) {
    return `session:${request.sessionId}`;
  }
  return 'annual';
}

function sessionSortTime(
  sessions: { id: string; startDate?: string; endDate?: string }[],
  sessionId: string,
): number {
  const session = sessions.find((s) => s.id === sessionId);
  const raw = session?.startDate ?? session?.endDate;
  return raw ? new Date(raw).getTime() : 0;
}

function requestScopeLabel(
  request: SalesTargetRequest,
  sessions: { id: string; name?: string | null }[],
): string {
  if (request.horizon === 'session' && request.sessionId) {
    const session = sessions.find((s) => s.id === request.sessionId);
    if (session?.name?.trim()) {
      return `Period · ${session.name.trim()}`;
    }
    return `Period · ${request.sessionId.slice(0, 8)}`;
  }
  return 'Annual';
}

function workflowScopeFromScopeKey(
  scopeKey: string,
  currencyId: string,
): {
  horizon: 'annual' | 'session';
  sessionId?: string | null;
  currencyId?: string | null;
} {
  if (scopeKey === 'annual') {
    return { horizon: 'annual', sessionId: null, currencyId };
  }
  return {
    horizon: 'session',
    sessionId: scopeKey.replace(/^session:/, ''),
    currencyId,
  };
}

function departmentScopedTeamsForDepartment(
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  departmentId: string,
) {
  const deptKey = departmentId.trim();
  if (!deptKey) return [];
  return salesTeams.filter(
    (team) =>
      team.targetParentLevel !== 'company' &&
      (team.parentDepartmentId?.trim() ?? '') === deptKey,
  );
}

function isDepartmentPackageStatus(status?: string | null): boolean {
  return (
    status === 'DRAFT' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'DEPARTMENT_APPROVED'
  );
}

function listDepartmentScopedPackageRequests(
  allRequestsForCurrency: SalesTargetRequest[],
  teamId: string,
  scopeKey: string,
  currencyId: string,
): SalesTargetRequest[] {
  return allRequestsForCurrency.filter((row) => {
    if (row.teamId !== teamId) return false;
    if (requestScopeKey(row) !== scopeKey) return false;
    if (row.currencyId !== currencyId) return false;
    if (row.status === 'DRAFT') return false;
    if (
      row.status === 'DEPARTMENT_REJECTED' ||
      row.status === 'COMPANY_REJECTED'
    ) {
      return false;
    }
    return true;
  });
}

/**
 * My Approvals dept package rows per team (0–2).
 * When a new team cycle is PENDING_DEPARTMENT, keep the older DEPARTMENT_APPROVED
 * row visible for submit-to-company until dept approves the new cycle.
 */
function listDepartmentConsolidationInboxRequests(
  allRequestsForCurrency: SalesTargetRequest[],
  teamId: string,
  scopeKey: string,
  currencyId: string,
  companyOnlyApproval: boolean,
): SalesTargetRequest[] {
  const scoped = listDepartmentScopedPackageRequests(
    allRequestsForCurrency,
    teamId,
    scopeKey,
    currencyId,
  );
  const byId = new Map<string, SalesTargetRequest>();
  const pending = scoped.find((row) => row.status === 'PENDING_DEPARTMENT');
  if (pending) byId.set(pending.id, pending);
  const deptApproved = scoped.find(
    (row) => row.status === 'DEPARTMENT_APPROVED',
  );
  if (deptApproved) byId.set(deptApproved.id, deptApproved);

  if (byId.size) {
    return [...byId.values()];
  }

  const workflowScope = workflowScopeFromScopeKey(scopeKey, currencyId);
  const display = pickDepartmentWorkflowDisplayRequest(
    allRequestsForCurrency,
    teamId,
    workflowScope,
    companyOnlyApproval,
  );
  if (display && isDepartmentPackageStatus(display.status)) {
    return [display];
  }
  return [];
}

function isDepartmentStepCompleteForForward(
  request: SalesTargetRequest,
): boolean {
  const status = request.status ?? '';
  return (
    status === 'DEPARTMENT_APPROVED' ||
    status === 'PENDING_COMPANY' ||
    status === 'COMPANY_APPROVED' ||
    status === 'PENDING_RECONCILIATION' ||
    status === 'RECONCILED' ||
    status === 'OFFICIAL'
  );
}

function hasActiveTeamRequest(request: SalesTargetRequest): boolean {
  if (!request?.id?.trim()) return false;
  if (request.status === 'DRAFT') return false;
  return true;
}

function currentRevision(request?: SalesTargetRequest | null) {
  return request?.revisions?.find((r) => r.id === request.currentRevisionId);
}

export function buildDepartmentConsolidationGroupsForDept(
  deptId: string,
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  allRequestsForCurrency: SalesTargetRequest[],
  currencyId: string,
  companyOnlyApproval: boolean,
  sessions: {
    id: string;
    name?: string | null;
    startDate?: string;
    endDate?: string;
  }[],
): DepartmentConsolidationScopeGroup[] {
  const deptKey = deptId.trim();
  if (!deptKey) return [];

  const deptTeams = departmentScopedTeamsForDepartment(salesTeams, deptKey);
  const departmentTeamIds = new Set(deptTeams.map((team) => team.id));
  if (!departmentTeamIds.size) return [];

  const scopeKeySet = new Set<string>();
  for (const row of allRequestsForCurrency) {
    if (!row.teamId || !departmentTeamIds.has(row.teamId)) continue;
    scopeKeySet.add(requestScopeKey(row));
  }

  const sortedKeys = [...scopeKeySet].sort((a, b) => {
    if (a === 'annual') return -1;
    if (b === 'annual') return 1;
    return (
      sessionSortTime(sessions, b.replace(/^session:/, '')) -
      sessionSortTime(sessions, a.replace(/^session:/, ''))
    );
  });

  const groups: DepartmentConsolidationScopeGroup[] = [];
  for (const key of sortedKeys) {
    const sessionId =
      key === 'annual' ? undefined : key.replace(/^session:/, '');
    const sample = allRequestsForCurrency.find(
      (r) =>
        requestScopeKey(r) === key && departmentTeamIds.has(r.teamId ?? ''),
    );
    const scopeLabel =
      key === 'annual'
        ? 'Annual'
        : sample
          ? requestScopeLabel(sample, sessions)
          : `Period · ${sessionId?.slice(0, 8) ?? ''}`;

    const teamRows: DepartmentTeamRow[] = [];
    for (const team of deptTeams) {
      const requests = listDepartmentConsolidationInboxRequests(
        allRequestsForCurrency,
        team.id,
        key,
        currencyId,
        companyOnlyApproval,
      );
      for (const request of requests) {
        if (!hasActiveTeamRequest(request)) continue;
        if (!isDepartmentPackageStatus(request.status)) continue;
        const rev = currentRevision(request);
        teamRows.push({
          requestId: request.id,
          teamId: team.id,
          teamName: team.name,
          status: request.status ?? 'DRAFT',
          amount: Number(rev?.amount ?? 0),
          request,
        });
      }
    }
    if (!teamRows.length) continue;

    const allTeamsDeptReadyForScope = deptTeams.every((team) => {
      const requests = listDepartmentConsolidationInboxRequests(
        allRequestsForCurrency,
        team.id,
        key,
        currencyId,
        companyOnlyApproval,
      );
      const packageRows = requests.filter(
        (row) =>
          hasActiveTeamRequest(row) && isDepartmentPackageStatus(row.status),
      );
      if (!packageRows.length) return false;
      return packageRows.some((row) => isDepartmentStepCompleteForForward(row));
    });

    groups.push({
      key,
      scopeLabel,
      horizon: key === 'annual' ? 'annual' : 'session',
      sessionId,
      sortKey:
        key === 'annual'
          ? Number.MAX_SAFE_INTEGER
          : sessionSortTime(sessions, sessionId ?? ''),
      teamRows,
      allTeamsDeptReadyForScope,
      canSubmit: teamRows.some((row) => row.status === 'DEPARTMENT_APPROVED'),
    });
  }
  return groups;
}

export function countForwardToCompanyItems(
  managedDepartmentIds: string[],
  salesTeams: {
    id: string;
    name: string;
    parentDepartmentId?: string;
    targetParentLevel?: string;
  }[],
  allRequestsForCurrency: SalesTargetRequest[],
  currencyId: string,
  companyOnlyApproval: boolean,
  sessions: {
    id: string;
    name?: string | null;
    startDate?: string;
    endDate?: string;
  }[],
): number {
  let count = 0;
  for (const deptId of managedDepartmentIds) {
    const groups = buildDepartmentConsolidationGroupsForDept(
      deptId,
      salesTeams,
      allRequestsForCurrency,
      currencyId,
      companyOnlyApproval,
      sessions,
    );
    for (const group of groups) {
      if (!group.canSubmit) continue;
      count += group.teamRows.filter(
        (row) => row.status === 'DEPARTMENT_APPROVED',
      ).length;
    }
  }
  return count;
}
