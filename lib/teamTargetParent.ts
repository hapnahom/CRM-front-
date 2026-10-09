export type TeamTargetParentLevel = 'company' | 'department';

export const TEAM_TARGET_PARENT_LEVELS: {
  value: TeamTargetParentLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'department',
    label: 'Department',
    description: 'Team target is carved from its department pool (default).',
  },
  {
    value: 'company',
    label: 'Company',
    description: 'Team target rolls up directly to the company pool.',
  },
];

export function normalizeTeamTargetParentLevel(
  value: TeamTargetParentLevel | string | null | undefined,
): TeamTargetParentLevel {
  return value === 'company' ? 'company' : 'department';
}

export function isCompanyDirectTargetTeam(team: {
  targetParentLevel?: TeamTargetParentLevel | string | null;
}): boolean {
  return normalizeTeamTargetParentLevel(team.targetParentLevel) === 'company';
}

export function isDepartmentScopedTargetTeam(team: {
  targetParentLevel?: TeamTargetParentLevel | string | null;
}): boolean {
  return !isCompanyDirectTargetTeam(team);
}

export function teamTargetParentLabel(
  level: TeamTargetParentLevel | string | null | undefined,
): string {
  return normalizeTeamTargetParentLevel(level) === 'company'
    ? 'Company'
    : 'Department';
}
