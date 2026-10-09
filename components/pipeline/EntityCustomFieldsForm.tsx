'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronsUpDown,
  FileIcon,
  Hash,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import type { CustomFieldConfig } from '@/modules/custom-fields/types';
import {
  fieldHasValueDescription,
  unwrapFieldDescription,
  unwrapFieldValue,
  wrapFieldValue,
} from '@/modules/custom-fields/field-value-with-description';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { fileUpload } from '@/utils/fileUpload';
import { resolveFileServerUploadUrl } from '@/utils/resolveFileServerUploadUrl';
import { extractUploadErrorMessage } from '@/utils/extractUploadErrorMessage';
import { DEFAULT_FILE_UPLOAD_MAX_MB } from '@/utils/constants';
import {
  commitNumericFieldInput,
  formatNumericFieldDisplay,
  numericFieldHint,
  numericFieldPlaceholder,
  validateNumericFieldInput,
  type NumericFieldType,
} from '@/modules/custom-fields/numeric-field.util';

interface EntityCustomFieldsFormProps {
  fields: CustomFieldConfig[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  className?: string;
  /** Action on the right of the field control (e.g. + Assign beside the input). */
  renderFieldAction?: (field: CustomFieldConfig) => React.ReactNode;
  /** Optional slot under each field control (e.g. expanded assign panel). */
  renderAfterField?: (field: CustomFieldConfig) => React.ReactNode;
  /** Hide field labels (e.g. when label is shown in an outer list column). */
  hideLabels?: boolean;
}

interface OptionItem {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string | null;
}

type BindingOptionCatalogs = {
  usersById: Map<string, OptionItem>;
  teamsById: Map<string, OptionItem>;
  departmentsById: Map<string, OptionItem>;
};

function FieldLabel({ field }: { field: CustomFieldConfig }) {
  return (
    <Label className="text-xs font-medium text-muted-foreground">
      {field.label}
      {field.required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

function ValueDescriptionInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
      <Label className="text-[11px] font-medium text-muted-foreground">
        Additional details
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder="Provide more context for your selection…"
        disabled={disabled}
        rows={2}
        className="mt-1.5 min-h-[56px] resize-none border-border/60 bg-white text-sm dark:bg-surface-card"
      />
    </div>
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v)).filter(Boolean);
        }
      } catch {
        // fall through — treat as a single scalar string
      }
    }
    return [value];
  }
  return [String(value)];
}

function initials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function OptionAvatar({
  label,
  avatarUrl,
  size = 'sm',
}: {
  label: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'size-5' : 'size-6';
  return (
    <Avatar className={cn(dim, 'shrink-0')}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={label} /> : null}
      <AvatarFallback className="bg-brand-muted text-[9px] font-semibold text-brand">
        {initials(label)}
      </AvatarFallback>
    </Avatar>
  );
}

function optionMatchesSearch(option: OptionItem, query: string) {
  if (!query) return true;
  return (
    option.label.toLowerCase().includes(query) ||
    (option.description ?? '').toLowerCase().includes(query)
  );
}

