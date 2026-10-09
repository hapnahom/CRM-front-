import type { BackendFieldType } from '@/store/server/features/entity-fields/types';
import { splitStoredFieldValue } from '@/modules/custom-fields/field-value-with-description';

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function coerceStoredValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function extractLabeledEntries(
  value: unknown,
): Array<{ id: string; label?: string }> {
  return asArray(coerceStoredValue(value)).flatMap((item) => {
    if (item == null || item === '') return [];
    if (typeof item === 'string' || typeof item === 'number') {
      const id = String(item).trim();
      return id ? [{ id }] : [];
    }
    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const id =
        obj.id ?? obj.value ?? obj.userId ?? obj.teamId ?? obj.departmentId;
      const label = obj.name ?? obj.label ?? obj.email;
      const labelText =
        label != null && String(label).trim()
          ? String(label).trim()
          : undefined;
      if (id == null || id === '') {
        return labelText ? [{ id: labelText, label: labelText }] : [];
      }
      return [{ id: String(id), label: labelText }];
    }
    return [];
  });
}

/** Entity ids stored on USER / TEAM / DEPARTMENT custom field values. */
export function extractCustomFieldEntityIds(value: unknown): string[] {
  return extractLabeledEntries(value).map((entry) => entry.id);
}

export type CustomFieldDirectory = Partial<
  Record<'USER' | 'TEAM' | 'DEPARTMENT', Map<string, string>>
>;

