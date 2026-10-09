/**
 * Bidirectional mappers between the frontend CustomFieldConfig shape
 * and the backend EntityField API shape.
 *
 * Frontend FieldType   →  Backend FieldType
 *   text               →  STRING
 *   textarea           →  STRING  (multiline flag stored in settings)
 *   number             →  INTEGER
 *   decimal            →  NUMBER
 *   currency           →  MONEY
 *   date               →  DATE
 *   datetime           →  DATETIME
 *   yesno              →  BOOLEAN
 *   list               →  LIST    (multiSelect flag controls single/multi)
 *   link               →  LINK
 *   address            →  ADDRESS
 *   file               →  FILE
 *   user               →  USER
 *   team               →  TEAM
 *   department         →  DEPARTMENT
 */

import type {
  EntityFieldResponse,
  CreateEntityFieldRequest,
  UpdateEntityFieldRequest,
  BackendFieldType,
  BackendBindingType,
} from './types';
import type {
  CompositeSubField,
  CompositeSubFieldType,
  CustomFieldConfig,
  CustomFieldAppliesTo,
  FieldType,
  ListOption,
  FieldBinding,
} from '@/modules/custom-fields/types';

function mapSubFieldTypeFromBackend(
  fieldType: string,
  multiline?: boolean,
): CompositeSubFieldType {
  switch (fieldType) {
    case 'LIST':
      return 'list';
    case 'USER':
      return 'user';
    case 'BOOLEAN':
      return 'yesno';
    case 'DATE':
      return 'date';
    case 'STRING':
      return multiline ? 'textarea' : 'text';
    default:
      return 'text';
  }
}

export function mapCompositeSubFieldsForListColumn(
  settings: Record<string, any> | null | undefined,
) {
  if (!Array.isArray(settings?.subFields)) return undefined;
  return settings.subFields
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const sub = raw as Record<string, unknown>;
      const key = String(sub.key ?? '').trim();
      const label = String(sub.label ?? '').trim();
      if (!key || !label) return null;
      return {
        key,
        label,
        fieldType: String(sub.fieldType ?? 'STRING'),
        options: Array.isArray(sub.options)
          ? sub.options.map((option) => {
              const item = option as Record<string, unknown>;
              return {
                label: String(item.label ?? ''),
                value: String(item.value ?? item.label ?? ''),
              };
            })
          : undefined,
      };
    })
    .filter(Boolean);
}

function mapSubFieldsFromSettings(
  settings: Record<string, any>,
): CompositeSubField[] {
  if (!Array.isArray(settings.subFields)) return [];
  return settings.subFields
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const sub = raw as Record<string, unknown>;
      const key = String(sub.key ?? '').trim();
      const label = String(sub.label ?? '').trim();
      if (!key || !label) return null;
      return {
        key,
        label,
        fieldType: mapSubFieldTypeFromBackend(
          String(sub.fieldType ?? 'STRING'),
          Boolean(sub.multiline),
        ),
        required: Boolean(sub.required),
        placeholder: String(sub.placeholder ?? ''),
        options: Array.isArray(sub.options)
          ? sub.options.map((option, index) => {
              const item = option as Record<string, unknown>;
              return {
                id: String(item.id ?? `${key}-${index}`),
                label: String(item.label ?? ''),
                value: String(item.value ?? item.label ?? ''),
                sortOrder: Number(item.sortOrder ?? index),
                active: item.active !== false,
              };
            })
          : [],
        bindings: Array.isArray(sub.bindings)
          ? sub.bindings.flatMap((binding, index) => {
              const item = binding as Record<string, unknown>;
              const bindingId = String(item.bindingId ?? item.id ?? '').trim();
              if (!bindingId) return [];
              return [
                {
                  bindingType: 'USER' as const,
                  bindingId,
                  sortOrder: Number(item.sortOrder ?? index),
                },
              ];
            })
          : [],
      } satisfies CompositeSubField;
    })
    .filter(Boolean) as CompositeSubField[];
}

function feTypeToBeType(type: FieldType): BackendFieldType {
  switch (type) {
    case 'text':
    case 'textarea':
      return 'STRING';
    case 'number':
      return 'INTEGER';
    case 'decimal':
      return 'NUMBER';
    case 'currency':
      return 'MONEY';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'DATETIME';
    case 'yesno':
      return 'BOOLEAN';
    case 'list':
      return 'LIST';
    case 'link':
      return 'LINK';
    case 'address':
      return 'ADDRESS';
    case 'file':
      return 'FILE';
    case 'user':
      return 'USER';
    case 'team':
      return 'TEAM';
    case 'department':
      return 'DEPARTMENT';
    case 'composite':
      return 'COMPOSITE';
    default:
      return 'STRING';
  }
}

