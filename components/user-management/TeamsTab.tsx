'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Search,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { normalizeTeamTargetParentLevel } from '@/lib/teamTargetParent';
import type {
  Department,
  Team,
} from '@/store/server/features/departments/types';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useUpdateDepartment } from '@/store/server/features/departments/mutations';
import { toast } from 'sonner';
import {
  useGetCrmTeams,
  useGetCrmTeamMembers,
} from '@/store/server/features/teams/queries';
import { OrgStructureSkeleton } from '@/components/loading/skeleton-screens';
import { UserManagementQueryErrorFill } from './UserManagementQueryError';
import {
  DepartmentModal,
  DeleteDepartmentModal,
  TeamModal,
  DeleteTeamModal,
  ManageMembersModal,
  CompanyChiefInline,
} from './DepartmentTeamModals';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// ─── Selection state ──────────────────────────────────────────────────────────

type Selection = { kind: 'department'; id: string } | null;

// ─── Modal state ──────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'createDept' }
  | { type: 'editDept'; department: Department }
  | { type: 'deleteDept'; department: Department }
  | { type: 'createTeam'; defaultDeptId?: string }
  | { type: 'editTeam'; team: Team }
  | { type: 'deleteTeam'; team: Team }
  | { type: 'manageMembers'; team: Team }
  | null;

// ─── Avatar color palette — deterministic per name ───────────────────────────

