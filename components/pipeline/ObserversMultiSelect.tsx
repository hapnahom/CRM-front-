'use client';

import { useMemo, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
  Users,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import { formatUserName } from '@/lib/format-user-name';
import {
  usePipelineFilterTree,
  type FilterTreeDepartment,
  type FilterTreeTeam,
} from '@/store/server/features/deals/pipeline/filter-tree-queries';

const UNASSIGNED_ID = '__unassigned__';
const UNASSIGNED_TEAM_ID = '__unassigned_team__';

type OrgTeamGroup = {
  id: string;
  name: string;
  users: PlatformUser[];
};

type OrgDeptGroup = {
  id: string;
  name: string;
  teams: OrgTeamGroup[];
};

function userDisplayName(user: PlatformUser) {
  return formatUserName(user, 'User');
}

function userInitials(user: PlatformUser) {
  const name = userDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserOptionLabel({ user }: { user: PlatformUser }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-6 shrink-0">
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={userDisplayName(user)} />
        ) : null}
        <AvatarFallback className="bg-brand-muted text-[9px] font-semibold text-brand">
          {userInitials(user)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">
          {userDisplayName(user)}
        </span>
        {user.email ? (
          <span className="block truncate text-[11px] text-muted-foreground">
            {user.email}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function userMatchesSearch(user: PlatformUser, query: string) {
  if (!query) return true;
  const name = userDisplayName(user).toLowerCase();
  const email = (user.email ?? '').toLowerCase();
  const team = (user.team?.name ?? '').toLowerCase();
  const department = (user.team?.departmentName ?? '').toLowerCase();
  return (
    name.includes(query) ||
    email.includes(query) ||
    team.includes(query) ||
    department.includes(query)
  );
}

function isExcludedUser(user: PlatformUser, excludeUserId?: string) {
  if (!excludeUserId) return false;
  return user.id === excludeUserId || user.selamnewId === excludeUserId;
}

function sortTeams(teams: OrgTeamGroup[]) {
  return [...teams]
    .map((team) => ({
      ...team,
      users: [...team.users].sort((a, b) =>
        userDisplayName(a).localeCompare(userDisplayName(b)),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function OrgUserPickerList({
  grouped,
  orgLoading,
  availableCount,
  search,
  collapsedDepts,
  onToggleDept,
  mode,
  value,
  onSelect,
  onSelectTeam,
}: {
  grouped: OrgDeptGroup[];
  orgLoading: boolean;
  availableCount: number;
  search: string;
  collapsedDepts: Set<string>;
  onToggleDept: (id: string) => void;
  mode: 'single' | 'multiple';
  value: string | string[];
  onSelect: (userId: string) => void;
  /** When set, clicking a team row adds/toggles all of that team's members. */
  onSelectTeam?: (userIds: string[]) => void;
}) {
  const isSearching = search.trim().length > 0;
  const selectedSet = Array.isArray(value) ? new Set(value) : new Set([value]);

  if (orgLoading) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        Loading organization…
      </p>
    );
  }

  if (grouped.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        {availableCount === 0
          ? 'No users available'
          : 'No users match your search'}
      </p>
    );
  }

  return (
    <>
      {grouped.map((dept) => {
        const expanded = isSearching || !collapsedDepts.has(dept.id);
        const count = deptUserCount(dept);
        const isUnassigned = dept.id === UNASSIGNED_ID;

        return (
          <div key={dept.id} className="mb-0.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                if (!isSearching) onToggleDept(dept.id);
              }}
              className="sticky top-0 z-[1] flex w-full items-center gap-1.5 bg-surface-card px-2 py-1.5 text-left hover:bg-surface-elevated"
            >
              <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                {expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
              {isUnassigned ? (
                <Users size={13} className="shrink-0 text-muted-foreground" />
              ) : (
                <BriefcaseBusiness
                  size={13}
                  className="shrink-0 text-muted-foreground"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
                {dept.name}
              </span>
              <span className="shrink-0 rounded-full bg-surface-card px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {count}
              </span>
            </button>

            {expanded ? (
              <div className="ml-4 border-l border-border py-0.5">
                {dept.teams.map((team) => {
                  const showTeamHeader =
                    !isUnassigned && team.id !== UNASSIGNED_TEAM_ID;
                  return (
                    <div key={team.id}>
                      {showTeamHeader ? (
                        onSelectTeam ? (
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelectTeam(team.users.map((user) => user.id));
                            }}
                            className="flex w-full items-center gap-1.5 px-2 py-1 pl-3 text-left hover:bg-surface-elevated"
                          >
                            <Users
                              size={12}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                              {team.name}
                            </span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {team.users.length}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 pl-3">
                            <Users
                              size={12}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                              {team.name}
                            </span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {team.users.length}
                            </span>
                          </div>
                        )
                      ) : null}
                      {team.users.map((user) => {
                        const checked = selectedSet.has(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelect(user.id);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 py-1.5 pr-2 text-left hover:bg-surface-elevated',
                              showTeamHeader ? 'pl-6' : 'pl-3',
                              checked && 'bg-brand-muted/25',
                            )}
                          >
                            {mode === 'multiple' ? (
                              <Checkbox
                                checked={checked}
                                className="pointer-events-none"
                                tabIndex={-1}
                              />
                            ) : (
                              <span
                                className={cn(
                                  'size-3.5 shrink-0 rounded-full border',
                                  checked
                                    ? 'border-brand bg-brand'
                                    : 'border-border bg-white',
                                )}
                              />
                            )}
                            <UserOptionLabel user={user} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function buildOrgUserGroups(
  users: PlatformUser[],
  orgTree: FilterTreeDepartment[],
  excludeUserId?: string,
): OrgDeptGroup[] {
  const available = users.filter((u) => !isExcludedUser(u, excludeUserId));
  const teamIndex = new Map<
    string,
    { dept: FilterTreeDepartment; team: FilterTreeTeam }
  >();
  for (const dept of orgTree) {
    for (const team of dept.teams ?? []) {
      teamIndex.set(team.id, { dept, team });
    }
  }

  const groupByDeptId = new Map<string, OrgDeptGroup>();

  const getOrCreateDept = (deptId: string, deptName: string) => {
    let deptGroup = groupByDeptId.get(deptId);
    if (!deptGroup) {
      deptGroup = { id: deptId, name: deptName, teams: [] };
      groupByDeptId.set(deptId, deptGroup);
    }
    return deptGroup;
  };

  const getOrCreateTeam = (
    deptGroup: OrgDeptGroup,
    teamId: string,
    teamName: string,
  ) => {
    let teamGroup = deptGroup.teams.find((team) => team.id === teamId);
    if (!teamGroup) {
      teamGroup = { id: teamId, name: teamName, users: [] };
      deptGroup.teams.push(teamGroup);
    }
    return teamGroup;
  };

  for (const user of available) {
    let deptId = user.team?.departmentId?.trim();
    let deptName = user.team?.departmentName?.trim();
    let teamId = user.team?.id?.trim() || user.teamId?.trim();
    let teamName = user.team?.name?.trim();

    if (teamId && !deptName) {
      const found = teamIndex.get(teamId);
      if (found) {
        deptId = found.dept.id;
        deptName = found.dept.name;
        teamName = teamName || found.team.name;
      }
    }

    deptId = deptId || UNASSIGNED_ID;
    deptName = deptName || 'Other';
    teamId = teamId || UNASSIGNED_TEAM_ID;
    teamName = teamName || 'Unassigned';

    const deptGroup = getOrCreateDept(deptId, deptName);
    const teamGroup = getOrCreateTeam(deptGroup, teamId, teamName);
    teamGroup.users.push(user);
  }

  const groups = Array.from(groupByDeptId.values());
  for (const dept of groups) {
    dept.teams = sortTeams(dept.teams);
  }
  groups.sort((a, b) => {
    if (a.id === UNASSIGNED_ID) return 1;
    if (b.id === UNASSIGNED_ID) return -1;
    return a.name.localeCompare(b.name);
  });
  return groups;
}

function filterOrgGroups(
  groups: OrgDeptGroup[],
  query: string,
): OrgDeptGroup[] {
  if (!query) return groups;
  return groups
    .map((dept) => {
      const deptMatches = dept.name.toLowerCase().includes(query);
      const teams = dept.teams
        .map((team) => {
          if (deptMatches || team.name.toLowerCase().includes(query)) {
            return team;
          }
          return {
            ...team,
            users: team.users.filter((user) => userMatchesSearch(user, query)),
          };
        })
        .filter((team) => team.users.length > 0);
      return { ...dept, teams };
    })
    .filter((dept) => dept.teams.length > 0);
}

function flattenOrgUsers(groups: OrgDeptGroup[]) {
  return groups.flatMap((dept) => dept.teams.flatMap((team) => team.users));
}

function deptUserCount(dept: OrgDeptGroup) {
  return dept.teams.reduce((sum, team) => sum + team.users.length, 0);
}

export function ObserversMultiSelect({
  users,
  value,
  onChange,
  excludeUserId,
  placeholder = 'Select people',
  /** Singular noun for the trigger summary, e.g. "person" / "assignee". */
  entityLabel = 'person',
  className,
}: {
  users: PlatformUser[];
  value: string[];
  onChange: (next: string[]) => void;
  excludeUserId?: string;
  placeholder?: string;
  entityLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(
    () => new Set(),
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const { data: orgTree = [], isLoading: orgLoading } = usePipelineFilterTree();

  const available = useMemo(
    () => users.filter((u) => !isExcludedUser(u, excludeUserId)),
    [users, excludeUserId],
  );

  const orgGroups = useMemo(
    () => buildOrgUserGroups(users, orgTree, excludeUserId),
    [users, orgTree, excludeUserId],
  );

  const directoryUsers = useMemo(() => flattenOrgUsers(orgGroups), [orgGroups]);

  const selected = useMemo(() => {
    const byId = new Map(directoryUsers.map((user) => [user.id, user]));
    return value
      .map((id) => byId.get(id) ?? available.find((user) => user.id === id))
      .filter((user): user is PlatformUser => Boolean(user));
  }, [available, directoryUsers, value]);

  const grouped = useMemo(
    () => filterOrgGroups(orgGroups, search.trim().toLowerCase()),
    [orgGroups, search],
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const toggleTeam = (userIds: string[]) => {
    if (!userIds.length) return;
    const allSelected = userIds.every((id) => value.includes(id));
    if (allSelected) {
      const remove = new Set(userIds);
      onChange(value.filter((id) => !remove.has(id)));
      return;
    }
    onChange([...new Set([...value, ...userIds])]);
  };

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const toggleDept = (id: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="h-auto min-h-9 w-full justify-between border-border bg-white px-3 py-1.5 text-sm font-normal hover:bg-white aria-expanded:bg-white dark:bg-surface-card dark:hover:bg-surface-card dark:aria-expanded:bg-surface-card"
        >
          <span className="truncate text-left text-muted-foreground">
            {selected.length
              ? `${selected.length} ${entityLabel}${selected.length === 1 ? '' : 's'} selected`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </div>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        minWidth={320}
        preferredMaxHeight={420}
      >
        <div className="relative shrink-0 border-b border-border p-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people, teams, or departments…"
            className="h-8 pl-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
          onWheel={(e) => e.stopPropagation()}
        >
          <OrgUserPickerList
            grouped={grouped}
            orgLoading={orgLoading && users.length === 0}
            availableCount={available.length}
            search={search}
            collapsedDepts={collapsedDepts}
            onToggleDept={toggleDept}
            mode="multiple"
            value={value}
            onSelect={toggle}
            onSelectTeam={toggleTeam}
          />
        </div>
      </PortaledDropdownPanel>

      {selected.length > 0 ? (
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
                    alt={userDisplayName(user)}
                  />
                ) : null}
                <AvatarFallback className="bg-brand-muted text-[7px] font-semibold text-brand">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-[11px] leading-tight text-foreground">
                  {userDisplayName(user)}
                </span>
                {user.team?.name ? (
                  <span className="block truncate text-[9px] leading-tight text-muted-foreground">
                    {[user.team.departmentName, user.team.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label={`Remove ${userDisplayName(user)}`}
                onClick={() => toggle(user.id)}
                className="rounded p-0.5 text-muted-foreground hover:bg-surface-card hover:text-foreground"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function UserSingleSelect({
  users,
  value,
  onChange,
  placeholder = 'No assignee',
  disabled,
  className,
  allowClear = true,
  clearLabel = 'No assignee',
}: {
  users: PlatformUser[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(
    () => new Set(),
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const { data: orgTree = [], isLoading: orgLoading } = usePipelineFilterTree();

  const orgGroups = useMemo(
    () => buildOrgUserGroups(users, orgTree),
    [users, orgTree],
  );

  const directoryUsers = useMemo(() => flattenOrgUsers(orgGroups), [orgGroups]);

  const selected = useMemo(() => {
    if (!value) return undefined;
    const byId = new Map(directoryUsers.map((user) => [user.id, user]));
    return (
      byId.get(value) ?? users.find((user) => user.id === value) ?? undefined
    );
  }, [directoryUsers, users, value]);

  const grouped = useMemo(
    () => filterOrgGroups(orgGroups, search.trim().toLowerCase()),
    [orgGroups, search],
  );

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const toggleDept = (id: string) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={cn('w-full', className)}>
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="h-auto min-h-9 w-full justify-between border-border bg-white px-3 py-1.5 text-sm font-normal hover:bg-white aria-expanded:bg-white dark:bg-surface-card dark:hover:bg-surface-card dark:aria-expanded:bg-surface-card [&_[data-slot=select-value]]:line-clamp-none"
        >
          <span className="min-w-0 flex-1 text-left">
            {selected ? (
              <UserOptionLabel user={selected} />
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </div>
      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        minWidth={320}
        preferredMaxHeight={420}
      >
        <div className="relative shrink-0 border-b border-border p-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people, teams, or departments…"
            className="h-8 pl-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
          onWheel={(e) => e.stopPropagation()}
        >
          {allowClear ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                close();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-elevated',
                !value && 'bg-brand-muted/25',
              )}
            >
              <span
                className={cn(
                  'size-3.5 shrink-0 rounded-full border',
                  !value ? 'border-brand bg-brand' : 'border-border bg-white',
                )}
              />
              <span className="text-muted-foreground">{clearLabel}</span>
            </button>
          ) : null}
          <OrgUserPickerList
            grouped={grouped}
            orgLoading={orgLoading && users.length === 0}
            availableCount={users.length}
            search={search}
            collapsedDepts={collapsedDepts}
            onToggleDept={toggleDept}
            mode="single"
            value={value}
            onSelect={(userId) => {
              onChange(userId);
              close();
            }}
          />
        </div>
      </PortaledDropdownPanel>
    </div>
  );
}
