'use client';

import { useMemo } from 'react';
import { CatalogFormField } from '@/modules/product-catalog/components/CatalogFormPrimitives';
import { ObserversMultiSelect } from '@/components/pipeline/ObserversMultiSelect';
import { UserSingleSelect } from '@/components/pipeline/ObserversMultiSelect';
import type { PipelineRoleDto } from '@/store/server/features/pipeline-roles/queries';
import type { PlatformUser } from '@/store/server/features/userManagement/types';

export type SolutionRoleAssignmentValue = {
  roleId: string;
  userIds: string[];
};

function usersExclusiveWithRole(
  role: PipelineRoleDto,
  roles: PipelineRoleDto[],
  assignments: SolutionRoleAssignmentValue[],
): Set<string> {
  const blocked = new Set<string>();
  const exclusiveIds = new Set(role.exclusiveWithRoleIds ?? []);
  for (const other of roles) {
    if (other.id === role.id) continue;
    const mutuallyExclusive =
      exclusiveIds.has(other.id) ||
      (other.exclusiveWithRoleIds ?? []).includes(role.id);
    if (!mutuallyExclusive) continue;
    const entry = assignments.find((row) => row.roleId === other.id);
    for (const userId of entry?.userIds ?? []) {
      blocked.add(userId);
    }
  }
  return blocked;
}

export function SolutionSolutionRolesFields({
  roles,
  users,
  value,
  onChange,
  disabled,
  hint,
}: {
  roles: PipelineRoleDto[];
  users: PlatformUser[];
  value: SolutionRoleAssignmentValue[];
  onChange: (next: SolutionRoleAssignmentValue[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const valueByRole = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of value) map.set(row.roleId, row.userIds ?? []);
    return map;
  }, [value]);

  const setRoleUsers = (roleId: string, userIds: string[]) => {
    const next = value.filter((row) => row.roleId !== roleId);
    if (userIds.length) next.push({ roleId, userIds });
    onChange(next);
  };

  if (!roles.length) return null;

  return (
    <>
      {roles.map((role) => {
        const blocked = usersExclusiveWithRole(role, roles, value);
        const availableUsers = users.filter((user) => !blocked.has(user.id));
        const selected = valueByRole.get(role.id) ?? [];

        return (
          <CatalogFormField
            key={role.id}
            label={role.name}
            required={role.required}
            hint={hint}
          >
            <div
              className={
                disabled ? 'pointer-events-none opacity-60' : undefined
              }
            >
              {role.multiSelect ? (
                <ObserversMultiSelect
                  users={availableUsers}
                  value={selected}
                  onChange={(ids) => setRoleUsers(role.id, ids)}
                  placeholder={`Select ${role.name}`}
                  entityLabel={role.name}
                />
              ) : (
                <UserSingleSelect
                  users={availableUsers}
                  value={selected[0] ?? ''}
                  onChange={(userId) =>
                    setRoleUsers(role.id, userId ? [userId] : [])
                  }
                  placeholder={`Select ${role.name}`}
                />
              )}
            </div>
          </CatalogFormField>
        );
      })}
    </>
  );
}
