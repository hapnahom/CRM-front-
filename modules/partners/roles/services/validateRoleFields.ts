import type { CustomFieldConfig } from '@/modules/custom-fields';
import { validateFields } from '@/modules/custom-fields/validation/engine';
import type { PartnerRoleFieldGroup } from '../types';

/**
 * Validate values against the API-backed role-scoped field groups
 * (from `useFieldsForPartnerRoles`). Returns a map of fieldId → error message.
 */
export function validateRoleScopedFieldValues(
  fieldGroups: PartnerRoleFieldGroup[],
  values: Record<string, unknown>,
): Record<string, string> {
  const fields = fieldGroups.flatMap((group) => group.fields);
  const issues = validateFields(
    fields.map((f: CustomFieldConfig) => ({
      id: f.id,
      label: f.label,
      required: f.required,
      type: f.type,
      validationRules: f.validation?.rules,
      settings: f.settings as Record<string, unknown>,
    })),
    values,
  );

  const errors: Record<string, string> = {};
  for (const issue of issues) {
    if (!errors[issue.entityFieldId]) {
      errors[issue.entityFieldId] = issue.message;
    }
  }
  return errors;
}