function MultiSelectField({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  showAvatar,
}: {
  options: OptionItem[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  showAvatar?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((o) => optionMatchesSearch(o, q));
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="space-y-1.5">
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="h-auto min-h-9 w-full justify-between gap-2 border-border bg-white px-3 py-1.5 font-normal text-foreground hover:bg-white aria-expanded:bg-white dark:bg-surface-card dark:hover:bg-surface-card dark:aria-expanded:bg-surface-card"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
            {selected.length === 0 ? (
              <span className="truncate text-sm text-muted-foreground">
                {placeholder}
              </span>
            ) : (
              selected.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-xs dark:bg-surface-card"
                >
                  {showAvatar ? (
                    <OptionAvatar
                      label={item.label}
                      avatarUrl={item.avatarUrl}
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                  {!disabled ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(item.id);
                        }
                      }}
                      aria-label={`Remove ${item.label}`}
                    >
                      <X size={11} />
                    </span>
                  ) : null}
                </span>
              ))
            )}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </div>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        className="overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 border-border bg-surface-card text-xs"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No options found
            </p>
          ) : (
            filtered.map((option) => {
              const checked = value.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                    checked && 'bg-brand-muted/25',
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(option.id);
                  }}
                >
                  <Checkbox
                    checked={checked}
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                  {showAvatar ? (
                    <OptionAvatar
                      label={option.label}
                      avatarUrl={option.avatarUrl}
                      size="md"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium leading-tight">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {checked ? (
                    <Check size={13} className="shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PortaledDropdownPanel>
    </div>
  );
}

function SingleSelectField({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  showAvatar,
}: {
  options: OptionItem[];
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
  showAvatar?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((o) => optionMatchesSearch(o, q));
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const pick = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <div className="w-full">
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="h-auto min-h-9 w-full justify-between gap-2 border-border bg-white px-3 py-1.5 font-normal text-foreground hover:bg-white aria-expanded:bg-white dark:bg-surface-card dark:hover:bg-surface-card dark:aria-expanded:bg-surface-card"
        >
          {selected ? (
            <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
              {showAvatar ? (
                <OptionAvatar
                  label={selected.label}
                  avatarUrl={selected.avatarUrl}
                />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight">
                  {selected.label}
                </span>
                {selected.description ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {selected.description}
                  </span>
                ) : null}
              </span>
            </span>
          ) : (
            <span className="truncate text-sm text-muted-foreground">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </div>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        className="overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 border-border bg-surface-card text-xs"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {options.length === 0
                ? 'No options configured'
                : 'No options found'}
            </p>
          ) : (
            filtered.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                    isSelected && 'bg-brand-muted/25',
                  )}
                  onClick={() => pick(option.id)}
                >
                  {showAvatar ? (
                    <OptionAvatar
                      label={option.label}
                      avatarUrl={option.avatarUrl}
                      size="md"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium leading-tight">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Check size={13} className="shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PortaledDropdownPanel>
    </div>
  );
}

function fieldsUseBindingType(
  fields: CustomFieldConfig[],
  type: 'user' | 'team' | 'department',
): boolean {
  return fields.some((field) => {
    if (field.type === type) return true;
    if (field.type !== 'composite') return false;
    return (field.settings.subFields ?? []).some(
      (sub) => sub.fieldType === type,
    );
  });
}

function useBindingOptions(fields: CustomFieldConfig[]): BindingOptionCatalogs {
  const needsUsers = fieldsUseBindingType(fields, 'user');
  const needsTeams = fieldsUseBindingType(fields, 'team');
  const needsDepartments = fieldsUseBindingType(fields, 'department');

  const { data: platformUsersData } = useGetPlatformUsers(
    {
      page: 1,
      pageSize: 1000,
    },
    { enabled: needsUsers },
  );
  const { data: teamsData } = useGetCrmTeams({
    enabled: needsTeams,
  });
  const { data: departmentsData } = useGetDepartments(undefined, {
    enabled: needsDepartments,
  });

  const usersById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    if (!needsUsers) return map;
    for (const u of platformUsersData?.data ?? []) {
      const name = formatUserName(u, 'User');
      map.set(u.id, {
        id: u.id,
        label: name,
        description: u.email ?? undefined,
        avatarUrl: u.avatarUrl ?? null,
      });
    }
    return map;
  }, [needsUsers, platformUsersData]);

  const teamsById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    if (!needsTeams) return map;
    for (const t of teamsData?.data ?? []) {
      map.set(t.id, {
        id: t.id,
        label: t.name,
        description: t.department?.name ?? undefined,
      });
    }
    return map;
  }, [needsTeams, teamsData]);

  const departmentsById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    if (!needsDepartments) return map;
    for (const d of departmentsData?.data ?? []) {
      map.set(d.id, {
        id: d.id,
        label: d.name,
      });
    }
    return map;
  }, [needsDepartments, departmentsData]);

  return { usersById, teamsById, departmentsById };
}