const AVATAR_COLORS = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/40',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
  {
    bg: 'bg-lime-100 dark:bg-lime-900/40',
    text: 'text-lime-700 dark:text-lime-300',
  },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── TeamCard ─────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  onEdit,
  onDelete,
  onManageMembers,
}: {
  team: Team;
  onEdit: (t: Team) => void;
  onDelete: (t: Team) => void;
  onManageMembers: (t: Team) => void;
}) {
  const { data: members = [], isLoading: membersLoading } =
    useGetCrmTeamMembers(team.id);

  const MAX_VISIBLE = 5;
  const displayMembers = members.map((m) => ({
    id: m.id,
    name: m.name || m.email || m.id,
    email: m.email || '',
    avatarUrl: m.avatarUrl ?? undefined,
  }));
  const visibleMembers = displayMembers.slice(0, MAX_VISIBLE);
  const overflow = displayMembers.length - visibleMembers.length;
  const memberCount = membersLoading
    ? (team.memberCount ?? 0)
    : displayMembers.length;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-surface-card shadow-xs transition-all duration-150 hover:shadow-md hover:border-border-strong overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-brand/70 to-brand/30" />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted border border-brand/20">
              <Users size={16} className="text-brand" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {team.name}
                </p>
                {team.teamLead?.name ? (
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <span className="text-muted-foreground/70">·</span>
                    <Crown
                      size={12}
                      className="shrink-0 text-amber-500"
                      aria-label="Team lead"
                    />
                    <span>{team.teamLead.name}</span>
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {team.description ? (
                  <p className="min-w-0 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                    {team.description}
                  </p>
                ) : !team.targetParentLevel ||
                  team.targetParentLevel === 'department' ? (
                  <p className="text-[12px] text-muted-foreground/50 italic">
                    No description
                  </p>
                ) : null}
                {team.targetParentLevel === 'company' ? (
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0">
                    Company target
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label="Team options"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] w-44">
              <DropdownMenuItem
                className="cursor-pointer text-sm"
                onSelect={() => onEdit(team)}
              >
                <Edit size={14} className="mr-2" /> Edit Team
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-sm text-destructive focus:text-destructive"
                onSelect={() => onDelete(team)}
              >
                <Trash2 size={14} className="mr-2" /> Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between gap-2">
          {membersLoading ? (
            <span className="text-[12px] text-muted-foreground">
              Loading members…
            </span>
          ) : memberCount === 0 ? (
            <span className="text-[12px] text-muted-foreground">
              No members
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <AvatarGroup>
                {visibleMembers.map((m) => {
                  const color = avatarColor(m.name);
                  return (
                    <Avatar key={m.id} size="sm" title={m.name}>
                      {m.avatarUrl ? (
                        <AvatarImage src={m.avatarUrl} alt={m.name} />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          'text-xs font-semibold',
                          color.bg,
                          color.text,
                        )}
                      >
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {overflow > 0 && (
                  <AvatarGroupCount className="text-xs">
                    +{overflow}
                  </AvatarGroupCount>
                )}
              </AvatarGroup>
              <span className="text-[12px] text-muted-foreground">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sm text-muted-foreground hover:text-brand hover:bg-brand-muted px-2 shrink-0"
            onClick={() => onManageMembers(team)}
          >
            <UserPlus size={14} />
            Members
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── DepartmentPanel (right-side detail view) ─────────────────────────────────

function DepartmentPanel({
  department,
  onEditDept,
  onDeleteDept,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
  onManageMembers,
}: {
  department: Department;
  onEditDept: (d: Department) => void;
  onDeleteDept: (d: Department) => void;
  onCreateTeam: (deptId: string) => void;
  onEditTeam: (t: Team) => void;
  onDeleteTeam: (t: Team) => void;
  onManageMembers: (t: Team) => void;
}) {
  const updateDept = useUpdateDepartment();

  const handleSetMainDepartment = async () => {
    if (department.isMain) return;
    try {
      await updateDept.mutateAsync({
        id: department.id,
        data: { isMain: true },
      });
      toast.success(`${department.name} is now the main department`);
    } catch {
      toast.error('Failed to set main department');
    }
  };

  const totalMembers = department.teams.reduce(
    (sum, t) => sum + (t.memberCount ?? t.members.length),
    0,
  );

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated">
            <Building2 size={18} className="text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {department.name}
              </h2>
              {department.isMain ? (
                <Badge
                  variant="outline"
                  className="shrink-0 px-1.5 py-0 text-[11px]"
                >
                  Main dept
                </Badge>
              ) : null}
              {department.manager?.name ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/70">·</span>
                  <Crown
                    size={13}
                    className="shrink-0 text-amber-500"
                    aria-label="Department manager"
                  />
                  <span>{department.manager.name}</span>
                </span>
              ) : null}
            </div>
            {department.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                {department.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground mr-2">
            <span>
              <span className="font-semibold text-foreground">
                {department.teams.length}
              </span>{' '}
              team{department.teams.length !== 1 ? 's' : ''}
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {totalMembers}
              </span>{' '}
              member{totalMembers !== 1 ? 's' : ''}
            </span>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label="Department options"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] w-44">
              <DropdownMenuItem
                className="cursor-pointer text-sm"
                onSelect={() => onEditDept(department)}
              >
                <Edit size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              {!department.isMain ? (
                <DropdownMenuItem
                  className="cursor-pointer text-sm"
                  disabled={updateDept.isLoading}
                  onSelect={() => void handleSetMainDepartment()}
                >
                  <Crown size={14} className="mr-2" /> Set as main department
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-sm text-destructive focus:text-destructive"
                onSelect={() => onDeleteDept(department)}
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {department.teams.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-elevated px-6 py-12 text-center">
          <Users size={28} className="mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No teams yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            Add a team to this department to start organising its members.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => onCreateTeam(department.id)}
          >
            <Plus size={14} /> Add First Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 content-start overflow-y-auto">
          {department.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={onEditTeam}
              onDelete={onDeleteTeam}
              onManageMembers={onManageMembers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main TeamsTab ─────────────────────────────────────────────────────────────

export function TeamsTab() {
  const {
    data: departmentsData,
    isLoading: deptsLoading,
    isError: deptsError,
    error: deptsErr,
    refetch: refetchDepts,
  } = useGetDepartments();
  const {
    data: teamsData,
    isLoading: teamsLoading,
    isError: teamsError,
    error: teamsErr,
    refetch: refetchTeams,
  } = useGetCrmTeams();

  const departments: Department[] = useMemo(() => {
    const apiDepts = departmentsData?.data ?? [];
    const apiTeams = teamsData?.data ?? [];
    return apiDepts.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? undefined,
      createdAt: d.createdAt,
      managerId: d.managerId,
      manager: d.manager ? { id: d.manager.id, name: d.manager.name } : null,
      isMain: d.isMain === true,
      teams: apiTeams
        .filter((t) => t.departmentId === d.id)
        .map(
          (t): Team => ({
            id: t.id,
            name: t.name,
            description: t.description ?? undefined,
            departmentId: t.departmentId,
            members: [],
            createdAt: t.createdAt,
            targetParentLevel: normalizeTeamTargetParentLevel(
              t.targetParentLevel,
            ),
            teamLeadId: t.teamLeadId,
            teamLead: t.teamLead
              ? { id: t.teamLead.id, name: t.teamLead.name ?? null }
              : null,
            memberCount: t.memberCount,
          }),
        ),
    }));
  }, [departmentsData?.data, teamsData?.data]);

  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const closeModal = () => setModal(null);

  useEffect(() => {
    if (selection?.kind === 'department') {
      const stillExists = departments.some((d) => d.id === selection.id);
      if (!stillExists) {
        setSelection(
          departments.length > 0
            ? { kind: 'department', id: departments[0].id }
            : null,
        );
      }
      return;
    }
    if (selection === null && departments.length > 0) {
      setSelection({ kind: 'department', id: departments[0].id });
    }
  }, [departments, selection]);

  const q = sidebarSearch.toLowerCase().trim();
  const filteredDepts = useMemo(
    () =>
      q
        ? departments.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.teams.some((t) => t.name.toLowerCase().includes(q)),
          )
        : departments,
    [departments, q],
  );
  const selectedDept =
    selection?.kind === 'department'
      ? (departments.find((d) => d.id === selection.id) ?? null)
      : null;

  const totalTeams = departments.reduce((s, d) => s + d.teams.length, 0);
  const totalMembers = departments.reduce(
    (s, d) =>
      s +
      d.teams.reduce((ts, t) => ts + (t.memberCount ?? t.members.length), 0),
    0,
  );

  const openCreateTeam = (defaultDeptId?: string) => {
    if (departments.length === 0) return;
    setModal({
      type: 'createTeam',
      defaultDeptId: defaultDeptId ?? selectedDept?.id ?? departments[0]?.id,
    });
  };

  if (deptsLoading || teamsLoading) {
    return <OrgStructureSkeleton />;
  }

  if (deptsError || teamsError) {
    return (
      <UserManagementQueryErrorFill
        error={deptsErr ?? teamsErr}
        onRetry={() => {
          void refetchDepts();
          void refetchTeams();
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">
              {departments.length}
            </span>{' '}
            department{departments.length !== 1 ? 's' : ''}
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="font-semibold text-foreground">{totalTeams}</span>{' '}
            team{totalTeams !== 1 ? 's' : ''}
          </span>
          <span className="text-border">|</span>
          <span>
            <span className="font-semibold text-foreground">
              {totalMembers}
            </span>{' '}
            unique member{totalMembers !== 1 ? 's' : ''}
          </span>
          <CompanyChiefInline />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={departments.length === 0}
            onClick={() => openCreateTeam(selectedDept?.id)}
          >
            <Users size={14} /> New Team
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setModal({ type: 'createDept' })}
          >
            <Plus size={14} /> New Department
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface-elevated lg:w-64">
          <div className="shrink-0 px-3 pt-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder="Search…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            <div className="mb-1 px-1 pt-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Departments
              </span>
            </div>

            {filteredDepts.length === 0 && q ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                No results
              </p>
            ) : (
              filteredDepts.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() =>
                    setSelection({ kind: 'department', id: dept.id })
                  }
                  className={cn(
                    'group w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors',
                    selection?.kind === 'department' && selection.id === dept.id
                      ? 'bg-brand-muted text-brand font-medium'
                      : 'text-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={15} className="shrink-0" />
                    <span className="truncate text-sm">{dept.name}</span>
                    {dept.isMain ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 px-1 py-0 text-[10px] leading-4"
                      >
                        Main
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="muted" className="px-1.5 py-0">
                      {dept.teams.length}
                    </Badge>
                    <ChevronRight
                      size={14}
                      className={cn(
                        'shrink-0 text-muted-foreground transition-transform',
                        selection?.kind === 'department' &&
                          selection.id === dept.id
                          ? 'text-brand rotate-0'
                          : '',
                      )}
                    />
                  </div>
                </button>
              ))
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-border bg-surface-card p-5">
          {selectedDept ? (
            <DepartmentPanel
              department={selectedDept}
              onEditDept={(d) => setModal({ type: 'editDept', department: d })}
              onDeleteDept={(d) =>
                setModal({ type: 'deleteDept', department: d })
              }
              onCreateTeam={(deptId) => openCreateTeam(deptId)}
              onEditTeam={(t) => setModal({ type: 'editTeam', team: t })}
              onDeleteTeam={(t) => setModal({ type: 'deleteTeam', team: t })}
              onManageMembers={(t) =>
                setModal({ type: 'manageMembers', team: t })
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-elevated px-6 py-12 text-center">
              <Building2 size={28} className="mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                No departments yet
              </p>
              <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
                Create a department first. Every team must belong to one.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setModal({ type: 'createDept' })}
              >
                <Plus size={14} /> New Department
              </Button>
            </div>
          )}
        </main>
      </div>

      <DepartmentModal
        open={modal?.type === 'createDept' || modal?.type === 'editDept'}
        onClose={closeModal}
        department={modal?.type === 'editDept' ? modal.department : undefined}
      />
      <DeleteDepartmentModal
        open={modal?.type === 'deleteDept'}
        onClose={closeModal}
        department={modal?.type === 'deleteDept' ? modal.department : undefined}
      />
      <TeamModal
        open={modal?.type === 'createTeam' || modal?.type === 'editTeam'}
        onClose={closeModal}
        team={modal?.type === 'editTeam' ? modal.team : undefined}
        departments={departments}
        defaultDepartmentId={
          modal?.type === 'createTeam' ? modal.defaultDeptId : undefined
        }
      />
      <DeleteTeamModal
        open={modal?.type === 'deleteTeam'}
        onClose={closeModal}
        team={modal?.type === 'deleteTeam' ? modal.team : undefined}
      />
      <ManageMembersModal
        open={modal?.type === 'manageMembers'}
        onClose={closeModal}
        team={modal?.type === 'manageMembers' ? modal.team : undefined}
      />
    </div>
  );
}
