import type { CustomFieldConfig } from '@/modules/custom-fields';
import type { PartnerRole, PartnerRoleFieldGroup } from '../types';

/**
 * Resolve role-scoped custom fields for the given partner role IDs.
 * Prefer `useFieldsForPartnerRoles` hook for API-backed data.
 */
export function getFieldsForPartnerRoles(
  roleIds: string[],
  options?: {
    roles?: PartnerRole[];
    fields?: CustomFieldConfig[];
    activeOnly?: boolean;
  },
): PartnerRoleFieldGroup[] {
  const uniqueIds = [...new Set(roleIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const roles = options?.roles ?? [];
  const allFields = options?.fields ?? [];
  const activeOnly = options?.activeOnly ?? true;
  const roleById = new Map(roles.map((r) => [r.id, r]));

  return uniqueIds
    .map((roleId) => {
      const role = roleById.get(roleId);
      if (!role) return null;
      if (activeOnly && !role.isActive) return null;

      const fields = allFields
        .filter((f) => f.stageId === roleId)
        .filter((f) => (activeOnly ? f.active : true))
        .sort((a, b) => a.displayOrder - b.displayOrder);

      return { role, fields } satisfies PartnerRoleFieldGroup;
    })
    .filter((g): g is PartnerRoleFieldGroup => g !== null);
}

export function countFieldsForRole(roleId: string): number {
  void roleId;
  return 0;
}

export function flattenRoleFieldGroups(
  groups: PartnerRoleFieldGroup[],
): CustomFieldConfig[] {
  return groups.flatMap((g) => g.fields);
}
