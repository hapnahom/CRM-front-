import type { ValidationRule } from './types';

/** Expand legacy flat settings into rule objects (parity with backend). */
export function legacySettingsToRules(
  settings: Record<string, unknown> | null | undefined,
): ValidationRule[] {
  if (!settings) return [];
  const rules: ValidationRule[] = [];

  if (settings.min != null) {
    rules.push({
      id: 'legacy_min',
      category: 'number',
      operator: 'gte',
      value: settings.min,
    });
  }
  if (settings.max != null) {
    rules.push({
      id: 'legacy_max',
      category: 'number',
      operator: 'lte',
      value: settings.max,
    });
  }
  if (settings.minLength != null) {
    rules.push({
      id: 'legacy_minLength',
      category: 'text',
      operator: 'minLength',
      value: settings.minLength,
    });
  }
  if (settings.maxLength != null) {
    rules.push({
      id: 'legacy_maxLength',
      category: 'text',
      operator: 'maxLength',
      value: settings.maxLength,
    });
  }
  if (settings.validateUrl) {
    rules.push({
      id: 'legacy_url',
      category: 'text',
      operator: 'regex',
      value: '^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]+(\\/\\S*)?$',
      message: 'Must be a valid URL',
    });
  }
  if (settings.maxFileSize != null) {
    rules.push({
      id: 'legacy_maxFileSize',
      category: 'file',
      operator: 'maxFileSize',
      value: settings.maxFileSize,
    });
  }
  if (settings.allowedFileTypes) {
    rules.push({
      id: 'legacy_allowedFileTypes',
      category: 'file',
      operator: 'allowedExtensions',
      value: settings.allowedFileTypes,
    });
  }

  return rules;
}
