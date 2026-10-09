'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { cn } from '@/lib/utils';
import { canEditSettings } from '@/utils/dataScope';
import {
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
} from '../../components/profile/shared';
import {
  usePartnerRoleFields,
  usePartnerRoles,
} from '../hooks/usePartnerRoles';
import type {
  PartnerRole,
  SolutionCardinality,
  SolutionFieldSet,
  SolutionPlacement,
  CreatePartnerRoleInput,
  UpdatePartnerRoleInput,
} from '../types';
import { SolutionsWorkflowSettings } from './SolutionsWorkflowSettings';
import { PartnerRoleFieldsDemo } from './PartnerRoleFieldsDemo';
import { PartnerTiersSettings } from '../../tiers';
import { PartnerPartnershipTypesSettings } from '../../partnership-types';
import { PartnerReportSettings } from '../../components/PartnerReportSettings';

type RoleStatusFilter = 'all' | 'active' | 'inactive';

function formatRoleDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PartnerRolesSettings({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { roles, createRole, updateRole, deleteRole } = usePartnerRoles();
  const canManage = canEditSettings();
  const [configuringRole, setConfiguringRole] = useState<PartnerRole | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PartnerRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoleStatusFilter>('all');

  const filteredRoles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...roles]
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.displayOrder - b.displayOrder,
      )
      .filter((role) => {
        if (statusFilter === 'active' && !role.isActive) return false;
        if (statusFilter === 'inactive' && role.isActive) return false;
        if (!query) return true;
        return (
          role.name.toLowerCase().includes(query) ||
          role.description.toLowerCase().includes(query) ||
          role.code.toLowerCase().includes(query)
        );
      });
  }, [roles, searchQuery, statusFilter]);

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  if (configuringRole) {
    return (
      <PartnerRoleFieldsView
        role={configuringRole}
        onBack={() => setConfiguringRole(null)}
      />
    );
  }

  return (
    <div
      className={
        embedded
          ? 'flex min-h-0 flex-col gap-4'
          : 'flex h-full flex-col gap-4 overflow-auto bg-surface-card p-[10.5px] sm:p-[17.5px]'
      }
    >
      <PartnerTiersSettings />
      <PartnerPartnershipTypesSettings />
      <SolutionsWorkflowSettings />
      <PartnerReportSettings />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="m-0 text-[12px] font-semibold text-foreground">
            Partner Roles
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-[180px] sm:w-[240px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles..."
                className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] shadow-none dark:bg-surface-card"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as RoleStatusFilter)
              }
            >
              <SelectTrigger className="h-[31.5px] w-full border-border bg-white text-[12.25px] shadow-none sm:w-[140px] dark:bg-surface-card">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {canManage ? (
              <Button
                type="button"
                className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={openCreateDialog}
              >
                <Plus size={14} className="mr-1.5" />
                Add Partner Role
              </Button>
            ) : null}
          </div>
        </div>

        {filteredRoles.length === 0 ? (
          <Empty className="m-4 border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No partner roles</EmptyTitle>
              <EmptyDescription>
                {searchQuery.trim() || statusFilter !== 'all'
                  ? 'No roles match your search and filters.'
                  : 'Create a role to define which custom fields apply to partners.'}
              </EmptyDescription>
            </EmptyHeader>
            {canManage && !searchQuery.trim() && statusFilter === 'all' ? (
              <Button
                type="button"
                className="mt-4 h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                onClick={openCreateDialog}
              >
                <Plus size={14} className="mr-1.5" />
                Add Partner Role
              </Button>
            ) : null}
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'min-w-[240px]')}>
                    Role
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[120px]')}>
                    Type
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[160px]')}>
                    Solutions
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[130px]')}>
                    Custom fields
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[110px]')}>
                    Status
                  </TableHead>
                  <TableHead
                    className={cn(
                      TABLE_HEAD_CLASS,
                      'hidden w-[120px] sm:table-cell',
                    )}
                  >
                    Updated
                  </TableHead>
                  <TableHead className={cn(TABLE_HEAD_CLASS, 'w-12')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <RoleTableRow
                    key={role.id}
                    role={role}
                    canManage={canManage}
                    onConfigure={() => setConfiguringRole(role)}
                    onEdit={() => {
                      setEditingRole(role);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleteTarget(role)}
                    onToggleActive={() => {
                      updateRole(role.id, { isActive: !role.isActive });
                      NotificationMessage.success({
                        message: role.isActive
                          ? 'Role deactivated'
                          : 'Role activated',
                        description: `${role.name} is now ${
                          role.isActive ? 'inactive' : 'active'
                        }.`,
                      });
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PartnerRoleFormDialog
        open={formOpen && canManage}
        role={editingRole}
        onOpenChange={setFormOpen}
        onSubmit={(values) => {
          if (editingRole) {
            updateRole(editingRole.id, values);
            NotificationMessage.success({
              message: 'Partner Role Updated',
              description: `${values.name} has been saved.`,
            });
          } else {
            void createRole(values).then((created) => {
              NotificationMessage.success({
                message: 'Partner Role Created',
                description: `${created.name} is ready. Configure its custom fields next.`,
              });
            });
          }
          setFormOpen(false);
          setEditingRole(null);
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete partner role?</DialogTitle>
            <DialogDescription>
              This removes <strong>{deleteTarget?.name}</strong> and its custom
              field definitions. Partners that still reference this role should
              be updated separately.
              {deleteTarget?.isSystem ? ' This is a default seeded role.' : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                deleteRole(deleteTarget.id);
                NotificationMessage.success({
                  message: 'Role deleted',
                  description: `${deleteTarget.name} has been removed.`,
                });
                setDeleteTarget(null);
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

function RoleTableRow({
  role,
  canManage,
  onConfigure,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  role: PartnerRole;
  canManage: boolean;
  onConfigure: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const { fields } = usePartnerRoleFields(role.id);
  const fieldCount = fields.length;

  return (
    <TableRow
      className={cn('cursor-pointer', !role.isActive && 'opacity-70')}
      onClick={onConfigure}
    >
      <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{role.name}</p>
          {role.isPrimary ? (
            <Badge variant="success" className="shrink-0 text-[10px] px-2 py-0">
              Primary
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {role.description || 'No description'}
        </p>
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        {role.isSystem ? (
          <Badge variant="outline" className="rounded-full text-[10px]">
            <Shield size={10} className="mr-1" />
            Default
          </Badge>
        ) : (
          <Badge variant="muted" className="rounded-full text-[10px]">
            Custom
          </Badge>
        )}
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        {role.useInSolutions ? (
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              variant="outline"
              className="rounded-full border-sky-200 bg-sky-50 text-[10px] text-sky-800"
            >
              {role.solutionRequired ? 'Required' : 'Optional'}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full text-[10px] text-muted-foreground"
            >
              #{role.solutionOrder}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full text-[10px] capitalize text-muted-foreground"
            >
              {role.solutionPlacement.replace(/_/g, ' ')}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className={cn(TABLE_CELL_CLASS, 'tabular-nums')}>
        {fieldCount}
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        <Badge
          variant="outline"
          className={cn(
            'rounded-full text-[10px]',
            role.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'text-muted-foreground',
          )}
        >
          {role.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          TABLE_CELL_CLASS,
          'hidden text-muted-foreground sm:table-cell',
        )}
      >
        {formatRoleDate(role.updatedAt)}
      </TableCell>
      <TableCell
        className={cn(TABLE_CELL_CLASS, 'text-right')}
        onClick={(e) => e.stopPropagation()}
      >
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onConfigure}>
                Configure fields
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Edit role</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {role.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
                disabled={role.isPrimary || role.isSystem}
              >
                Delete role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function PartnerRoleFieldsView({
  role,
  onBack,
}: {
  role: PartnerRole;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface-card px-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Partner Roles
        </Button>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Custom Fields</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[220px] truncate text-[12px] font-medium text-foreground">
          {role.name}
        </span>
        {role.isSystem ? (
          <Badge
            variant="outline"
            className="ml-1 rounded-full border-border px-2 py-0 text-[10px] font-medium"
          >
            <Shield size={10} className="mr-1" />
            Default
          </Badge>
        ) : null}
        {!role.isActive ? (
          <Badge
            variant="outline"
            className="ml-1 rounded-full px-2 py-0 text-[10px] font-medium text-muted-foreground"
          >
            Inactive
          </Badge>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
        <div className="rounded-lg border border-border bg-surface-elevated/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="m-0 text-[15px] font-semibold text-foreground">
                {role.name}
              </h2>
              <p className="m-0 text-[12px] text-muted-foreground">
                {role.description || 'No description'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="rounded-full text-[10px]">
                {role.code}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full text-[10px]',
                  role.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'text-muted-foreground',
                )}
              >
                {role.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {role.useInSolutions ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Solutions
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-sky-200 bg-sky-50 text-[10px] text-sky-800"
              >
                {role.solutionRequired ? 'Required' : 'Optional'}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full text-[10px] text-muted-foreground"
              >
                Order #{role.solutionOrder}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full text-[10px] capitalize text-muted-foreground"
              >
                {role.solutionPlacement.replace(/_/g, ' ')}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full text-[10px] capitalize text-muted-foreground"
              >
                {role.solutionCardinality}
              </Badge>
              {role.filterByProductLink ? (
                <Badge
                  variant="outline"
                  className="rounded-full text-[10px] text-muted-foreground"
                >
                  Filter by product link
                </Badge>
              ) : null}
              {role.solutionFieldSet !== 'none' ? (
                <Badge
                  variant="outline"
                  className="rounded-full text-[10px] capitalize text-muted-foreground"
                >
                  {role.solutionFieldSet.replace(/_/g, ' ')}
                </Badge>
              ) : null}
            </div>
          ) : (
            <p className="m-0 mt-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
              Not used in solutions workflow.
            </p>
          )}
        </div>

        <PartnerRoleFieldsDemo role={role} />
      </div>
    </div>
  );
}

function PartnerRoleFormDialog({
  open,
  role,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  role: PartnerRole | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreatePartnerRoleInput & UpdatePartnerRoleInput) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [useInSolutions, setUseInSolutions] = useState(false);
  const [solutionOrder, setSolutionOrder] = useState(0);
  const [solutionPlacement, setSolutionPlacement] =
    useState<SolutionPlacement>('after_product');
  const [solutionRequired, setSolutionRequired] = useState(false);
  const [solutionCardinality, setSolutionCardinality] =
    useState<SolutionCardinality>('one');
  const [filterByProductLink, setFilterByProductLink] = useState(true);
  const [solutionFieldSet, setSolutionFieldSet] =
    useState<SolutionFieldSet>('none');

  React.useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setIsActive(role?.isActive ?? true);
    setIsPrimary(role?.isPrimary ?? false);
    setUseInSolutions(role?.useInSolutions ?? false);
    setSolutionOrder(role?.solutionOrder ?? 0);
    setSolutionPlacement(role?.solutionPlacement ?? 'after_product');
    setSolutionRequired(role?.solutionRequired ?? false);
    setSolutionCardinality(role?.solutionCardinality ?? 'one');
    setFilterByProductLink(role?.filterByProductLink ?? true);
    setSolutionFieldSet(role?.solutionFieldSet ?? 'none');
  }, [open, role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Edit Partner Role' : 'Add Partner Role'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cloud Service Provider"
                className="h-[31.5px] text-[12.25px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="h-[31.5px] text-[12.25px]"
              />
            </div>
            <div className="flex h-[42px] items-center justify-between rounded-md border border-border px-3">
              <span className="text-[12.25px] font-medium text-foreground">
                Active
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-[12.25px] font-medium text-foreground">
                  Primary
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Only one primary partner role is allowed.
                </p>
              </div>
              <Switch
                checked={isPrimary}
                disabled={Boolean(role?.isPrimary)}
                onCheckedChange={setIsPrimary}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex h-8 items-center justify-between gap-3">
              <span className="text-[12.25px] font-semibold text-foreground">
                Use in Solutions
              </span>
              <Switch
                checked={useInSolutions}
                onCheckedChange={setUseInSolutions}
              />
            </div>

            {useInSolutions ? (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                      Order
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={solutionOrder}
                      onChange={(e) =>
                        setSolutionOrder(Number(e.target.value) || 0)
                      }
                      className="h-[31.5px] text-[12.25px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                      Placement
                    </label>
                    <Select
                      value={solutionPlacement}
                      onValueChange={(v) =>
                        setSolutionPlacement(v as SolutionPlacement)
                      }
                    >
                      <SelectTrigger className="h-[31.5px] text-[12.25px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before_product">
                          Before product
                        </SelectItem>
                        <SelectItem value="with_product">
                          With product
                        </SelectItem>
                        <SelectItem value="after_product">
                          After product
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                      Cardinality
                    </label>
                    <Select
                      value={solutionCardinality}
                      onValueChange={(v) =>
                        setSolutionCardinality(v as SolutionCardinality)
                      }
                    >
                      <SelectTrigger className="h-[31.5px] text-[12.25px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one">One partner</SelectItem>
                        <SelectItem value="many">Many partners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                      Extra fields
                    </label>
                    <Select
                      value={solutionFieldSet}
                      onValueChange={(v) =>
                        setSolutionFieldSet(v as SolutionFieldSet)
                      }
                    >
                      <SelectTrigger className="h-[31.5px] text-[12.25px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="deal_registration">
                          Deal registration
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex h-[42px] items-center justify-between rounded-md border border-border px-3">
                  <span className="text-[12.25px] font-medium text-foreground">
                    Required
                  </span>
                  <Switch
                    checked={solutionRequired}
                    onCheckedChange={setSolutionRequired}
                  />
                </div>

                <div className="flex h-[42px] items-center justify-between rounded-md border border-border px-3">
                  <span className="text-[12.25px] font-medium text-foreground">
                    Filter by product link
                  </span>
                  <Switch
                    checked={filterByProductLink}
                    onCheckedChange={setFilterByProductLink}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim(),
                isActive,
                isPrimary,
                useInSolutions,
                solutionOrder,
                solutionPlacement,
                solutionRequired,
                solutionCardinality,
                filterByProductLink,
                solutionFieldSet,
              })
            }
          >
            {role ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
