'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { message } from 'antd';
import AccessGuard from '@/utils/permissionGuard';
import {
  Search,
  MoreHorizontal,
  Users,
  UserCheck,
  Mail,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Download,
  Eye,
  UserX,
  Check,
  CheckCircle2,
  Trash2,
  Send,
} from 'lucide-react';
import {
  UserTableBodySkeleton,
  ComboboxListSkeleton,
} from '@/components/loading/skeleton-screens';
import { formatUserName } from '@/lib/format-user-name';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useGetPlatformUsers,
  useGetUserStats,
  useGetRoleOptions,
  useGetTeamOptions,
  useGetExternalUsers,
  downloadUsersExport,
} from '@/store/server/features/userManagement/queries';
import {
  useUpdatePlatformUser,
  useCreateInvitation,
  useDeletePlatformUser,
} from '@/store/server/features/userManagement/mutations';
import {
  PlatformUser,
  BackendUserStatus,
  STATUS_DISPLAY,
  UserFilters,
  ExternalUser,
} from '@/store/server/features/userManagement/types';
import { UserDetailView } from './UserDetailView';
import {
  UserManagementQueryErrorBanner,
  UserManagementQueryErrorFill,
  UserManagementQueryErrorInline,
  userManagementErrorToast,
} from './UserManagementQueryError';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function roleBadgeVariant(
  name: string,
): 'brand' | 'purple' | 'success' | 'muted' {
  const map: Record<string, 'brand' | 'purple' | 'success' | 'muted'> = {
    'Super Admin': 'brand',
    Admin: 'purple',
    'Sales Manager': 'brand',
    'Sales Rep': 'success',
    Viewer: 'muted',
    'Support Agent': 'purple',
  };
  return map[name] ?? 'purple';
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string | null) {
  if (!name) return 'bg-lightblue text-blue';
  return 'bg-lightblue text-blue';
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getExternalUserDepartment(user: ExternalUser) {
  const dept = user.department ?? user.departmentName;
  return typeof dept === 'string' && dept.trim() ? dept.trim() : '';
}

function formatLastActive(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const PER_PAGE = 20;

export interface UsersTabProps {
  onViewingChange?: (viewing: boolean) => void;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function UsersTab({ onViewingChange }: UsersTabProps = {}) {
  // ── Filter + pagination state ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterRoleId, setFilterRoleId] = useState<string>('all');
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);

  // ── Detail view state ──────────────────────────────────────────────────────
  const [detailUser, setDetailUser] = useState<PlatformUser | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);

  // ── Invite dialog state ────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [inviteComboboxOpen, setInviteComboboxOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('');
  const [inviteTeamId, setInviteTeamId] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  // ── Query filters ──────────────────────────────────────────────────────────
  const filters: UserFilters = {
    page,
    pageSize: PER_PAGE,
    ...(search.trim() && { search: search.trim() }),
    ...(filterStatus !== 'all' && {
      status: filterStatus as BackendUserStatus,
    }),
    ...(filterRoleId !== 'all' && { roleId: filterRoleId }),
    ...(filterTeamId !== 'all' && { teamId: filterTeamId }),
  };

  // ── Data queries ───────────────────────────────────────────────────────────
  const usersQuery = useGetPlatformUsers(filters);
  const statsQuery = useGetUserStats();
  const rolesQuery = useGetRoleOptions();
  const teamsQuery = useGetTeamOptions();
  const externalQuery = useGetExternalUsers();

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersIsError,
    error: usersError,
    refetch: refetchUsers,
    isFetching: usersFetching,
  } = usersQuery;

  const stats = statsQuery.data;
  const roleOptions = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const teamOptions = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);

  const { data: externalUsers = [], isLoading: externalLoading } =
    externalQuery;

  const auxQueriesFailed =
    statsQuery.isError || rolesQuery.isError || teamsQuery.isError;
  const auxCombinedError =
    (statsQuery.isError ? statsQuery.error : undefined) ??
    (rolesQuery.isError ? rolesQuery.error : undefined) ??
    (teamsQuery.isError ? teamsQuery.error : undefined);
  const auxRefetchBusy =
    statsQuery.isFetching || rolesQuery.isFetching || teamsQuery.isFetching;

  const refetchAuxiliaryData = () => {
    void Promise.all([
      statsQuery.refetch(),
      rolesQuery.refetch(),
      teamsQuery.refetch(),
    ]);
  };

  const usersPersistedStale = Boolean(usersIsError && usersData);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: updateUser } = useUpdatePlatformUser();
  const { mutateAsync: createInvitationAsync } = useCreateInvitation();
  const { mutate: deleteUser } = useDeletePlatformUser();
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    onViewingChange?.(detailUser !== null);
  }, [detailUser, onViewingChange]);

  const users = useMemo(() => usersData?.data ?? [], [usersData?.data]);
  const pagination = usersData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelected(selected.length === users.length ? [] : users.map((u) => u.id));

  // ── Filter helpers (reset page on change) ─────────────────────────────────
  const applySearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const applyRoleFilter = (v: string) => {
    setFilterRoleId(v);
    setPage(1);
  };
  const applyTeamFilter = (v: string) => {
    setFilterTeamId(v);
    setPage(1);
  };
  const applyStatusFilter = (v: string) => {
    setFilterStatus(v);
    setPage(1);
  };

  // ── Quick status change from row dropdown ──────────────────────────────────
  const handleQuickStatus = (user: PlatformUser, status: BackendUserStatus) => {
    updateUser(
      { id: user.id, payload: { status } },
      {
        onError: (err) => {
          const msg = userManagementErrorToast(err);
          if (msg) message.error(msg);
        },
      },
    );
  };

  const handleReinvite = async (user: PlatformUser) => {
    if (!user.selamnewId) {
      message.error(
        'Cannot re-invite this user because their external identity is missing.',
      );
      return;
    }
    const roleIds = user.roles.map((role) => role.id);
    if (roleIds.length === 0) {
      message.error('Cannot re-invite this user because no role is assigned.');
      return;
    }
    const teamId = user.teamId ?? user.team?.id;
    try {
      await createInvitationAsync({
        inviteeSelamnewId: user.selamnewId,
        roleIds,
        ...(teamId ? { teamId } : {}),
        inviteeEmailOverride: user.email ?? undefined,
      });
      message.success('Invitation email sent.');
    } catch (err) {
      const msg = userManagementErrorToast(err);
      if (msg) message.error(msg);
    }
  };

  const handleDeleteUser = (user: PlatformUser) => {
    deleteUser(user.id, {
      onSuccess: () => {
        setSelected((prev) => prev.filter((id) => id !== user.id));
        message.success('User deleted.');
      },
      onError: (err) => {
        const msg = userManagementErrorToast(err);
        if (msg) message.error(msg);
      },
    });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    try {
      await downloadUsersExport({
        search: search.trim() || undefined,
        status:
          filterStatus !== 'all'
            ? (filterStatus as BackendUserStatus)
            : undefined,
        roleId: filterRoleId !== 'all' ? filterRoleId : undefined,
        teamId: filterTeamId !== 'all' ? filterTeamId : undefined,
      });
    } catch (e: unknown) {
      const msg = userManagementErrorToast(e);
      if (msg) {
        if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
          try {
            const text = await e.response.data.text();
            message.error(text || msg);
          } catch {
            message.error(msg);
          }
        } else {
          message.error(msg);
        }
      }
    } finally {
      setExportLoading(false);
    }
  };

  // ── Detail view helpers ────────────────────────────────────────────────────
  const openDetail = (user: PlatformUser, editMode = false) => {
    setDetailUser(user);
    setDetailEditMode(editMode);
  };

  const handleUserUpdate = (updated: PlatformUser) => {
    setDetailUser(updated);
  };

  // ── Invite helpers ─────────────────────────────────────────────────────────
  const platformEmails = useMemo(
    () =>
      new Set(
        users
          .map((u) => u.email?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    [users],
  );

  const poolCandidates = useMemo(() => {
    const q = inviteSearch.trim().toLowerCase();
    return externalUsers.filter((u) => {
      if (platformEmails.has(u.email?.toLowerCase() ?? '')) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      );
    });
  }, [externalUsers, platformEmails, inviteSearch]);

  const isUnknownInvite = !selectedPoolId && looksLikeEmail(inviteSearch);
  const canInvite =
    Boolean(inviteRoleId) &&
    (Boolean(selectedPoolId) ||
      (isUnknownInvite && inviteName.trim().length > 0));

  const defaultInviteRoleId = useMemo(() => {
    const viewer = roleOptions.find((role) => role.name === 'Viewer');
    return viewer?.id ?? roleOptions[0]?.id ?? '';
  }, [roleOptions]);

  const closeInviteDialog = () => {
    setInviteOpen(false);
    setInviteSearch('');
    setSelectedPoolId(null);
    setInviteComboboxOpen(false);
    setInviteName('');
    setInvitePhone('');
    setInviteDepartment('');
    setInviteRoleId(defaultInviteRoleId);
    setInviteTeamId('');
  };

  const openInviteDialog = () => {
    setInviteRoleId(defaultInviteRoleId);
    setInviteTeamId('');
    setInviteOpen(true);
  };

  const handleInvite = async () => {
    if (!canInvite) return;

    const selectedUser = externalUsers.find((u) => u.id === selectedPoolId);
    const email = inviteSearch.trim();

    setInviting(true);
    try {
      if (selectedPoolId) {
        await createInvitationAsync({
          inviteeSelamnewId: selectedPoolId,
          roleIds: [inviteRoleId],
          ...(inviteTeamId ? { teamId: inviteTeamId } : {}),
          inviteeEmailOverride: selectedUser?.email ?? undefined,
        });
      } else if (isUnknownInvite) {
        await createInvitationAsync({
          inviteeSelamnewId: email,
          roleIds: [inviteRoleId],
          ...(inviteTeamId ? { teamId: inviteTeamId } : {}),
          inviteeEmailOverride: email,
        });
      }

      message.success('Invitation sent.');
      closeInviteDialog();
    } catch (err) {
      const msg = userManagementErrorToast(err);
      if (msg) message.error(msg);
    } finally {
      setInviting(false);
    }
  };

  // ── Detail view render ─────────────────────────────────────────────────────
  if (detailUser) {
    return (
      <UserDetailView
        user={detailUser}
        initialEditMode={detailEditMode}
        onBack={() => {
          setDetailUser(null);
          setDetailEditMode(false);
        }}
        onUpdate={handleUserUpdate}
      />
    );
  }

  // ─── Table view ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users…"
            className="h-9 w-full border-border bg-white pl-9 text-sm shadow-none dark:bg-surface-card"
            value={search}
            onChange={(e) => applySearch(e.target.value)}
          />
        </div>

        <Select value={filterRoleId} onValueChange={applyRoleFilter}>
          <SelectTrigger className="h-9 w-40 border-border bg-white text-sm shadow-none dark:bg-surface-card">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto" position="popper">
            <SelectItem value="all" className="text-sm">
              All roles
            </SelectItem>
            {roleOptions.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-sm">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTeamId} onValueChange={applyTeamFilter}>
          <SelectTrigger className="h-9 w-36 border-border bg-white text-sm shadow-none dark:bg-surface-card">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto" position="popper">
            <SelectItem value="all" className="text-sm">
              All teams
            </SelectItem>
            {teamOptions.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-sm">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={applyStatusFilter}>
          <SelectTrigger className="h-9 w-36 border-border bg-white text-sm shadow-none dark:bg-surface-card">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto" position="popper">
            <SelectItem value="all" className="text-sm">
              All statuses
            </SelectItem>
            <SelectItem value="active" className="text-sm">
              Active
            </SelectItem>
            <SelectItem value="invited" className="text-sm">
              Pending
            </SelectItem>
            <SelectItem value="suspended" className="text-sm">
              Suspended
            </SelectItem>
            <SelectItem value="declined" className="text-sm">
              Declined
            </SelectItem>
            <SelectItem value="expired" className="text-sm">
              Invitation Expired
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <AccessGuard permissions={['export-users']}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-border bg-surface-card text-sm"
              onClick={handleExport}
              disabled={exportLoading}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {exportLoading ? 'Exporting…' : 'Export'}
            </Button>
          </AccessGuard>
          <AccessGuard permissions={['create-users']}>
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-md bg-brand hover:bg-brand-hover text-brand-foreground text-sm"
              onClick={openInviteDialog}
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          </AccessGuard>
        </div>
      </div>

      {auxQueriesFailed && auxCombinedError !== undefined ? (
        <UserManagementQueryErrorBanner
          error={auxCombinedError}
          onRetry={refetchAuxiliaryData}
          retrying={auxRefetchBusy}
          className="mb-4"
        />
      ) : null}

      {usersPersistedStale ? (
        <UserManagementQueryErrorBanner
          error={
            usersError ??
            new Error('Could not refresh the user list. Try again.')
          }
          onRetry={() => void refetchUsers()}
          retrying={usersFetching}
          className="mb-4"
        />
      ) : null}

      {/* KPI cards */}
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Users',
            value: stats?.total ?? '—',
            icon: Users,
          },
          {
            label: 'Active',
            value: stats?.active ?? '—',
            icon: UserCheck,
          },
          {
            label: 'Pending',
            value: stats?.invited ?? '—',
            icon: Mail,
          },
          {
            label: 'Inactive',
            value: stats?.suspended ?? '—',
            icon: UserX,
          },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface-card p-4 transition-all hover:bg-surface-elevated hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xl font-semibold tabular-nums leading-tight text-foreground">
                  {stat.value}
                </p>
                <StatIcon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              </div>
              <p className="mt-0.5 text-[12px] font-medium leading-snug text-muted-foreground">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-surface-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface-card">
            <TableRow>
              <TableHead className="w-10 py-3 pl-4">
                <Checkbox
                  checked={users.length > 0 && selected.length === users.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="py-3 pl-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                User
              </TableHead>
              <TableHead className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </TableHead>
              <TableHead className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Last Active
              </TableHead>
              <TableHead className="w-12 px-4 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersIsError && usersData == null ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-6 align-top">
                  <UserManagementQueryErrorFill
                    error={usersError ?? new Error('Could not load users.')}
                    onRetry={() => void refetchUsers()}
                    retrying={usersFetching}
                  />
                </TableCell>
              </TableRow>
            ) : usersLoading && usersData == null ? (
              <UserTableBodySkeleton />
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-[12px] text-muted-foreground"
                >
                  No users match the current filter.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const displayName = formatUserName(user, '—');
                const primaryRole = user.roles[0];
                const teamsLabel = user.team?.name || '—';
                const statusCfg = STATUS_DISPLAY[user.status];
                const canActivate = user.status === 'suspended';
                const canSuspend = user.status === 'active';
                const canManageInviteOutcome =
                  user.status === 'declined' || user.status === 'expired';
                const hasSecondaryActions =
                  canActivate || canSuspend || canManageInviteOutcome;

                return (
                  <TableRow
                    key={user.id}
                    className="group cursor-pointer hover:bg-surface-elevated"
                    onClick={() => openDetail(user)}
                  >
                    <TableCell className="py-3.5 pl-4">
                      <Checkbox
                        checked={selected.includes(user.id)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </TableCell>
                    <TableCell className="py-3.5 pl-1">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          {user.avatarUrl && (
                            <AvatarImage
                              src={user.avatarUrl}
                              alt={displayName}
                            />
                          )}
                          <AvatarFallback
                            className={`${getAvatarColor(displayName)} text-xs font-semibold`}
                          >
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-brand">
                            {displayName}
                          </div>
                          <div className="text-[12px] text-muted-foreground">
                            {user.email ?? '—'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      {primaryRole ? (
                        <Badge
                          variant={roleBadgeVariant(primaryRole.name)}
                          className="hover:opacity-100"
                        >
                          {primaryRole.name}
                        </Badge>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          No role
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-[12px] text-muted-foreground">
                      {teamsLabel}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <Badge
                        variant={statusCfg.variant}
                        className="hover:opacity-100"
                      >
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-[12px] text-muted-foreground">
                      {formatLastActive(user.lastActive)}
                    </TableCell>
                    <TableCell className="relative z-50 px-4 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors outline-none"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 z-[100]"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(user);
                            }}
                            className="text-sm cursor-pointer"
                          >
                            <Eye size={13} className="mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          {hasSecondaryActions && (
                            <AccessGuard
                              permissions={['edit-users', 'delete-users']}
                            >
                              <DropdownMenuSeparator />
                            </AccessGuard>
                          )}
                          <AccessGuard permissions={['edit-users']}>
                            {canActivate ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatus(user, 'active');
                                }}
                                className="text-sm cursor-pointer text-success"
                              >
                                <CheckCircle2 size={13} className="mr-2" />
                                Activate
                              </DropdownMenuItem>
                            ) : canSuspend ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatus(user, 'suspended');
                                }}
                                className="text-sm cursor-pointer text-warning"
                              >
                                <UserX size={13} className="mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : null}
                            {canManageInviteOutcome && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleReinvite(user);
                                }}
                                className="text-sm cursor-pointer text-blue"
                              >
                                <Send size={13} className="mr-2" />
                                Re-invite
                              </DropdownMenuItem>
                            )}
                          </AccessGuard>
                          <AccessGuard permissions={['delete-users']}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(user);
                              }}
                              className="text-sm cursor-pointer text-error"
                            >
                              <Trash2 size={13} className="mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </AccessGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4">
          <p className="text-[12px] text-muted-foreground">
            Showing {(page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, pagination.total)} of {pagination.total}{' '}
            users
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (unused, i) => {
              const p =
                totalPages <= 5
                  ? i + 1
                  : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                      ? totalPages - 4 + i
                      : page - 2 + i;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 text-sm ${p === page ? 'bg-brand hover:bg-brand-hover text-brand-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Invite User Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (!open) closeInviteDialog();
          else setInviteOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-none gap-0 overflow-y-auto rounded-xl border border-border p-0 sm:max-w-2xl">
          <DialogHeader className="px-6 py-4 text-left">
            <DialogTitle className="text-base font-semibold leading-tight text-foreground">
              Add User
            </DialogTitle>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Search for a known employee or enter an email address to invite
              someone new.
            </p>
          </DialogHeader>

          <div className="space-y-5 px-6 py-1">
            <div
              onBlurCapture={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  window.setTimeout(() => setInviteComboboxOpen(false), 120);
                }
              }}
            >
              <label
                htmlFor="invite-employee-search"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Employee <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  id="invite-employee-search"
                  value={inviteSearch}
                  placeholder="Search by name or type an email address…"
                  className="h-10 border-border bg-surface-card pr-9 text-sm shadow-none"
                  onFocus={() => setInviteComboboxOpen(true)}
                  onClick={() => setInviteComboboxOpen(true)}
                  onChange={(event) => {
                    setInviteSearch(event.target.value);
                    setSelectedPoolId(null);
                    setInviteComboboxOpen(true);
                  }}
                />
                <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {inviteComboboxOpen && (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-border bg-surface-card p-1 shadow-sm">
                  {externalQuery.isError && externalQuery.error ? (
                    <UserManagementQueryErrorInline
                      error={externalQuery.error}
                      onRetry={() => void externalQuery.refetch()}
                      retrying={externalQuery.isFetching}
                      className="mx-1"
                    />
                  ) : externalLoading ? (
                    <ComboboxListSkeleton rows={4} />
                  ) : poolCandidates.length === 0 ? (
                    <div className="px-3 py-2.5 text-[12px] text-muted-foreground">
                      {looksLikeEmail(inviteSearch)
                        ? `No match found — fill in the details below to invite ${inviteSearch.trim()}.`
                        : 'No matching employees. Type an email address to invite someone new.'}
                    </div>
                  ) : (
                    poolCandidates.map((user) => {
                      const department = getExternalUserDepartment(user);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSelectedPoolId(user.id);
                            setInviteSearch(user.name ?? user.email ?? '');
                            setInviteComboboxOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated ${
                            selectedPoolId === user.id
                              ? 'bg-brand-muted ring-1 ring-brand-border'
                              : ''
                          }`}
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-brand-muted text-xs font-semibold text-brand">
                              {getInitials(user.name ?? user.email ?? null)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm leading-tight font-medium text-foreground">
                              {user.name}
                            </div>
                            <div className="text-[12px] text-muted-foreground">
                              {user.email}
                              {department ? ` · ${department}` : ''}
                            </div>
                          </div>
                          {selectedPoolId === user.id && (
                            <Check className="ml-auto h-4 w-4 shrink-0 text-brand" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {isUnknownInvite && (
              <div className="rounded-lg border border-border bg-surface-elevated p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                    New invitee details
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="invite-full-name"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Full Name <span className="text-error">*</span>
                    </label>
                    <Input
                      id="invite-full-name"
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                      placeholder="e.g. John Smith"
                      className="h-10 border-border bg-surface-card text-sm shadow-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="invite-phone"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Phone
                      </label>
                      <Input
                        id="invite-phone"
                        value={invitePhone}
                        onChange={(event) => setInvitePhone(event.target.value)}
                        placeholder="+1 000 000 0000"
                        className="h-10 border-border bg-surface-card text-sm shadow-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invite-department"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Department
                      </label>
                      <Input
                        id="invite-department"
                        value={inviteDepartment}
                        onChange={(event) =>
                          setInviteDepartment(event.target.value)
                        }
                        placeholder="e.g. Sales"
                        className="h-10 border-border bg-surface-card text-sm shadow-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="invite-role"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Assign Role
              </label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger
                  id="invite-role"
                  className="h-10 w-full border-border bg-surface-card text-sm shadow-none"
                >
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent
                  className="z-[71] max-h-64 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto"
                  position="popper"
                  align="start"
                >
                  {roleOptions.map((role) => (
                    <SelectItem
                      key={role.id}
                      value={role.id}
                      className="text-sm"
                    >
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="invite-team"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Assign Team{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Select
                value={inviteTeamId || '__none__'}
                onValueChange={(value) =>
                  setInviteTeamId(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger
                  id="invite-team"
                  className="h-10 w-full border-border bg-surface-card text-sm shadow-none"
                >
                  <SelectValue placeholder="No team" />
                </SelectTrigger>
                <SelectContent
                  className="z-[71] max-h-64 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto"
                  position="popper"
                  align="start"
                >
                  <SelectItem value="__none__" className="text-sm">
                    No team
                  </SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem
                      key={team.id}
                      value={team.id}
                      className="text-sm"
                    >
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-border px-5 text-sm"
              onClick={closeInviteDialog}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 bg-brand px-5 text-sm text-brand-foreground hover:bg-brand-hover"
              onClick={() => void handleInvite()}
              disabled={!canInvite || inviting}
            >
              {inviting
                ? 'Sending…'
                : isUnknownInvite
                  ? 'Send Invite'
                  : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