function formatDateLike(value: unknown): string {
  if (value == null || value === '') return '—';
  const raw = String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function moneyAmount(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as {
      amount?: unknown;
      currency?: unknown;
      value?: unknown;
    };
    const amount = obj.amount ?? obj.value;
    const currency =
      typeof obj.currency === 'string' && obj.currency
        ? ` ${obj.currency}`
        : '';
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}${currency}`;
    }
    if (amount != null && amount !== '') return `${String(amount)}${currency}`;
  }
  return String(value);
}

function resolveListLabelItems(
  value: unknown,
  options?: Array<{ label: string; value: string }>,
  directory?: Map<string, string>,
): string[] {
  const entries = extractLabeledEntries(value);
  if (!entries.length) return [];
  const byValue = new Map(
    (options ?? []).map((option) => [option.value, option.label]),
  );
  return entries.map((entry) => {
    if (entry.label) return entry.label;
    return byValue.get(entry.id) ?? directory?.get(entry.id) ?? entry.id;
  });
}

function addressLabel(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const parts = [
      obj.line1,
      obj.line2,
      obj.city,
      obj.state,
      obj.postalCode,
      obj.country,
    ]
      .map((p) => (p == null ? '' : String(p).trim()))
      .filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }
  return String(value);
}

function fileLabel(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') {
    const name = value.split('/').pop() || value;
    return name || '—';
  }
  if (typeof value === 'object') {
    const obj = value as { name?: unknown; fileName?: unknown; url?: unknown };
    if (obj.name) return String(obj.name);
    if (obj.fileName) return String(obj.fileName);
    if (obj.url) return fileLabel(obj.url);
  }
  return 'File';
}

export type CustomFieldFileEntry = {
  name: string;
  url?: string;
};

/** Structured file metadata for read-only custom field display. */
export function formatCustomFieldFileEntries(
  value: unknown,
): CustomFieldFileEntry[] {
  return asArray(coerceStoredValue(value)).flatMap((item) => {
    if (item == null || item === '') return [];

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) return [];
      const name = trimmed.split('/').pop() || trimmed;
      return [
        {
          name,
          url: /^https?:\/\//i.test(trimmed) ? trimmed : undefined,
        },
      ];
    }

    if (typeof item === 'object') {
      const obj = item as { name?: unknown; fileName?: unknown; url?: unknown };
      const name =
        obj.name != null && String(obj.name).trim()
          ? String(obj.name).trim()
          : obj.fileName != null && String(obj.fileName).trim()
            ? String(obj.fileName).trim()
            : typeof obj.url === 'string'
              ? fileLabel(obj.url)
              : 'File';
      const url =
        typeof obj.url === 'string' && obj.url.trim()
          ? obj.url.trim()
          : undefined;
      return [{ name, url }];
    }

    return [];
  });
}

function normalizeListFieldType(fieldType?: string): string | undefined {
  if (!fieldType) return fieldType;
  switch (fieldType) {
    case 'user':
      return 'USER';
    case 'team':
      return 'TEAM';
    case 'department':
      return 'DEPARTMENT';
    case 'list':
      return 'LIST';
    case 'composite':
      return 'COMPOSITE';
    case 'file':
      return 'FILE';
    default:
      return fieldType;
  }
}

function formatScalarValue(value: unknown, fieldType?: string): string {
  if (value == null || value === '') return '—';

  switch (fieldType as BackendFieldType | undefined) {
    case 'BOOLEAN':
      return value === true || value === 'true' || value === 1 || value === '1'
        ? 'Yes'
        : value === false || value === 'false' || value === 0 || value === '0'
          ? 'No'
          : String(value);
    case 'DATE':
    case 'DATETIME':
      return formatDateLike(value);
    case 'MONEY':
      return moneyAmount(value);
    case 'ADDRESS':
      return addressLabel(value);
    case 'LINK':
      return typeof value === 'string' ? value : String(value);
    case 'INTEGER':
    case 'NUMBER':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    default:
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return '—';
        }
      }
      return String(value);
  }
}

function appendValueDescription(main: string, description?: string): string {
  if (!description || main === '—') return main;
  return `${main} — ${description}`;
}

type CompositeSubFieldMeta = {
  key: string;
  label: string;
  fieldType: string;
  options?: Array<{ label: string; value: string }>;
};

/** Compact display string for custom field values in list tables. */
export function formatCustomFieldListValue(
  value: unknown,
  fieldType?: string,
  options?: Array<{ label: string; value: string }>,
  directory?: CustomFieldDirectory,
  subFields?: CompositeSubFieldMeta[],
): string {
  if (fieldType === 'COMPOSITE') {
    const items = formatCustomFieldListItems(
      value,
      fieldType,
      options,
      directory,
      subFields,
    );
    return items.length ? items.join('\n') : '—';
  }
  const { value: core, description } = splitStoredFieldValue(value);
  const items = formatCustomFieldListItems(core, fieldType, options, directory);
  const main = items.length ? items.join('\n') : '—';
  return appendValueDescription(main, description);
}

/** Individual labels for multi-value custom fields (list, users, files, arrays). */
export function formatCustomFieldListItems(
  value: unknown,
  fieldType?: string,
  options?: Array<{ label: string; value: string }>,
  directory?: CustomFieldDirectory,
  subFields?: CompositeSubFieldMeta[],
): string[] {
  if (value == null || value === '') return [];

  switch (normalizeListFieldType(fieldType) as BackendFieldType | undefined) {
    case 'COMPOSITE': {
      const stored = coerceStoredValue(value);
      const record =
        stored && typeof stored === 'object' && !Array.isArray(stored)
          ? (stored as Record<string, unknown>)
          : {};
      return (subFields ?? []).flatMap((sub) => {
        const subValue = record[sub.key];
        const labels = formatCustomFieldListItems(
          subValue,
          normalizeListFieldType(sub.fieldType),
          sub.options,
          directory,
        );
        if (!labels.length) return [];
        return [`${sub.label}: ${labels.join(', ')}`];
      });
    }
    case 'LIST':
      return resolveListLabelItems(value, options);
    case 'USER':
      return resolveListLabelItems(value, options, directory?.USER);
    case 'TEAM':
      return resolveListLabelItems(value, options, directory?.TEAM);
    case 'DEPARTMENT':
      return resolveListLabelItems(value, options, directory?.DEPARTMENT);
    case 'FILE':
      return asArray(coerceStoredValue(value))
        .map(fileLabel)
        .filter((label) => label && label !== '—');
    default: {
      const stored = coerceStoredValue(value);
      if (Array.isArray(stored)) {
        return stored
          .map((item) => formatScalarValue(item, fieldType))
          .filter((label) => label && label !== '—');
      }
      const display = formatScalarValue(stored, fieldType);
      return display === '—' ? [] : [display];
    }
  }
}
