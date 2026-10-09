import type {
  TargetPrerequisite,
  TargetPrerequisiteCompletion,
  TargetPrerequisiteEntityType,
  TargetPrerequisiteLevel,
} from '@/store/server/features/salesTargeting/types';

type LegacyTargetPrerequisite = Partial<TargetPrerequisite> & {
  blockedDepartmentId?: string;
  requiredDepartmentIds?: string[];
  requiredScope?: 'department_target' | 'all_team_targets';
};

export function normalizeTargetPrerequisite(
  rule: LegacyTargetPrerequisite,
): TargetPrerequisite | null {
  if (
    rule.blockedType &&
    rule.blockedId &&
    rule.requiredType &&
    rule.requiredIds?.length
  ) {
    return {
      blockedType: rule.blockedType,
      blockedId: rule.blockedId,
      requiredType: rule.requiredType,
      requiredIds: rule.requiredIds,
      requiredCompletion:
        rule.requiredCompletion ??
        (rule.requiredType === 'team'
          ? 'each_team_target'
          : 'all_team_targets'),
      level: rule.level ?? 'both',
    };
  }

  const blockedId = rule.blockedDepartmentId?.trim();
  const requiredIds = (rule.requiredDepartmentIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (!blockedId || requiredIds.length === 0) return null;

  return {
    blockedType: 'department',
    blockedId,
    requiredType: 'department',
    requiredIds,
    requiredCompletion:
      rule.requiredScope === 'department_target'
        ? 'department_target'
        : 'all_team_targets',
    level: rule.level ?? 'both',
  };
}

export function normalizeTargetPrerequisites(
  rules?: LegacyTargetPrerequisite[] | null,
): TargetPrerequisite[] {
  return (rules ?? [])
    .map((rule) => normalizeTargetPrerequisite(rule))
    .filter((rule): rule is TargetPrerequisite => rule != null);
}

export function createEmptyTargetPrerequisiteRule(): TargetPrerequisite {
  return {
    blockedType: 'department',
    blockedId: '',
    requiredType: 'department',
    requiredIds: [],
    requiredCompletion: 'all_team_targets',
    level: 'both',
  };
}

export function defaultRequiredCompletion(
  requiredType: TargetPrerequisiteEntityType,
): TargetPrerequisiteCompletion {
  return requiredType === 'team' ? 'each_team_target' : 'all_team_targets';
}

export function validateTargetPrerequisites(
  rules: TargetPrerequisite[],
): string | null {
  for (const rule of rules) {
    if (!rule.blockedId?.trim()) {
      return 'Each dependency must specify a dependent entity.';
    }
    if (!rule.requiredIds.length) {
      return 'Each dependency must specify at least one prerequisite entity.';
    }
    if (rule.requiredIds.includes(rule.blockedId)) {
      return 'A dependency cannot reference the same entity as both dependent and prerequisite.';
    }
    if (rule.blockedType === 'team' && rule.requiredType === 'team') {
      if (rule.requiredIds.includes(rule.blockedId)) {
        return 'A team cannot depend on itself.';
      }
    }
  }
  return null;
}

export function horizonLabel(level: TargetPrerequisiteLevel): string {
  if (level === 'annual') return 'Annual';
  if (level === 'session') return 'Period';
  return 'Annual & period';
}

export function completionLabel(
  requiredType: TargetPrerequisiteEntityType,
  completion: TargetPrerequisiteCompletion,
): string {
  if (requiredType === 'team') return 'Each selected team has a target';
  if (completion === 'department_target') return 'Department target is set';
  return 'All teams in department have targets';
}

/** Sort entities so prerequisite targets appear before dependent targets. */
export function sortEntitiesByTargetPrerequisites<T extends { id: string }>(
  items: readonly T[],
  prerequisites: TargetPrerequisite[] | null | undefined,
  entityType: TargetPrerequisiteEntityType,
  fallbackCompare?: (a: T, b: T) => number,
): T[] {
  if (items.length <= 1) {
    return [...items];
  }

  const rules = normalizeTargetPrerequisites(prerequisites).filter(
    (rule) =>
      rule.blockedType === entityType && rule.requiredType === entityType,
  );

  if (rules.length === 0) {
    return fallbackCompare ? [...items].sort(fallbackCompare) : [...items];
  }

  const originalIndex = new Map(items.map((item, index) => [item.id, index]));
  const ids = new Set(items.map((item) => item.id));
  const inDegree = new Map<string, number>();
  const dependentsByPrerequisite = new Map<string, Set<string>>();

  for (const id of ids) {
    inDegree.set(id, 0);
    dependentsByPrerequisite.set(id, new Set());
  }

  for (const rule of rules) {
    if (!ids.has(rule.blockedId)) continue;
    for (const requiredId of rule.requiredIds) {
      if (!ids.has(requiredId) || requiredId === rule.blockedId) continue;
      const dependents = dependentsByPrerequisite.get(requiredId)!;
      if (dependents.has(rule.blockedId)) continue;
      dependents.add(rule.blockedId);
      inDegree.set(rule.blockedId, (inDegree.get(rule.blockedId) ?? 0) + 1);
    }
  }

  const stableSort = (a: T, b: T) =>
    originalIndex.get(a.id)! - originalIndex.get(b.id)!;

  const queue = items
    .filter((item) => (inDegree.get(item.id) ?? 0) === 0)
    .sort(stableSort);

  const sorted: T[] = [];
  const itemById = new Map(items.map((item) => [item.id, item]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const dependents = [
      ...(dependentsByPrerequisite.get(current.id) ?? []),
    ].sort((a, b) => (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0));

    for (const dependentId of dependents) {
      const nextDegree = (inDegree.get(dependentId) ?? 1) - 1;
      inDegree.set(dependentId, nextDegree);
      if (nextDegree === 0) {
        const dependent = itemById.get(dependentId);
        if (dependent) {
          queue.push(dependent);
          queue.sort(stableSort);
        }
      }
    }
  }

  if (sorted.length < items.length) {
    const placed = new Set(sorted.map((item) => item.id));
    const remaining = items.filter((item) => !placed.has(item.id));
    if (fallbackCompare) {
      remaining.sort(fallbackCompare);
    } else {
      remaining.sort(stableSort);
    }
    sorted.push(...remaining);
  }

  return sorted;
}
