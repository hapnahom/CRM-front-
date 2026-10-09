'use client';

import { useState } from 'react';
import { message } from 'antd';
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Mail,
  Phone,
  Users,
  Calendar,
  Clock,
  Key,
  User,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatUserName } from '@/lib/format-user-name';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PlatformUser,
  BackendUserStatus,
  STATUS_DISPLAY,
  UpdateUserPayload,
} from '@/store/server/features/userManagement/types';
import {
  useGetRoleOptions,
  useGetTeamOptions,
} from '@/store/server/features/userManagement/queries';
import { useUpdatePlatformUser } from '@/store/server/features/userManagement/mutations';
import { roles as mockRoles } from '@/data/userManagementData';
import {
  UserManagementQueryErrorBanner,
  userManagementErrorToast,
} from './UserManagementQueryError';
import AccessGuard from '@/utils/permissionGuard';
import { createEmptyPermissionMatrix } from '@/utils/rolePermissions';
import { PermissionsTable } from './PermissionsTable';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function copySystemId(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => message.success(`${label} copied`),
    () => message.error(`Could not copy ${label}`),
  );
}

/** Low-profile ids for admin / migration lookups (click to copy). */
function UserSystemIds({ user }: { user: PlatformUser }) {
  return (
    <div className="mt-3 flex flex-wrap justify-end gap-x-3 gap-y-0.5 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => copySystemId('CRM id', user.id)}
        className="max-w-full truncate font-mono text-[12px] leading-tight text-muted-foreground/45 hover:text-muted-foreground/70"
        title="Copy CRM user id"
      >
        id: {user.id}
      </button>
      {user.selamnewId ? (
        <button
          type="button"
          onClick={() => copySystemId('selamnewId', user.selamnewId!)}
          className="max-w-full truncate font-mono text-[12px] leading-tight text-muted-foreground/45 hover:text-muted-foreground/70"
          title="Copy selamnewId"
        >
          selamnewId: {user.selamnewId}
        </button>
      ) : null}
    </div>
  );
}

/** Look up permissions from the mock roles by name (display-only). */
function getRolePermissions(
  roleName: string,
): Record<string, Record<string, boolean>> {
  const role = mockRoles.find((r) => r.name === roleName);
  if (role) return JSON.parse(JSON.stringify(role.permissions));
  return createEmptyPermissionMatrix();
}

// ─── InfoField ────────────────────────────────────────────────────────────────
function InfoField({
  label,
  value,
  isEditing,
  children,
  icon,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground flex items-center gap-1">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
      </Label>
      {isEditing && children ? (
        children
      ) : (
        <div className="bg-surface-elevated border border-border rounded-md px-3 py-2.5 text-sm text-foreground min-h-[38px] flex items-center">
          {value || '—'}
        </div>
      )}
    </div>
  );
}

// ─── Edit state ───────────────────────────────────────────────────────────────
interface EditState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: BackendUserStatus;
  roleIds: string[];
  teamId: string | null;
}

