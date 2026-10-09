import type { PlatformUser } from '@/store/server/features/userManagement/types';
import type { CrmTeam } from '@/store/server/features/teams/types';
import type { ProductFamily } from '@/modules/product-catalog/types';

export function teamMemberUserIds(
  team: CrmTeam,
  platformUsers: PlatformUser[],
): string[] {
  const memberIds = new Set(
    (team.members ?? []).flatMap(
      (member) => [member.id, member.selamnewId].filter(Boolean) as string[],
    ),
  );
  return platformUsers
    .filter(
      (user) =>
        user.team?.id === team.id ||
        user.teamId === team.id ||
        memberIds.has(user.id) ||
        (user.selamnewId != null && memberIds.has(user.selamnewId)),
    )
    .map((user) => user.id);
}

/** Merge direct user ids with members from legacy responsibleTeamIds. */
export function expandResponsibleUserIds(
  family: Pick<ProductFamily, 'responsibleUserIds' | 'responsibleTeamIds'>,
  teams: CrmTeam[],
  users: PlatformUser[],
): string[] {
  const ids = new Set(family.responsibleUserIds ?? []);
  for (const teamId of family.responsibleTeamIds ?? []) {
    const team = teams.find((item) => item.id === teamId);
    if (!team) continue;
    for (const userId of teamMemberUserIds(team, users)) {
      ids.add(userId);
    }
  }
  return [...ids];
}
