'use client';

import { formatUserName } from '@/lib/format-user-name';

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetRoles } from '@/store/server/features/leads/roles/queries';
import { useGetUsers } from '@/store/server/features/leads/users/queries';
import { safeTransformToArray, safeMap } from '@/utils/safeDataTransform';
import { FormFieldRow, SearchableSelect, MultiSelect } from './form-controls';

export type DynamicItem = { id: number };

interface RolesSectionProps {
  roles: DynamicItem[];
  addRoleRow: () => void;
  removeRoleRow: (id: number) => void;
}

export const RolesSection: React.FC<RolesSectionProps> = ({
  roles,
  addRoleRow,
  removeRoleRow,
}) => {
  const { control } = useFormContext();
  const {
    data: rolesData = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useGetRoles();
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useGetUsers();

  // Transform roles data with proper error handling
  const safeRoles = safeTransformToArray(rolesData);
  const roleOptions = safeMap(safeRoles, (role: any) => ({
    value: role.id,
    label: role.name,
  }));

  // Transform users data with proper error handling
  const safeUsers = safeTransformToArray(users);
  const userOptions = safeMap(safeUsers, (user: any) => ({
    value: user.id,
    label: formatUserName(user),
  }));

  return (
    <div data-cy="roles-section">
      <h3
        className="text-lg font-medium text-foreground mb-2"
        data-cy="roles-section-title"
      >
        Lead Participants
      </h3>

      <div className="space-y-2" data-cy="roles-container">
        {roles.map((role, index) => (
          <div
            key={role.id}
            className="flex items-start gap-2"
            data-cy={`role-row-${index}`}
          >
            <Controller
              name={`leadParticipants.${index}.roleId`}
              control={control}
              rules={{ required: 'Role is required' }}
              render={({ field, fieldState }) => (
                <FormFieldRow
                  label="Role"
                  required
                  error={fieldState.error?.message}
                  className="flex-[0_0_150px]"
                  dataCy={`role-select-form-item-${index}`}
                >
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={roleOptions}
                    loading={rolesLoading}
                    placeholder={
                      rolesLoading ? 'Loading roles...' : 'Select Role'
                    }
                    disabled={rolesLoading || !!rolesError}
                    invalid={!!fieldState.error}
                    notFoundContent={
                      rolesLoading
                        ? 'Loading...'
                        : rolesError
                          ? 'Error loading roles'
                          : 'No roles found'
                    }
                    dataCy={`role-select-${index}`}
                  />
                </FormFieldRow>
              )}
            />
            <Controller
              name={`leadParticipants.${index}.users`}
              control={control}
              rules={{
                validate: (value) =>
                  (Array.isArray(value) && value.length > 0) ||
                  'Select user(s)',
              }}
              render={({ field, fieldState }) => (
                <FormFieldRow
                  label="Users"
                  required
                  error={fieldState.error?.message}
                  className="flex-1"
                  dataCy={`users-select-form-item-${index}`}
                >
                  <MultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={userOptions}
                    loading={usersLoading}
                    placeholder={
                      usersLoading ? 'Loading users...' : 'Select Users'
                    }
                    disabled={usersLoading || !!usersError}
                    invalid={!!fieldState.error}
                    notFoundContent={
                      usersLoading
                        ? 'Loading...'
                        : usersError
                          ? 'Error loading users'
                          : 'No users found'
                    }
                    dataCy={`users-select-${index}`}
                  />
                </FormFieldRow>
              )}
            />
            {index === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={addRoleRow}
                className="h-9 w-9 hover:bg-primary-muted"
                style={{ marginTop: '24px' }}
                data-cy="add-role-btn"
              >
                <Plus className="text-brand" />
              </Button>
            )}
            {index > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRoleRow(role.id)}
                style={{ marginTop: '24px' }}
                className="hover:bg-primary-muted"
                data-cy={`remove-role-btn-${index}`}
              >
                <X className="text-brand" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
