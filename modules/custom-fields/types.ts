import type { LucideIcon } from 'lucide-react';
import type { ValidationRule } from './validation/types';

export type EntityType = 'lead' | 'deal';

export type CustomFieldAppliesTo = 'LEAD' | 'DEAL' | 'BOTH';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'yesno'
  | 'list'
  | 'link'
  | 'address'
  | 'file'
  | 'user'
  | 'team'
  | 'department'
  | 'composite';

export type CompositeSubFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'list'
  | 'user'
  | 'yesno';

export interface CompositeSubField {
  /** Internal identifier — auto-generated from label, used in stored values. */
  key: string;
  label: string;
  fieldType: CompositeSubFieldType;
  required?: boolean;
  placeholder?: string;
  options?: ListOption[];
  /** Permitted users when fieldType is `user`. Empty = all CRM users. */
  bindings?: FieldBinding[];
}

export const MAX_COMPOSITE_SUB_FIELDS = 8;

export interface FieldTypeDefinition {
  type: FieldType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface StageRef {
  id: string;
  name: string;
  color?: string;
  category?: 'open' | 'won' | 'lost' | 'inactive';
}

export interface ListOption {
  id: string;
  label: string;
  value: string;
  sortOrder?: number;
  active?: boolean;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  department?: string;
  memberCount?: number;
}

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface FieldBinding {
  id?: string;
  bindingType: 'USER' | 'TEAM' | 'DEPARTMENT';
  bindingId: string;
  sortOrder?: number;
}

export interface CurrencyRef {
  code: string;
  name: string;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  internalName: string;
  description: string;
  type: FieldType;
  placeholder: string;
  defaultValue: string;
  appliesTo: CustomFieldAppliesTo;
  leadStageId: string;
  dealStageId: string;
  /** Primary stage alias for legacy UI helpers. */
  stageId: string;
  required: boolean;
  active: boolean;
  readOnly: boolean;
  multiSelect: boolean;
  searchable: boolean;
  visibleInLists: boolean;
  visibleInDetail: boolean;
  showInFilters: boolean;
  showInGlobalSearch: boolean;
  showInReports: boolean;
  displayOrder: number;
  validation: ValidationConfig;
  options: ListOption[];
  bindings: FieldBinding[];
  settings: FieldTypeSettings;
  entityType?: EntityType;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationConfig {
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  decimals?: number;
  validateUrl?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  allowMultipleFiles?: boolean;
  pattern?: string;
  customMessage?: string;
  /** Extensible rule engine definitions persisted in settings.validationRules */
  rules?: ValidationRule[];
  /** Workflow used when continuing past a failed validation rule */
  exceptionApprovalWorkflowId?: string | null;
}

export interface FieldTypeSettings {
  multiline?: boolean;
  currency?: string;
  decimalPrecision?: number;
  inputStyle?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  validateUrl?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string;
  allowMultipleFiles?: boolean;
  validationRules?: ValidationRule[];
  exceptionApprovalWorkflowId?: string | null;
  /** When true, selected users get deal.value on won deals (sales targets). */
  countsTowardTargetAchievement?: boolean;
  /** When true, users can provide optional details alongside the field value. */
  allowValueDescription?: boolean;
  /** Sub-fields for composite / outcome detail fields. */
  subFields?: CompositeSubField[];
  /**
   * Optional default field-responsibility due date offset in days
   * (null/empty = no default; 0 = due today; 30 → assignment date + 30 days).
   */
  defaultDueDays?: number | null;
  /** When true, this field can have a responsible assignee (shows + Assign). */
  allowResponsibleAssignee?: boolean;
  /** When true, this field can have a due date (shows + Assign). */
  allowDueDate?: boolean;
  /**
   * Report column group name. Fields sharing a group render as one column;
   * each row shows the value from its stage-specific field.
   */
  reportColumnGroup?: string | null;
  /** @deprecated Use reportColumnGroup as the column header. */
  reportColumnLabel?: string | null;
  /**
   * When true, also include this open/won-stage field in the Inactive
   * Opportunities report table (Total Pipeline is unchanged).
   */
  showInInactiveReport?: boolean;
}

export type CreateCustomFieldInput = Omit<
  CustomFieldConfig,
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateCustomFieldInput = Partial<CreateCustomFieldInput>;