function beTypeToFe(
  backendType: BackendFieldType,
  settings: Record<string, any>,
): FieldType {
  switch (backendType) {
    case 'STRING':
      return settings.multiline ? 'textarea' : 'text';
    case 'INTEGER':
      return 'number';
    case 'NUMBER':
      return 'decimal';
    case 'BOOLEAN':
      return 'yesno';
    case 'DATE':
      return 'date';
    case 'DATETIME':
      return 'datetime';
    case 'MONEY':
      return 'currency';
    case 'LIST':
      return 'list';
    case 'LINK':
      return 'link';
    case 'ADDRESS':
      return 'address';
    case 'FILE':
      return 'file';
    case 'USER':
      return 'user';
    case 'TEAM':
      return 'team';
    case 'DEPARTMENT':
      return 'department';
    case 'COMPOSITE':
      return 'composite';
    default:
      return 'text';
  }
}

export function fieldAppliesToEntity(
  field: Pick<EntityFieldResponse, 'appliesTo'>,
  entity: 'LEAD' | 'DEAL',
): boolean {
  if (!field.appliesTo) return false;
  if (field.appliesTo === 'BOTH') return true;
  return field.appliesTo === entity;
}

export function apiResponseToConfig(
  field: EntityFieldResponse,
): CustomFieldConfig {
  const settings = field.settings ?? {};

  const options: ListOption[] = (field.options ?? []).map((o) => ({
    id: o.id,
    label: o.label,
    value: o.value,
    sortOrder: o.sortOrder,
    active: o.active,
  }));

  const bindings: FieldBinding[] = (field.bindings ?? []).map((b) => ({
    id: b.id,
    bindingType: b.bindingType as FieldBinding['bindingType'],
    bindingId: b.bindingId,
    sortOrder: b.sortOrder,
  }));

  const feType = beTypeToFe(field.fieldType, settings);
  const allowedFileTypesRaw =
    typeof settings.allowedFileTypes === 'string'
      ? settings.allowedFileTypes
      : Array.isArray(settings.allowedFileTypes)
        ? settings.allowedFileTypes.join(', ')
        : undefined;

  return {
    id: field.id,
    label: field.label,
    internalName: field.internalName,
    description: field.description ?? '',
    type: feType,
    placeholder: field.placeholder ?? '',
    defaultValue: field.defaultValue ?? '',
    appliesTo: (field.appliesTo ?? 'BOTH') as CustomFieldAppliesTo,
    leadStageId: field.leadStageId ?? '',
    dealStageId: field.dealStageId ?? '',
    stageId: field.leadStageId ?? field.dealStageId ?? field.stageId ?? '',
    required: field.required,
    active: field.active,
    readOnly: field.readOnly,
    multiSelect: Boolean(field.multiSelect),
    searchable: field.searchable,
    visibleInLists: field.visibleInLists,
    visibleInDetail: field.visibleInDetail,
    showInFilters: field.showInFilters,
    showInGlobalSearch: field.showInGlobalSearch,
    showInReports: field.showInReports !== false,
    displayOrder: field.displayOrder,
    validation: {
      minLength: settings.minLength,
      maxLength: settings.maxLength,
      min: settings.min,
      max: settings.max,
      decimals: settings.decimalPrecision,
      validateUrl: settings.validateUrl,
      acceptedFileTypes: allowedFileTypesRaw
        ? allowedFileTypesRaw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
      maxFileSize: settings.maxFileSize,
      allowMultipleFiles: settings.allowMultipleFiles,
      rules: Array.isArray(settings.validationRules)
        ? settings.validationRules
        : [],
      exceptionApprovalWorkflowId:
        typeof settings.exceptionApprovalWorkflowId === 'string'
          ? settings.exceptionApprovalWorkflowId
          : null,
    },
    options,
    bindings,
    settings: {
      multiline: feType === 'textarea' ? true : settings.multiline,
      currency: settings.currency,
      decimalPrecision: settings.decimalPrecision,
      inputStyle: settings.inputStyle,
      minLength: settings.minLength,
      maxLength: settings.maxLength,
      min: settings.min,
      max: settings.max,
      validateUrl: settings.validateUrl,
      maxFileSize: settings.maxFileSize,
      allowedFileTypes: allowedFileTypesRaw,
      allowMultipleFiles: settings.allowMultipleFiles ?? false,
      validationRules: Array.isArray(settings.validationRules)
        ? settings.validationRules
        : [],
      exceptionApprovalWorkflowId:
        typeof settings.exceptionApprovalWorkflowId === 'string'
          ? settings.exceptionApprovalWorkflowId
          : null,
      countsTowardTargetAchievement: Boolean(
        settings.countsTowardTargetAchievement,
      ),
      allowValueDescription: Boolean(settings.allowValueDescription),
      subFields: mapSubFieldsFromSettings(settings),
      defaultDueDays:
        typeof settings.defaultDueDays === 'number' &&
        Number.isFinite(settings.defaultDueDays) &&
        settings.defaultDueDays >= 0
          ? Math.floor(settings.defaultDueDays)
          : null,
      allowResponsibleAssignee: Boolean(settings.allowResponsibleAssignee),
      allowDueDate: Boolean(settings.allowDueDate),
      reportColumnGroup:
        typeof settings.reportColumnGroup === 'string'
          ? settings.reportColumnGroup
          : null,
      reportColumnLabel:
        typeof settings.reportColumnLabel === 'string'
          ? settings.reportColumnLabel
          : null,
      showInInactiveReport: Boolean(settings.showInInactiveReport),
    },
    entityType:
      field.appliesTo === 'DEAL'
        ? 'deal'
        : field.appliesTo === 'LEAD'
          ? 'lead'
          : undefined,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
  };
}

