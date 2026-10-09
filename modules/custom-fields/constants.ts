import {
  Type,
  AlignLeft,
  Hash,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  ToggleLeft,
  LayoutList,
  Link,
  MapPin,
  File,
  User,
  Users,
  Building2,
  Layers,
} from 'lucide-react';
import type {
  CompositeSubFieldType,
  FieldType,
  FieldTypeDefinition,
} from './types';

export const FIELD_TYPE_DEFINITIONS: FieldTypeDefinition[] = [
  {
    type: 'text',
    label: 'Text',
    description: 'Single-line text input',
    icon: Type,
    color: '#3b82f6',
  },
  {
    type: 'textarea',
    label: 'Text Area',
    description: 'Multi-line text input',
    icon: AlignLeft,
    color: '#6366f1',
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Whole number input',
    icon: Hash,
    color: '#8b5cf6',
  },
  {
    type: 'decimal',
    label: 'Decimal',
    description: 'Decimal number input',
    icon: Percent,
    color: '#a855f7',
  },
  {
    type: 'currency',
    label: 'Currency',
    description: 'Monetary amount with currency',
    icon: DollarSign,
    color: '#10b981',
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker field',
    icon: Calendar,
    color: '#f59e0b',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    description: 'Date and time picker',
    icon: Clock,
    color: '#f97316',
  },
  {
    type: 'yesno',
    label: 'Yes/No',
    description: 'Yes / no toggle',
    icon: ToggleLeft,
    color: '#22c55e',
  },
  {
    type: 'list',
    label: 'List',
    description: 'Option-based selection field',
    icon: LayoutList,
    color: '#14b8a6',
  },
  {
    type: 'link',
    label: 'Link',
    description: 'URL / hyperlink field',
    icon: Link,
    color: '#3b82f6',
  },
  {
    type: 'address',
    label: 'Address',
    description: 'Address field',
    icon: MapPin,
    color: '#f97316',
  },
  {
    type: 'file',
    label: 'File',
    description: 'File upload field',
    icon: File,
    color: '#8b5cf6',
  },
  {
    type: 'user',
    label: 'User',
    description: 'User selection binding',
    icon: User,
    color: '#0ea5e9',
  },
  {
    type: 'team',
    label: 'Team',
    description: 'Team selection binding',
    icon: Users,
    color: '#7c3aed',
  },
  {
    type: 'department',
    label: 'Department',
    description: 'Department selection binding',
    icon: Building2,
    color: '#f59e0b',
  },
  {
    type: 'composite',
    label: 'Outcome / Status Detail',
    description: 'Grouped sub-fields shown together in one cell',
    icon: Layers,
    color: '#64748b',
  },
];

export const CHOICE_FIELD_TYPES: FieldType[] = ['list'];

export const BINDING_FIELD_TYPES: FieldType[] = ['user', 'team', 'department'];

export const MULTI_SELECT_ALLOWED_TYPES: FieldType[] = [
  'list',
  'user',
  'team',
  'department',
];

export const DEFAULT_VALUE_ALLOWED_TYPES: FieldType[] = [
  'text',
  'textarea',
  'number',
  'decimal',
  'currency',
  'date',
  'datetime',
  'yesno',
  'list',
];

export function isChoiceField(type: FieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(type);
}

export function isBindingField(type: FieldType): boolean {
  return BINDING_FIELD_TYPES.includes(type);
}

export function isMultiSelectAllowed(type: FieldType): boolean {
  return MULTI_SELECT_ALLOWED_TYPES.includes(type);
}

export function isDefaultValueAllowed(type: FieldType): boolean {
  return DEFAULT_VALUE_ALLOWED_TYPES.includes(type);
}

export function getFieldDefinition(
  type: string,
): FieldTypeDefinition | undefined {
  return FIELD_TYPE_DEFINITIONS.find((f) => f.type === type);
}

export function generateInternalName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function isCompositeField(type: FieldType): boolean {
  return type === 'composite';
}

export const COMPOSITE_SUB_FIELD_TYPES: CompositeSubFieldType[] = [
  'text',
  'textarea',
  'date',
  'list',
  'user',
  'yesno',
];

export const COMPOSITE_SUB_FIELD_TYPE_DEFINITIONS: FieldTypeDefinition[] =
  COMPOSITE_SUB_FIELD_TYPES.map((type) => {
    const def = FIELD_TYPE_DEFINITIONS.find((f) => f.type === type);
    if (!def) {
      throw new Error(
        `Missing field definition for composite sub-field: ${type}`,
      );
    }
    return def;
  });

export function getCompositeSubFieldDefinition(
  type: CompositeSubFieldType,
): FieldTypeDefinition | undefined {
  return COMPOSITE_SUB_FIELD_TYPE_DEFINITIONS.find((f) => f.type === type);
}

export function createDefaultFieldConfig(
  type: FieldType,
  overrides: Partial<{
    label: string;
    internalName: string;
    appliesTo: import('./types').CustomFieldAppliesTo;
    leadStageId: string;
    dealStageId: string;
  }> = {},
) {
  const label = overrides.label ?? '';
  const internalName = overrides.internalName ?? generateInternalName(label);
  const appliesTo = overrides.appliesTo ?? 'BOTH';
  const leadStageId = overrides.leadStageId ?? '';
  const dealStageId = overrides.dealStageId ?? '';

  return {
    label,
    internalName,
    description: '',
    type,
    placeholder: '',
    defaultValue: '',
    appliesTo,
    leadStageId,
    dealStageId,
    stageId: leadStageId || dealStageId,
    required: false,
    active: true,
    readOnly: false,
    multiSelect: false,
    searchable: true,
    visibleInLists: true,
    visibleInDetail: true,
    showInFilters: false,
    showInGlobalSearch: false,
    showInReports: true,
    displayOrder: 0,
    validation: {},
    options: [],
    bindings: [],
    settings: {
      defaultDueDays: null,
      allowResponsibleAssignee: false,
      allowDueDate: false,
      ...(type === 'composite' ? { subFields: [] } : {}),
    },
  };
}