function bindingOptionsForField(
  field: CustomFieldConfig,
  catalogs: BindingOptionCatalogs,
): OptionItem[] {
  const catalog =
    field.type === 'user'
      ? catalogs.usersById
      : field.type === 'team'
        ? catalogs.teamsById
        : catalogs.departmentsById;

  const sorted = [...field.bindings].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const fromBindings = sorted
    .map((binding) => {
      const known = catalog.get(binding.bindingId);
      if (known) return known;
      return {
        id: binding.bindingId,
        label: binding.bindingId,
      };
    })
    .filter(Boolean);

  // No permitted users configured → list every CRM user.
  if (field.type === 'user' && fromBindings.length === 0) {
    return [...catalog.values()];
  }
  return fromBindings;
}

function listOptionsForField(field: CustomFieldConfig): OptionItem[] {
  return field.options
    .filter((o) => o.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((o) => ({
      id: o.value,
      label: o.label,
    }));
}

interface CustomFileValue {
  name: string;
  size: number;
  type?: string;
  url?: string;
}

function isCustomFileValue(value: unknown): value is CustomFileValue {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as CustomFileValue).name === 'string'
  );
}

function asFileArray(value: unknown): CustomFileValue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (isCustomFileValue(item)) return [item];
      if (typeof item === 'string' && item.trim()) {
        const trimmed = item.trim();
        return [
          {
            name: trimmed.split('/').pop() || 'File',
            size: 0,
            url: trimmed,
          },
        ];
      }
      return [];
    });
  }
  if (isCustomFileValue(value)) return [value];
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    return [
      {
        name: trimmed.split('/').pop() || 'File',
        size: 0,
        url: trimmed,
      },
    ];
  }
  return [];
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseAcceptedFileTypes(
  field: CustomFieldConfig,
): string[] | undefined {
  if (field.validation.acceptedFileTypes?.length) {
    return field.validation.acceptedFileTypes;
  }
  const raw = field.settings.allowedFileTypes;
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function fileFieldAllowsMultiple(field: CustomFieldConfig): boolean {
  return Boolean(
    field.validation.allowMultipleFiles ?? field.settings.allowMultipleFiles,
  );
}

function buildAcceptAttr(types?: string[]) {
  if (!types?.length) return undefined;
  return types
    .map((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return '';
      if (trimmed.includes('/')) return trimmed;
      return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
    })
    .filter(Boolean)
    .join(',');
}

function normalizeExtension(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return (parts.pop() ?? '').toLowerCase();
}

function FileFieldControl({
  field,
  value,
  onChange,
}: {
  field: CustomFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const allowMultiple = fileFieldAllowsMultiple(field);
  const maxMb =
    field.validation.maxFileSize ??
    field.settings.maxFileSize ??
    DEFAULT_FILE_UPLOAD_MAX_MB;
  const acceptedTypes = parseAcceptedFileTypes(field);

  const files = asFileArray(value);

  const commit = (next: CustomFileValue[]) => {
    if (allowMultiple) onChange(next.length > 0 ? next : null);
    else onChange(next[0] ?? null);
  };

  const openFilePicker = () => {
    if (field.readOnly || uploading) return;
    inputRef.current?.click();
  };

  const validateLocalFile = (file: File): string | null => {
    if (maxMb != null && file.size > maxMb * 1024 * 1024) {
      return `File must be ${maxMb} MB or smaller.`;
    }
    if (acceptedTypes?.length) {
      const allowed = acceptedTypes.map((t) =>
        t.trim().toLowerCase().replace(/^\./, ''),
      );
      const ext = normalizeExtension(file.name);
      const mimeOk = acceptedTypes.some(
        (t) => t.includes('/') && file.type === t.trim(),
      );
      if (ext && !allowed.includes(ext) && !mimeOk) {
        return `Allowed types: ${acceptedTypes.join(', ')}`;
      }
    }
    return null;
  };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length || field.readOnly) return;
    setLocalError(null);

    const incoming = allowMultiple
      ? Array.from(selected)
      : [Array.from(selected)[0]!].filter(Boolean);
    if (incoming.length === 0) return;

    for (const file of incoming) {
      const err = validateLocalFile(file);
      if (err) {
        setLocalError(err);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded: CustomFileValue[] = [];
      for (const file of incoming) {
        const response = await fileUpload(file);
        const url = resolveFileServerUploadUrl(response?.data);
        if (!url) {
          throw new Error('Upload succeeded but no file URL was returned.');
        }
        uploaded.push({
          name: file.name,
          size: file.size,
          type: file.type || undefined,
          url,
        });
      }
      commit(allowMultiple ? [...files, ...uploaded] : uploaded.slice(0, 1));
    } catch (error) {
      setLocalError(extractUploadErrorMessage(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    const next = files.filter((unused, i) => i !== index);
    commit(next);
  };

  const hintParts: string[] = [];
  if (acceptedTypes?.length) hintParts.push(acceptedTypes.join(', '));
  if (maxMb != null) hintParts.push(`max ${maxMb} MB`);
  if (allowMultiple) hintParts.push('multiple files');

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={field.readOnly || uploading}
        multiple={allowMultiple}
        accept={buildAcceptAttr(acceptedTypes)}
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />

      {files.length === 0 || !allowMultiple ? (
        <label
          htmlFor={inputId}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-page/60 px-4 py-5 text-center transition-colors hover:border-brand/40 hover:bg-brand-muted/20',
            (field.readOnly || uploading) && 'pointer-events-none opacity-60',
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {uploading
                ? 'Uploading…'
                : allowMultiple
                  ? 'Click to upload files'
                  : 'Click to upload a file'}
            </p>
            {hintParts.length ? (
              <p className="text-[11px] text-muted-foreground">
                {hintParts.join(' · ')}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                PDF, images, or documents
              </p>
            )}
          </div>
        </label>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-card px-2.5 py-2"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-page text-muted-foreground">
                <FileIcon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-brand hover:underline"
                  >
                    {file.name}
                  </a>
                ) : (
                  <span className="block truncate text-sm font-medium">
                    {file.name}
                  </span>
                )}
                <span className="block text-[11px] text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </span>
              {!field.readOnly ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {allowMultiple && files.length > 0 && !field.readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={openFilePicker}
          className="h-8 w-full border-border bg-surface-card text-xs"
        >
          {uploading ? (
            <>
              <Loader2 size={13} className="mr-1.5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={13} className="mr-1.5" />
              Add more files
            </>
          )}
        </Button>
      ) : null}

      {localError ? (
        <p className="text-[11px] text-destructive">{localError}</p>
      ) : null}
    </div>
  );
}

function NumericFieldControl({
  field,
  value,
  onChange,
  error,
}: {
  field: CustomFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const numericType = field.type as NumericFieldType;
  const common = 'h-9 border-border bg-white text-sm dark:bg-surface-card';
  const [localError, setLocalError] = useState<string | null>(null);
  const displayValue = formatNumericFieldDisplay(value);
  const currencyCode =
    numericType === 'currency' && field.settings.currency
      ? field.settings.currency
      : null;
  const mergedError = error ?? localError;
  const hint = numericFieldHint(numericType);

  const handleChange = (raw: string) => {
    const nextError = validateNumericFieldInput(raw, numericType);
    setLocalError(nextError);
    onChange(commitNumericFieldInput(raw, numericType));
  };

  const handleBlur = () => {
    const blurError = validateNumericFieldInput(displayValue, numericType, {
      onBlur: true,
    });
    setLocalError(blurError);
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        {currencyCode ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {currencyCode}
          </span>
        ) : (
          <Hash
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <Input
          type="text"
          inputMode={numericType === 'number' ? 'numeric' : 'decimal'}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={numericFieldPlaceholder(numericType, field.placeholder)}
          disabled={field.readOnly}
          aria-invalid={Boolean(mergedError)}
          className={cn(
            common,
            currencyCode ? 'pl-12' : 'pl-9',
            mergedError &&
              'border-destructive focus-visible:ring-destructive/30',
          )}
        />
      </div>
      {mergedError ? (
        <p className="text-[11px] text-destructive">{mergedError}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function CustomFieldControl({
  field,
  value,
  onChange,
  catalogs,
  error,
}: {
  field: CustomFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  catalogs: BindingOptionCatalogs;
  error?: string;
}) {
  const common = 'h-9 border-border bg-white text-sm dark:bg-surface-card';

  if (field.type === 'textarea' || field.type === 'address') {
    return (
      <Textarea
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={field.placeholder || undefined}
        disabled={field.readOnly}
        className="min-h-[72px] resize-none border-border bg-white text-sm dark:bg-surface-card"
      />
    );
  }

  if (field.type === 'yesno') {
    return (
      <div className="flex h-9 items-center gap-2">
        <Switch
          checked={value === true || value === 'true'}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={field.readOnly}
        />
        <span className="text-xs text-muted-foreground">
          {value === true || value === 'true' ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  if (field.type === 'list') {
    const options = listOptionsForField(field);
    if (field.multiSelect) {
      return (
        <MultiSelectField
          options={options}
          value={asStringArray(value)}
          onChange={onChange}
          placeholder={
            options.length ? 'Select options…' : 'No options configured'
          }
          disabled={field.readOnly || options.length === 0}
        />
      );
    }
    return (
      <SingleSelectField
        options={options}
        value={String(value ?? '')}
        onChange={onChange}
        placeholder={options.length ? 'Select…' : 'No options configured'}
        disabled={field.readOnly || options.length === 0}
      />
    );
  }

  if (
    field.type === 'user' ||
    field.type === 'team' ||
    field.type === 'department'
  ) {
    const options = bindingOptionsForField(field, catalogs);
    const showAvatar = field.type === 'user';
    const emptyPlaceholder =
      field.type === 'user'
        ? field.bindings.length === 0
          ? 'Loading users…'
          : 'No permitted users configured'
        : field.type === 'team'
          ? 'No permitted teams configured'
          : 'No permitted departments configured';
    const placeholder =
      options.length === 0
        ? emptyPlaceholder
        : field.type === 'user'
          ? field.multiSelect
            ? 'Select users…'
            : 'Select user…'
          : field.type === 'team'
            ? field.multiSelect
              ? 'Select teams…'
              : 'Select team…'
            : field.multiSelect
              ? 'Select departments…'
              : 'Select department…';

    if (field.multiSelect) {
      return (
        <MultiSelectField
          options={options}
          value={asStringArray(value)}
          onChange={onChange}
          placeholder={placeholder}
          disabled={field.readOnly || options.length === 0}
          showAvatar={showAvatar}
        />
      );
    }

    return (
      <SingleSelectField
        options={options}
        value={String(value ?? '')}
        onChange={onChange}
        placeholder={placeholder}
        disabled={field.readOnly || options.length === 0}
        showAvatar={showAvatar}
      />
    );
  }

  if (field.type === 'file') {
    return <FileFieldControl field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={field.readOnly}
        className={common}
      />
    );
  }

  if (field.type === 'datetime') {
    return (
      <Input
        type="datetime-local"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={field.readOnly}
        className={common}
      />
    );
  }

  if (
    field.type === 'number' ||
    field.type === 'decimal' ||
    field.type === 'currency'
  ) {
    return (
      <NumericFieldControl
        field={field}
        value={value}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (field.type === 'link') {
    return (
      <Input
        type="url"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || 'https://'}
        disabled={field.readOnly}
        className={common}
      />
    );
  }

  // text (and any unknown type)
  return (
    <Input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || undefined}
      disabled={field.readOnly}
      className={common}
    />
  );
}

export function EntityCustomFieldsForm({
  fields,
  values,
  onChange,
  errors = {},
  className,
  renderFieldAction,
  renderAfterField,
  hideLabels = false,
}: EntityCustomFieldsFormProps) {
  const catalogs = useBindingOptions(fields);

  if (fields.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          !hideLabels && 'md:grid-cols-2',
        )}
      >
        {fields.map((field) => {
          const stored = values[field.id];
          const mainValue = unwrapFieldValue(stored, field);
          const valueDescription = unwrapFieldDescription(stored, field);
          const showValueDescription = fieldHasValueDescription(field);
          const error = errors[field.id];
          const spansFull =
            field.type === 'composite' ||
            field.type === 'textarea' ||
            field.type === 'address' ||
            field.type === 'file' ||
            showValueDescription ||
            (field.multiSelect &&
              (field.type === 'list' ||
                field.type === 'user' ||
                field.type === 'team' ||
                field.type === 'department'));

          if (field.type === 'composite') {
            const subValues =
              stored && typeof stored === 'object' && !Array.isArray(stored)
                ? (stored as Record<string, unknown>)
                : {};
            return (
              <div
                key={field.id}
                className="space-y-2 rounded-lg border border-border bg-muted/10 p-3 md:col-span-2"
              >
                <FieldLabel field={field} />
                {field.description ? (
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    {field.description}
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(field.settings.subFields ?? []).map((sub) => {
                    const subField: CustomFieldConfig = {
                      ...field,
                      id: `${field.id}:${sub.key}`,
                      label: sub.label,
                      type: sub.fieldType,
                      placeholder: sub.placeholder ?? '',
                      required: Boolean(sub.required),
                      options: sub.options ?? [],
                      bindings: sub.bindings ?? [],
                      multiSelect: false,
                      settings: {},
                    };
                    return (
                      <div
                        key={sub.key}
                        className={cn(
                          'space-y-1.5',
                          sub.fieldType === 'textarea' && 'md:col-span-2',
                        )}
                      >
                        <Label className="text-[11px] font-medium text-foreground">
                          {sub.label}
                          {sub.required ? (
                            <span className="ml-0.5 text-destructive">*</span>
                          ) : null}
                        </Label>
                        <CustomFieldControl
                          field={subField}
                          value={subValues[sub.key]}
                          onChange={(next) =>
                            onChange(field.id, {
                              ...subValues,
                              [sub.key]: next,
                            })
                          }
                          catalogs={catalogs}
                        />
                      </div>
                    );
                  })}
                </div>
                {error ? (
                  <p className="text-[11px] text-destructive">{error}</p>
                ) : null}
              </div>
            );
          }

          const fieldAction = renderFieldAction?.(field);

          return (
            <div
              key={field.id}
              className={cn('space-y-1.5', spansFull && 'md:col-span-2')}
            >
              {hideLabels ? (
                <span className="sr-only">{field.label}</span>
              ) : (
                <FieldLabel field={field} />
              )}
              {field.description ? (
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {field.description}
                </p>
              ) : null}

              <div
                className={cn(
                  fieldAction ? 'flex items-center gap-2' : undefined,
                )}
              >
                <div
                  className={cn(
                    'space-y-2',
                    showValueDescription && 'space-y-2.5',
                    fieldAction && 'min-w-0 flex-1',
                  )}
                >
                  <CustomFieldControl
                    field={field}
                    value={mainValue}
                    onChange={(next) =>
                      onChange(
                        field.id,
                        showValueDescription
                          ? wrapFieldValue(field, next, valueDescription)
                          : next,
                      )
                    }
                    catalogs={catalogs}
                    error={error}
                  />

                  {showValueDescription ? (
                    <ValueDescriptionInput
                      value={valueDescription}
                      onChange={(next) =>
                        onChange(
                          field.id,
                          wrapFieldValue(field, mainValue, next),
                        )
                      }
                      disabled={field.readOnly}
                    />
                  ) : null}
                </div>

                {fieldAction ? (
                  <div className="shrink-0 self-center">{fieldAction}</div>
                ) : null}
              </div>

              {error &&
              field.type !== 'number' &&
              field.type !== 'decimal' &&
              field.type !== 'currency' ? (
                <p className="text-[11px] text-destructive">{error}</p>
              ) : null}

              {renderAfterField?.(field)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Keep values for fields that still apply; drop the rest. */
export function pruneCustomFieldValues(
  values: Record<string, unknown>,
  nextFieldIds: string[],
): Record<string, unknown> {
  const idSet = new Set(nextFieldIds);
  const next: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(values)) {
    if (idSet.has(id)) next[id] = value;
  }
  return next;
}

/** Coerce a field's configured defaultValue into a form-ready value. */
export function coerceFieldDefaultValue(
  field: Pick<CustomFieldConfig, 'type' | 'defaultValue'>,
): unknown {
  const raw = field.defaultValue;
  if (raw == null || String(raw).trim() === '') return undefined;
  if (field.type === 'yesno') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  if (
    field.type === 'number' ||
    field.type === 'decimal' ||
    field.type === 'currency'
  ) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

/**
 * Prefill missing keys from field.defaultValue (UX hint).
 * Does not overwrite keys already present in `values` (including explicit empty).
 */
export function applyCustomFieldDefaults(
  values: Record<string, unknown>,
  fields: Array<Pick<CustomFieldConfig, 'id' | 'type' | 'defaultValue'>>,
): Record<string, unknown> {
  let changed = false;
  const next = { ...values };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(next, field.id)) continue;
    const def = coerceFieldDefaultValue(field);
    if (def === undefined) continue;
    next[field.id] = def;
    changed = true;
  }
  return changed ? next : values;
}

export function customFieldValuesToPayload(
  values: Record<string, unknown>,
): Array<{ entityFieldId: string; value: unknown }> {
  return Object.entries(values).map(([entityFieldId, value]) => ({
    entityFieldId,
    value,
  }));
}

/** Merge field values with Assign drafts so create persists assignee/due atomically. */
export function customFieldValuesWithResponsibilityPayload(
  values: Record<string, unknown>,
  responsibility?: Record<
    string,
    | {
        responsibleUserId?: string | null;
        responsibleUserIds?: string[];
        dueAt: string;
      }
    | undefined
  > | null,
): Array<{
  entityFieldId: string;
  value: unknown;
  responsibleUserId?: string | null;
  responsibleUserIds?: string[];
  dueAt?: string | null;
}> {
  const fieldIds = new Set([
    ...Object.keys(values),
    ...Object.keys(responsibility ?? {}),
  ]);
  return [...fieldIds].map((entityFieldId) => {
    const draft = responsibility?.[entityFieldId];
    const item: {
      entityFieldId: string;
      value: unknown;
      responsibleUserId?: string | null;
      responsibleUserIds?: string[];
      dueAt?: string | null;
    } = {
      entityFieldId,
      // Prefer empty string over null — DB value column is NOT NULL jsonb.
      value:
        values[entityFieldId] !== undefined && values[entityFieldId] !== null
          ? values[entityFieldId]
          : '',
    };
    if (draft) {
      const ids =
        Array.isArray(draft.responsibleUserIds) &&
        draft.responsibleUserIds.length
          ? [...new Set(draft.responsibleUserIds.filter(Boolean))]
          : draft.responsibleUserId
            ? [draft.responsibleUserId]
            : [];
      item.responsibleUserIds = ids;
      item.responsibleUserId = ids[0] ?? null;
      const due = draft.dueAt?.trim();
      if (due) {
        item.dueAt = `${due}T23:59:59.000Z`;
      }
    }
    return item;
  });
}
