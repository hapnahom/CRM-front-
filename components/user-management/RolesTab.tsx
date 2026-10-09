'use client';

import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import AccessGuard from '@/utils/permissionGuard';
import { Plus, MoreHorizontal, Shield, Edit, Trash2 } from 'lucide-react';
import {
  RolesPermissionsSkeleton,
  RolePermissionsPanelSkeleton,
} from '@/components/loading/skeleton-screens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Role } from '@/data/userManagementData';
import { PermissionsTable } from './PermissionsTable';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import {
  useGetRoleDetail,
  useGetRoleSummaries,
} from '@/store/server/features/userManagement/queries';
import {
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
} from '@/store/server/features/userManagement/mutations';
import type {
  RoleDetail,
  RoleSummary,
} from '@/store/server/features/userManagement/types';
import {
  mergeMatrixPermissionSlugs,
  matrixToPermissionSlugs,
  permissionSlugsToMatrix,
} from '@/utils/rolePermissions';
import {
  UserManagementQueryErrorFill,
  userManagementErrorToast,
} from './UserManagementQueryError';
import { tokens } from '@/lib/design-tokens';

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': tokens.color.brand,
  Admin: tokens.color.purple,
  'Sales Manager': tokens.color.orange,
  'Sales Rep': tokens.color.success,
  Viewer: tokens.color.textSubtle,
  'Support Agent': tokens.color.purple,
};

function getRoleColor(name: string) {
  return ROLE_COLORS[name] ?? tokens.color.brand;
}

function isSystemRole(role: Pick<RoleSummary, 'tenantId'>): boolean {
  return role.tenantId == null;
}

function isProtectedAdminRole(role: Pick<RoleSummary, 'name'>): boolean {
  return role.name.trim().toLowerCase() === 'admin';
}

function canDeleteRole(role: Pick<RoleSummary, 'name' | 'tenantId'>): boolean {
  return !isSystemRole(role) && !isProtectedAdminRole(role);
}

function releasePageInteraction() {
  const unlock = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  };
  unlock();
  window.setTimeout(unlock, 0);
  window.setTimeout(unlock, 250);
}

function mapRoleDetailToViewModel(role: RoleDetail): Role {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    usersCount: role.userCount ?? 0,
    isSystem: isSystemRole(role),
    permissions: permissionSlugsToMatrix(
      role.permissions?.map((permission) => permission.slug) ?? [],
    ),
    createdAt: role.createdAt,
  };
}

