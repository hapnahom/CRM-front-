'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import type { CustomFieldConfig } from '@/modules/custom-fields';
import { apiResponseToConfig } from '@/store/server/features/entity-fields/mappers';
import type { EntityFieldResponse } from '@/store/server/features/entity-fields/types';
import {
  usePartnerRolesQuery,
  useFieldsForPartnerRolesQuery,
  partnerKeys,
} from '@/store/server/features/partners/queries';
import {
  useCreatePartnerRole,
  useUpdatePartnerRole,
  useDeletePartnerRole,
  useActivatePartnerRole,
  useDeactivatePartnerRole,
} from '@/store/server/features/partners/mutations';
import { useEntityFieldValues } from '@/store/server/features/entity-fields/values';
import type {
  CreatePartnerRoleInput,
  PartnerRole,
  PartnerRoleFieldGroup,
  UpdatePartnerRoleInput,
} from '../types';

/** System role codes — resolve to UUIDs via `getRoleIdByCode`. */
export const PARTNER_ROLE_CODES = {
  vendor: 'vendor',
  /** Canonical code after vendors→partners migration (`Implementer` role). */
  implementationPartner: 'implementer',
  distributor: 'distributor',
} as const;

/** Legacy/alternate codes that map to the same logical role. */
export const PARTNER_ROLE_CODE_ALIASES: Record<string, string[]> = {
  vendor: ['vendor'],
  implementer: ['implementer', 'implementation_partner'],
  implementation_partner: ['implementer', 'implementation_partner'],
  distributor: ['distributor'],
};

export function expandPartnerRoleCodes(
  roleCodeOrCodes: string | string[],
): string[] {
  const input = Array.isArray(roleCodeOrCodes)
    ? roleCodeOrCodes
    : [roleCodeOrCodes];
  const out = new Set<string>();
  for (const code of input) {
    out.add(code);
    for (const alias of PARTNER_ROLE_CODE_ALIASES[code] ?? []) {
      out.add(alias);
    }
  }
  return [...out];
}

/** @deprecated Use PARTNER_ROLE_CODES + getRoleIdByCode */
export const SYSTEM_PARTNER_ROLE_IDS = PARTNER_ROLE_CODES;

type PartnerRoleFieldApi = EntityFieldResponse & {
  originatingRole?: PartnerRole | null;
};

function groupPartnerRoleFields(
  fields: PartnerRoleFieldApi[],
  roles: PartnerRole[],
): PartnerRoleFieldGroup[] {
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const grouped = new Map<string, PartnerRoleFieldGroup>();

  for (const field of fields) {
    const roleId = field.originatingRole?.id ?? field.stageId;
    const role =
      field.originatingRole ?? (roleId ? roleById.get(roleId) : undefined);
    if (!role || !roleId) continue;

    const config: CustomFieldConfig = {
      ...apiResponseToConfig(field),
      stageId: roleId,
      entityType: 'lead',
    };

    const existing = grouped.get(roleId);
    if (existing) {
      existing.fields.push(config);
    } else {
      grouped.set(roleId, { role, fields: [config] });
    }
  }

  return [...grouped.values()].map((group) => ({
    ...group,
    fields: group.fields.sort((a, b) => a.displayOrder - b.displayOrder),
  }));
}

export function usePartnerRoles() {
  const queryClient = useQueryClient();
  const rolesQuery = usePartnerRolesQuery();
  const createMutation = useCreatePartnerRole();
  const updateMutation = useUpdatePartnerRole();
  const deleteMutation = useDeletePartnerRole();
  const activateMutation = useActivatePartnerRole();
  const deactivateMutation = useDeactivatePartnerRole();

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const activeRoles = useMemo(() => roles.filter((r) => r.isActive), [roles]);

  const getRoleIdByCode = useCallback(
    (code: string) => {
      const aliases = expandPartnerRoleCodes(code);
      return roles.find((r) => aliases.includes(r.code))?.id;
    },
    [roles],
  );

  const createRole = useCallback(
    (input: CreatePartnerRoleInput) => {
      return createMutation.mutateAsync({
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
        isPrimary: input.isPrimary,
        useInSolutions: input.useInSolutions,
        solutionOrder: input.solutionOrder,
        solutionPlacement: input.solutionPlacement,
        solutionRequired: input.solutionRequired,
        solutionCardinality: input.solutionCardinality,
        filterByProductLink: input.filterByProductLink,
        solutionFieldSet: input.solutionFieldSet,
      });
    },
    [createMutation],
  );

  const updateRole = useCallback(
    (id: string, input: UpdatePartnerRoleInput) => {
      return updateMutation.mutateAsync({ id, payload: input });
    },
    [updateMutation],
  );

  const deleteRole = useCallback(
    (id: string) => {
      if (roles.find((r) => r.id === id)?.isSystem) return;
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation, roles],
  );

  const setRoleActive = useCallback(
    (id: string, isActive: boolean) => {
      if (isActive) return activateMutation.mutateAsync(id);
      return deactivateMutation.mutateAsync(id);
    },
    [activateMutation, deactivateMutation],
  );

  return {
    roles,
    activeRoles,
    isLoading: rolesQuery.isLoading,
    createRole,
    updateRole,
    deleteRole,
    setRoleActive,
    getRoleIdByCode,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles }),
  };
}

export function useFieldsForPartnerRoles(
  roleIds: string[],
): PartnerRoleFieldGroup[] {
  const { roles } = usePartnerRoles();
  const query = useFieldsForPartnerRolesQuery(roleIds);

  return useMemo(() => {
    const fields = (query.data ?? []) as PartnerRoleFieldApi[];
    return groupPartnerRoleFields(fields, roles);
  }, [query.data, roles]);
}

export function usePartnerRoleFields(roleId: string | null) {
  const groups = useFieldsForPartnerRoles(roleId ? [roleId] : []);
  const fields = useMemo(() => {
    if (!roleId) return [];
    return groups.find((g) => g.role.id === roleId)?.fields ?? [];
  }, [groups, roleId]);

  return {
    fields,
    isLoading: false,
    createField: async () => {
      throw new Error('Use CustomFieldsModule for field CRUD');
    },
    updateField: async () => {
      throw new Error('Use CustomFieldsModule for field CRUD');
    },
    deleteField: async () => {
      throw new Error('Use CustomFieldsModule for field CRUD');
    },
    setFields: () => undefined,
    toggleActive: () => undefined,
  };
}

export function usePartnerFieldValues(partnerId: string | undefined) {
  const query = useEntityFieldValues('PARTNER', partnerId);

  const values = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const row of query.data ?? []) {
      out[row.entityFieldId] = row.value;
    }
    return out;
  }, [query.data]);

  return {
    values,
    isLoading: query.isLoading,
    setValues: () => undefined,
    setValue: () => undefined,
  };
}

export function normalizePartnerRoleIds(roleIds: string[]): string[] {
  return [...new Set(roleIds.filter(Boolean))];
}
