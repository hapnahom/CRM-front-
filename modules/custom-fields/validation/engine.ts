import type { FieldValidationIssue, ValidationRule } from './types';
import { legacySettingsToRules } from './legacy';
import { unwrapFieldValue } from '../field-value-with-description';
import {
  validateNumericFieldValue,
  type NumericFieldType,
} from '../numeric-field.util';

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    const obj = value as {
      name?: unknown;
      url?: unknown;
      value?: unknown;
    };
    // Wrapped custom field values store the primary value under `value`
    if ('value' in obj && !('name' in obj) && !('url' in obj)) {
      return isEmpty(obj.value);
    }
    // File field values are objects with at least a name/url
    if ('name' in obj || 'url' in obj) {
      return !String(obj.name ?? obj.url ?? '').trim();
    }
  }
  return false;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return '';
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function betweenBounds(raw: unknown): {
  min?: number | string;
  max?: number | string;
} {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as { min?: number | string; max?: number | string };
  }
  return {};
}

function defaultMessage(rule: ValidationRule, label: string): string {
  if (rule.message?.trim()) return rule.message.trim();
  const v = rule.value;
  switch (rule.operator) {
    case 'gt':
      return `${label} must be greater than ${v}`;
    case 'gte':
      return `${label} must be greater than or equal to ${v}`;
    case 'lt':
      return `${label} must be less than ${v}`;
    case 'lte':
      return `${label} must be less than or equal to ${v}`;
    case 'eq':
      return `${label} must equal ${v}`;
    case 'between': {
      const b = betweenBounds(v);
      return `${label} must be between ${b.min} and ${b.max}`;
    }
    case 'minLength':
      return `${label} must be at least ${v} characters`;
    case 'maxLength':
      return `${label} must be at most ${v} characters`;
    case 'startsWith':
      return `${label} must start with "${v}"`;
    case 'endsWith':
      return `${label} must end with "${v}"`;
    case 'contains':
      return `${label} must contain "${v}"`;
    case 'regex':
      return `${label} format is invalid`;
    case 'before':
      return `${label} must be before ${v}`;
    case 'after':
      return `${label} must be after ${v}`;
    case 'mustContain':
      return `${label} must include the required value`;
    case 'mustNotContain':
      return `${label} must not include the restricted value`;
    case 'maxFileSize':
      return `${label} exceeds the maximum file size`;
    case 'allowedExtensions':
      return `${label} file type is not allowed`;
    default:
      return `${label} failed validation`;
  }
}

function evaluateRule(
  rule: ValidationRule,
  value: unknown,
  label: string,
): string | null {
  if (isEmpty(value) && rule.operator !== 'minLength') return null;

  switch (rule.category) {
    case 'number': {
      const n = asNumber(value);
      if (n === null) return `${label} must be a number`;
      const threshold = asNumber(rule.value);
      switch (rule.operator) {
        case 'gt':
          return threshold !== null && !(n > threshold)
            ? defaultMessage(rule, label)
            : null;
        case 'gte':
          return threshold !== null && !(n >= threshold)
            ? defaultMessage(rule, label)
            : null;
        case 'lt':
          return threshold !== null && !(n < threshold)
            ? defaultMessage(rule, label)
            : null;
        case 'lte':
          return threshold !== null && !(n <= threshold)
            ? defaultMessage(rule, label)
            : null;
        case 'eq':
          return threshold !== null && n !== threshold
            ? defaultMessage(rule, label)
            : null;
        case 'between': {
          const b = betweenBounds(rule.value);
          const min = asNumber(b.min);
          const max = asNumber(b.max);
          if (min !== null && n < min) return defaultMessage(rule, label);
          if (max !== null && n > max) return defaultMessage(rule, label);
          return null;
        }
        default:
          return null;
      }
    }
    case 'text': {
      const s = asString(value);
      switch (rule.operator) {
        case 'minLength': {
          const min = asNumber(rule.value) ?? 0;
          return s.length < min ? defaultMessage(rule, label) : null;
        }
        case 'maxLength': {
          const max = asNumber(rule.value) ?? Number.POSITIVE_INFINITY;
          return s.length > max ? defaultMessage(rule, label) : null;
        }
        case 'startsWith':
          return !s.startsWith(asString(rule.value))
            ? defaultMessage(rule, label)
            : null;
        case 'endsWith':
          return !s.endsWith(asString(rule.value))
            ? defaultMessage(rule, label)
            : null;
        case 'contains':
          return !s.includes(asString(rule.value))
            ? defaultMessage(rule, label)
            : null;
        case 'regex': {
          try {
            const re = new RegExp(asString(rule.value));
            return !re.test(s) ? defaultMessage(rule, label) : null;
          } catch {
            return `${label} has an invalid validation pattern`;
          }
        }
        default:
          return null;
      }
    }
    case 'date': {
      const d = asDate(value);
      if (!d) return `${label} must be a valid date`;
      switch (rule.operator) {
        case 'before': {
          const bound = asDate(rule.value);
          return bound && !(d < bound) ? defaultMessage(rule, label) : null;
        }
        case 'after': {
          const bound = asDate(rule.value);
          return bound && !(d > bound) ? defaultMessage(rule, label) : null;
        }
        case 'between': {
          const b = betweenBounds(rule.value);
          const min = asDate(b.min);
          const max = asDate(b.max);
          if (min && d < min) return defaultMessage(rule, label);
          if (max && d > max) return defaultMessage(rule, label);
          return null;
        }
        default:
          return null;
      }
    }
    case 'list': {
      const selected = Array.isArray(value)
        ? value.map(asString)
        : [asString(value)];
      const target = asString(rule.value);
      if (rule.operator === 'mustContain') {
        return selected.includes(target) ? null : defaultMessage(rule, label);
      }
      if (rule.operator === 'mustNotContain') {
        return selected.includes(target) ? defaultMessage(rule, label) : null;
      }
      return null;
    }
    case 'file':
      return null;
    default:
      return null;
  }
}

