import type { FilterTreeDepartment } from '@/store/server/features/deals/pipeline/filter-tree-queries';
import type { ReportExportScopeLevel } from '@/hooks/useReportExportScope';
import type { PipelineFilterSelection } from '@/modules/sales-pipeline/pipeline-filter';

/**
 * Restricts the org filter tree shown in report/pipeline UI to what the user's
 * permission scope allows. Backend still enforces scope on data.
 */
export function scopeFilterTreeDepartments(
  departments: FilterTreeDepartment[],
  scopeLevel: ReportExportScopeLevel,
  options?: {
    /** Current user's team id — required for team scope pruning */
    userTeamId?: string | null;
    /** Current user's department id — required for department scope pruning */
    userDepartmentId?: string | null;
    /** Current user id — required for personal scope pruning */
    userId?: string | null;
  },
): FilterTreeDepartment[] {
  if (scopeLevel === 'company' || !departments.length) {
    return departments;
  }

  if (scopeLevel === 'department' && options?.userDepartmentId) {
    return departments.filter((dept) => dept.id === options.userDepartmentId);
  }

  if (scopeLevel === 'team' && options?.userTeamId) {
    return departments
      .map((dept) => ({
        ...dept,
        teams: dept.teams.filter((team) => team.id === options.userTeamId),
      }))
      .filter((dept) => dept.teams.length > 0);
  }

  if (scopeLevel === 'personal' && options?.userId) {
    return departments
      .map((dept) => ({
        ...dept,
        teams: dept.teams
          .map((team) => ({
            ...team,
            members: team.members.filter(
              (member) => member.id === options.userId,
            ),
          }))
          .filter((team) => team.members.length > 0),
      }))
      .filter((dept) => dept.teams.length > 0);
  }

  // Scope resolved but org context not found yet — show nothing rather than
  // leaking the full company tree.
  if (
    scopeLevel === 'department' ||
    scopeLevel === 'team' ||
    scopeLevel === 'personal'
  ) {
    return [];
  }

  return departments;
}

const emptyUserOrgContext = () => ({
  departmentId: null as string | null,
  teamId: null as string | null,
  departmentName: null as string | null,
  teamName: null as string | null,
  memberName: null as string | null,
});

export function findTeamInFilterTree(
  departments: FilterTreeDepartment[],
  teamId?: string | null,
) {
  if (!teamId) return null;
  for (const dept of departments) {
    const team = dept.teams.find((row) => row.id === teamId);
    if (team) {
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        teamId: team.id,
        teamName: team.name,
      };
    }
  }
  return null;
}

export function findUserOrgContext(
  departments: FilterTreeDepartment[],
  userId?: string | null,
  options?: {
    userTeamId?: string | null;
    allowedTeamIds?: string[];
  },
): {
  departmentId: string | null;
  teamId: string | null;
  departmentName: string | null;
  teamName: string | null;
  memberName: string | null;
} {
  if (!userId) {
    return emptyUserOrgContext();
  }

  for (const dept of departments) {
    if (dept.managerId === userId) {
      return {
        departmentId: dept.id,
        teamId: null,
        departmentName: dept.name,
        teamName: null,
        memberName: 'Me',
      };
    }

    for (const team of dept.teams) {
      if (team.teamLeadId === userId) {
        return {
          departmentId: dept.id,
          teamId: team.id,
          departmentName: dept.name,
          teamName: team.name,
          memberName: 'Me',
        };
      }

      const member = team.members.find((row) => row.id === userId);
      if (member) {
        return {
          departmentId: dept.id,
          teamId: team.id,
          departmentName: dept.name,
          teamName: team.name,
          memberName: member.name ?? member.selamnewId ?? 'Me',
        };
      }
    }
  }

  const teamIdHint =
    options?.userTeamId ?? options?.allowedTeamIds?.find(Boolean) ?? null;
  const teamFromTree = findTeamInFilterTree(departments, teamIdHint);
  if (teamFromTree) {
    return {
      departmentId: teamFromTree.departmentId,
      teamId: teamFromTree.teamId,
      departmentName: teamFromTree.departmentName,
      teamName: teamFromTree.teamName,
      memberName: null,
    };
  }

  return emptyUserOrgContext();
}

