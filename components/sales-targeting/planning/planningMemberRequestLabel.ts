import type { PlanningPersonProfile } from '@/components/sales-targeting/planning/planningPersonProfiles';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';

export function resolveMemberRequestDisplayName(
  request: SalesTargetRequest,
  profiles: Map<string, PlanningPersonProfile>,
): string {
  const fromMetadata = request.metadata?.memberDisplayName;
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  if (request.userId) {
    const profile = profiles.get(request.userId);
    if (profile?.name?.trim()) return profile.name.trim();
  }
  return 'Team member';
}

export function collectMemberRequestUserIds(
  requests: SalesTargetRequest[],
): string[] {
  const ids = new Set<string>();
  for (const request of requests) {
    if (request.targetLevel === 'person' && request.userId) {
      ids.add(request.userId);
    }
  }
  return [...ids];
}
