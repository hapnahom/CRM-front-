export type NumericFieldType = 'number' | 'decimal' | 'currency';

export function numericFieldHint(type: NumericFieldType): string {
  switch (type) {
    case 'number':
      return 'Whole numbers only';
    case 'decimal':
      return 'Decimal numbers allowed';
    case 'currency':
      return 'Numeric amount only';
  }
}

export function numericFieldPlaceholder(
  type: NumericFieldType,
  custom?: string | null,
): string {
  if (custom?.trim()) return custom.trim();
  switch (type) {
    case 'number':
      return 'Enter a whole number';
    case 'decimal':
      return 'Enter a decimal number';
    case 'currency':
      return 'Enter amount';
  }
}

export function formatNumericFieldDisplay(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  return String(value);
}

function allowsPartialNumericInput(
  raw: string,
  type: NumericFieldType,
): boolean {
  if (raw === '' || raw === '-') return true;
  if (type === 'number') return /^-?\d*$/.test(raw);
  return /^-?(\d*\.?\d*)$/.test(raw);
}

function isCompleteNumericInput(raw: string, type: NumericFieldType): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '.') return false;
  if (type === 'number') return /^-?\d+$/.test(trimmed);
  return /^-?(\d+\.?\d*|\.\d+)$/.test(trimmed);
}

/** Inline validation while the user is typing or on blur. */
export function validateNumericFieldInput(
  raw: string,
  type: NumericFieldType,
  opts?: { onBlur?: boolean },
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (!allowsPartialNumericInput(raw, type)) {
    return type === 'number'
      ? 'Enter a whole number (digits only).'
      : 'Enter a valid number.';
  }

  if (type === 'number' && raw.includes('.')) {
    return 'Decimals are not allowed.';
  }

  if (opts?.onBlur && !isCompleteNumericInput(raw, type)) {
    return type === 'number'
      ? 'Enter a complete whole number.'
      : 'Enter a complete number.';
  }

  return null;
}

export function validateNumericFieldValue(
  type: NumericFieldType,
  value: unknown,
  label: string,
): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return `${label} must be a number`;
    if (type === 'number' && !Number.isInteger(value)) {
      return `${label} must be a whole number`;
    }
    return null;
  }

  if (typeof value === 'string') {
    const inputError = validateNumericFieldInput(value, type, { onBlur: true });
    if (inputError) return `${label}: ${inputError}`;
    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed)) return `${label} must be a number`;
    if (type === 'number' && !Number.isInteger(parsed)) {
      return `${label} must be a whole number`;
    }
    return null;
  }

  return `${label} must be a number`;
}

export function commitNumericFieldInput(
  raw: string,
  type: NumericFieldType,
): number | '' | string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (isCompleteNumericInput(trimmed, type)) {
    return Number(trimmed);
  }

  return raw;
}
