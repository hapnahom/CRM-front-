'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OptionListEditor } from './OptionListEditor';
import { UserBindingSelector } from './UserBindingSelector';
import {
  COMPOSITE_SUB_FIELD_TYPE_DEFINITIONS,
  generateInternalName,
  getCompositeSubFieldDefinition,
} from '../constants';
import {
  MAX_COMPOSITE_SUB_FIELDS,
  type CompositeSubField,
  type CompositeSubFieldType,
  type UserRef,
} from '../types';

function buildUniqueSubFieldKey(
  label: string,
  subFields: CompositeSubField[],
  index: number,
): string {
  const otherKeys = subFields
    .map((sub, i) => (i === index ? null : sub.key))
    .filter(Boolean) as string[];

  let base = generateInternalName(label.trim());
  if (!base || !/^[a-z]/.test(base)) {
    base = `field_${index + 1}`;
  }

  let key = base;
  let suffix = 2;
  while (otherKeys.includes(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  return key;
}

interface CompositeSubFieldEditorProps {
  subFields: CompositeSubField[];
  onChange: (subFields: CompositeSubField[]) => void;
  availableUsers: UserRef[];
  error?: string;
  /** When true, existing sub-fields cannot be removed or retyped. */
  lockStructure?: boolean;
  /** Sub-field keys that cannot be removed or retyped. */
  lockedSubFieldKeys?: string[];
}

export function CompositeSubFieldEditor({
  subFields,
  onChange,
  availableUsers,
  error,
  lockStructure = false,
  lockedSubFieldKeys = [],
}: CompositeSubFieldEditorProps) {
  const lockedKeys = new Set(lockedSubFieldKeys);
  const addSubField = () => {
    if (subFields.length >= MAX_COMPOSITE_SUB_FIELDS) return;
    const index = subFields.length + 1;
    const label = `Field ${index}`;
    onChange([
      ...subFields,
      {
        key: buildUniqueSubFieldKey(label, subFields, subFields.length),
        label,
        fieldType: 'text',
        required: false,
        placeholder: '',
        options: [],
        bindings: [],
      },
    ]);
  };

  const updateSubField = (
    index: number,
    partial: Partial<CompositeSubField>,
  ) => {
    onChange(
      subFields.map((sub, i) => {
        if (i !== index) return sub;
        const next = { ...sub, ...partial };

        if (
          partial.label !== undefined &&
          !(lockStructure && lockedKeys.has(sub.key))
        ) {
          next.key = buildUniqueSubFieldKey(
            partial.label || sub.label,
            subFields,
            index,
          );
        }

        if (partial.fieldType) {
          if (partial.fieldType !== 'list') {
            next.options = [];
          }
          if (partial.fieldType !== 'user') {
            next.bindings = [];
          } else if (!next.bindings?.length) {
            next.bindings = [];
          }
        }

        return next;
      }),
    );
  };

  const removeSubField = (index: number) => {
    onChange(subFields.filter((subField, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <Label className="text-[13px]">Sub-fields</Label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Configure the grouped pieces shown together in forms and reports (max{' '}
          {MAX_COMPOSITE_SUB_FIELDS}).
        </p>
      </div>

      {subFields.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Add sub-fields such as Reason, Dropped Date, Approved Person, and
          Description.
        </p>
      ) : (
        <div className="space-y-3">
          {subFields.map((sub, index) => {
            const typeDef = getCompositeSubFieldDefinition(sub.fieldType);
            const showPlaceholder =
              sub.fieldType === 'text' || sub.fieldType === 'textarea';

            return (
              <div
                key={index}
                className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground">
                    Sub-field {index + 1}
                  </p>
                  {!(lockStructure && lockedKeys.has(sub.key)) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSubField(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Label</Label>
                    <Input
                      value={sub.label}
                      onChange={(event) =>
                        updateSubField(index, { label: event.target.value })
                      }
                      placeholder="Reason"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Type</Label>
                    <Select
                      value={sub.fieldType}
                      disabled={lockStructure && lockedKeys.has(sub.key)}
                      onValueChange={(value) =>
                        updateSubField(index, {
                          fieldType: value as CompositeSubFieldType,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            {typeDef ? (
                              <typeDef.icon
                                size={13}
                                style={{ color: typeDef.color }}
                                className="shrink-0"
                              />
                            ) : null}
                            {typeDef?.label ?? sub.fieldType}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        className="max-h-72 w-[var(--radix-select-trigger-width)]"
                        position="popper"
                        sideOffset={4}
                        align="start"
                      >
                        {COMPOSITE_SUB_FIELD_TYPE_DEFINITIONS.map((ft) => (
                          <SelectItem key={ft.type} value={ft.type}>
                            <span className="flex items-center gap-2.5">
                              <ft.icon
                                size={13}
                                style={{ color: ft.color }}
                                className="shrink-0"
                              />
                              {ft.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showPlaceholder ? (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[11px]">Placeholder</Label>
                      <Input
                        value={sub.placeholder ?? ''}
                        onChange={(event) =>
                          updateSubField(index, {
                            placeholder: event.target.value,
                          })
                        }
                        className="h-8 text-[12px]"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <Label className="text-[12px]">Required</Label>
                  <Switch
                    checked={Boolean(sub.required)}
                    onCheckedChange={(checked) =>
                      updateSubField(index, { required: checked })
                    }
                  />
                </div>

                {sub.fieldType === 'list' ? (
                  <OptionListEditor
                    options={sub.options ?? []}
                    onChange={(options) => updateSubField(index, { options })}
                    lockedOptionValues={
                      lockStructure && lockedKeys.has(sub.key)
                        ? (sub.options ?? []).map((option) => option.value)
                        : []
                    }
                  />
                ) : null}

                {sub.fieldType === 'user' ? (
                  <div className="space-y-2">
                    <Label className="text-[11px]">
                      Permitted users{' '}
                      {(sub.bindings?.length ?? 0) > 0 ? (
                        <span className="font-normal text-muted-foreground">
                          ({sub.bindings?.length})
                        </span>
                      ) : null}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Leave empty to allow any CRM user.
                    </p>
                    <UserBindingSelector
                      availableUsers={availableUsers}
                      bindings={sub.bindings ?? []}
                      onChange={(bindings) =>
                        updateSubField(index, { bindings })
                      }
                      preventRemoval={lockStructure && lockedKeys.has(sub.key)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-[12px]"
        onClick={addSubField}
        disabled={subFields.length >= MAX_COMPOSITE_SUB_FIELDS}
      >
        <Plus size={14} />
        Add sub-field
      </Button>

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
