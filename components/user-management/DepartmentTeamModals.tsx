'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { formatUserName } from '@/lib/format-user-name';
import {
  Search,
  UserPlus,
  AlertTriangle,
  Building2,
  Users,
  X,
  Crown,
  ChevronDown,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  Department,
  Team,
} from '@/store/server/features/departments/types';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useUpdateOrganizationStructureSettings,
} from '@/store/server/features/departments/mutations';
import { useGetOrganizationStructureSettings } from '@/store/server/features/departments/queries';
import {
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useReplaceTeamMembers,
} from '@/store/server/features/teams/mutations';
import { useGetCrmTeamMembers } from '@/store/server/features/teams/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function mutationErrorMessage(error: unknown, fallback: string): string | null {
  const err = error as {
    message?: string;
    response?: {
      status?: number;
      data?: { message?: string | string[]; error?: string };
    };
  };
  if (err?.response?.status === 403) {
    return null;
  }
  const apiMessage = err?.response?.data?.message;
  if (Array.isArray(apiMessage) && apiMessage.length) {
    return apiMessage.join(', ');
  }
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage.trim();
  }
  if (
    err?.message &&
    !/^Request failed with status code \d+/i.test(err.message)
  ) {
    return err.message;
  }
  return fallback;
}

function userDisplayName(user: {
  name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  id: string;
}) {
  return formatUserName(user, user.id);
}

function userRoleLabel(
  user?: {
    roles?: { id: string; name: string }[] | null;
  } | null,
): string | null {
  const roles = user?.roles ?? [];
  if (!roles.length) return null;
  return roles.map((r) => r.name).join(', ');
}

function MemberAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const color = memberAvatarColor(name);
  return (
    <Avatar size="default">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback
        className={cn('text-xs font-semibold', color.bg, color.text)}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function RolePill({ label }: { label: string }) {
  return (
    <span className="hidden sm:inline-block shrink-0 max-w-[140px] truncate text-[12px] text-muted-foreground bg-surface-elevated rounded-full px-2 py-0.5 border border-border">
      {label}
    </span>
  );
}

/** Searchable user list (avatar + role) with crown for the selected lead/manager. */
function UserRolePicker({
  users,
  selectedId,
  onSelect,
  isLoading,
  emptyLabel = 'No users available',
  searchPlaceholder = 'Search by name, email, or role…',
}: {
  users: PlatformUser[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState('');

  const list = Array.isArray(users) ? users : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const role = userRoleLabel(u) ?? '';
      const hay =
        `${userDisplayName(u)} ${u.email ?? ''} ${role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [list, query]);

  // Keep selected user visible at the top when present.
  const ordered = useMemo(() => {
    if (!selectedId) return filtered;
    const selected = filtered.find((u) => u.id === selectedId);
    if (!selected) return filtered;
    return [selected, ...filtered.filter((u) => u.id !== selectedId)];
  }, [filtered, selectedId]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto p-1.5">
        {isLoading ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            Loading users…
          </p>
        ) : ordered.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            {query.trim() ? 'No users match your search.' : emptyLabel}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {ordered.map((user) => {
              const label = userDisplayName(user);
              const roleLabel = userRoleLabel(user);
              const isSelected = user.id === selectedId;
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(user.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-brand-muted border border-brand/30'
                        : 'border border-transparent hover:bg-surface-elevated',
                    )}
                  >
                    <MemberAvatar name={label} avatarUrl={user.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {label}
                        </p>
                        {isSelected ? (
                          <Crown
                            size={13}
                            className="shrink-0 text-amber-500"
                            aria-label="Selected"
                          />
                        ) : null}
                      </div>
                      {user.email ? (
                        <p className="truncate text-[12px] text-muted-foreground">
                          {user.email}
                        </p>
                      ) : null}
                    </div>
                    {roleLabel ? <RolePill label={roleLabel} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Department Modal (Create / Edit) ─────────────────────────────────────────

interface DepartmentModalProps {
  open: boolean;
  onClose: () => void;
  department?: Department;
}

export function DepartmentModal({
  open,
  onClose,
  department,
}: DepartmentModalProps) {
  const isEdit = !!department;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [isMain, setIsMain] = useState(false);

  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const { data: usersData, isLoading: usersLoading } = useGetPlatformUsers({
    page: 1,
    pageSize: 200,
  });
  const users = usersData?.data ?? [];

  useEffect(() => {
    if (open) {
      setName(department?.name ?? '');
      setDescription(department?.description ?? '');
      setManagerId(department?.managerId ?? '');
      setIsMain(department?.isMain === true);
    }
  }, [open, department]);

  const handleSave = async () => {
    if (!name.trim() || !managerId) return;
    try {
      if (isEdit && department) {
        await updateDept.mutateAsync({
          id: department.id,
          data: {
            name: name.trim(),
            description: description.trim() || null,
            managerId,
            isMain,
          },
        });
        toast.success('Department updated');
      } else {
        await createDept.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          managerId,
          ...(isMain ? { isMain: true } : {}),
        });
        toast.success('Department created');
      }
      onClose();
    } catch (error) {
      const msg = mutationErrorMessage(error, 'Failed to save department');
      if (msg) toast.error(msg);
    }
  };

  const busy = createDept.isLoading || updateDept.isLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated">
              <Building2 size={16} className="text-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {isEdit ? 'Edit Department' : 'Create Department'}
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                {isEdit
                  ? 'Update the department details and manager.'
                  : 'Add a new department to organize your teams under.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dept-name"
              placeholder="e.g. Sales, Pre-Sales, Customer Success"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Manager <span className="text-destructive">*</span>
            </Label>
            <UserRolePicker
              key={open ? `mgr-${department?.id ?? 'new'}` : 'mgr-closed'}
              users={users}
              selectedId={managerId}
              onSelect={setManagerId}
              isLoading={usersLoading}
              searchPlaceholder="Search manager…"
            />
            <p className="text-[12px] text-muted-foreground">
              Crown marks the selected department manager.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-desc">Description</Label>
            <Textarea
              id="dept-desc"
              placeholder="What does this department do? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-3">
            <Checkbox
              id="dept-main"
              checked={isMain}
              onCheckedChange={(v) => setIsMain(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="dept-main"
                className="cursor-pointer text-sm font-medium leading-none"
              >
                Main department for target planning
              </Label>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                In bottom-up or hybrid mode, only teams in this department can
                propose targets. Other departments receive targets after company
                approval. Only one main department per company.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !managerId || busy}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Department Modal ───────────────────────────────────────────────────

interface DeleteDepartmentModalProps {
  open: boolean;
  onClose: () => void;
  department?: Department;
}

export function DeleteDepartmentModal({
  open,
  onClose,
  department,
}: DeleteDepartmentModalProps) {
  const deleteDept = useDeleteDepartment();
  const [formError, setFormError] = useState<string | null>(null);
  const teamCount = department?.teams.length ?? 0;
  const blocked = teamCount > 0;

  useEffect(() => {
    if (open) setFormError(null);
  }, [open, department?.id]);

  const handleConfirm = async () => {
    if (!department) return;
    if (blocked) {
      const msg =
        'Cannot delete this department while it still has teams. Move or delete its teams first.';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormError(null);
    try {
      await deleteDept.mutateAsync(department.id);
      toast.success('Department deleted');
      onClose();
    } catch (error) {
      const msg = mutationErrorMessage(
        error,
        'Cannot delete this department while it still has teams. Move or delete its teams first.',
      );
      setFormError(msg);
      if (msg) toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
              <AlertTriangle size={16} className="text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Delete Department</DialogTitle>
              <DialogDescription className="text-[12px]">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{department?.name}</span>?
          </p>
          {blocked ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-warning"
              />
              <p className="text-sm text-foreground">
                This department has{' '}
                <span className="font-semibold">
                  {teamCount} team{teamCount > 1 ? 's' : ''}
                </span>
                . Delete or move those teams first — the department cannot be
                deleted while teams remain.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This will permanently remove the department.
            </p>
          )}
          {formError ? (
            <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
              {formError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteDept.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteDept.isLoading || blocked}
          >
            {deleteDept.isLoading ? 'Deleting…' : 'Delete Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Team Modal (Create / Edit) ───────────────────────────────────────────────

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
  departments: Department[];
  defaultDepartmentId?: string;
}

export function TeamModal({
  open,
  onClose,
  team,
  departments,
  defaultDepartmentId,
}: TeamModalProps) {
  const isEdit = !!team;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [targetParentLevel, setTargetParentLevel] = useState<
    'company' | 'department'
  >('department');

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const { data: usersData, isLoading: usersLoading } = useGetPlatformUsers({
    page: 1,
    pageSize: 200,
  });
  const users = usersData?.data ?? [];

  useEffect(() => {
    if (open) {
      setName(team?.name ?? '');
      setDescription(team?.description ?? '');
      setDepartmentId(
        team?.departmentId ?? defaultDepartmentId ?? departments[0]?.id ?? '',
      );
      setTeamLeadId(team?.teamLeadId ?? '');
      setTargetParentLevel(team?.targetParentLevel ?? 'department');
    }
  }, [open, team, defaultDepartmentId, departments]);

  const handleSave = async () => {
    if (!name.trim() || !teamLeadId || !departmentId) return;
    try {
      if (isEdit && team) {
        await updateTeam.mutateAsync({
          id: team.id,
          data: {
            name: name.trim(),
            description: description.trim() || null,
            departmentId,
            teamLeadId,
            targetParentLevel,
          },
        });
        toast.success('Team updated');
      } else {
        await createTeam.mutateAsync({
          name: name.trim(),
          departmentId,
          description: description.trim() || undefined,
          teamLeadId,
          targetParentLevel,
        });
        toast.success('Team created');
      }
      onClose();
    } catch (error) {
      const msg = mutationErrorMessage(error, 'Failed to save team');
      if (msg) toast.error(msg);
    }
  };

  const busy = createTeam.isLoading || updateTeam.isLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated">
              <Users size={16} className="text-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {isEdit ? 'Edit Team' : 'Create Team'}
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                {isEdit
                  ? "Update this team's details and department assignment."
                  : 'Create a team under a department.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder="e.g. Enterprise Sales, Solutions Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">Description</Label>
            <Textarea
              id="team-desc"
              placeholder="What does this team focus on? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-dept">
              Department <span className="text-destructive">*</span>
            </Label>
            <Select
              value={departmentId || undefined}
              onValueChange={setDepartmentId}
              disabled={departments.length === 0}
            >
              <SelectTrigger id="team-dept">
                <SelectValue
                  placeholder={
                    departments.length === 0
                      ? 'Create a department first'
                      : 'Select department'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departments.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Teams must belong to a department. Create one under Org
                Structure first.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>
              Team lead <span className="text-destructive">*</span>
            </Label>
            <UserRolePicker
              key={open ? `lead-${team?.id ?? 'new'}` : 'lead-closed'}
              users={users}
              selectedId={teamLeadId}
              onSelect={setTeamLeadId}
              isLoading={usersLoading}
              searchPlaceholder="Search team lead…"
            />
            <p className="text-[12px] text-muted-foreground">
              Crown marks the selected team lead.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-target-parent">Target parent</Label>
            <Select
              value={targetParentLevel}
              onValueChange={(value: 'company' | 'department') =>
                setTargetParentLevel(value)
              }
            >
              <SelectTrigger id="team-target-parent">
                <SelectValue placeholder="Select target parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">
                  Department (default) — target from department pool
                </SelectItem>
                <SelectItem value="company">
                  Company — target rolls up to company directly
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !teamLeadId || !departmentId || busy}
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Team Modal ─────────────────────────────────────────────────────────

interface DeleteTeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
}

export function DeleteTeamModal({ open, onClose, team }: DeleteTeamModalProps) {
  const deleteTeam = useDeleteTeam();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setFormError(null);
  }, [open, team?.id]);

  const handleConfirm = async () => {
    if (!team) return;
    setFormError(null);
    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success('Team deleted');
      onClose();
    } catch (error) {
      const msg = mutationErrorMessage(
        error,
        'Cannot delete team while leads/deals still reference it.',
      );
      setFormError(msg);
      if (msg) toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
              <AlertTriangle size={16} className="text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Delete Team</DialogTitle>
              <DialogDescription className="text-[12px]">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-sm text-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{team?.name}</span>?
          </p>
          <p className="text-sm text-muted-foreground">
            Members will be unassigned. Blocked if leads or deals still use this
            team as salesTeamId.
          </p>
          {formError ? (
            <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
              {formError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteTeam.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteTeam.isLoading}
          >
            {deleteTeam.isLoading ? 'Deleting…' : 'Delete Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Members Modal ──────────────────────────────────────────────────────

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

function memberAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface ManageMembersModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team;
}

export function ManageMembersModal({
  open,
  onClose,
  team,
}: ManageMembersModalProps) {
  const { data: apiMembers = [], isLoading: membersLoading } =
    useGetCrmTeamMembers(open ? team?.id : undefined);
  const { data: usersData, isLoading: usersLoading } = useGetPlatformUsers({
    page: 1,
    pageSize: 200,
  });
  const users = useMemo(() => usersData?.data ?? [], [usersData?.data]);
  const replaceMembers = useReplaceTeamMembers();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initializedForTeam, setInitializedForTeam] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open || !team?.id) return;
    if (membersLoading) return;
    if (initializedForTeam === team.id) return;
    setSelectedIds(apiMembers.map((m) => m.id).filter(Boolean));
    setSearch('');
    setInitializedForTeam(team.id);
  }, [open, team?.id, apiMembers, membersLoading, initializedForTeam]);

  useEffect(() => {
    if (!open) {
      setInitializedForTeam(null);
      setSearch('');
    }
  }, [open]);

  const memberIdSet = useMemo(
    () => new Set(apiMembers.map((m) => m.id)),
    [apiMembers],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const currentMembers = useMemo(() => {
    return selectedIds
      .map((id) => {
        const fromApi = apiMembers.find((m) => m.id === id);
        const fromUsers = users.find((u) => u.id === id);
        const name =
          fromApi?.name ||
          (fromUsers ? userDisplayName(fromUsers) : null) ||
          id;
        const email = fromApi?.email || fromUsers?.email || '';
        return {
          id,
          name,
          email: email ?? '',
          avatarUrl: fromApi?.avatarUrl ?? fromUsers?.avatarUrl ?? undefined,
          roleLabel: userRoleLabel(fromUsers),
        };
      })
      .filter(
        (m) =>
          search.trim() === '' ||
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          (m.roleLabel ?? '').toLowerCase().includes(search.toLowerCase()),
      );
  }, [selectedIds, apiMembers, users, search]);

  const availableFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !selectedSet.has(u.id))
      .filter((u) => {
        if (!q) return true;
        const role = userRoleLabel(u) ?? '';
        const label =
          `${userDisplayName(u)} ${u.email ?? ''} ${role}`.toLowerCase();
        return label.includes(q);
      });
  }, [users, selectedSet, search]);

  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setPendingAdd(new Set());
  }, [open, team?.id]);

  const togglePending = (id: string) => {
    setPendingAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPending = () => {
    const allIds = availableFiltered.map((u) => u.id);
    const allSelected = allIds.every((id) => pendingAdd.has(id));
    setPendingAdd(allSelected ? new Set() : new Set(allIds));
  };

  const handleAddSelected = async () => {
    if (!team || pendingAdd.size === 0) return;
    const nextIds = [...selectedIds, ...pendingAdd];
    try {
      await replaceMembers.mutateAsync({ id: team.id, memberIds: nextIds });
      setSelectedIds(nextIds);
      setPendingAdd(new Set());
      toast.success(
        `Added ${pendingAdd.size} member${pendingAdd.size > 1 ? 's' : ''}`,
      );
    } catch (error) {
      const msg = mutationErrorMessage(error, 'Failed to update members');
      if (msg) toast.error(msg);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!team) return;
    const nextIds = selectedIds.filter((id) => id !== memberId);
    try {
      await replaceMembers.mutateAsync({ id: team.id, memberIds: nextIds });
      setSelectedIds(nextIds);
      toast.success('Member removed');
    } catch (error) {
      const msg = mutationErrorMessage(error, 'Failed to update members');
      if (msg) toast.error(msg);
    }
  };

  const handleSaveAll = async () => {
    if (!team) return;
    try {
      await replaceMembers.mutateAsync({
        id: team.id,
        memberIds: selectedIds,
      });
      toast.success(
        selectedIds.length === 0
          ? 'All members removed from team'
          : `Team members updated (${selectedIds.length})`,
      );
      onClose();
    } catch (error) {
      const msg = mutationErrorMessage(error, 'Failed to update members');
      if (msg) toast.error(msg);
    }
  };

  const busy = replaceMembers.isLoading || membersLoading || usersLoading;
  const allVisibleSelected =
    availableFiltered.length > 0 &&
    availableFiltered.every((u) => pendingAdd.has(u.id));

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated">
            <UserPlus size={17} className="text-foreground" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base leading-tight">
              Manage Members
            </DialogTitle>
            <DialogDescription className="text-[12px] mt-0.5 truncate">
              <span className="font-medium text-foreground">{team.name}</span>
              {' · '}
              {selectedIds.length} member
              {selectedIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-b border-border">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Each user can be on only one team — assigning someone here moves
            them off their previous team.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-2">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Members ({currentMembers.length})
            </p>
            {membersLoading ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                Loading members…
              </p>
            ) : currentMembers.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                {search
                  ? 'No current members match your search.'
                  : 'No members yet. Add people below.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {currentMembers.map((member) => {
                  return (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-elevated transition-colors"
                    >
                      <MemberAvatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      {member.roleLabel ? (
                        <RolePill label={member.roleLabel} />
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(member.id)}
                        disabled={busy}
                        title="Remove from team"
                      >
                        <X size={13} />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          <div className="px-5 pt-4 pb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Add Members ({availableFiltered.length} available)
              </p>
              {availableFiltered.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllPending}
                  className="text-sm text-brand hover:underline"
                >
                  {allVisibleSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {usersLoading ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                Loading users…
              </p>
            ) : availableFiltered.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                {search
                  ? 'No available users match your search.'
                  : 'All CRM users are already in this team.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {availableFiltered.map((user) => {
                  const label = userDisplayName(user);
                  const isSelected = pendingAdd.has(user.id);
                  const otherTeam =
                    user.teamId && user.teamId !== team.id ? user.team : null;
                  const roleLabel = userRoleLabel(user);

                  return (
                    <li
                      key={user.id}
                      onClick={() => togglePending(user.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors',
                        isSelected
                          ? 'bg-brand-muted border border-brand/30'
                          : 'hover:bg-surface-elevated border border-transparent',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? 'bg-brand border-brand text-brand-foreground'
                            : 'border-border bg-surface-card',
                        )}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 10 8"
                            className="h-2.5 w-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 4l2.5 2.5L9 1" />
                          </svg>
                        )}
                      </div>

                      <MemberAvatar name={label} avatarUrl={user.avatarUrl} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {label}
                          </p>
                          {memberIdSet.has(user.id) ? (
                            <Badge variant="muted">On team</Badge>
                          ) : null}
                          {otherTeam ? (
                            <Badge variant="warning">On {otherTeam.name}</Badge>
                          ) : null}
                        </div>
                        {user.email ? (
                          <p className="truncate text-[12px] text-muted-foreground">
                            {user.email}
                          </p>
                        ) : null}
                        {otherTeam && isSelected ? (
                          <p className="mt-0.5 text-[12px] text-amber-700">
                            Will be moved from {otherTeam.name} to this team.
                          </p>
                        ) : null}
                      </div>
                      {roleLabel ? <RolePill label={roleLabel} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border px-5 py-3 bg-surface-elevated">
          <p className="text-[12px] text-muted-foreground">
            {pendingAdd.size > 0
              ? `${pendingAdd.size} user${pendingAdd.size > 1 ? 's' : ''} selected to add`
              : 'Select users above to add them'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </Button>
            {pendingAdd.size > 0 ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={handleAddSelected}
                className="gap-1.5"
              >
                <UserPlus size={13} />
                Add {pendingAdd.size}{' '}
                {pendingAdd.size === 1 ? 'Member' : 'Members'}
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={handleSaveAll}>
                {replaceMembers.isLoading ? 'Saving…' : 'Done'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact company-level lead (same pattern as dept manager / team lead). */
export function CompanyChiefInline() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: orgSettings, isLoading: settingsLoading } =
    useGetOrganizationStructureSettings();
  const updateSettings = useUpdateOrganizationStructureSettings();
  const { data: usersData, isLoading: usersLoading } = useGetPlatformUsers(
    { page: 1, pageSize: 200 },
    { enabled: pickerOpen },
  );
  const users = usersData?.data ?? [];

  const chiefId = orgSettings?.companyChiefUserId ?? '';
  const chiefName =
    orgSettings?.companyChief?.name?.trim() ||
    (chiefId ? 'Assigned user' : null);

  const handleSelectChief = async (id: string) => {
    if (!id || id === chiefId) {
      setPickerOpen(false);
      return;
    }
    try {
      await updateSettings.mutateAsync({ companyChiefUserId: id });
      toast.success('Company chief updated');
      setPickerOpen(false);
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, 'Failed to update company chief') ??
          'Failed to update company chief',
      );
    }
  };

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-border hidden sm:inline">|</span>
      <Crown size={13} className="shrink-0 text-amber-500" aria-hidden />
      <span className="shrink-0">Company chief</span>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground',
              'hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Select company chief"
          >
            <span className="truncate">
              {settingsLoading ? 'Loading…' : (chiefName ?? 'Not assigned')}
            </span>
            <ChevronDown size={14} className="shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(100vw-2rem,22rem)] p-0">
          <UserRolePicker
            key={pickerOpen ? `chief-picker-${chiefId}` : 'chief-picker-closed'}
            users={users}
            selectedId={chiefId}
            onSelect={(id) => void handleSelectChief(id)}
            isLoading={usersLoading || updateSettings.isLoading}
            searchPlaceholder="Search by name or email…"
            emptyLabel="No users available"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
