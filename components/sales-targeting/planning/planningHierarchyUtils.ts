import type {
  PlanningEligibilityView,
  TargetPlanningHierarchyNode,
} from '@/store/server/features/salesTargeting/types';

export function walkHierarchy(
  node: TargetPlanningHierarchyNode,
  visit: (node: TargetPlanningHierarchyNode) => void,
): void {
  visit(node);
  for (const child of node.children) {
    walkHierarchy(child, visit);
  }
}

export function findHierarchyNode(
  root: TargetPlanningHierarchyNode,
  scopeLevel: TargetPlanningHierarchyNode['scopeLevel'],
  scopeId: string,
): TargetPlanningHierarchyNode | null {
  let found: TargetPlanningHierarchyNode | null = null;
  walkHierarchy(root, (node) => {
    if (found) return;
    if (node.scopeLevel === scopeLevel && node.scopeId === scopeId) {
      found = node;
    }
  });
  return found;
}

export function findPersonNodeForUser(
  root: TargetPlanningHierarchyNode,
  userId: string,
): TargetPlanningHierarchyNode | null {
  let found: TargetPlanningHierarchyNode | null = null;
  walkHierarchy(root, (node) => {
    if (found) return;
    if (node.scopeLevel === 'person' && node.scopeId === userId) {
      found = node;
    }
  });
  return found;
}

export function collectNodesByLevel(
  root: TargetPlanningHierarchyNode,
  scopeLevel: TargetPlanningHierarchyNode['scopeLevel'],
): TargetPlanningHierarchyNode[] {
  const nodes: TargetPlanningHierarchyNode[] = [];
  walkHierarchy(root, (node) => {
    if (node.scopeLevel === scopeLevel) {
      nodes.push(node);
    }
  });
  return nodes;
}

export function findTeamsForUser(
  root: TargetPlanningHierarchyNode,
  userId: string | null,
  managedTeamIds: string[] = [],
  leadTeamIds: string[] = [],
): TargetPlanningHierarchyNode[] {
  const found = new Map<string, TargetPlanningHierarchyNode>();

  const addTeamId = (teamId: string | null | undefined) => {
    if (!teamId) return;
    const team = findHierarchyNode(root, 'team', teamId);
    if (team) found.set(teamId, team);
  };

  if (userId) {
    const person = findPersonNodeForUser(root, userId);
    addTeamId(person?.parentScopeId);
  }

  for (const teamId of [...managedTeamIds, ...leadTeamIds]) {
    addTeamId(teamId);
  }

  return [...found.values()];
}

export function findTeamForUser(
  root: TargetPlanningHierarchyNode,
  userId: string | null,
  managedTeamIds: string[] = [],
  leadTeamIds: string[] = [],
): TargetPlanningHierarchyNode | null {
  return findTeamsForUser(root, userId, managedTeamIds, leadTeamIds)[0] ?? null;
}

export function filterDepartmentsForScope(
  departments: TargetPlanningHierarchyNode[],
  scopeLevel: 'company' | 'department' | 'team' | 'personal',
  managedDepartmentIds: string[] = [],
): TargetPlanningHierarchyNode[] {
  if (scopeLevel === 'team' || scopeLevel === 'personal') return [];
  if (scopeLevel !== 'department' || managedDepartmentIds.length === 0) {
    return departments;
  }
  const managed = new Set(managedDepartmentIds);
  return departments.filter(
    (dept) => dept.scopeId != null && managed.has(dept.scopeId),
  );
}

export function collectDirectTeamsAtRoot(
  root: TargetPlanningHierarchyNode,
): TargetPlanningHierarchyNode[] {
  return root.children.filter((child) => child.scopeLevel === 'team');
}

export function formatRequestStatusLabel(
  status: TargetPlanningHierarchyNode['requestStatus'],
): string {
  if (!status) return 'Not started';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isBlockedEntity(
  eligibility: PlanningEligibilityView | null | undefined,
  entityType: 'department' | 'team',
  entityId: string | null | undefined,
): boolean {
  if (!eligibility || !entityId) return false;
  return eligibility.entities.some(
    (row) =>
      !row.eligible &&
      row.entityType === entityType &&
      row.entityId === entityId,
  );
}

export function countTeamMembers(node: TargetPlanningHierarchyNode): number {
  return node.children.filter((child) => child.scopeLevel === 'person').length;
}

export function countTeamsWithProposal(deptNode: TargetPlanningHierarchyNode): {
  proposed: number;
  total: number;
} {
  const teams = deptNode.children.filter(
    (child) => child.scopeLevel === 'team',
  );
  const proposed = teams.filter(
    (team) => team.requestStatus && team.requestStatus !== 'DRAFT',
  ).length;
  return { proposed, total: teams.length };
}

export function hierarchyScopeKey(node: TargetPlanningHierarchyNode): string {
  return `${node.scopeLevel}:${node.scopeId ?? node.scopeName}`;
}

export function flattenHierarchyRows(
  root: TargetPlanningHierarchyNode,
): Array<{ node: TargetPlanningHierarchyNode; depth: number }> {
  const rows: Array<{ node: TargetPlanningHierarchyNode; depth: number }> = [];

  const walk = (node: TargetPlanningHierarchyNode, depth: number) => {
    rows.push({ node, depth });
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };

  walk(root, 0);
  return rows;
}

/** Keys for nodes expanded by default — company and departments visible, teams collapsed. */
export function defaultExpandedHierarchyKeys(
  root: TargetPlanningHierarchyNode,
  maxExpandedDepth = 1,
): Set<string> {
  const keys = new Set<string>();

  const walk = (node: TargetPlanningHierarchyNode, depth: number) => {
    if (node.children.length > 0 && depth <= maxExpandedDepth) {
      keys.add(hierarchyScopeKey(node));
    }
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };

  walk(root, 0);
  return keys;
}

export function flattenVisibleHierarchyRows(
  root: TargetPlanningHierarchyNode,
  expandedKeys: Set<string>,
): Array<{ node: TargetPlanningHierarchyNode; depth: number }> {
  const rows: Array<{ node: TargetPlanningHierarchyNode; depth: number }> = [];

  const walk = (node: TargetPlanningHierarchyNode, depth: number) => {
    rows.push({ node, depth });
    if (!expandedKeys.has(hierarchyScopeKey(node))) return;
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };

  walk(root, 0);
  return rows;
}

export function scopeLevelLabel(
  level: TargetPlanningHierarchyNode['scopeLevel'],
): string {
  switch (level) {
    case 'company':
      return 'Company';
    case 'department':
      return 'Department';
    case 'team':
      return 'Team';
    case 'person':
      return 'Person';
    default:
      return level;
  }
}
