'use client';

import {
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
} from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { EntityFieldValueRow } from '@/store/server/features/entity-fields/values';
import { useUpdateEntityFieldResponsibility } from '@/store/server/features/entity-fields/values';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';

const USERS_FILTER = { page: 1, pageSize: 500 } as const;

export function addDaysIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function resolveFieldDefaultDueDays(
  defaultDueDays?: number | null,
): number | null {
  return typeof defaultDueDays === 'number' &&
    Number.isFinite(defaultDueDays) &&
    defaultDueDays >= 0
    ? Math.floor(defaultDueDays)
    : null;
}

export type FieldResponsibilityDraft = {
  /** @deprecated Prefer responsibleUserIds */
  responsibleUserId?: string | null;
  responsibleUserIds: string[];
  dueAt: string;
};

export type AssignableField = {
  id: string;
  label: string;
  defaultDueDays?: number | null;
  allowResponsibleAssignee?: boolean;
  allowDueDate?: boolean;
  meta?: EntityFieldValueRow | null;
};

export function fieldAllowsAssign(field: {
  allowResponsibleAssignee?: boolean;
  allowDueDate?: boolean;
}): boolean {
  return Boolean(field.allowResponsibleAssignee) || Boolean(field.allowDueDate);
}

function normalizeDraftUserIds(
  draft?: FieldResponsibilityDraft | null,
): string[] {
  if (!draft) return [];
  if (
    Array.isArray(draft.responsibleUserIds) &&
    draft.responsibleUserIds.length
  ) {
    return [...new Set(draft.responsibleUserIds.filter(Boolean))];
  }
  return draft.responsibleUserId ? [draft.responsibleUserId] : [];
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

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
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

/**
 * layout="section": Assign sits with custom fields (create opportunity uses
 * per-field + when draft mode is on). Pass className / omit sectionTitle to
 * keep fields inline with the parent form card.
 */
export function FieldResponsibilityAssign({
  fields,
  entityType,
  entityId,
  canEdit,
  canReassign: canReassignProp,
  canEditDueAt: canEditDueAtProp,
  committedDrafts,
  onCommitDrafts,
  className,
  layout = 'default',
  sectionTitle,
  sectionDescription,
  children,
}: {
  fields: AssignableField[];
  entityType?: BackendEntityType;
  entityId?: string;
  canEdit?: boolean;
  canReassign?: boolean;
  canEditDueAt?: boolean;
  /** Kept for callers; assignment no longer defaults to opportunity owner. */
  ownerName?: string | null;
  /** Kept for callers; assignment no longer defaults to opportunity owner. */
  ownerUserId?: string | null;
  committedDrafts?: Record<string, FieldResponsibilityDraft>;
  onCommitDrafts?: (next: Record<string, FieldResponsibilityDraft>) => void;
  className?: string;
  layout?: 'default' | 'section';
  sectionTitle?: string;
  sectionDescription?: string;
  children?: ReactNode;
}) {
  const isDraftMode = typeof onCommitDrafts === 'function';
  const perFieldAssign = isDraftMode && layout === 'section';
  const canReassign = canReassignProp ?? Boolean(canEdit);
  const canEditDueAt = canEditDueAtProp ?? Boolean(canEdit);
  const canChangeAnything = canReassign || canEditDueAt || isDraftMode;

  const usersQuery = useGetPlatformUsers(USERS_FILTER);
  const updateResponsibility = useUpdateEntityFieldResponsibility();

  const [expanded, setExpanded] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [localUserIds, setLocalUserIds] = useState<string[]>([]);
  const [localDueAt, setLocalDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const users = useMemo(() => {
    const list = usersQuery.data?.data ?? [];
    return list
      .filter((u) => Boolean(u?.id))
      .map((u) => ({
        id: u.id,
        label: formatUserName(u) || u.email || u.id,
        avatarUrl: u.avatarUrl ?? null,
      }));
  }, [usersQuery.data]);

  const usersById = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    return map;
  }, [users]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const selectedAllowsResponsible = Boolean(
    selectedField?.allowResponsibleAssignee,
  );
  const selectedAllowsDue = Boolean(selectedField?.allowDueDate);

  const selectedHasPriorAssignment = Boolean(
    selectedFieldId &&
      (normalizeDraftUserIds(committedDrafts?.[selectedFieldId]).length > 0 ||
        selectedField?.meta?.responsibleUserId ||
        (selectedField?.meta?.responsibleUserIds?.length ?? 0) > 0 ||
        selectedField?.meta?.dueAt),
  );

  const loadFieldIntoLocal = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) {
      setLocalUserIds([]);
      setLocalDueAt('');
      return;
    }
    const committed = committedDrafts?.[field.id];
    const fromDraft = normalizeDraftUserIds(committed);
    const fromMeta = Array.isArray(field.meta?.responsibleUserIds)
      ? field.meta!.responsibleUserIds!.filter(Boolean)
      : field.meta?.responsibleUserId
        ? [field.meta.responsibleUserId]
        : [];
    const due =
      committed?.dueAt ||
      (field.meta?.dueAt ? String(field.meta.dueAt).slice(0, 10) : '') ||
      '';
    setLocalUserIds(fromDraft.length ? fromDraft : fromMeta);
    setLocalDueAt(due);
  };

  const openEditor = (fieldId?: string) => {
    const assignable = fields.filter(fieldAllowsAssign);
    const initialId =
      fieldId || (assignable.length === 1 ? assignable[0]!.id : '');
    setSelectedFieldId(initialId);
    if (initialId) loadFieldIntoLocal(initialId);
    else {
      setLocalUserIds([]);
      setLocalDueAt('');
    }
    setExpanded(true);
  };

  const closeDiscard = () => {
    setSelectedFieldId('');
    setLocalUserIds([]);
    setLocalDueAt('');
    setExpanded(false);
  };

  const save = async () => {
    if (!selectedFieldId) return;
    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;

    const allowResponsible = Boolean(field.allowResponsibleAssignee);
    const allowDue = Boolean(field.allowDueDate);
    if (!allowResponsible && !allowDue) return;

    const due = localDueAt.trim();
    const nextUserIds = allowResponsible
      ? [...new Set(localUserIds.filter(Boolean))]
      : [];
    const nextDue = allowDue ? due : '';

    if (isDraftMode) {
      onCommitDrafts?.({
        ...(committedDrafts ?? {}),
        [selectedFieldId]: {
          responsibleUserIds: nextUserIds,
          responsibleUserId: nextUserIds[0] ?? null,
          dueAt: nextDue,
        },
      });
      setExpanded(false);
      setSelectedFieldId('');
      return;
    }

    if (!entityType || !entityId || !canChangeAnything) return;
    setSaving(true);
    try {
      const payload: {
        entityType: BackendEntityType;
        entityId: string;
        entityFieldId: string;
        responsibleUserIds?: string[];
        dueAt?: string | null;
      } = {
        entityType,
        entityId,
        entityFieldId: selectedFieldId,
      };
      if (canReassign && allowResponsible) {
        payload.responsibleUserIds = nextUserIds;
      }
      if (canEditDueAt && allowDue) {
        payload.dueAt = nextDue ? `${nextDue}T23:59:59.000Z` : null;
      }
      await updateResponsibility.mutateAsync(payload);
      setExpanded(false);
      setSelectedFieldId('');
    } finally {
      setSaving(false);
    }
  };

  const clearAssignment = (fieldId: string) => {
    if (!isDraftMode) return;
    const next = { ...(committedDrafts ?? {}) };
    delete next[fieldId];
    onCommitDrafts?.(next);
    if (selectedFieldId === fieldId) closeDiscard();
  };

  const toggleLocalUser = (userId: string) => {
    setLocalUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  if (!fields.length || !canChangeAnything) {
    if (layout === 'section' && children) {
      return <div className={cn(className)}>{children}</div>;
    }
    return null;
  }

  const responsibilityFields = (
    <div
      className={cn(
        'grid gap-2.5',
        selectedAllowsResponsible && selectedAllowsDue && 'sm:grid-cols-2',
      )}
    >
      {selectedAllowsResponsible ? (
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Responsible</Label>
          {canReassign || isDraftMode ? (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
              {users.length === 0 ? (
                <p className="px-1 py-1.5 text-[11px] text-muted-foreground">
                  No users available
                </p>
              ) : (
                users.map((u) => {
                  const checked = localUserIds.includes(u.id);
                  const color = avatarColor(u.label);
                  return (
                    <label
                      key={u.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/50',
                        checked && 'bg-muted/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 accent-brand"
                        disabled={
                          !selectedFieldId ||
                          saving ||
                          updateResponsibility.isLoading
                        }
                        checked={checked}
                        onChange={() => toggleLocalUser(u.id)}
                      />
                      <Avatar size="sm" className="size-5">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} alt={u.label} />
                        ) : null}
                        <AvatarFallback
                          className={cn(
                            'text-[9px] font-semibold',
                            color.bg,
                            color.text,
                          )}
                        >
                          {getInitials(u.label)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{u.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          ) : (
            <p className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-2 text-xs font-medium">
              {localUserIds.length
                ? localUserIds
                    .map((id) => usersById.get(id)?.label ?? id)
                    .join(', ')
                : 'Unassigned'}
            </p>
          )}
        </div>
      ) : null}
      {selectedAllowsDue ? (
        <div className="space-y-1">
          <Label className="text-xs">Due date</Label>
          {canEditDueAt || isDraftMode ? (
            <Input
              type="date"
              className="h-9 text-xs"
              disabled={
                !selectedFieldId || saving || updateResponsibility.isLoading
              }
              value={localDueAt}
              onChange={(e) => setLocalDueAt(e.target.value)}
            />
          ) : (
            <p className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-2 text-xs font-medium">
              {localDueAt
                ? new Date(`${localDueAt}T00:00:00`).toLocaleDateString()
                : 'No due date'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );

  const editorActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 text-xs"
        disabled={saving}
        onClick={closeDiscard}
      >
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs font-medium"
        disabled={!selectedFieldId || saving || updateResponsibility.isLoading}
        onClick={() => void save()}
      >
        <Check className="size-3.5" />
        Save
      </Button>
    </div>
  );

  const assignableFields = fields.filter(fieldAllowsAssign);

  const perFieldEditor =
    expanded && selectedFieldId ? (
      <div className="space-y-3 rounded-lg border border-border bg-background p-3 shadow-sm">
        {responsibilityFields}
        {editorActions}
      </div>
    ) : null;

  const sharedEditor = expanded ? (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold text-foreground">
            {selectedHasPriorAssignment
              ? 'Update assignment'
              : 'Assign who fills a custom field'}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={closeDiscard}
          aria-label="Close assignment"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Custom field</Label>
        <Select
          disabled={saving || updateResponsibility.isLoading}
          value={selectedFieldId || undefined}
          onValueChange={(id) => {
            setSelectedFieldId(id);
            loadFieldIntoLocal(id);
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select a custom field" />
          </SelectTrigger>
          <SelectContent>
            {assignableFields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {responsibilityFields}
      {editorActions}
    </div>
  ) : null;

  const assignButton =
    !expanded && assignableFields.length > 0 ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 border-border/80 bg-background px-2.5 text-[11px] font-semibold shadow-sm"
        onClick={() => openEditor()}
      >
        <Plus className="size-3.5" />
      </Button>
    ) : null;

  if (layout === 'section' && perFieldAssign) {
    const enhancedChildren =
      isValidElement(children) && children
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            renderFieldAction: (field: { id: string; label: string }) => {
              const assignable = fields.find((f) => f.id === field.id);
              if (!assignable || !fieldAllowsAssign(assignable)) return null;

              const draft = committedDrafts?.[field.id];
              const assigneeIds = normalizeDraftUserIds(draft);
              const isOpen = expanded && selectedFieldId === field.id;
              const hasDraft = Boolean(
                draft &&
                  (assigneeIds.length > 0 ||
                    (draft.dueAt && draft.dueAt.trim())),
              );

              return (
                <div className="flex items-center gap-1.5">
                  {hasDraft && assigneeIds.length > 0 && !isOpen ? (
                    <button
                      type="button"
                      className="shrink-0"
                      title="Clear assignment"
                      onClick={() => clearAssignment(field.id)}
                    >
                      <AvatarGroup className="-space-x-1.5">
                        {assigneeIds.slice(0, 3).map((id) => {
                          const u = usersById.get(id);
                          const label = u?.label ?? id;
                          const color = avatarColor(label);
                          return (
                            <Avatar
                              key={id}
                              size="sm"
                              className="size-6 ring-1 ring-background"
                              title={label}
                            >
                              {u?.avatarUrl ? (
                                <AvatarImage src={u.avatarUrl} alt={label} />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  'text-[9px] font-semibold',
                                  color.bg,
                                  color.text,
                                )}
                              >
                                {getInitials(label)}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                        {assigneeIds.length > 3 ? (
                          <AvatarGroupCount className="size-6 text-[9px]">
                            +{assigneeIds.length - 3}
                          </AvatarGroupCount>
                        ) : null}
                      </AvatarGroup>
                    </button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="size-7 border-border/80 bg-background shadow-sm"
                    aria-label={hasDraft ? 'Edit assignment' : 'Assign'}
                    onClick={() => {
                      if (isOpen) closeDiscard();
                      else openEditor(field.id);
                    }}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              );
            },
            renderAfterField: (field: { id: string }) =>
              expanded && selectedFieldId === field.id ? perFieldEditor : null,
          })
        : children;

    const hasSectionChrome = Boolean(sectionTitle);
    return (
      <div
        className={cn(
          hasSectionChrome &&
            'space-y-3 rounded-lg border border-border/70 bg-muted/15 p-3',
          className,
        )}
      >
        {sectionTitle ? (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {sectionTitle}
          </h3>
        ) : null}
        {enhancedChildren}
      </div>
    );
  }

  if (layout === 'section') {
    return (
      <div
        className={cn(
          'space-y-3 rounded-lg border border-border/70 bg-muted/15 p-3',
          className,
        )}
      >
        {sectionTitle ? (
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {sectionTitle}
            </h3>
            {sectionDescription ? (
              <p className="text-[11px] text-muted-foreground">
                {sectionDescription}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
        <div className="flex justify-end pt-1">{assignButton}</div>
        {sharedEditor}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {children}
      <div className="flex justify-end">{assignButton}</div>
      {sharedEditor}
    </div>
  );
}

export function FieldResponsibilityControls({
  entityType,
  entityId,
  entityFieldId,
  fieldLabel,
  meta,
  canEdit,
  canReassign,
  canEditDueAt,
  ownerName,
  ownerUserId,
  defaultDueDays,
  draftValue,
  onDraftChange,
  className,
}: {
  entityType?: BackendEntityType;
  entityId?: string;
  entityFieldId: string;
  fieldLabel: string;
  meta?: EntityFieldValueRow | null;
  canEdit?: boolean;
  canReassign?: boolean;
  canEditDueAt?: boolean;
  ownerName?: string | null;
  ownerUserId?: string | null;
  defaultDueDays?: number | null;
  draftValue?: FieldResponsibilityDraft;
  onDraftChange?: (next: FieldResponsibilityDraft) => void;
  className?: string;
}) {
  return (
    <FieldResponsibilityAssign
      fields={[
        {
          id: entityFieldId,
          label: fieldLabel,
          defaultDueDays,
          allowResponsibleAssignee: true,
          allowDueDate: true,
          meta,
        },
      ]}
      entityType={entityType}
      entityId={entityId}
      canEdit={canEdit}
      canReassign={canReassign}
      canEditDueAt={canEditDueAt}
      ownerName={ownerName}
      ownerUserId={ownerUserId}
      committedDrafts={
        draftValue
          ? {
              [entityFieldId]: {
                responsibleUserIds: normalizeDraftUserIds(draftValue),
                responsibleUserId: normalizeDraftUserIds(draftValue)[0] ?? null,
                dueAt: draftValue.dueAt ?? '',
              },
            }
          : undefined
      }
      onCommitDrafts={
        onDraftChange
          ? (next) => {
              const draft = next[entityFieldId];
              if (draft) onDraftChange(draft);
            }
          : undefined
      }
      className={className}
    />
  );
}