function buildFieldSettings(
  config: CustomFieldConfig,
): Record<string, unknown> {
  const settings: Record<string, unknown> = { ...(config.settings ?? {}) };

  if (config.type === 'textarea') {
    settings.multiline = true;
  } else if (config.type === 'text') {
    delete settings.multiline;
  }

  if (config.type === 'currency') {
    settings.currency = config.settings.currency ?? 'USD';
    settings.decimalPrecision =
      config.settings.decimalPrecision ?? config.validation.decimals ?? 2;
  } else {
    delete settings.currency;
    delete settings.decimalPrecision;
  }

  if (config.type === 'link') {
    settings.validateUrl = config.validation.validateUrl ?? true;
  } else {
    delete settings.validateUrl;
  }

  if (config.type === 'file') {
    if (config.validation.maxFileSize != null) {
      settings.maxFileSize = config.validation.maxFileSize;
    } else {
      delete settings.maxFileSize;
    }
    if (config.validation.acceptedFileTypes?.length) {
      settings.allowedFileTypes = config.validation.acceptedFileTypes.join(',');
    } else {
      delete settings.allowedFileTypes;
    }
    settings.allowMultipleFiles = config.validation.allowMultipleFiles ?? false;
  } else {
    delete settings.maxFileSize;
    delete settings.allowedFileTypes;
    delete settings.allowMultipleFiles;
  }

  if (config.type === 'user') {
    settings.countsTowardTargetAchievement = Boolean(
      config.settings.countsTowardTargetAchievement,
    );
  } else {
    delete settings.countsTowardTargetAchievement;
  }

  if (config.validation.min != null) settings.min = config.validation.min;
  else delete settings.min;
  if (config.validation.max != null) settings.max = config.validation.max;
  else delete settings.max;
  if (config.validation.minLength != null) {
    settings.minLength = config.validation.minLength;
  } else {
    delete settings.minLength;
  }
  if (config.validation.maxLength != null) {
    settings.maxLength = config.validation.maxLength;
  } else {
    delete settings.maxLength;
  }

  const rules =
    config.validation.rules ?? config.settings.validationRules ?? [];
  if (rules.length) {
    settings.validationRules = rules;
  } else {
    delete settings.validationRules;
  }

  const exceptionApprovalWorkflowId =
    config.validation.exceptionApprovalWorkflowId ??
    config.settings.exceptionApprovalWorkflowId ??
    null;
  if (exceptionApprovalWorkflowId) {
    settings.exceptionApprovalWorkflowId = exceptionApprovalWorkflowId;
  } else {
    delete settings.exceptionApprovalWorkflowId;
  }

  settings.allowValueDescription = Boolean(
    config.settings.allowValueDescription,
  );

  if (config.type === 'composite') {
    settings.subFields = (config.settings.subFields ?? []).map((sub) => {
      const payload: Record<string, unknown> = {
        key: sub.key,
        label: sub.label,
        fieldType:
          sub.fieldType === 'list'
            ? 'LIST'
            : sub.fieldType === 'user'
              ? 'USER'
              : sub.fieldType === 'yesno'
                ? 'BOOLEAN'
                : sub.fieldType === 'date'
                  ? 'DATE'
                  : sub.fieldType === 'textarea'
                    ? 'STRING'
                    : 'STRING',
        required: Boolean(sub.required),
        placeholder: sub.placeholder ?? '',
        options: (sub.options ?? []).map((option, index) => ({
          label: option.label,
          value:
            option.value || option.label.toLowerCase().replace(/\s+/g, '_'),
          sortOrder: option.sortOrder ?? index,
          active: option.active ?? true,
        })),
        multiline: sub.fieldType === 'textarea',
      };

      if (sub.fieldType === 'user') {
        payload.bindings = (sub.bindings ?? []).map((binding, index) => ({
          bindingType: 'USER',
          bindingId: binding.bindingId,
          sortOrder: binding.sortOrder ?? index,
        }));
      }

      return payload;
    });
  } else {
    delete settings.subFields;
  }

  const defaultDueDays = config.settings.defaultDueDays;
  if (
    typeof defaultDueDays === 'number' &&
    Number.isFinite(defaultDueDays) &&
    defaultDueDays >= 0
  ) {
    settings.defaultDueDays = Math.floor(defaultDueDays);
  } else {
    settings.defaultDueDays = null;
  }

  settings.allowResponsibleAssignee = Boolean(
    config.settings.allowResponsibleAssignee,
  );
  settings.allowDueDate = Boolean(config.settings.allowDueDate);

  const reportColumnGroup = config.settings.reportColumnGroup?.trim();
  if (reportColumnGroup) {
    settings.reportColumnGroup = reportColumnGroup;
  } else {
    delete settings.reportColumnGroup;
  }

  if (config.settings.showInInactiveReport) {
    settings.showInInactiveReport = true;
  } else {
    delete settings.showInInactiveReport;
  }

  return settings;
}

