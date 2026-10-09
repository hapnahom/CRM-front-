import type { CustomFieldConfig } from './types';

export interface FieldValueWithDescription {
  value: unknown;
  description?: string;
}

export function fieldHasValueDescription(field: CustomFieldConfig): boolean {
  return Boolean(field.settings.allowValueDescription);
}

function isWrappedValue(stored: unknown): stored is FieldValueWithDescription {
  return (
    stored !== null &&
    typeof stored === 'object' &&
    !Array.isArray(stored) &&
    'value' in stored
  );
}

/** Extract the primary field value from stored form/API data. */
export function unwrapFieldValue(
  stored: unknown,
  field?: Pick<CustomFieldConfig, 'settings'>,
): unknown {
  const allowDescription = field
    ? fieldHasValueDescription(field as CustomFieldConfig)
    : isWrappedValue(stored);

  if (allowDescription && isWrappedValue(stored)) {
    return stored.value;
  }
  return stored;
}

/** Extract optional user-provided description from stored form/API data. */
export function unwrapFieldDescription(
  stored: unknown,
  field?: Pick<CustomFieldConfig, 'settings'>,
): string {
  const allowDescription = field
    ? fieldHasValueDescription(field as CustomFieldConfig)
    : isWrappedValue(stored);

  if (allowDescription && isWrappedValue(stored)) {
    return String(stored.description ?? '');
  }
  return '';
}

/** Build stored value shape for fields that allow an additional description. */
export function wrapFieldValue(
  field: CustomFieldConfig,
  value: unknown,
  description: string,
): unknown {
  if (!fieldHasValueDescription(field)) return value;

  return {
    value,
    ...(description ? { description } : {}),
  };
}

/** Normalize API values into the form state shape. */
export function normalizeStoredFieldValue(
  stored: unknown,
  field: CustomFieldConfig,
): unknown {
  if (!fieldHasValueDescription(field)) {
    return unwrapFieldValue(stored, field);
  }

  if (isWrappedValue(stored)) {
    return {
      value: stored.value,
      ...(typeof stored.description === 'string' && stored.description.trim()
        ? { description: stored.description.trim() }
        : {}),
    };
  }

  return { value: stored ?? '' };
}

/** Unwrap stored values for display formatters. */
export function splitStoredFieldValue(stored: unknown): {
  value: unknown;
  description?: string;
} {
  if (isWrappedValue(stored)) {
    const desc =
      typeof stored.description === 'string' && stored.description.trim()
        ? stored.description.trim()
        : undefined;
    return { value: stored.value, description: desc };
  }
  return { value: stored };
}
