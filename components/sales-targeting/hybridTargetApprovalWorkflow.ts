import type { TargetReconciliationTeamRow } from '@/store/server/features/salesTargeting/types';

/**
 * Team proposals always go to the department manager before company.
 * Company-direct teams (no department) are a separate skip, not a workflow setting.
 */
export function resolveCompanyOnlyTargetApproval(input?: {
  enableApprovalWorkflows?: boolean;
  teamTargetApprovalWorkflowId?: string | null;
  workflowStepCount?: number;
}): boolean {
  void input;
  return false;
}

/** Still on workflow step 1 (department leads when multi-step). Hidden from company Details. */
export function isAwaitingFirstLevelTargetApproval(
  status: string | null | undefined,
  companyOnly: boolean,
): boolean {
  if (companyOnly) return false;
  return String(status ?? '').toUpperCase() === 'PENDING_DEPARTMENT';
}

/** Company has approved — shown on company Details “Company approved”, not in dept Details. */
export function isCompanyApprovedTargetRequestStatus(
  status: string | null | undefined,
): boolean {
  const normalized = String(status ?? '').toUpperCase();
  return (
    normalized === 'COMPANY_APPROVED' ||
    normalized === 'PENDING_RECONCILIATION' ||
    normalized === 'RECONCILED' ||
    normalized === 'OFFICIAL'
  );
}

/**
 * Department Details (B2T/Hybrid): workflow step 1 complete, still before company approval.
 */
export function isVisibleOnDepartmentTargetDetails(
  status: string | null | undefined,
  companyOnly: boolean,
): boolean {
  const normalized = String(status ?? '').toUpperCase();
  if (
    normalized === 'DRAFT' ||
    normalized === 'PENDING_DEPARTMENT' ||
    isCompanyApprovedTargetRequestStatus(normalized)
  ) {
    return false;
  }
  if (companyOnly) {
    return normalized === 'PENDING_COMPANY';
  }
  return (
    normalized === 'DEPARTMENT_APPROVED' || normalized === 'PENDING_COMPANY'
  );
}

/**
 * Company Details (B2T/Hybrid): step 1 done per Target Settings, not company-approved yet.
 */
export function isHybridVisibleAwaitingCompanyApproval(
  status: string | null | undefined,
  companyOnly: boolean,
): boolean {
  const normalized = String(status ?? '').toUpperCase();
  if (
    normalized === 'DRAFT' ||
    normalized === 'PENDING_DEPARTMENT' ||
    isCompanyApprovedTargetRequestStatus(normalized)
  ) {
    return false;
  }
  if (companyOnly) {
    return normalized === 'PENDING_COMPANY';
  }
  return (
    normalized === 'PENDING_COMPANY' || normalized === 'DEPARTMENT_APPROVED'
  );
}

export function filterHybridCompanyInboxTeams<
  T extends Pick<TargetReconciliationTeamRow, 'status'>,
>(teams: T[], companyOnly: boolean): T[] {
  return teams.filter((row) =>
    isHybridVisibleAwaitingCompanyApproval(row.status, companyOnly),
  );
}

/** Company Details modal edits use company review (inbox queue only). */
export function hybridCompanyInboxModifyReviewLevel(): 'COMPANY' {
  return 'COMPANY';
}

export function firstLevelTargetApprovalLabel(companyOnly: boolean): string {
  return companyOnly ? 'Company approval' : 'Department manager approval';
}

/** B2T company Details — per-team hint while company has not approved yet. */
export function b2tAwaitingCompanyTeamStatusHint(
  status: string | null | undefined,
): string {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'PENDING_COMPANY') {
    return 'Pending company approval';
  }
  if (normalized === 'DEPARTMENT_APPROVED') {
    return 'Dept approved · forward to company';
  }
  return 'Awaiting company approval';
}
