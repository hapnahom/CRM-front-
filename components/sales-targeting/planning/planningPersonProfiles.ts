'use client';

import { useMemo } from 'react';
import { formatUserName } from '@/lib/format-user-name';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';

export type PlanningPersonProfile = {
  name: string;
  avatarUrl: string | null;
};

export function collectPersonIdsFromHierarchy(
  root: TargetPlanningHierarchyNode,
): string[] {
  const ids = new Set<string>();

  const walk = (node: TargetPlanningHierarchyNode) => {
    if (node.scopeLevel === 'person' && node.scopeId) {
      ids.add(node.scopeId);
    }
    for (const child of node.children) {
      walk(child);
    }
  };

  walk(root);
  return [...ids];
}

export function usePlanningPersonProfiles(personIds: string[]) {
  const sortedIds = useMemo(
    () => [...new Set(personIds.filter(Boolean))].sort(),
    [personIds],
  );
  const enabled = sortedIds.length > 0;

  const { data } = useGetPlatformUsers({ page: 1, pageSize: 500 }, { enabled });

  return useMemo(() => {
    const map = new Map<string, PlanningPersonProfile>();
    if (!data?.data?.length) return map;

    const wanted = new Set(sortedIds);
    for (const user of data.data) {
      if (!user.id || !wanted.has(user.id)) continue;
      map.set(user.id, {
        name: formatUserName(user, user.email ?? 'Unknown'),
        avatarUrl: user.avatarUrl ?? null,
      });
    }
    return map;
  }, [data?.data, sortedIds]);
}

export function resolvePlanningScopeName(
  node: TargetPlanningHierarchyNode,
  profiles: Map<string, PlanningPersonProfile>,
): string {
  if (node.scopeLevel === 'person' && node.scopeId) {
    const profile = profiles.get(node.scopeId);
    if (profile?.name) return profile.name;
    if (node.scopeName && node.scopeName !== node.scopeId) {
      return node.scopeName;
    }
    return 'Unknown member';
  }
  return node.scopeName;
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}