function RoleListItem({
  role,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  role: RoleSummary & { usersCount?: number; isSystem: boolean };
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deletable = canDeleteRole(role);

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all',
        isSelected
          ? 'border-brand bg-brand-muted shadow-sm'
          : 'border-border hover:border-brand-border hover:bg-surface-card',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: getRoleColor(role.name) }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight text-foreground">
            {role.name}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {role.usersCount ?? 0} users
          </div>
        </div>
        {role.isSystem && (
          <Badge className="shrink-0 bg-muted text-muted-foreground hover:opacity-100">
            Default
          </Badge>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={16} className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100] w-44">
          <AccessGuard permissions={['edit-roles']}>
            <DropdownMenuItem
              className="cursor-pointer font-medium"
              onSelect={() => onEdit()}
            >
              <Edit size={13} className="mr-2" />
              Edit Role
            </DropdownMenuItem>
          </AccessGuard>
          {deletable && (
            <AccessGuard permissions={['delete-roles']}>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer font-medium text-error"
                onSelect={() => onDelete()}
              >
                <Trash2 size={13} className="mr-2" />
                Delete Role
              </DropdownMenuItem>
            </AccessGuard>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RolesTab() {
  const rolesQuery = useGetRoleSummaries();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleSummary | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const roleSummaries = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const selectedRoleDetailQuery = useGetRoleDetail(selectedRoleId);
  const editingRoleDetailQuery = useGetRoleDetail(
    editModalOpen ? editingRoleId : null,
  );
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const roleListItems = useMemo(
    () =>
      roleSummaries.map((role) => ({
        ...role,
        isSystem: isSystemRole(role),
        usersCount: role.userCount ?? 0,
      })),
    [roleSummaries],
  );

  useEffect(() => {
    if (roleSummaries.length === 0) {
      setSelectedRoleId(null);
      return;
    }

    if (
      !selectedRoleId ||
      !roleSummaries.some((role) => role.id === selectedRoleId)
    ) {
      setSelectedRoleId(roleSummaries[0].id);
    }
  }, [roleSummaries, selectedRoleId]);

  useEffect(() => {
    if (!deleteTarget) setDeleteConfirmed(false);
  }, [deleteTarget]);

  const selectedRole = useMemo(() => {
    if (!selectedRoleDetailQuery.data) return null;
    return mapRoleDetailToViewModel(selectedRoleDetailQuery.data);
  }, [selectedRoleDetailQuery.data]);

  const editingRole = useMemo(() => {
    if (!editingRoleDetailQuery.data) return null;
    if (editingRoleId && editingRoleDetailQuery.data.id !== editingRoleId) {
      return null;
    }
    return mapRoleDetailToViewModel(editingRoleDetailQuery.data);
  }, [editingRoleDetailQuery.data, editingRoleId]);

  const openEditModal = (roleId: string) => {
    // Let the row menu finish closing before the dialog opens, or its
    // scroll lock stays on the page after save.
    window.setTimeout(() => {
      setSelectedRoleId(roleId);
      setEditingRoleId(roleId);
      setEditModalOpen(true);
    }, 0);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingRoleId(null);
    releasePageInteraction();
  };

  const handleCreateRole = async (
    data: Omit<Role, 'id' | 'usersCount' | 'isSystem' | 'createdAt'>,
  ) => {
    try {
      const created = await createRoleMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        permissionSlugs: matrixToPermissionSlugs(data.permissions),
      });
      message.success('Role created successfully');
      setSelectedRoleId(created.id);
    } catch (error) {
      const msg = userManagementErrorToast(error);
      if (msg) message.error(msg);
      throw error;
    }
  };

  const handleEditRole = async (data: Role) => {
    if (editingRoleId && data.id !== editingRoleId) {
      message.error(
        'Role data is out of date. Reopen the editor and try again.',
      );
      return;
    }

    const existingSlugs =
      editingRoleDetailQuery.data?.id === data.id
        ? (editingRoleDetailQuery.data.permissions?.map(
            (permission) => permission.slug,
          ) ?? [])
        : [];

    try {
      await updateRoleMutation.mutateAsync({
        id: data.id,
        payload: {
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          permissionSlugs: mergeMatrixPermissionSlugs(
            data.permissions,
            existingSlugs,
          ),
        },
      });
      closeEditModal();
      message.success('Role updated successfully');
    } catch (error) {
      const msg = userManagementErrorToast(error);
      if (msg) message.error(msg);
      throw error;
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget || !deleteConfirmed) return;
    if (!canDeleteRole(deleteTarget)) {
      message.error('The Admin role cannot be deleted.');
      setDeleteTarget(null);
      return;
    }

    try {
      await deleteRoleMutation.mutateAsync(deleteTarget.id);
      message.success('Role deleted successfully');
      if (selectedRoleId === deleteTarget.id) {
        setSelectedRoleId(null);
      }
      setDeleteTarget(null);
      releasePageInteraction();
    } catch (error) {
      const msg = userManagementErrorToast(error);
      if (msg) message.error(msg);
    }
  };

  const isSaving =
    createRoleMutation.isLoading ||
    updateRoleMutation.isLoading ||
    deleteRoleMutation.isLoading;

  if (rolesQuery.isError) {
    return (
      <UserManagementQueryErrorFill
        error={rolesQuery.error}
        onRetry={() => {
          void rolesQuery.refetch();
        }}
      />
    );
  }

  if (rolesQuery.isLoading) {
    return <RolesPermissionsSkeleton />;
  }

  const isSuperAdminLocked =
    selectedRole?.isSystem && selectedRole.name === 'Super Admin';

  return (
    <div className="space-y-4">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h2 className="shrink-0 text-base font-semibold leading-none text-foreground">
          Roles &amp; Permissions
        </h2>
        <AccessGuard permissions={['create-roles']}>
          <Button
            size="sm"
            className="ml-auto h-9 gap-1.5 rounded-lg bg-brand px-4 text-sm hover:bg-brand-hover text-brand-foreground"
            onClick={() => setCreateModalOpen(true)}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </AccessGuard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-1.5">
          {roleListItems.map((role) => (
            <RoleListItem
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onClick={() => setSelectedRoleId(role.id)}
              onEdit={() => openEditModal(role.id)}
              onDelete={() => setDeleteTarget(role)}
            />
          ))}
        </div>

        {!selectedRoleId ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-card text-muted-foreground">
            <Shield size={32} className="opacity-20" />
            <p className="text-sm">No roles available</p>
          </div>
        ) : selectedRoleDetailQuery.isError ? (
          <UserManagementQueryErrorFill
            error={selectedRoleDetailQuery.error}
            onRetry={() => {
              void selectedRoleDetailQuery.refetch();
            }}
          />
        ) : selectedRoleDetailQuery.isLoading || !selectedRole ? (
          <RolePermissionsPanelSkeleton />
        ) : (
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="shrink-0 border-b border-border px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: getRoleColor(selectedRole.name),
                      }}
                    />
                    <span className="text-base font-semibold text-foreground">
                      {selectedRole.name}
                    </span>
                    {selectedRole.isSystem && (
                      <Badge className="bg-muted text-muted-foreground hover:opacity-100">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {selectedRole.description || 'No description provided.'}
                  </p>
                </div>
                <AccessGuard permissions={['edit-roles']}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5 border-border text-sm"
                    onClick={() => openEditModal(selectedRole.id)}
                  >
                    <Edit size={14} />
                    Edit
                  </Button>
                </AccessGuard>
              </div>
            </div>

            <PermissionsTable
              embedded
              permissions={selectedRole.permissions}
              readOnly={true}
              className="max-h-[min(calc(100vh-220px),640px)]"
            />

            {isSuperAdminLocked && (
              <div className="border-t border-border px-5 py-2.5">
                <p className="text-[12px] text-muted-foreground">
                  Super Admin permissions cannot be modified.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateRoleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={handleCreateRole}
        isSaving={createRoleMutation.isLoading}
      />

      <EditRoleModal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
          else setEditModalOpen(true);
        }}
        role={editingRole}
        isLoading={
          editModalOpen &&
          Boolean(editingRoleId) &&
          (editingRoleDetailQuery.isLoading || !editingRole)
        }
        onSave={handleEditRole}
        isSaving={updateRoleMutation.isLoading}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            releasePageInteraction();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role?</DialogTitle>
            <DialogDescription>
              You are about to permanently delete the role{' '}
              <strong>{deleteTarget?.name}</strong>. Users currently assigned to
              this role will lose these permissions. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 rounded-md border border-border bg-surface-elevated/50 px-3 py-2.5 text-sm text-foreground">
            <Checkbox
              checked={deleteConfirmed}
              onCheckedChange={(checked) =>
                setDeleteConfirmed(checked === true)
              }
              className="mt-0.5"
            />
            <span>
              I understand that deleting <strong>{deleteTarget?.name}</strong>{' '}
              is permanent and may affect assigned users.
            </span>
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9"
              disabled={!deleteConfirmed || deleteRoleMutation.isLoading}
              onClick={() => {
                void handleDeleteRole();
              }}
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
