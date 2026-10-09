'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Pencil, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { CustomFieldConfig } from '@/modules/custom-fields/types';
import { getFieldDefinition } from '@/modules/custom-fields/constants';
import type { EntityFieldValueRow } from '@/store/server/features/entity-fields/values';
import { useUpdateEntityFieldResponsibility } from '@/store/server/features/entity-fields/values';
import type { BackendEntityType } from '@/store/server/features/entity-fields/types';
import { EntityCustomFieldsForm } from '@/components/pipeline/EntityCustomFieldsForm';
import {
  extractCustomFieldEntityIds,
  formatCustomFieldFileEntries,
  formatCustomFieldListItems,
} from '@/lib/pipeline/format-custom-field-value';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';

const USERS_FILTER = { page: 1, pageSize: 500 } as const;

function StatusBadge({
  status,
}: {
  status: 'pending' | 'completed' | 'overdue';
}) {
  const label =
    status === 'completed'
      ? 'Completed'
      : status === 'overdue'
        ? 'Overdue'
        : 'Pending';
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'overdue'
        ? 'danger'
        : 'muted';

  return (
    <Badge variant={variant} className="px-2 py-0 text-[10px]">
      {label}
    </Badge>
  );
}

function metaAssigneeIds(meta?: EntityFieldValueRow | null): string[] {
  if (!meta) return [];
  if (
    Array.isArray(meta.responsibleUserIds) &&
    meta.responsibleUserIds.length
  ) {
    return [...new Set(meta.responsibleUserIds.filter(Boolean))];
  }
  return meta.responsibleUserId ? [meta.responsibleUserId] : [];
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

function resolveRowPermissions(input: {
  currentUserId?: string | null;
  ownerUserId?: string | null;
  meta?: EntityFieldValueRow | null;
  canEditCustomFields: boolean;
  allowResponsibleAssignee?: boolean;
  allowDueDate?: boolean;
}) {
  const assigneeIds = metaAssigneeIds(input.meta);
  const isFieldAssignee = Boolean(
    input.currentUserId && assigneeIds.includes(input.currentUserId),
  );
  const canEditResponsible =
    input.canEditCustomFields && Boolean(input.allowResponsibleAssignee);
  const canEditDue = input.canEditCustomFields && Boolean(input.allowDueDate);
  const canEditValue = input.canEditCustomFields || isFieldAssignee;
  return {
    canEditResponsible,
    canEditDue,
    canEditValue,
    canEditRow: canEditResponsible || canEditDue || canEditValue,
  };
}

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusAccentClass(status: 'pending' | 'completed' | 'overdue') {
  if (status === 'completed') return 'border-l-emerald-500';
  if (status === 'overdue') return 'border-l-destructive';
  return 'border-l-amber-400';
}

function MetaItem({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = icon;

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0">
        <span className="text-[11px] text-muted-foreground">{label}: </span>
        <span className="text-sm text-foreground">{children}</span>
      </div>
    </div>
  );
}

function CustomFieldValueDisplay({
  value,
  fieldType,
  options,
  usersById,
}: {
  value: unknown;
  fieldType: string;
  options?: Array<{ label: string; value: string }>;
  usersById: Map<string, { label: string; avatarUrl: string | null }>;
}) {
  const normalizedType = fieldType.toUpperCase();

  if (normalizedType === 'FILE') {
    const files = formatCustomFieldFileEntries(value);
    if (!files.length) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <ul className="space-y-1.5">
        {files.map((file, index) => (
          <li key={`${file.name}-${file.url ?? index}`}>
            {file.url ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand hover:underline"
              >
                {file.name}
              </a>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {file.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (normalizedType === 'USER') {
    const userIds = extractCustomFieldEntityIds(value);
    if (!userIds.length) {
      return <span className="text-muted-foreground">—</span>;
    }
    return <AssigneeAvatars userIds={userIds} usersById={usersById} />;
  }

  const items = formatCustomFieldListItems(value, normalizedType, options);

  if (!items.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (items.length === 1) {
    return (
      <span className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {items[0]}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className="h-auto max-w-full whitespace-normal px-2 py-0.5 text-xs font-normal leading-snug"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function AssigneeAvatars({
  userIds,
  usersById,
}: {
  userIds: string[];
  usersById: Map<string, { label: string; avatarUrl: string | null }>;
}) {
  if (!userIds.length) {
    return <span className="text-sm text-muted-foreground">Unassigned</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <AvatarGroup className="-space-x-1.5">
        {userIds.slice(0, 3).map((id) => {
          const u = usersById.get(id);
          const label = u?.label ?? id;
          const color = avatarColor(label);
          return (
            <Avatar
              key={id}
              size="sm"
              className="size-5 ring-1 ring-background"
              title={label}
            >
              {u?.avatarUrl ? (
                <AvatarImage src={u.avatarUrl} alt={label} />
              ) : null}
              <AvatarFallback
                className={cn('text-[8px] font-semibold', color.bg, color.text)}
              >
                {getInitials(label)}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {userIds.length > 3 ? (
          <AvatarGroupCount className="size-5 text-[8px]">
            +{userIds.length - 3}
          </AvatarGroupCount>
        ) : null}
      </AvatarGroup>
      <span className="truncate text-sm text-foreground">
        {userIds
          .slice(0, 2)
          .map((id) => usersById.get(id)?.label ?? id)
          .join(', ')}
        {userIds.length > 2 ? ` +${userIds.length - 2}` : ''}
      </span>
    </span>
  );
}

function AssigneePicker({
  users,
  selectedIds,
  disabled,
  onChange,
}: {
  users: Array<{ id: string; label: string; avatarUrl: string | null }>;
  selectedIds: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-md border border-border bg-background p-1.5">
      {users.map((u) => {
        const checked = selectedIds.includes(u.id);
        const color = avatarColor(u.label);
        return (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
          >
            <input
              type="checkbox"
              className="size-3.5 accent-brand"
              disabled={disabled}
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? selectedIds.filter((id) => id !== u.id)
                    : [...selectedIds, u.id],
                )
              }
            />
            <Avatar size="sm" className="size-5">
              {u.avatarUrl ? (
                <AvatarImage src={u.avatarUrl} alt={u.label} />
              ) : null}
              <AvatarFallback
                className={cn('text-[8px] font-semibold', color.bg, color.text)}
              >
                {getInitials(u.label)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{u.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function OpportunityCustomFieldsList({
  fields,
  values,
  valueRows,
  ownerUserId,
  entityType,
  entityId,
  currentUserId,
  canEditCustomFields = false,
  pageEditing = false,
  onChange,
  onSaveValue,
  embedded = false,
  className,
}: {
  fields: CustomFieldConfig[];
  values: Record<string, unknown>;
  valueRows?: EntityFieldValueRow[] | null;
  /** Kept for callers; display uses explicit assignees only. */
  ownerName?: string | null;
  ownerUserId?: string | null;
  entityType?: BackendEntityType;
  entityId?: string;
  currentUserId?: string | null;
  canEditCustomFields?: boolean;
  /** When true (page-level edit), editable values render as inputs. */
  pageEditing?: boolean;
  onChange: (fieldId: string, value: unknown) => void;
  onSaveValue?: (
    fieldId: string,
    value: unknown,
  ) => void | boolean | Promise<void | boolean>;
  /** When true, render flush inside a parent DetailSection (no inner card border). */
  embedded?: boolean;
  className?: string;
}) {
  const usersQuery = useGetPlatformUsers(USERS_FILTER);
  const updateResponsibility = useUpdateEntityFieldResponsibility();
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<unknown>(null);
  const [draftUserIds, setDraftUserIds] = useState<string[]>([]);
  const [draftDueAt, setDraftDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const users = useMemo(() => {
    return (usersQuery.data?.data ?? [])
      .filter((u) => Boolean(u?.id))
      .map((u) => ({
        id: u.id,
        label: formatUserName(u) || u.email || u.id,
        avatarUrl: u.avatarUrl ?? null,
      }));
  }, [usersQuery.data]);

  const usersById = useMemo(() => {
    const map = new Map<string, { label: string; avatarUrl: string | null }>();
    for (const u of users)
      map.set(u.id, { label: u.label, avatarUrl: u.avatarUrl });
    return map;
  }, [users]);

  const startEdit = (field: CustomFieldConfig) => {
    const meta = valueRows?.find((v) => v.entityFieldId === field.id);
    setEditingFieldId(field.id);
    setDraftValue(values[field.id]);
    setDraftUserIds(metaAssigneeIds(meta));
    setDraftDueAt(meta?.dueAt ? String(meta.dueAt).slice(0, 10) : '');
  };

  const cancelEdit = () => {
    setEditingFieldId(null);
    setDraftValue(null);
    setDraftUserIds([]);
    setDraftDueAt('');
  };

  const saveRow = async (field: CustomFieldConfig) => {
    const meta = valueRows?.find((v) => v.entityFieldId === field.id);
    const perms = resolveRowPermissions({
      currentUserId,
      ownerUserId,
      meta,
      canEditCustomFields,
      allowResponsibleAssignee: Boolean(
        field.settings?.allowResponsibleAssignee,
      ),
      allowDueDate: Boolean(field.settings?.allowDueDate),
    });

    setSaving(true);
    try {
      if (perms.canEditValue) {
        const saved = await onSaveValue?.(field.id, draftValue);
        if (saved === false) {
          return;
        }
        onChange(field.id, draftValue);
      }

      if (
        entityType &&
        entityId &&
        (perms.canEditResponsible || perms.canEditDue)
      ) {
        const payload: {
          entityType: BackendEntityType;
          entityId: string;
          entityFieldId: string;
          responsibleUserIds?: string[];
          dueAt?: string | null;
        } = {
          entityType,
          entityId,
          entityFieldId: field.id,
        };
        if (perms.canEditResponsible) {
          payload.responsibleUserIds = draftUserIds;
        }
        if (perms.canEditDue) {
          payload.dueAt = draftDueAt ? `${draftDueAt}T23:59:59.000Z` : null;
        }
        await updateResponsibility.mutateAsync(payload);
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  if (!fields.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No requirements configured for this stage.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'divide-y divide-border',
        embedded
          ? 'overflow-hidden'
          : 'overflow-hidden rounded-lg border border-border bg-background/40',
        className,
      )}
    >
      {fields.map((field) => {
        const meta = valueRows?.find((v) => v.entityFieldId === field.id);
        const assigneeIds = metaAssigneeIds(meta);
        const dueAt = meta?.dueAt ? String(meta.dueAt).slice(0, 10) : '';
        const dueLabel = dueAt ? formatDisplayDate(dueAt) : '—';
        const enteredAt = meta?.valueEnteredAt
          ? String(meta.valueEnteredAt).slice(0, 10)
          : '';
        const enteredLabel = enteredAt ? formatDisplayDate(enteredAt) : '—';
        const status =
          meta?.completionStatus ?? (meta?.isOverdue ? 'overdue' : 'pending');
        const isRowEditing = editingFieldId === field.id;
        const perms = resolveRowPermissions({
          currentUserId,
          ownerUserId,
          meta,
          canEditCustomFields,
          allowResponsibleAssignee: Boolean(
            field.settings?.allowResponsibleAssignee,
          ),
          allowDueDate: Boolean(field.settings?.allowDueDate),
        });
        const { canEditResponsible, canEditDue, canEditValue, canEditRow } =
          perms;
        const showPageValueEdit =
          pageEditing && canEditValue && !isRowEditing && !field.readOnly;
        const showRowValueEdit = isRowEditing && canEditValue;
        const displayAssigneeIds = isRowEditing ? draftUserIds : assigneeIds;
        const fieldDef = getFieldDefinition(field.type);
        const FieldIcon = fieldDef?.icon;
        const showAssignees =
          Boolean(field.settings?.allowResponsibleAssignee) ||
          displayAssigneeIds.length > 0;
        const showDue =
          Boolean(field.settings?.allowDueDate) ||
          Boolean(dueAt) ||
          isRowEditing;
        const showMeta = showAssignees || showDue || enteredLabel !== '—';

        return (
          <article
            key={field.id}
            className={cn(
              'group border-l-[3px] bg-surface-card/30 px-4 py-4 transition-colors sm:px-5',
              statusAccentClass(status),
              (isRowEditing || showPageValueEdit) &&
                'bg-surface-card ring-inset ring-1 ring-brand/15',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {FieldIcon ? (
                  <div
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: fieldDef
                        ? `${fieldDef.color}18`
                        : undefined,
                      color: fieldDef?.color,
                    }}
                  >
                    <FieldIcon className="size-3.5" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h4 className="text-sm font-medium text-foreground">
                      {field.label}
                      {field.required ? (
                        <span className="ml-0.5 text-destructive">*</span>
                      ) : null}
                    </h4>
                    <StatusBadge status={status} />
                  </div>
                  {field.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {field.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {canEditRow ? (
                <div className="flex shrink-0 items-center gap-1">
                  {isRowEditing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={saving}
                        onClick={cancelEdit}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 px-2.5 text-xs"
                        disabled={saving}
                        onClick={() => void saveRow(field)}
                      >
                        <Check className="size-3.5" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
                        pageEditing
                          ? 'opacity-100'
                          : 'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                      )}
                      onClick={() => startEdit(field)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-3 pl-0 sm:pl-10">
              {showRowValueEdit ? (
                <EntityCustomFieldsForm
                  className="!space-y-0"
                  hideLabels
                  fields={[{ ...field, readOnly: false }]}
                  values={{ [field.id]: draftValue }}
                  onChange={(fieldId, value) => {
                    void fieldId;
                    setDraftValue(value);
                  }}
                />
              ) : showPageValueEdit ? (
                <EntityCustomFieldsForm
                  className="!space-y-0"
                  hideLabels
                  fields={[{ ...field, readOnly: false }]}
                  values={{ [field.id]: values[field.id] }}
                  onChange={(fieldId, value) => onChange(fieldId, value)}
                />
              ) : (
                <div
                  className={cn(
                    'rounded-md px-3 py-2 text-sm',
                    values[field.id] != null &&
                      values[field.id] !== '' &&
                      String(values[field.id]).length > 0
                      ? 'bg-muted/20'
                      : 'bg-muted/10 text-muted-foreground',
                  )}
                >
                  <CustomFieldValueDisplay
                    value={values[field.id]}
                    fieldType={String(field.type || 'text')}
                    options={field.options?.map((o) => ({
                      label: o.label,
                      value: o.value || o.label,
                    }))}
                    usersById={usersById}
                  />
                </div>
              )}

              {showMeta ? (
                <div
                  className={cn(
                    'mt-3 border-t border-border/60 pt-3',
                    isRowEditing
                      ? 'space-y-3'
                      : 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2',
                  )}
                >
                  {showAssignees ? (
                    isRowEditing && canEditResponsible ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Assigned to
                          </span>
                        </div>
                        <AssigneePicker
                          users={users}
                          selectedIds={draftUserIds}
                          disabled={saving}
                          onChange={setDraftUserIds}
                        />
                      </div>
                    ) : (
                      <MetaItem icon={Users} label="Assigned to">
                        <AssigneeAvatars
                          userIds={displayAssigneeIds}
                          usersById={usersById}
                        />
                      </MetaItem>
                    )
                  ) : null}

                  {showDue ? (
                    isRowEditing && canEditDue ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Due date
                          </span>
                        </div>
                        <Input
                          type="date"
                          className="h-8 max-w-[180px] text-sm"
                          disabled={saving}
                          value={draftDueAt}
                          onChange={(e) => setDraftDueAt(e.target.value)}
                        />
                      </div>
                    ) : (
                      <MetaItem icon={CalendarDays} label="Due date">
                        <span
                          className={cn(
                            dueLabel === '—'
                              ? 'text-muted-foreground'
                              : status === 'overdue'
                                ? 'font-medium text-destructive'
                                : undefined,
                          )}
                        >
                          {dueLabel}
                        </span>
                      </MetaItem>
                    )
                  ) : null}

                  {enteredLabel !== '—' ? (
                    <MetaItem icon={Clock3} label="Completed on">
                      {enteredLabel}
                    </MetaItem>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