export function resolveReportScopeNames(input: {
  level: ReportExportScopeLevel;
  departments: FilterTreeDepartment[];
  userOrg: ReturnType<typeof findUserOrgContext>;
  orgTeams?: Array<{ name: string; departmentName: string }>;
  allowedTeamIds?: string[];
  teamId?: string | null;
  teamName?: string | null;
  departmentName?: string | null;
}): {
  scopeDepartmentName: string | null;
  scopeTeamName: string | null;
} {
  let scopeTeamName = input.teamName?.trim() || input.userOrg.teamName;
  let scopeDepartmentName =
    input.departmentName?.trim() || input.userOrg.departmentName;

  const teamIdHint = input.teamId ?? input.allowedTeamIds?.[0] ?? null;
  if (!scopeTeamName && teamIdHint) {
    const team = findTeamInFilterTree(input.departments, teamIdHint);
    if (team) {
      scopeTeamName = team.teamName;
      scopeDepartmentName = scopeDepartmentName ?? team.departmentName;
    }
  }

  if (!scopeTeamName && input.allowedTeamIds?.length === 1) {
    const team = findTeamInFilterTree(
      input.departments,
      input.allowedTeamIds[0],
    );
    if (team) {
      scopeTeamName = team.teamName;
      scopeDepartmentName = scopeDepartmentName ?? team.departmentName;
    }
  }

  if (!scopeTeamName && input.orgTeams?.length === 1) {
    scopeTeamName = input.orgTeams[0]!.name;
    scopeDepartmentName =
      scopeDepartmentName ?? input.orgTeams[0]!.departmentName;
  }

  if (
    !scopeDepartmentName &&
    input.level === 'department' &&
    input.departments.length === 1
  ) {
    scopeDepartmentName = input.departments[0]!.name;
  }

  return { scopeDepartmentName, scopeTeamName };
}

/** Max-scope selection used as the UI "all" / default for non-company users. */
export function maxScopeFilterSelection(
  scopeLevel: ReportExportScopeLevel,
  org: {
    departmentId: string | null;
    teamId: string | null;
    departmentName: string | null;
    teamName: string | null;
    memberName?: string | null;
    memberId?: string | null;
  },
): PipelineFilterSelection {
  if (scopeLevel === 'department' && org.departmentId) {
    return {
      type: 'department',
      departmentId: org.departmentId,
      departmentName: org.departmentName ?? 'My department',
    };
  }
  if (scopeLevel === 'team' && org.teamId) {
    return {
      type: 'team',
      teamId: org.teamId,
      teamName: org.teamName ?? 'My team',
      departmentId: org.departmentId ?? undefined,
      departmentName: org.departmentName ?? undefined,
    };
  }
  if (scopeLevel === 'personal' && org.memberId) {
    return {
      type: 'member',
      memberId: org.memberId,
      memberName: org.memberName ?? 'Me',
      teamId: org.teamId ?? undefined,
      teamName: org.teamName ?? undefined,
      departmentId: org.departmentId ?? undefined,
      departmentName: org.departmentName ?? undefined,
    };
  }
  return { type: 'all' };
}

/**
 * Keeps the current filter inside the caller's allowed org tree.
 * Out-of-scope selections fall back to the user's max permitted scope.
 */
export function clampFilterToScope(
  filter: PipelineFilterSelection,
  scopeLevel: ReportExportScopeLevel,
  scopedDepartments: FilterTreeDepartment[],
  org: {
    departmentId: string | null;
    teamId: string | null;
    departmentName: string | null;
    teamName: string | null;
    memberName?: string | null;
    memberId?: string | null;
  },
): PipelineFilterSelection {
  if (scopeLevel === 'company') return filter;

  const allowedDeptIds = new Set(scopedDepartments.map((dept) => dept.id));
  const allowedTeamIds = new Set(
    scopedDepartments.flatMap((dept) => dept.teams.map((team) => team.id)),
  );
  const allowedMemberIds = new Set(
    scopedDepartments.flatMap((dept) =>
      dept.teams.flatMap((team) => team.members.map((member) => member.id)),
    ),
  );

  if (filter.type === 'all') {
    return maxScopeFilterSelection(scopeLevel, org);
  }

  if (filter.type === 'department') {
    if (scopeLevel === 'team' || scopeLevel === 'personal') {
      return maxScopeFilterSelection(scopeLevel, org);
    }
    if (!allowedDeptIds.has(filter.departmentId)) {
      return maxScopeFilterSelection(scopeLevel, org);
    }
    return filter;
  }

  if (filter.type === 'team') {
    if (scopeLevel === 'personal') {
      return maxScopeFilterSelection(scopeLevel, org);
    }
    if (!allowedTeamIds.has(filter.teamId)) {
      return maxScopeFilterSelection(scopeLevel, org);
    }
    return filter;
  }

  if (filter.type === 'member') {
    if (!allowedMemberIds.has(filter.memberId)) {
      return maxScopeFilterSelection(scopeLevel, org);
    }
    return filter;
  }

  return maxScopeFilterSelection(scopeLevel, org);
}

