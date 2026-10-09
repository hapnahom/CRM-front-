'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MultiTeamSelect } from '@/components/pipeline/MultiTeamSelect';
import { ObserversMultiSelect } from '@/components/pipeline/ObserversMultiSelect';
import { formatUserName } from '@/lib/format-user-name';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useGetSalesTeams } from '@/store/server/features/salesTargeting/queries';
import type { PlatformUser } from '@/store/server/features/userManagement/types';

export interface ResponsibilitySelectorProps {
  userIds: string[];
  onUsersChange: (ids: string[]) => void;
  teamIds?: string[];
  onTeamsChange?: (ids: string[]) => void;
  readOnly?: boolean;
}

function userInitials(user: PlatformUser) {
  const name = formatUserName(user, 'User');
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SelectedUserChips({
  users,
  userIds,
  onRemove,
  readOnly,
}: {
  users: PlatformUser[];
  userIds: string[];
  onRemove: (id: string) => void;
  readOnly?: boolean;
}) {
  const selected = useMemo(() => {
    const byId = new Map(users.map((user) => [user.id, user]));
    return userIds
      .map((id) => byId.get(id))
      .filter((user): user is PlatformUser => Boolean(user));
  }, [users, userIds]);

  if (selected.length === 0) {
    return <p className="text-[12px] text-muted-foreground">No one assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {selected.map((user) => (
        <span
          key={user.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-white py-0.5 pl-1 pr-1.5 dark:bg-surface-card"
        >
          <Avatar className="size-4 shrink-0">
            {user.avatarUrl ? (
              <AvatarImage
                src={user.avatarUrl}
                alt={formatUserName(user, 'User')}
              />
            ) : null}
            <AvatarFallback className="bg-brand-muted text-[7px] font-semibold text-brand">
              {userInitials(user)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-[11px] leading-tight text-foreground">
              {formatUserName(user, 'User')}
            </span>
            {user.email ? (
              <span className="block truncate text-[9px] leading-tight text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </span>
          {!readOnly ? (
            <button
              type="button"
              aria-label={`Remove ${formatUserName(user, 'User')}`}
              onClick={() => onRemove(user.id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-surface-card hover:text-foreground"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function SelectedTeamChips({
  teamIds,
  teamLabelById,
  onRemove,
  readOnly,
}: {
  teamIds: string[];
  teamLabelById: Map<string, string>;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}) {
  if (teamIds.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">No teams assigned</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {teamIds.map((teamId) => (
        <span
          key={teamId}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-foreground dark:bg-surface-card"
        >
          <span className="truncate">
            {teamLabelById.get(teamId) ?? teamId}
          </span>
          {!readOnly ? (
            <button
              type="button"
              aria-label="Remove team"
              onClick={() => onRemove(teamId)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function ResponsibilitySelector({
  userIds,
  onUsersChange,
  teamIds = [],
  onTeamsChange,
  readOnly,
}: ResponsibilitySelectorProps) {
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const { data: salesTeams = [] } = useGetSalesTeams(true);

  const platformUsers = useMemo(
    () => platformUsersData?.data ?? [],
    [platformUsersData],
  );

  const teamGroups = useMemo(() => {
    const byDept = new Map<string, { value: string; label: string }[]>();
    for (const team of salesTeams) {
      const dept = team.parentDepartmentName?.trim() || 'Teams';
      const list = byDept.get(dept) ?? [];
      list.push({ value: team.id, label: team.name });
      byDept.set(dept, list);
    }
    return [...byDept.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [salesTeams]);

  const teamLabelById = useMemo(
    () => new Map(salesTeams.map((team) => [team.id, team.name])),
    [salesTeams],
  );

  const showTeams = onTeamsChange != null;

  return (
    <div className="space-y-4">
      {showTeams ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Responsible teams
          </p>
          {readOnly ? (
            <SelectedTeamChips
              teamIds={teamIds}
              teamLabelById={teamLabelById}
              onRemove={() => undefined}
              readOnly
            />
          ) : (
            <MultiTeamSelect
              value={teamIds}
              onChange={onTeamsChange}
              groups={teamGroups}
              placeholder="Add teams"
              emptyLabel="No teams available"
              countNoun="team"
              className="border-border bg-surface-card text-sm shadow-none"
            />
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Responsible people
        </p>
        {readOnly ? (
          <SelectedUserChips
            users={platformUsers}
            userIds={userIds}
            onRemove={() => undefined}
            readOnly
          />
        ) : (
          <ObserversMultiSelect
            users={platformUsers}
            value={userIds}
            onChange={onUsersChange}
            placeholder="Add people"
            entityLabel="person"
          />
        )}
      </div>
    </div>
  );
}
