import { countForwardToCompanyItems } from '@/components/sales-targeting/departmentConsolidationGroups';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';

function teamInManagedDepartments(
  teamId: string | null | undefined,
  salesTeams: { id: string; parentDepartmentId?: string }[],
  managedDepartmentIds: string[],
): boolean {
  if (!managedDepartmentIds.length) return true;
  if (!teamId) return true;
  const team = salesTeams.find((row) => row.id === teamId);
  const deptId = team?.parentDepartmentId?.trim();
  if (!deptId) return true;
  return managedDepartmentIds.includes(deptId);
}

/** Matches inner “Waiting approval” tab badge — not Submitted. */
export function countWaitingApprovalActions(input: {
  currencyId?: string;
  reviewQueue: SalesTargetRequest[];
  teamQueue?: SalesTargetRequest[];
  companyQueue: SalesTargetRequest[];
  allRequests: SalesTargetRequest[];
  showTeamInbox?: boolean;
  showDepartmentInbox: boolean;
  showCompanyInbox: boolean;
  showDepartmentConsolidation: boolean;
  managedDepartmentIds: string[];
  salesTeams: { id: string; parentDepartmentId?: string }[];
  companyOnlyApproval: boolean;
  sessions: {
    id: string;
    name?: string | null;
    startDate?: string;
    endDate?: string;
  }[];
}): number {
  const forCurrency = (rows: SalesTargetRequest[]) =>
    rows.filter(
      (row) => !input.currencyId || row.currencyId === input.currencyId,
    );

  let count = 0;
  const pendingDeptIds = new Set<string>();

  if (input.showTeamInbox) {
    count += forCurrency(input.teamQueue ?? []).filter(
      (row) => row.status === 'PENDING_TEAM',
    ).length;
  }

  if (input.showDepartmentInbox) {
    for (const request of forCurrency(input.reviewQueue)) {
      if (request.status !== 'PENDING_DEPARTMENT') continue;
      if (
        !teamInManagedDepartments(
          request.teamId,
          input.salesTeams,
          input.managedDepartmentIds,
        )
      ) {
        continue;
      }
      pendingDeptIds.add(request.id);
      count += 1;
    }
    for (const request of forCurrency(input.allRequests)) {
      if (request.status !== 'PENDING_DEPARTMENT') continue;
      if (
        !teamInManagedDepartments(
          request.teamId,
          input.salesTeams,
          input.managedDepartmentIds,
        )
      ) {
        continue;
      }
      if (pendingDeptIds.has(request.id)) continue;
      count += 1;
    }
  }

  if (input.showCompanyInbox) {
    count += forCurrency(input.companyQueue).filter(
      (row) => row.status === 'PENDING_COMPANY',
    ).length;
  }

  const canCountDeptForward =
    !input.companyOnlyApproval &&
    input.managedDepartmentIds.length > 0 &&
    (input.showDepartmentConsolidation || input.showDepartmentInbox);

  if (canCountDeptForward) {
    count += countForwardToCompanyItems(
      input.managedDepartmentIds,
      input.salesTeams,
      forCurrency(input.allRequests),
      input.currencyId ?? '',
      input.companyOnlyApproval,
      input.sessions,
    );
  }

  return count;
}
