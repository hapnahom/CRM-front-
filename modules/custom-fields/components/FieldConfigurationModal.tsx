'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FIELD_TYPE_DEFINITIONS,
  getFieldDefinition,
  generateInternalName,
  isChoiceField,
  isBindingField,
  isMultiSelectAllowed,
  isDefaultValueAllowed,
  isCompositeField,
} from '../constants';
import { OptionListEditor } from './OptionListEditor';
import { CompositeSubFieldEditor } from './CompositeSubFieldEditor';
import { UserBindingSelector } from './UserBindingSelector';
import { TeamBindingSelector } from './TeamBindingSelector';
import { DepartmentBindingSelector } from './DepartmentBindingSelector';
import { ValidationRulesEditor } from './ValidationRulesEditor';
import type {
  CustomFieldConfig,
  CustomFieldAppliesTo,
  FieldType,
  StageRef,
  UserRef,
  TeamRef,
  DepartmentRef,
  CurrencyRef,
} from '../types';
import { STAGE_COLOR_PRESETS } from '@/lib/stage-presets';
import {
  customFieldAppliesToOptions,
  customFieldRecordLabel,
  customFieldStageLabel,
  customFieldStagePlaceholder,
  isLeadsEnabled,
} from '@/config/salesWorkflow';

function stageDotColor(stage: StageRef, index: number) {
  return (
    stage.color ??
    STAGE_COLOR_PRESETS[index % STAGE_COLOR_PRESETS.length]!.color
  );
}

function isInactiveOrLostStageCategory(
  category?: StageRef['category'],
): boolean {
  return category === 'inactive' || category === 'lost';
}

function fieldHasOpenPipelineStage(
  config: CustomFieldConfig,
  leadStages: StageRef[],
  dealStages: StageRef[],
): boolean {
  const needsLeadStage =
    isLeadsEnabled() &&
    (config.appliesTo === 'LEAD' || config.appliesTo === 'BOTH');
  const needsDealStage =
    config.appliesTo === 'DEAL' || config.appliesTo === 'BOTH';

  if (needsDealStage && config.dealStageId) {
    const category = dealStages.find(
      (stage) => stage.id === config.dealStageId,
    )?.category;
    if (category && !isInactiveOrLostStageCategory(category)) return true;
  }
  if (needsLeadStage && config.leadStageId) {
    const category = leadStages.find(
      (stage) => stage.id === config.leadStageId,
    )?.category;
    if (category && !isInactiveOrLostStageCategory(category)) return true;
  }
  return false;
}

function inactiveReportSettingsForStage(
  settings: CustomFieldConfig['settings'],
  config: CustomFieldConfig,
  leadStages: StageRef[],
  dealStages: StageRef[],
): CustomFieldConfig['settings'] {
  if (fieldHasOpenPipelineStage(config, leadStages, dealStages)) {
    return settings;
  }
  if (!settings.showInInactiveReport) return settings;
  return { ...settings, showInInactiveReport: false };
}

function normalizeFileFieldConfig(
  config: CustomFieldConfig,
): CustomFieldConfig {
  if (config.type !== 'file') return config;

  const raw = (config.settings.allowedFileTypes ?? '').trim();
  const acceptedFileTypes = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  return {
    ...config,
    settings: {
      ...config.settings,
      allowedFileTypes: raw || undefined,
    },
    validation: {
      ...config.validation,
      acceptedFileTypes,
    },
  };
}

interface FieldConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomFieldConfig | null;
  leadStages: StageRef[];
  dealStages: StageRef[];
  availableUsers: UserRef[];
  availableTeams: TeamRef[];
  availableDepartments: DepartmentRef[];
  availableCurrencies: CurrencyRef[];
  onSave: (field: CustomFieldConfig) => void;
  isNew?: boolean;
  isSaving?: boolean;
  hasStoredValues?: boolean;
  /** Snapshot used to lock structural properties after values exist. */
  originalField?: CustomFieldConfig | null;
}

