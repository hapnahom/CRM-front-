'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CustomFieldConfig } from '@/modules/custom-fields';
import { useFieldsForPartnerRoles } from '../hooks/usePartnerRoles';
import type { PartnerRoleFieldGroup } from '../types';

interface PartnerRoleFieldsFormProps {
  roleIds: string[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  /** When false, render read-only display. Default true. */
  editable?: boolean;
}

export function PartnerRoleFieldsForm({
  roleIds,
  values,
  onChange,
  errors = {},
  editable = true,
}: PartnerRoleFieldsFormProps) {
  const groups = useFieldsForPartnerRoles(roleIds);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <RoleFieldGroupSection
          key={group.role.id}
          group={group}
          values={values}
          onChange={onChange}
          errors={errors}
          editable={editable}
        />
      ))}
    </div>
  );
}

function RoleFieldGroupSection({
  group,
  values,
  onChange,
  errors,
  editable,
}: {
  group: PartnerRoleFieldGroup;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors: Record<string, string>;
  editable: boolean;
}) {
  const { role, fields } = group;
  if (fields.length === 0) {
    return (
      <section className="space-y-2">
        <header className="border-b border-border pb-1.5">
          <h4 className="m-0 text-sm font-semibold text-foreground">
            {role.name} Information
          </h4>
        </header>
        <p className="text-xs text-muted-foreground">
          No custom fields configured for this role yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="border-b border-border pb-1.5">
        <h4 className="m-0 text-sm font-semibold text-foreground">
          {role.name} Information
        </h4>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className={
              field.type === 'textarea' || field.type === 'address'
                ? 'sm:col-span-2'
                : undefined
            }
          >
            {editable ? (
              <FieldInput
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                onChange={(v) => onChange(field.id, v)}
              />
            ) : (
              <FieldDisplay field={field} value={values[field.id]} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: CustomFieldConfig;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <label className="mb-1 block text-xs font-medium text-foreground">
      {field.label}
      {field.required ? <span className="text-destructive"> *</span> : null}
    </label>
  );

  const stringValue =
    value === null || value === undefined ? '' : String(value);

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <Textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || undefined}
          className="min-h-[72px] text-xs"
          disabled={field.readOnly}
        />
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.type === 'list') {
    return (
      <div>
        {label}
        <Select
          value={stringValue || undefined}
          onValueChange={onChange}
          disabled={field.readOnly}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options
              .filter((o) => o.active !== false)
              .map((opt) => (
                <SelectItem key={opt.id} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.type === 'yesno') {
    const checked = value === true || value === 'yes' || value === 'true';
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          {label}
          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={(v) => onChange(v)}
          disabled={field.readOnly}
        />
      </div>
    );
  }

  const inputType =
    field.type === 'number' ||
    field.type === 'decimal' ||
    field.type === 'currency'
      ? 'number'
      : field.type === 'date'
        ? 'date'
        : field.type === 'datetime'
          ? 'datetime-local'
          : field.type === 'link'
            ? 'url'
            : 'text';

  return (
    <div>
      {label}
      <Input
        type={inputType}
        value={stringValue}
        onChange={(e) =>
          onChange(
            inputType === 'number'
              ? e.target.value === ''
                ? ''
                : Number(e.target.value)
              : e.target.value,
          )
        }
        placeholder={field.placeholder || undefined}
        className="h-8 text-xs"
        disabled={field.readOnly}
        step={
          field.type === 'decimal' || field.type === 'currency'
            ? '0.01'
            : undefined
        }
      />
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function FieldDisplay({
  field,
  value,
}: {
  field: CustomFieldConfig;
  value: unknown;
}) {
  let display = '—';
  if (value !== null && value !== undefined && String(value).trim() !== '') {
    if (field.type === 'list') {
      const opt = field.options.find((o) => o.value === value);
      display = opt?.label ?? String(value);
    } else if (field.type === 'yesno') {
      display =
        value === true || value === 'yes' || value === 'true' ? 'Yes' : 'No';
    } else {
      display = String(value);
    }
  }

  return (
    <div>
      <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </p>
      <p className="m-0 mt-0.5 whitespace-pre-wrap text-sm text-foreground">
        {display}
      </p>
    </div>
  );
}

export function validatePartnerRoleFieldValues(
  roleIds: string[],
  values: Record<string, unknown>,
): Record<string, string> {
  // Lazy import avoided — callers should use validateFields from custom-fields
  // This helper is kept for convenience in form components via the hook below.
  void roleIds;
  void values;
  return {};
}
