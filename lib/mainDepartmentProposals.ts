import { isCompanyDirectTargetTeam } from '@/lib/teamTargetParent';

export type TeamWithDepartment = {
  id: string;
  parentDepartmentId?: string | null;
  targetParentLevel?: string | null;
};

/** Whether this team may submit bottom-up / hybrid target requests. */
export function isBottomUpProposingTeam(
  team: TeamWithDepartment,
  mainDepartmentId: string | null | undefined,
): boolean {
  if (!mainDepartmentId?.trim()) return false;
  if (isCompanyDirectTargetTeam(team)) return false;
  return (team.parentDepartmentId?.trim() ?? '') === mainDepartmentId.trim();
}

export function bottomUpProposingTeams<T extends TeamWithDepartment>(
  teams: T[],
  mainDepartmentId: string | null | undefined,
): T[] {
  return teams.filter((team) =>
    isBottomUpProposingTeam(team, mainDepartmentId),
  );
}

export function bottomUpProposerBlockedReason(
  mainDepartmentId: string | null | undefined,
  team?: TeamWithDepartment,
): string | null {
  if (!mainDepartmentId?.trim()) {
    return 'Set a main department under User management → Teams before proposing targets.';
  }
  if (team && isCompanyDirectTargetTeam(team)) {
    return 'Company-target teams receive targets after company approval and finalization.';
  }
  if (team && !isBottomUpProposingTeam(team, mainDepartmentId)) {
    return 'Only the main department proposes targets. Other departments receive targets after company finalization.';
  }
  return null;
}