function toEditState(user: PlatformUser): EditState {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    status: user.status,
    roleIds: user.roles.map((r) => r.id),
    teamId: user.teamId ?? user.team?.id ?? null,
  };
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({
  user,
  editState,
  isEditing,
  isSelf,
  roleOptions,
  teamOptions,
  onChange,
}: {
  user: PlatformUser;
  editState: EditState;
  isEditing: boolean;
  isSelf: boolean;
  roleOptions: { id: string; name: string }[];
  teamOptions: { id: string; name: string }[];
  onChange: (partial: Partial<EditState>) => void;
}) {
  const primaryRoleName =
    (isEditing
      ? roleOptions.find((r) => r.id === editState.roleIds[0])?.name
      : user.roles[0]?.name) ?? '—';

  const teamsDisplay =
    (isEditing
      ? teamOptions.find((t) => t.id === editState.teamId)?.name
      : user.team?.name) || '—';

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* First Name */}
        <InfoField
          label="First Name"
          value={user.firstName ?? ''}
          isEditing={isEditing && isSelf}
          icon={<User size={11} />}
        >
          <Input
            value={editState.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            className="h-9 border-border"
            placeholder="First name"
          />
        </InfoField>

        {/* Last Name */}
        <InfoField
          label="Last Name"
          value={user.lastName ?? ''}
          isEditing={isEditing && isSelf}
          icon={<User size={11} />}
        >
          <Input
            value={editState.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            className="h-9 border-border"
            placeholder="Last name"
          />
        </InfoField>

        {/* Email */}
        <InfoField
          label="Email Address"
          value={user.email ?? ''}
          isEditing={isEditing && isSelf}
          icon={<Mail size={11} />}
        >
          <Input
            type="email"
            value={editState.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="h-9 border-border"
            placeholder="email@company.com"
          />
        </InfoField>

        {/* Phone */}
        <InfoField
          label="Phone Number"
          value={user.phone ?? ''}
          isEditing={isEditing && isSelf}
          icon={<Phone size={11} />}
        >
          <Input
            value={editState.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="h-9 border-border"
            placeholder="+251911000000"
          />
        </InfoField>

        {/* Status */}
        <InfoField
          label="Account Status"
          value={STATUS_DISPLAY[user.status].label}
          isEditing={isEditing && !isSelf}
          icon={<Shield size={11} />}
        >
          <Select
            value={editState.status}
            onValueChange={(v) => onChange({ status: v as BackendUserStatus })}
          >
            <SelectTrigger className="h-9 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Invitation Expired</SelectItem>
            </SelectContent>
          </Select>
        </InfoField>

        {/* Primary Role – single select; replaces all roles */}
        <InfoField
          label="CRM Role"
          value={primaryRoleName}
          isEditing={isEditing && !isSelf}
          icon={<Key size={11} />}
        >
          <Select
            value={editState.roleIds[0] ?? ''}
            onValueChange={(v) => onChange({ roleIds: v ? [v] : [] })}
          >
            <SelectTrigger className="h-9 border-border">
              <SelectValue placeholder="Select role…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {roleOptions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InfoField>

        {/* Teams – single select for simplicity; replaces all team memberships */}
        <InfoField
          label="Team"
          value={teamsDisplay}
          isEditing={isEditing && !isSelf}
          icon={<Users size={11} />}
        >
          <Select
            value={editState.teamId ?? 'none'}
            onValueChange={(v) => onChange({ teamId: v === 'none' ? null : v })}
          >
            <SelectTrigger className="h-9 border-border">
              <SelectValue placeholder="Select team…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="none">No Team</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InfoField>

        {/* Joined */}
        <InfoField
          label="Joined Date"
          value={formatDate(user.createdAt)}
          isEditing={false}
          icon={<Calendar size={11} />}
        />

        {/* Last Active */}
        <InfoField
          label="Last Active"
          value={formatDate(user.lastActive)}
          isEditing={false}
          icon={<Clock size={11} />}
        />
      </div>
    </div>
  );
}

// ─── PermissionsTab (display-only via mock role names) ────────────────────────
function PermissionsTab({
  permissions,
  roleName,
  isEditing,
  onToggle,
  onReset,
}: {
  permissions: Record<string, Record<string, boolean>>;
  roleName: string;
  isEditing: boolean;
  onToggle: (module: string, action: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="font-medium text-foreground">Module Permissions</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isEditing
              ? 'Toggle individual permissions. Changes override the role defaults for this user.'
              : 'Showing permissions based on the assigned role.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[12px] text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Based on:{' '}
            <span className="font-medium text-foreground">
              {roleName || '—'}
            </span>
          </span>
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-border text-sm gap-1.5"
              onClick={onReset}
            >
              <RefreshCw size={13} />
              Reset to Defaults
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <PermissionsTable
          embedded
          permissions={permissions}
          readOnly={!isEditing}
          className="max-h-[min(56vh,520px)]"
          onChange={
            isEditing
              ? (module, action, value) => {
                  if ((permissions[module]?.[action] ?? false) !== value) {
                    onToggle(module, action);
                  }
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

// ─── TeamsTab ─────────────────────────────────────────────────────────────────
function TeamsTab({
  user,
  editState,
  isEditing,
  teamOptions,
  onChange,
}: {
  user: PlatformUser;
  editState: EditState;
  isEditing: boolean;
  teamOptions: { id: string; name: string }[];
  onChange: (partial: Partial<EditState>) => void;
}) {
  const currentTeam = isEditing
    ? teamOptions.find((t) => t.id === editState.teamId)
    : user.team;

  return (
    <div className="w-full space-y-4">
      {isEditing && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            Team Membership
          </Label>
          <Select
            value={editState.teamId ?? 'none'}
            onValueChange={(v) => onChange({ teamId: v === 'none' ? null : v })}
          >
            <SelectTrigger className="h-9 border-border text-sm">
              <SelectValue placeholder="Select team…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="none">No Team</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Team Membership
        </h4>
        {!currentTeam ? (
          <p className="text-sm text-muted-foreground">
            This user is not a member of any team.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-foreground">
              <Users size={13} className="text-brand" />
              {currentTeam.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
type DetailTab = 'profile' | 'permissions' | 'team';

type Props = {
  user: PlatformUser;
  initialEditMode?: boolean;
  onBack: () => void;
  onUpdate: (updated: PlatformUser) => void;
};

export function UserDetailView({
  user,
  initialEditMode = false,
  onBack,
  onUpdate,
}: Props) {
  const { userId: currentUserId } = useAuthenticationStore();
  const isSelf = currentUserId === user.id;

  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editState, setEditState] = useState<EditState>(() =>
    toEditState(user),
  );
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >(() => getRolePermissions(user.roles[0]?.name ?? ''));

  const rolesQuery = useGetRoleOptions();
  const teamsQuery = useGetTeamOptions();
  const roleOptions = rolesQuery.data ?? [];
  const teamOptions = teamsQuery.data ?? [];

  const optionsQueriesFailed = rolesQuery.isError || teamsQuery.isError;
  const optionsCombinedError =
    (rolesQuery.isError ? rolesQuery.error : undefined) ??
    (teamsQuery.isError ? teamsQuery.error : undefined);

  const { mutate: updateUser, isLoading: saving } = useUpdatePlatformUser();

  const refetchRoleTeamOptions = () => {
    void Promise.all([rolesQuery.refetch(), teamsQuery.refetch()]);
  };

  const displayName = formatUserName(user, '—');
  const primaryRoleName =
    roleOptions.find((r) => r.id === editState.roleIds[0])?.name ??
    user.roles[0]?.name ??
    '';

  const handleChange = (partial: Partial<EditState>) =>
    setEditState((prev) => ({ ...prev, ...partial }));

  const handleRoleChange = (roleId: string) => {
    handleChange({ roleIds: roleId ? [roleId] : [] });
    const roleName = roleOptions.find((r) => r.id === roleId)?.name ?? '';
    setPermissions(getRolePermissions(roleName));
  };

  const handleSave = () => {
    const payload: UpdateUserPayload = isSelf
      ? {
          firstName: editState.firstName || undefined,
          lastName: editState.lastName || undefined,
          email: editState.email || undefined,
          phone: editState.phone || undefined,
        }
      : {
          status: editState.status,
          roleIds: editState.roleIds,
          teamId: editState.teamId,
        };

    updateUser(
      { id: user.id, payload },
      {
        onSuccess: (updated) => {
          onUpdate(updated);
          setIsEditing(false);
        },
        onError: (err) => {
          const msg = userManagementErrorToast(err);
          if (msg) message.error(msg);
        },
      },
    );
  };

  const handleCancel = () => {
    setEditState(toEditState(user));
    setPermissions(getRolePermissions(user.roles[0]?.name ?? ''));
    setIsEditing(false);
  };

  const tabConfig: {
    id: DetailTab;
    label: string;
    icon: React.ReactNode;
    hint: string;
  }[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User size={13} />,
      hint: 'Identity and contact details',
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <Key size={13} />,
      hint: 'Module access matrix',
    },
    {
      id: 'team',
      label: 'Team & Access',
      icon: <Users size={13} />,
      hint: 'Team memberships',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded border-border hover:bg-transparent"
            onClick={onBack}
            aria-label="Back to users list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-[18px] font-semibold text-foreground">
            {displayName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-border text-sm"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-9 bg-brand hover:bg-brand-hover text-brand-foreground text-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  'Saving…'
                ) : (
                  <>
                    <Check size={14} className="mr-1" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <AccessGuard permissions={['edit-users']}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-border text-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={14} />
                Edit
              </Button>
            </AccessGuard>
          )}
        </div>
      </div>

      {/* Profile header section */}
      <section className="rounded-lg border border-border bg-surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
            <Avatar className="h-12 w-12">
              {user.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="bg-lightblue text-sm font-semibold text-blue">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
              <h2 className="text-lg font-semibold leading-tight text-foreground">
                {displayName}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {user.email ?? '—'}
              </p>
            </div>
          </div>
          <Badge
            variant={STATUS_DISPLAY[user.status].variant}
            className="shrink-0"
          >
            {STATUS_DISPLAY[user.status].label}
          </Badge>
        </div>

        <div className="my-5 h-px bg-muted" />

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">
              Joined at
            </p>
            <p className="mt-1 text-sm text-foreground">
              {formatDate(user.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">
              Role
            </p>
            <p className="mt-1 text-sm text-foreground">
              {primaryRoleName || '—'}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">
              Team
            </p>
            <p className="mt-1 text-sm text-foreground">
              {user.team?.name || '—'}
            </p>
          </div>
        </div>

        <UserSystemIds user={user} />
      </section>

      {/* Section switcher + content */}
      <div>
        {optionsQueriesFailed && optionsCombinedError !== undefined ? (
          <UserManagementQueryErrorBanner
            error={optionsCombinedError}
            onRetry={refetchRoleTeamOptions}
            retrying={rolesQuery.isFetching || teamsQuery.isFetching}
            className="mb-4"
          />
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <aside className="w-full lg:w-[220px] lg:min-w-[220px]">
            <div className="flex flex-col gap-1.5">
              {tabConfig.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-all',
                    activeTab === tab.id
                      ? 'border-brand bg-brand-muted shadow-sm'
                      : 'border-border bg-surface-card hover:border-brand-border hover:bg-surface-elevated',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        activeTab === tab.id
                          ? 'text-brand'
                          : 'text-muted-foreground'
                      }
                    >
                      {tab.icon}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        activeTab === tab.id
                          ? 'text-brand-hover'
                          : 'text-muted-foreground',
                      )}
                    >
                      {tab.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {tab.hint}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                editState={editState}
                isEditing={isEditing}
                isSelf={isSelf}
                roleOptions={roleOptions}
                teamOptions={teamOptions}
                onChange={(partial) => {
                  if ('roleIds' in partial && partial.roleIds !== undefined) {
                    handleRoleChange(partial.roleIds[0] ?? '');
                  } else {
                    handleChange(partial);
                  }
                }}
              />
            )}
            {activeTab === 'permissions' && (
              <PermissionsTab
                permissions={permissions}
                roleName={primaryRoleName}
                isEditing={false}
                onToggle={() => {}}
                onReset={() => {}}
              />
            )}
            {activeTab === 'team' && (
              <TeamsTab
                user={user}
                editState={editState}
                isEditing={isEditing && !isSelf}
                teamOptions={teamOptions}
                onChange={handleChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
