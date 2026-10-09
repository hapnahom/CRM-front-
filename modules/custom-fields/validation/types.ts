/**
 * Extensible custom-field validation rules (mirrors backend engine).
 * Stored in EntityField.settings.validationRules.
 */

export type ValidationRuleCategory =
  | 'number'
  | 'text'
  | 'date'
  | 'list'
  | 'file';

export type NumberOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
export type TextOperator =
  | 'minLength'
  | 'maxLength'
  | 'startsWith'
  | 'endsWith'
  | 'contains'
  | 'regex';
export type DateOperator = 'before' | 'after' | 'between';
export type ListOperator = 'mustContain' | 'mustNotContain';
export type FileOperator = 'maxFileSize' | 'allowedExtensions';

export type ValidationRuleOperator =
  | NumberOperator
  | TextOperator
  | DateOperator
  | ListOperator
  | FileOperator;

export interface ValidationRule {
  id: string;
  category: ValidationRuleCategory;
  operator: ValidationRuleOperator;
  value?: unknown;
  message?: string;
}

export interface FieldValidationIssue {
  entityFieldId: string;
  message: string;
  code: 'REQUIRED' | 'RULE_FAILED';
}

export const NUMBER_OPERATOR_OPTIONS: Array<{
  value: NumberOperator;
  label: string;
}> = [
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'eq', label: 'Equal' },
  { value: 'between', label: 'Between' },
];

export const TEXT_OPERATOR_OPTIONS: Array<{
  value: TextOperator;
  label: string;
}> = [
  { value: 'minLength', label: 'Minimum length' },
  { value: 'maxLength', label: 'Maximum length' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'contains', label: 'Contains' },
  { value: 'regex', label: 'Regular expression' },
];

export const DATE_OPERATOR_OPTIONS: Array<{
  value: DateOperator;
  label: string;
}> = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

export const LIST_OPERATOR_OPTIONS: Array<{
  value: ListOperator;
  label: string;
}> = [
  { value: 'mustContain', label: 'Must contain' },
  { value: 'mustNotContain', label: 'Must not contain' },
];

export const FILE_OPERATOR_OPTIONS: Array<{
  value: FileOperator;
  label: string;
}> = [
  { value: 'maxFileSize', label: 'Maximum size (MB)' },
  { value: 'allowedExtensions', label: 'Allowed extensions' },
];

export function ruleCategoryForFieldType(
  type: string,
): ValidationRuleCategory | null {
  switch (type) {
    case 'number':
    case 'decimal':
    case 'currency':
      return 'number';
    case 'text':
    case 'textarea':
    case 'link':
    case 'address':
      return 'text';
    case 'date':
    case 'datetime':
      return 'date';
    case 'list':
      return 'list';
    case 'file':
      return 'file';
    default:
      return null;
  }
}

export function createEmptyRule(
  category: ValidationRuleCategory,
): ValidationRule {
  const defaults: Record<ValidationRuleCategory, ValidationRuleOperator> = {
    number: 'gt',
    text: 'minLength',
    date: 'after',
    list: 'mustContain',
    file: 'maxFileSize',
  };
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    operator: defaults[category],
    value: '',
    message: '',
  };
}