function mapListOptions(config: CustomFieldConfig) {
  return config.options.map((o, i) => ({
    label: o.label,
    value: o.value || o.label.toLowerCase().replace(/\s+/g, '_'),
    sortOrder: o.sortOrder ?? i,
    active: o.active ?? true,
  }));
}

function mapBindings(config: CustomFieldConfig) {
  return (config.bindings ?? []).map((b, i) => ({
    bindingType: b.bindingType as BackendBindingType,
    bindingId: b.bindingId,
    sortOrder: b.sortOrder ?? i,
  }));
}

export function configToCreateRequest(
  config: CustomFieldConfig,
): CreateEntityFieldRequest {
  const isMultiSelect =
    config.type === 'list'
      ? config.multiSelect
      : config.multiSelect &&
        ['user', 'team', 'department'].includes(config.type);

  const settings = buildFieldSettings(config);

  const options = config.type === 'list' ? mapListOptions(config) : undefined;

  const bindings = ['user', 'team', 'department'].includes(config.type)
    ? mapBindings(config)
    : undefined;

  return {
    appliesTo: config.appliesTo,
    leadStageId: config.leadStageId || undefined,
    dealStageId: config.dealStageId || undefined,
    label: config.label,
    description: config.description || undefined,
    placeholder: config.placeholder || undefined,
    fieldType: feTypeToBeType(config.type),
    defaultValue: config.defaultValue || undefined,
    required: config.required,
    active: config.active,
    readOnly: config.readOnly,
    multiSelect: isMultiSelect,
    searchable: config.searchable,
    visibleInLists: config.visibleInLists,
    visibleInDetail: config.visibleInDetail,
    showInFilters: config.showInFilters,
    showInGlobalSearch: config.showInGlobalSearch,
    showInReports: config.showInReports,
    displayOrder: config.displayOrder,
    settings,
    options,
    bindings,
  };
}

export function configToUpdateRequest(
  config: CustomFieldConfig,
): UpdateEntityFieldRequest {
  const request = configToCreateRequest(config);
  delete request.internalName;

  if (config.type !== 'list') {
    request.options = [];
  }
  if (!['user', 'team', 'department'].includes(config.type)) {
    request.bindings = [];
  }

  return request;
}
