'use client';

import { useMemo } from 'react';
import { formatUserName } from '@/lib/format-user-name';
import type { CustomFieldDirectory } from '@/lib/pipeline/format-custom-field-value';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';

type CustomFieldDirectoryColumn = {
  fieldType?: string;
  subFields?: Array<{ fieldType?: string }>;
  groupedFields?: Array<{
    fieldType?: string;
    subFields?: Array<{ fieldType?: string }>;
  }>;
};

function flattenDirectoryColumns(
  columns: CustomFieldDirectoryColumn[],
): Array<{ fieldType?: string; subFields?: Array<{ fieldType?: string }> }> {
  return columns.flatMap((column) => {
    if (column.groupedFields?.length) {
      return column.groupedFields.map((field) => ({
        fieldType: field.fieldType,
        subFields: field.subFields,
      }));
    }
    return [{ fieldType: column.fieldType, subFields: column.subFields }];
  });
}

export function useCustomFieldDirectory(
  columns: CustomFieldDirectoryColumn[],
): CustomFieldDirectory {
  const flattened = flattenDirectoryColumns(columns);
  const needsUsers = flattened.some(
    (column) =>
      column.fieldType === 'USER' ||
      column.subFields?.some((sub) => sub.fieldType === 'USER'),
  );
  const needsTeams = flattened.some(
    (column) =>
      column.fieldType === 'TEAM' ||
      column.subFields?.some((sub) => sub.fieldType === 'TEAM'),
  );
  const needsDepartments = flattened.some(
    (column) =>
      column.fieldType === 'DEPARTMENT' ||
      column.subFields?.some((sub) => sub.fieldType === 'DEPARTMENT'),
  );

  const { data: usersData } = useGetPlatformUsers(
    {
      page: 1,
      pageSize: 1000,
    },
    { enabled: needsUsers },
  );
  const { data: teamsData } = useGetCrmTeams({ enabled: needsTeams });
  const { data: departmentsData } = useGetDepartments(undefined, {
    enabled: needsDepartments,
  });

  return useMemo(() => {
    const directory: CustomFieldDirectory = {};

    if (needsUsers) {
      const users = new Map<string, string>();
      for (const user of usersData?.data ?? []) {
        const name = formatUserName(user, user.email || 'User');
        users.set(user.id, name);
        if (user.selamnewId) users.set(user.selamnewId, name);
      }
      directory.USER = users;
    }

    if (needsTeams) {
      const teams = new Map<string, string>();
      for (const team of teamsData?.data ?? []) {
        teams.set(team.id, team.name);
      }
      directory.TEAM = teams;
    }

    if (needsDepartments) {
      const departments = new Map<string, string>();
      for (const department of departmentsData?.data ?? []) {
        departments.set(department.id, department.name);
      }
      directory.DEPARTMENT = departments;
    }

    return directory;
  }, [
    departmentsData,
    needsDepartments,
    needsTeams,
    needsUsers,
    teamsData,
    usersData,
  ]);
}