export interface ValidatableField {
  id: string;
  label: string;
  required: boolean;
  type: string;
  validationRules?: ValidationRule[];
  settings?: Record<string, unknown>;
}

export function collectFieldRules(field: ValidatableField): ValidationRule[] {
  const fromSettings = legacySettingsToRules(field.settings);
  return [...fromSettings, ...(field.validationRules ?? [])];
}

function compositeSubFields(
  settings: Record<string, unknown> | undefined,
): Array<{
  key: string;
  label: string;
  fieldType?: string;
  required?: boolean;
}> {
  const raw = settings?.subFields;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const sub = item as {
        key?: string;
        label?: string;
        fieldType?: string;
        required?: boolean;
      };
      const key = String(sub.key ?? '').trim();
      const label = String(sub.label ?? '').trim();
      if (!key || !label) return null;
      return { key, label, fieldType: sub.fieldType, required: sub.required };
    })
    .filter(Boolean) as Array<{
    key: string;
    label: string;
    fieldType?: string;
    required?: boolean;
  }>;
}

function isNumericFieldType(
  type: string | undefined,
): type is NumericFieldType {
  return type === 'number' || type === 'decimal' || type === 'currency';
}

export function validateFieldValue(
  field: ValidatableField,
  value: unknown,
): FieldValidationIssue[] {
  const issues: FieldValidationIssue[] = [];
  const coreValue = unwrapFieldValue(value, {
    settings: field.settings ?? {},
  });
  if (field.required && isEmpty(coreValue)) {
    issues.push({
      entityFieldId: field.id,
      message: `${field.label} is required`,
      code: 'REQUIRED',
    });
    return issues;
  }
  if (isEmpty(coreValue)) return issues;

  if (isNumericFieldType(field.type)) {
    const typeError = validateNumericFieldValue(
      field.type,
      coreValue,
      field.label,
    );
    if (typeError) {
      issues.push({
        entityFieldId: field.id,
        message: typeError,
        code: 'INVALID_TYPE',
      });
      return issues;
    }
  }

  if (field.type === 'composite') {
    const record =
      coreValue && typeof coreValue === 'object' && !Array.isArray(coreValue)
        ? (coreValue as Record<string, unknown>)
        : {};
    for (const sub of compositeSubFields(field.settings)) {
      const subValue = record[sub.key];
      if (sub.required && isEmpty(subValue)) {
        issues.push({
          entityFieldId: field.id,
          message: `${sub.label} is required`,
          code: 'REQUIRED',
        });
        continue;
      }
      if (isEmpty(subValue)) continue;
      if (isNumericFieldType(sub.fieldType)) {
        const typeError = validateNumericFieldValue(
          sub.fieldType,
          subValue,
          `${field.label} — ${sub.label}`,
        );
        if (typeError) {
          issues.push({
            entityFieldId: field.id,
            message: typeError,
            code: 'INVALID_TYPE',
          });
        }
      }
    }
    if (issues.length) return issues;
  }

  for (const rule of collectFieldRules(field)) {
    const message = evaluateRule(rule, coreValue, field.label);
    if (message) {
      issues.push({
        entityFieldId: field.id,
        message,
        code: 'RULE_FAILED',
      });
    }
  }
  return issues;
}

export function validateFields(
  fields: ValidatableField[],
  values: Record<string, unknown>,
): FieldValidationIssue[] {
  return fields.flatMap((field) => validateFieldValue(field, values[field.id]));
}