export function scopeAllLabel(scopeLevel: ReportExportScopeLevel): string {
  if (scopeLevel === 'department') return 'My department';
  if (scopeLevel === 'team') return 'My team';
  if (scopeLevel === 'personal') return 'My records';
  return 'All teams & owners';
}

/**
 * Default Team & owners selection = maximum access for the caller's level.
 * - company: empty → all teams
 * - department: empty → all teams in own department
 * - team: own team (+ members)
 * - personal / no access: current user only
 */
export function defaultReportOrgFilters(
  scopeLevel: ReportExportScopeLevel,
  options: {
    userId?: string | null;
    userTeamId?: string | null;
    allowedTeamIds: string[];
    allowedOwnerIds: string[];
  },
): { teamIds: string[]; ownerIds: string[] } {
  // Empty UI selection = maximum access for every level.
  // Export/normalize still expands empty → full allowed scope.
  void options;
  if (
    scopeLevel === 'company' ||
    scopeLevel === 'department' ||
    scopeLevel === 'team' ||
    scopeLevel === 'personal'
  ) {
    return { teamIds: [], ownerIds: [] };
  }

  return { teamIds: [], ownerIds: [] };
}

/**
 * Empty Team & owners = full permission scope on export.
 * UI keeps empty visible as the max-access label (My records / My team / My department).
 * Selecting every allowed team/member collapses back to empty for company/department.
 */
export function normalizeReportOrgFilters(
  filters: {
    teamIds: string[];
    ownerIds: string[];
  },
  allowedTeamIds: string[],
  allowedOwnerIds: string[],
  scopeLevel?: ReportExportScopeLevel,
  options?: {
    userId?: string | null;
    userTeamId?: string | null;
    /** When true, empty selection expands to the caller's max access (export path). */
    expandMaxAccess?: boolean;
  },
): { teamIds: string[]; ownerIds: string[] } {
  const expand = options?.expandMaxAccess === true;

  if (scopeLevel === 'personal' && options?.userId) {
    if (!filters.teamIds.length && !filters.ownerIds.length) {
      return expand
        ? { teamIds: [], ownerIds: [options.userId] }
        : { teamIds: [], ownerIds: [] };
    }
    // Narrow/select inside personal → only the current user.
    return { teamIds: [], ownerIds: [options.userId] };
  }

  const teamIds = filters.teamIds.filter((id) => allowedTeamIds.includes(id));
  const ownerIds = filters.ownerIds.filter((id) =>
    allowedOwnerIds.includes(id),
  );

  if (!teamIds.length && !ownerIds.length) {
    if (!expand) return { teamIds: [], ownerIds: [] };
    if (scopeLevel === 'team' && options?.userTeamId) {
      return {
        teamIds: [options.userTeamId],
        ownerIds: [...allowedOwnerIds],
      };
    }
    return { teamIds: [], ownerIds: [] };
  }

  const allTeams =
    allowedTeamIds.length > 0 &&
    teamIds.length === allowedTeamIds.length &&
    allowedTeamIds.every((id) => teamIds.includes(id));
  const allOwners =
    allowedOwnerIds.length > 0 &&
    ownerIds.length === allowedOwnerIds.length &&
    allowedOwnerIds.every((id) => ownerIds.includes(id));
  const noOwners = ownerIds.length === 0;

  // Full max-access coverage → same as default empty max scope (UI label).
  if (scopeLevel === 'department' || scopeLevel === 'company') {
    if (allTeams && (noOwners || allOwners)) {
      return { teamIds: [], ownerIds: [] };
    }
    if (!teamIds.length && allOwners) {
      return { teamIds: [], ownerIds: [] };
    }
  }

  if (
    scopeLevel === 'team' &&
    options?.userTeamId &&
    ((teamIds.length === 1 &&
      teamIds[0] === options.userTeamId &&
      (noOwners || allOwners)) ||
      (!teamIds.length && allOwners))
  ) {
    return expand
      ? {
          teamIds: [options.userTeamId],
          ownerIds: [...allowedOwnerIds],
        }
      : { teamIds: [], ownerIds: [] };
  }

  return { teamIds, ownerIds };
}
