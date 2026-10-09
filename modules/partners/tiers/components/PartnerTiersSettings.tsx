'use client';

import React, { useMemo, useState } from 'react';
import { MoreHorizontal, Plus, Search, Layers } from 'lucide-react';
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
import { usePartnerTiers } from '../hooks/usePartnerTiers';
import type {
  CreatePartnerTierInput,
  PartnerTierDefinition,
  UpdatePartnerTierInput,
} from '../types';

type TierStatusFilter = 'all' | 'active' | 'inactive';

const PRESET_COLORS = [
  { label: 'Violet', color: '#f5f3ff', borderColor: '#ddd6fe' },
  { label: 'Amber', color: '#fffbeb', borderColor: '#fde68a' },
  { label: 'Slate', color: '#f8fafc', borderColor: '#e2e8f0' },
  { label: 'Sky', color: '#f0f9ff', borderColor: '#bae6fd' },
  { label: 'Emerald', color: '#ecfdf5', borderColor: '#a7f3d0' },
  { label: 'Rose', color: '#fff1f2', borderColor: '#fecdd3' },
];

function formatTierDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PartnerTiersSettings() {
  const { tiers, createTier, updateTier, deleteTier } = usePartnerTiers();
  const canManage = canEditSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PartnerTierDefinition | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    useState<PartnerTierDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TierStatusFilter>('all');

  const filteredTiers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...tiers]
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      )
      .filter((tier) => {
        if (statusFilter === 'active' && !tier.isActive) return false;
        if (statusFilter === 'inactive' && tier.isActive) return false;
        if (!query) return true;
        return (
          tier.name.toLowerCase().includes(query) ||
          tier.description.toLowerCase().includes(query) ||
          tier.code.toLowerCase().includes(query)
        );
      });
  }, [tiers, searchQuery, statusFilter]);

  const openCreateDialog = () => {
    setEditingTier(null);
    setFormOpen(true);
  };

  return (
    <div className="relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="m-0 text-[12px] font-semibold text-foreground">
            Partner Tiers
          </h2>
          <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">
            Define tier names, order, and badge colors used across Partners.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[180px] sm:w-[240px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tiers..."
              className="h-[31.5px] border-border bg-white pl-9 text-[12.25px] shadow-none dark:bg-surface-card"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as TierStatusFilter)
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
              Add Tier
            </Button>
          ) : null}
        </div>
      </div>

      {filteredTiers.length === 0 ? (
        <Empty className="m-4 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers />
            </EmptyMedia>
            <EmptyTitle>No partner tiers</EmptyTitle>
            <EmptyDescription>
              {searchQuery.trim() || statusFilter !== 'all'
                ? 'No tiers match your search and filters.'
                : 'Create tiers to classify partners (e.g. Authorized, Advanced).'}
            </EmptyDescription>
          </EmptyHeader>
          {canManage && !searchQuery.trim() && statusFilter === 'all' ? (
            <Button
              type="button"
              className="mt-4 h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
              onClick={openCreateDialog}
            >
              <Plus size={14} className="mr-1.5" />
              Add Tier
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-surface-elevated hover:bg-surface-elevated">
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[72px]')}>
                  Order
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'min-w-[220px]')}>
                  Tier
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[180px]')}>
                  Badge
                </TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, 'w-[120px]')}>
                  Type
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
              {filteredTiers.map((tier) => (
                <TierTableRow
                  key={tier.id}
                  tier={tier}
                  canManage={canManage}
                  onEdit={() => {
                    setEditingTier(tier);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(tier)}
                  onToggleActive={() => {
                    void updateTier(tier.id, { isActive: !tier.isActive });
                    NotificationMessage.success({
                      message: tier.isActive
                        ? 'Tier deactivated'
                        : 'Tier activated',
                      description: `${tier.name} is now ${
                        tier.isActive ? 'inactive' : 'active'
                      }.`,
                    });
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PartnerTierFormDialog
        open={formOpen && canManage}
        tier={editingTier}
        onOpenChange={setFormOpen}
        onSubmit={(values) => {
          if (editingTier) {
            void updateTier(editingTier.id, values).then(() => {
              NotificationMessage.success({
                message: 'Partner Tier Updated',
                description: `${values.name ?? editingTier.name} has been saved.`,
              });
            });
          } else {
            void createTier(values as CreatePartnerTierInput).then(
              (created) => {
                NotificationMessage.success({
                  message: 'Partner Tier Created',
                  description: `${created.name} is ready to assign to partners.`,
                });
              },
            );
          }
          setFormOpen(false);
          setEditingTier(null);
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete partner tier?</DialogTitle>
            <DialogDescription>
              This removes <strong>{deleteTarget?.name}</strong>. Partners that
              still use this tier will have their tier cleared.
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
                const name = deleteTarget.name;
                void deleteTier(deleteTarget.id)
                  .then(() => {
                    NotificationMessage.success({
                      message: 'Tier deleted',
                      description: `${name} has been removed.`,
                    });
                    setDeleteTarget(null);
                  })
                  .catch(() => {
                    NotificationMessage.error({
                      message: 'Failed to delete tier',
                      description: `Could not remove ${name}. Please try again.`,
                    });
                  });
              }}
            >
              Delete Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TierTableRow({
  tier,
  canManage,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  tier: PartnerTierDefinition;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <TableRow className={cn(!tier.isActive && 'opacity-70')}>
      <TableCell className={cn(TABLE_CELL_CLASS, 'tabular-nums')}>
        {tier.displayOrder}
      </TableCell>
      <TableCell className={cn(TABLE_CELL_CLASS, 'max-w-0')}>
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{tier.name}</p>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {tier.description || 'No description'}
        </p>
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border-2"
            style={{
              backgroundColor: tier.borderColor || tier.color || '#e2e8f0',
              borderColor: tier.borderColor || '#cbd5e1',
            }}
            title={tier.name}
          >
            <span
              className="size-3 rounded-full border border-white/80 shadow-sm"
              style={{
                backgroundColor: tier.color || tier.borderColor || '#94a3b8',
              }}
            />
          </span>
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: tier.color || undefined,
              borderColor: tier.borderColor || undefined,
              color: tier.borderColor ? undefined : undefined,
            }}
          >
            {tier.name}
          </Badge>
        </div>
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        <Badge variant="muted" className="rounded-full text-[10px]">
          Custom
        </Badge>
      </TableCell>
      <TableCell className={TABLE_CELL_CLASS}>
        <Badge
          variant="outline"
          className={cn(
            'rounded-full text-[10px]',
            tier.isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'text-muted-foreground',
          )}
        >
          {tier.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          TABLE_CELL_CLASS,
          'hidden text-muted-foreground sm:table-cell',
        )}
      >
        {formatTierDate(tier.updatedAt)}
      </TableCell>
      <TableCell className={cn(TABLE_CELL_CLASS, 'text-right')}>
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
              <DropdownMenuItem onClick={onEdit}>Edit tier</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {tier.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Delete tier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function PartnerTierFormDialog({
  open,
  tier,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  tier: PartnerTierDefinition | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreatePartnerTierInput & UpdatePartnerTierInput) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f8fafc');
  const [borderColor, setBorderColor] = useState('#e2e8f0');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  React.useEffect(() => {
    if (!open) return;
    setName(tier?.name ?? '');
    setDescription(tier?.description ?? '');
    setColor(tier?.color ?? '#f8fafc');
    setBorderColor(tier?.borderColor ?? '#e2e8f0');
    setDisplayOrder(String(tier?.displayOrder ?? 0));
    setIsActive(tier?.isActive ?? true);
  }, [open, tier]);

  const canSubmit = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tier ? 'Edit partner tier' : 'Add partner tier'}
          </DialogTitle>
          <DialogDescription>
            Tiers classify partners and drive badge colors in the partner list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Platinum"
              className="h-[31.5px] text-[12.25px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="h-[31.5px] text-[12.25px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">
              Display order
            </label>
            <Input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="h-[31.5px] text-[12.25px]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Badge colors
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  className={cn(
                    'size-6 rounded-full border-2',
                    color === preset.color && borderColor === preset.borderColor
                      ? 'border-foreground'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: preset.borderColor }}
                  onClick={() => {
                    setColor(preset.color);
                    setBorderColor(preset.borderColor);
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#f8fafc'}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-[31.5px] text-[12.25px]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Border
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(borderColor)
                        ? borderColor
                        : '#e2e8f0'
                    }
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <Input
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-[31.5px] text-[12.25px]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Badge
                variant="outline"
                className="rounded-full text-[11px]"
                style={{
                  backgroundColor: color || undefined,
                  borderColor: borderColor || undefined,
                }}
              >
                {name.trim() || 'Preview'}
              </Badge>
            </div>
          </div>
          {tier ? (
            <div className="flex h-[42px] items-center justify-between rounded-md border border-border px-3">
              <span className="text-[12.25px] font-medium text-foreground">
                Active
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          ) : null}
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
            className="bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                color: color.trim() || undefined,
                borderColor: borderColor.trim() || undefined,
                displayOrder: Number(displayOrder) || 0,
                isActive,
              });
            }}
          >
            {tier ? 'Save changes' : 'Create tier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
