'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  OpportunityTypeAppliesTo,
  OpportunityTypeCategory,
} from '@/store/server/features/opportunity-types/queries';
import {
  appliesToScopeLabel,
  appliesToScopeOptions,
  dealUiLabel,
  isLeadsEnabled,
  opportunityTypeCategoryLabel,
  opportunityTypeCategoryOptions,
} from '@/config/salesWorkflow';
import { SettingsRowActionsMenu } from '@/components/pipeline/SettingsRowActionsMenu';

export interface EntityTypeItem {
  id: string;
  name: string;
  description?: string | null;
  appliesTo?: OpportunityTypeAppliesTo;
  category?: OpportunityTypeCategory;
  usageCount?: number;
  usageDetail?: string;
}

export type EntityTypeWriteInput = {
  name: string;
  description?: string | null;
  appliesTo?: OpportunityTypeAppliesTo;
  category?: OpportunityTypeCategory;
};

interface EntityTypesSettingsTabProps {
  title?: string;
  description?: string;
  types: EntityTypeItem[];
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (input: EntityTypeWriteInput) => Promise<void>;
  onUpdate: (id: string, input: EntityTypeWriteInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EntityTypesSettingsTab({
  title = 'Opportunity Types',
  description = isLeadsEnabled()
    ? 'Define types for leads, deals, or both. Forms only show types that apply to that record.'
    : `Define types for ${dealUiLabel({ plural: true, lowercase: true })} and assign each to SD or BID. These categories drive the pipeline dashboard KPIs.`,
  types,
  isLoading = false,
  isSaving = false,
  onCreate,
  onUpdate,
  onDelete,
}: EntityTypesSettingsTabProps) {
  const showAppliesTo = isLeadsEnabled();
  const showCategory = !showAppliesTo;
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [appliesToInput, setAppliesToInput] =
    useState<OpportunityTypeAppliesTo>(showAppliesTo ? 'BOTH' : 'DEAL');
  const [categoryInput, setCategoryInput] =
    useState<OpportunityTypeCategory>('SD');
  const [editingType, setEditingType] = useState<EntityTypeItem | null>(null);
  const [deletingType, setDeletingType] = useState<EntityTypeItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetDialogs = () => {
    setNameInput('');
    setDescriptionInput('');
    setAppliesToInput(showAppliesTo ? 'BOTH' : 'DEAL');
    setCategoryInput('SD');
    setEditingType(null);
    setDeletingType(null);
    setError(null);
  };

  const buildWriteInput = (): EntityTypeWriteInput => ({
    name: nameInput.trim(),
    description: descriptionInput.trim() || null,
    appliesTo: showAppliesTo ? appliesToInput : 'DEAL',
    category: showCategory ? categoryInput : undefined,
  });

  const handleAdd = async () => {
    if (!nameInput.trim()) {
      setError('Type name is required.');
      return;
    }
    try {
      setError(null);
      await onCreate(buildWriteInput());
      setAddOpen(false);
      resetDialogs();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || 'Failed to add type.');
    }
  };

  const handleEdit = async () => {
    if (!editingType) return;
    if (!nameInput.trim()) {
      setError('Type name is required.');
      return;
    }
    try {
      setError(null);
      await onUpdate(editingType.id, buildWriteInput());
      setEditOpen(false);
      resetDialogs();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || 'Failed to update type.');
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      setError(null);
      await onDelete(deletingType.id);
      setDeleteOpen(false);
      resetDialogs();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || 'Failed to delete type.');
    }
  };

  const openEdit = (type: EntityTypeItem) => {
    setEditingType(type);
    setNameInput(type.name);
    setDescriptionInput(type.description ?? '');
    setAppliesToInput(type.appliesTo ?? (showAppliesTo ? 'BOTH' : 'DEAL'));
    setCategoryInput(type.category ?? 'SD');
    setError(null);
    setEditOpen(true);
  };

  const openDelete = (type: EntityTypeItem) => {
    setDeletingType(type);
    setError(null);
    setDeleteOpen(true);
  };

  const typeFormFields = (
    <>
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium">Name</Label>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="e.g. Enterprise"
          className="border-border"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium">Description</Label>
        <Textarea
          value={descriptionInput}
          onChange={(e) => setDescriptionInput(e.target.value)}
          placeholder="Optional helper text for your team"
          className="min-h-[80px] resize-none border-border"
        />
      </div>
      {showCategory ? (
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Category</Label>
          <Select
            value={categoryInput}
            onValueChange={(v: OpportunityTypeCategory) => setCategoryInput(v)}
          >
            <SelectTrigger className="border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opportunityTypeCategoryOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {showAppliesTo ? (
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Applies to</Label>
          <Select
            value={appliesToInput}
            onValueChange={(v: OpportunityTypeAppliesTo) =>
              setAppliesToInput(v)
            }
          >
            <SelectTrigger className="border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {appliesToScopeOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {description}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand-hover"
          onClick={() => {
            resetDialogs();
            setAddOpen(true);
          }}
        >
          <Plus size={14} className="mr-1.5" />
          Add type
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading types…</p>
        ) : types.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No types yet. Add one to show a type field on{' '}
            {dealUiLabel({ plural: true, lowercase: true })} forms.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {types.map((type) => {
              const scope = type.appliesTo ?? 'BOTH';
              const inUse = (type.usageCount ?? 0) > 0;
              const subtitleParts: string[] = [];
              if (showCategory) {
                subtitleParts.push(
                  opportunityTypeCategoryLabel(type.category ?? 'SD'),
                );
              }
              if (showAppliesTo) subtitleParts.push(appliesToScopeLabel(scope));
              if (type.description?.trim()) {
                subtitleParts.push(type.description.trim());
              } else if (type.usageDetail) {
                subtitleParts.push(type.usageDetail);
              } else if (inUse) {
                subtitleParts.push(
                  `Used by ${type.usageCount} record${type.usageCount === 1 ? '' : 's'}`,
                );
              }

              return (
                <li
                  key={type.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {type.name}
                    </p>
                    {subtitleParts.length > 0 ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {subtitleParts.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative z-10 flex w-10 shrink-0 items-center justify-end">
                    <SettingsRowActionsMenu
                      onEdit={() => openEdit(type)}
                      onDelete={() => openDelete(type)}
                      deleteDisabled={inUse}
                      deleteDisabledReason="Cannot delete while in use"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add type</DialogTitle>
            <DialogDescription>
              {showAppliesTo
                ? 'Choose whether this type appears on lead forms, deal forms, or both.'
                : `Create a type for ${dealUiLabel({ plural: true, lowercase: true })}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">{typeFormFields}</div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => void handleAdd()}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Add type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">{typeFormFields}</div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              onClick={() => void handleEdit()}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) resetDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingType?.name}
              &rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isSaving}
            >
              {isSaving ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