export function FieldConfigurationModal({
  open,
  onOpenChange,
  field,
  leadStages,
  dealStages,
  availableUsers,
  availableTeams,
  availableDepartments,
  availableCurrencies,
  onSave,
  isNew,
  isSaving = false,
  hasStoredValues = false,
  originalField = null,
}: FieldConfigurationModalProps) {
  const [config, setConfig] = useState<CustomFieldConfig | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [defaultDueDaysDraft, setDefaultDueDaysDraft] = useState('');

  useEffect(() => {
    if (open && field) {
      setConfig({ ...field });
      setErrors({});
      const days = field.settings?.defaultDueDays;
      setDefaultDueDaysDraft(
        typeof days === 'number' && Number.isFinite(days) && days >= 0
          ? String(Math.floor(days))
          : '',
      );
    }
  }, [open, field]);

  const update = useCallback(
    (partial: Partial<CustomFieldConfig>) =>
      setConfig((prev) => (prev ? { ...prev, ...partial } : prev)),
    [],
  );

  const handleLabelChange = (label: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const internalName =
        isNew || prev.internalName === generateInternalName(prev.label)
          ? generateInternalName(label)
          : prev.internalName;
      return { ...prev, label, internalName };
    });
  };

  const handleTypeChange = (type: FieldType) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const wasChoice = isChoiceField(prev.type);
      const nowChoice = isChoiceField(type);
      const wasBinding = isBindingField(prev.type);
      const nowBinding = isBindingField(type);
      return {
        ...prev,
        type,
        options: wasChoice && !nowChoice ? [] : prev.options,
        bindings: wasBinding && !nowBinding ? [] : prev.bindings,
        multiSelect: isMultiSelectAllowed(type) ? prev.multiSelect : false,
        defaultValue: isDefaultValueAllowed(type) ? prev.defaultValue : '',
      };
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!config) return false;
    if (!config.label.trim()) errs.label = 'Label is required';
    const needsLeadStage =
      isLeadsEnabled() &&
      (config.appliesTo === 'LEAD' || config.appliesTo === 'BOTH');
    const needsDealStage =
      config.appliesTo === 'DEAL' || config.appliesTo === 'BOTH';
    if (needsLeadStage && !config.leadStageId) {
      errs.leadStage = `${customFieldStageLabel('intake')} is required`;
    }
    if (needsDealStage && !config.dealStageId) {
      errs.dealStage = `${customFieldStageLabel('pipeline')} is required`;
    }
    if (isChoiceField(config.type)) {
      if (config.options.length < 2) {
        errs.options = 'At least two options are required';
      }
    }
    if (
      isBindingField(config.type) &&
      config.type !== 'user' &&
      config.bindings.length === 0
    ) {
      errs.bindings = 'At least one binding is required';
    }
    if (isCompositeField(config.type)) {
      const subFields = config.settings.subFields ?? [];
      if (subFields.length === 0) {
        errs.subFields = 'Add at least one sub-field';
      }
      for (const sub of subFields) {
        if (!sub.label.trim()) {
          errs.subFields = 'Each sub-field needs a label';
          break;
        }
        if (sub.fieldType === 'list' && (sub.options?.length ?? 0) < 2) {
          errs.subFields = `Sub-field "${sub.label}" needs at least two list options`;
          break;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!config || isSaving) return;
    if (!validate()) return;
    const raw = defaultDueDaysDraft.trim();
    const days = Number(raw);
    const defaultDueDays =
      raw !== '' && Number.isFinite(days) && days >= 0
        ? Math.floor(days)
        : null;
    const next: CustomFieldConfig = {
      ...config,
      settings: {
        ...config.settings,
        defaultDueDays,
      },
    };
    onSave(next.type === 'file' ? normalizeFileFieldConfig(next) : next);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isSaving) return;
    onOpenChange(next);
  };

  if (!config) return null;

  const def = getFieldDefinition(config.type);
  const isNewField = isNew ?? false;
  const showChoices = isChoiceField(config.type);
  const showBindings = isBindingField(config.type);
  const showMultiSelect = isMultiSelectAllowed(config.type);
  const showDefaultValue = isDefaultValueAllowed(config.type);
  const appliesToOptions = customFieldAppliesToOptions();
  const needsLeadStage =
    isLeadsEnabled() &&
    (config.appliesTo === 'LEAD' || config.appliesTo === 'BOTH');
  const needsDealStage =
    config.appliesTo === 'DEAL' || config.appliesTo === 'BOTH';
  const selectedLeadStage = leadStages.find((s) => s.id === config.leadStageId);
  const selectedDealStage = dealStages.find((s) => s.id === config.dealStageId);
  const selectedLeadStageIndex = leadStages.findIndex(
    (s) => s.id === config.leadStageId,
  );
  const selectedDealStageIndex = dealStages.findIndex(
    (s) => s.id === config.dealStageId,
  );
  const lockedOptionValues =
    hasStoredValues && originalField?.type === 'list'
      ? (originalField.options ?? []).map((option) => option.value)
      : [];
  const lockedSubFieldKeys =
    hasStoredValues && originalField?.type === 'composite'
      ? (originalField.settings.subFields ?? []).map((sub) => sub.key)
      : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-hidden p-0 gap-0 sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            {def && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${def.color}18`,
                  color: def.color,
                }}
              >
                <def.icon size={17} />
              </div>
            )}
            <div>
              <DialogTitle className="text-[15px] leading-snug">
                {isNewField ? 'Create Custom Field' : 'Edit Custom Field'}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {isNewField
                  ? 'Configure and save your new field'
                  : `Editing "${config.label}"`}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
            aria-label="Close"
          >
            <X size={15} />
          </Button>
        </DialogHeader>

        <div
          className="overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide"
          style={{ maxHeight: 'calc(90vh - 160px)' }}
        >
          {hasStoredValues ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-snug text-foreground">
              This field has saved values on{' '}
              {customFieldRecordLabel({ plural: true, lowercase: true })}. Field
              type, multi-select, and structural options are locked to protect
              existing data. You can still update labels, visibility,
              validation, and add new choices.
            </div>
          ) : null}
          {appliesToOptions.length > 1 ? (
            <div className="space-y-1.5">
              <Label className="field-label">Applies to</Label>
              <Select
                value={config.appliesTo}
                onValueChange={(value) =>
                  update({
                    appliesTo: value as CustomFieldAppliesTo,
                    stageId:
                      value === 'DEAL'
                        ? config.dealStageId
                        : config.leadStageId,
                  })
                }
              >
                <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appliesToOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Stages + Label */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {needsLeadStage ? (
              <div className="space-y-1.5">
                <Label className="field-label">
                  {customFieldStageLabel('intake')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={config.leadStageId || undefined}
                  onValueChange={(v) => {
                    const next = { ...config, leadStageId: v, stageId: v };
                    update({
                      leadStageId: v,
                      stageId: v,
                      settings: inactiveReportSettingsForStage(
                        config.settings,
                        next,
                        leadStages,
                        dealStages,
                      ),
                    });
                  }}
                >
                  <SelectTrigger
                    className={`h-9 w-full border-border bg-surface-card text-sm ${
                      errors.leadStage ? 'border-destructive' : ''
                    }`}
                  >
                    <SelectValue
                      placeholder={customFieldStagePlaceholder('intake')}
                    >
                      {selectedLeadStage ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: stageDotColor(
                                selectedLeadStage,
                                Math.max(0, selectedLeadStageIndex),
                              ),
                            }}
                          />
                          {selectedLeadStage.name}
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-60 w-[var(--radix-select-trigger-width)]"
                    position="popper"
                    sideOffset={4}
                    align="start"
                  >
                    {leadStages.map((s, index) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: stageDotColor(s, index),
                            }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.leadStage ? (
                  <p className="text-[11px] text-destructive">
                    {errors.leadStage}
                  </p>
                ) : null}
              </div>
            ) : null}

            {needsDealStage ? (
              <div className="space-y-1.5">
                <Label className="field-label">
                  {customFieldStageLabel('pipeline')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={config.dealStageId || undefined}
                  onValueChange={(v) => {
                    const next = { ...config, dealStageId: v, stageId: v };
                    update({
                      dealStageId: v,
                      stageId: v,
                      settings: inactiveReportSettingsForStage(
                        config.settings,
                        next,
                        leadStages,
                        dealStages,
                      ),
                    });
                  }}
                >
                  <SelectTrigger
                    className={`h-9 w-full border-border bg-surface-card text-sm ${
                      errors.dealStage ? 'border-destructive' : ''
                    }`}
                  >
                    <SelectValue
                      placeholder={customFieldStagePlaceholder('pipeline')}
                    >
                      {selectedDealStage ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: stageDotColor(
                                selectedDealStage,
                                Math.max(0, selectedDealStageIndex),
                              ),
                            }}
                          />
                          {selectedDealStage.name}
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-60 w-[var(--radix-select-trigger-width)]"
                    position="popper"
                    sideOffset={4}
                    align="start"
                  >
                    {dealStages.map((s, index) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: stageDotColor(s, index),
                            }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dealStage ? (
                  <p className="text-[11px] text-destructive">
                    {errors.dealStage}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="field-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                value={config.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Opportunity source"
                className={`h-9 border-border bg-surface-card text-sm ${
                  errors.label ? 'border-destructive' : ''
                }`}
                autoFocus
              />
              {errors.label && (
                <p className="text-[11px] text-destructive">{errors.label}</p>
              )}
            </div>
          </div>

          {/* Field Type */}
          <div className="space-y-1.5">
            <Label className="field-label">Field Type</Label>
            <Select
              value={config.type}
              disabled={hasStoredValues}
              onValueChange={(v) => handleTypeChange(v as FieldType)}
            >
              <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {def && (
                      <def.icon
                        size={13}
                        style={{ color: def.color }}
                        className="shrink-0"
                      />
                    )}
                    {def?.label ?? config.type}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="max-h-72 w-[var(--radix-select-trigger-width)]"
                position="popper"
                sideOffset={4}
                align="start"
              >
                {FIELD_TYPE_DEFINITIONS.map((ft) => (
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

          {/* Placeholder */}
          {!showChoices &&
            config.type !== 'yesno' &&
            config.type !== 'date' &&
            config.type !== 'datetime' &&
            !showBindings && (
              <div className="space-y-1.5">
                <Label className="field-label">Placeholder</Label>
                <Input
                  value={config.placeholder}
                  onChange={(e) => update({ placeholder: e.target.value })}
                  placeholder="e.g. Enter value…"
                  className="h-9 border-border bg-surface-card text-sm"
                />
              </div>
            )}

          {/* Default Value — UI prefill hint; does not satisfy required stage gates */}
          {showDefaultValue && (
            <div className="space-y-1.5">
              <Label className="field-label">Default Value</Label>
              <p className="text-[11px] text-muted-foreground">
                Prefills the input so users see a starting value. Does not count
                as filled for required stage moves — users must confirm. When
                empty, the placeholder is shown instead.
              </p>
              {config.type === 'yesno' ? (
                <Select
                  value={config.defaultValue}
                  onValueChange={(v) => update({ defaultValue: v })}
                >
                  <SelectTrigger className="h-9 w-40 border-border bg-surface-card text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : config.type === 'date' ? (
                <Input
                  type="date"
                  value={config.defaultValue}
                  onChange={(e) => update({ defaultValue: e.target.value })}
                  className="h-9 w-48 border-border bg-surface-card text-sm"
                />
              ) : config.type === 'datetime' ? (
                <Input
                  type="datetime-local"
                  value={config.defaultValue}
                  onChange={(e) => update({ defaultValue: e.target.value })}
                  className="h-9 w-56 border-border bg-surface-card text-sm"
                />
              ) : (
                <Input
                  value={config.defaultValue}
                  onChange={(e) => update({ defaultValue: e.target.value })}
                  placeholder="Default value…"
                  className="h-9 border-border bg-surface-card text-sm"
                />
              )}
            </div>
          )}

          {/* MONEY: Currency only */}
          {config.type === 'currency' && (
            <div className="space-y-1.5">
              <Label className="field-label">Currency</Label>
              <Select
                value={config.settings.currency ?? ''}
                onValueChange={(v) =>
                  update({
                    settings: { ...config.settings, currency: v },
                  })
                }
              >
                <SelectTrigger className="h-9 w-72 border-border bg-surface-card text-sm">
                  <SelectValue placeholder="Select currency…" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.length > 0
                    ? availableCurrencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} {c.name ? `— ${c.name}` : ''}
                        </SelectItem>
                      ))
                    : ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* LINK: URL validation */}
          {config.type === 'link' && (
            <div className="rounded-lg border border-border bg-surface-page/60 p-3">
              <ToggleRow
                label="Validate URL"
                description="Ensure the value is a valid URL"
                checked={config.validation.validateUrl ?? true}
                onChange={(v) =>
                  update({
                    validation: { ...config.validation, validateUrl: v },
                  })
                }
              />
            </div>
          )}

          {/* ADDRESS */}
          {config.type === 'address' && (
            <div className="rounded-lg border border-border bg-surface-page/60 p-3">
              <p className="text-[11px] text-muted-foreground">
                Address fields collect structured location data.
              </p>
            </div>
          )}

          {/* FILE */}
          {config.type === 'file' && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-page/60 p-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                File Settings
              </Label>
              <div className="space-y-1.5">
                <Label className="text-xs">Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={config.validation.maxFileSize ?? ''}
                  onChange={(e) =>
                    update({
                      validation: {
                        ...config.validation,
                        maxFileSize: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  placeholder="10"
                  className="h-8 w-32 border-border bg-surface-card text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Allowed File Types (comma-separated)
                </Label>
                <Input
                  value={
                    config.settings.allowedFileTypes ??
                    config.validation.acceptedFileTypes?.join(', ') ??
                    ''
                  }
                  onChange={(e) =>
                    update({
                      settings: {
                        ...config.settings,
                        allowedFileTypes: e.target.value,
                      },
                    })
                  }
                  placeholder=".pdf, .docx, .jpg, .png, .xlsx"
                  className="h-8 border-border bg-surface-card text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Separate extensions with commas, e.g. .pdf, .xlsx, .jpg
                </p>
              </div>
              <ToggleRow
                label="Allow Multiple Files"
                description="Users can upload more than one file"
                checked={config.validation.allowMultipleFiles ?? false}
                onChange={(v) =>
                  update({
                    validation: { ...config.validation, allowMultipleFiles: v },
                  })
                }
              />
            </div>
          )}

          {isCompositeField(config.type) ? (
            <CompositeSubFieldEditor
              subFields={config.settings.subFields ?? []}
              availableUsers={availableUsers}
              onChange={(subFields) =>
                update({
                  settings: {
                    ...config.settings,
                    subFields,
                  },
                })
              }
              error={errors.subFields}
              lockStructure={hasStoredValues}
              lockedSubFieldKeys={lockedSubFieldKeys}
            />
          ) : null}

          {/* LIST: Options editor */}
          {showChoices && (
            <div className="space-y-2">
              <Label className="field-label">
                Choices{' '}
                {config.options.length > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({config.options.length})
                  </span>
                )}
              </Label>
              <OptionListEditor
                options={config.options}
                onChange={(options) => update({ options })}
                lockedOptionValues={lockedOptionValues}
              />
              {errors.options && (
                <p className="text-[11px] text-destructive">{errors.options}</p>
              )}
            </div>
          )}

          {/* USER binding */}
          {config.type === 'user' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="field-label">
                  Permitted Users{' '}
                  {config.bindings.length > 0 && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({config.bindings.length})
                    </span>
                  )}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Leave empty to allow any CRM user. Add users here to restrict
                  the picker to a specific list.
                </p>
                <UserBindingSelector
                  availableUsers={availableUsers}
                  bindings={config.bindings}
                  onChange={(bindings) => update({ bindings })}
                  preventRemoval={hasStoredValues}
                />
                {errors.bindings && (
                  <p className="text-[11px] text-destructive">
                    {errors.bindings}
                  </p>
                )}
              </div>
              {(config.entityType === 'lead' ||
                config.entityType === 'deal') && (
                <div className="rounded-lg border border-border bg-surface-page/60 p-3">
                  <ToggleRow
                    label="Count toward target achievement"
                    description={`Selected users always see the ${customFieldRecordLabel({ lowercase: true })} in their pipeline. When enabled, a won ${customFieldRecordLabel({ lowercase: true })} also adds its value to each selected user's personal target (and their team/department when not the owner's).`}
                    checked={Boolean(
                      config.settings.countsTowardTargetAchievement,
                    )}
                    onChange={(checked) =>
                      update({
                        settings: {
                          ...config.settings,
                          countsTowardTargetAchievement: checked,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* TEAM binding */}
          {config.type === 'team' && (
            <div className="space-y-2">
              <Label className="field-label">
                Permitted Teams{' '}
                {config.bindings.length > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({config.bindings.length})
                  </span>
                )}
              </Label>
              <TeamBindingSelector
                availableTeams={availableTeams}
                bindings={config.bindings}
                onChange={(bindings) => update({ bindings })}
                preventRemoval={hasStoredValues}
              />
              {errors.bindings && (
                <p className="text-[11px] text-destructive">
                  {errors.bindings}
                </p>
              )}
            </div>
          )}

          {/* DEPARTMENT binding */}
          {config.type === 'department' && (
            <div className="space-y-2">
              <Label className="field-label">
                Permitted Departments{' '}
                {config.bindings.length > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({config.bindings.length})
                  </span>
                )}
              </Label>
              <DepartmentBindingSelector
                availableDepartments={availableDepartments}
                bindings={config.bindings}
                onChange={(bindings) => update({ bindings })}
                preventRemoval={hasStoredValues}
              />
              {errors.bindings && (
                <p className="text-[11px] text-destructive">
                  {errors.bindings}
                </p>
              )}
            </div>
          )}

          {/* Multi Select toggle */}
          {showMultiSelect && (
            <div className="rounded-lg border border-border bg-surface-page/60 p-3">
              <ToggleRow
                label="Multi Select"
                description="Allow end users to select multiple of the configured options"
                checked={config.multiSelect}
                disabled={hasStoredValues}
                onChange={(v) => update({ multiSelect: v })}
              />
            </div>
          )}

          {!isCompositeField(config.type) ? (
            <>
              <div className="rounded-lg border border-border bg-surface-page/60 p-3">
                <ToggleRow
                  label="Allow additional details"
                  description="Show an optional description field when users enter a value (e.g. explain an “Other” selection)"
                  checked={Boolean(config.settings.allowValueDescription)}
                  onChange={(checked) =>
                    update({
                      settings: {
                        ...config.settings,
                        allowValueDescription: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-1.5 rounded-lg border border-border bg-surface-page/60 p-3">
                <Label className="field-label" htmlFor="default-due-days">
                  Default responsibility due date (days)
                </Label>
                <Input
                  id="default-due-days"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 30"
                  value={defaultDueDaysDraft}
                  onChange={(e) => {
                    // Allow free typing (including empty while editing).
                    setDefaultDueDaysDraft(e.target.value);
                  }}
                  onBlur={() => {
                    const raw = defaultDueDaysDraft.trim();
                    if (!raw) {
                      setDefaultDueDaysDraft('');
                      update({
                        settings: {
                          ...config.settings,
                          defaultDueDays: null,
                        },
                      });
                      return;
                    }
                    const days = Number(raw);
                    if (!Number.isFinite(days) || days < 0) {
                      setDefaultDueDaysDraft('');
                      update({
                        settings: {
                          ...config.settings,
                          defaultDueDays: null,
                        },
                      });
                      return;
                    }
                    const next = Math.floor(days);
                    setDefaultDueDaysDraft(String(next));
                    update({
                      settings: {
                        ...config.settings,
                        defaultDueDays: next,
                      },
                    });
                  }}
                  className="h-9 w-40 border-border bg-surface-card text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Optional. Type a number or use the arrows (0 or more days).
                  Leave empty for no default due date. Applies only to this
                  custom field when an opportunity is created; you can override
                  the due date on that opportunity.
                </p>
              </div>

              <ValidationRulesEditor
                fieldType={config.type}
                rules={config.validation.rules ?? []}
                exceptionApprovalWorkflowId={
                  config.validation.exceptionApprovalWorkflowId ??
                  config.settings.exceptionApprovalWorkflowId ??
                  null
                }
                entityScope={
                  config.entityType === 'lead'
                    ? 'LEAD'
                    : config.entityType === 'deal'
                      ? 'DEAL'
                      : undefined
                }
                onChange={(rules) =>
                  update({
                    validation: { ...config.validation, rules },
                    settings: { ...config.settings, validationRules: rules },
                  })
                }
                onExceptionApprovalWorkflowIdChange={(
                  exceptionApprovalWorkflowId,
                ) =>
                  update({
                    validation: {
                      ...config.validation,
                      exceptionApprovalWorkflowId,
                    },
                    settings: {
                      ...config.settings,
                      exceptionApprovalWorkflowId,
                    },
                  })
                }
              />
            </>
          ) : null}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Properties toggles */}
          <div className="space-y-1">
            <Label className="field-label mb-2 block">Properties</Label>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <ToggleRow
                label="Required"
                description="Required when entering this stage (lost stages only check their own fields)"
                checked={config.required}
                onChange={(v) => update({ required: v })}
              />
              <ToggleRow
                label="Active"
                description="Field is visible to users"
                checked={config.active}
                onChange={(v) => update({ active: v })}
              />
              <ToggleRow
                label="Searchable"
                description="Include in search results"
                checked={config.searchable}
                onChange={(v) => update({ searchable: v })}
              />
              <ToggleRow
                label="Show in Filters"
                description="Available as a filter option"
                checked={config.showInFilters}
                onChange={(v) => update({ showInFilters: v })}
              />
              <ToggleRow
                label="Visible in Lists"
                description="Show in table / list views"
                checked={config.visibleInLists}
                onChange={(v) => update({ visibleInLists: v })}
              />
              <ToggleRow
                label="Visible in Detail"
                description="Show in detail view"
                checked={config.visibleInDetail}
                onChange={(v) => update({ visibleInDetail: v })}
              />
              <ToggleRow
                label="Show in Global Search"
                description="Include in global search"
                checked={config.showInGlobalSearch}
                onChange={(v) => update({ showInGlobalSearch: v })}
              />
              <ToggleRow
                label="Show in Reports"
                description="Include as a column in exported pipeline reports"
                checked={config.showInReports}
                onChange={(v) => update({ showInReports: v })}
              />
              <ToggleRow
                label="Responsible Assignee"
                description="Allow assigning someone to fill this field (+ Assign)"
                checked={Boolean(config.settings.allowResponsibleAssignee)}
                onChange={(v) =>
                  update({
                    settings: {
                      ...config.settings,
                      allowResponsibleAssignee: v,
                    },
                  })
                }
              />
              <ToggleRow
                label="Due Date"
                description="Allow setting a due date for this field (+ Assign)"
                checked={Boolean(config.settings.allowDueDate)}
                onChange={(v) =>
                  update({
                    settings: {
                      ...config.settings,
                      allowDueDate: v,
                    },
                  })
                }
              />
              {config.showInReports && (
                <div className="col-span-2 space-y-3 rounded-lg border border-border bg-surface-page/60 p-3">
                  {fieldHasOpenPipelineStage(config, leadStages, dealStages) ? (
                    <ToggleRow
                      label="Inactive opportunities table"
                      description="Also include this column in the Inactive Opportunities report table"
                      checked={Boolean(config.settings.showInInactiveReport)}
                      onChange={(value) =>
                        update({
                          settings: {
                            ...config.settings,
                            showInInactiveReport: value,
                          },
                        })
                      }
                    />
                  ) : null}
                  <div className="space-y-1">
                    <Label className="field-label">Report column group</Label>
                    <Input
                      value={config.settings.reportColumnGroup ?? ''}
                      onChange={(event) =>
                        update({
                          settings: {
                            ...config.settings,
                            reportColumnGroup: event.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Reason"
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 min-w-[110px] bg-brand text-brand-foreground hover:bg-brand-hover"
            onClick={handleSave}
            disabled={
              isSaving ||
              !config.label.trim() ||
              (needsLeadStage && !config.leadStageId) ||
              (needsDealStage && !config.dealStageId)
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {isNewField ? 'Creating…' : 'Saving…'}
              </>
            ) : isNewField ? (
              'Create Field'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:bg-surface-hover'
      }`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[10px] leading-tight text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        size="sm"
      />
    </label>
  );
}
