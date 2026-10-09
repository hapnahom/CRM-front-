import type { PipelineRoleAppliesTo } from '@/store/server/features/pipeline-roles/queries';

export type RolePipelineListColumnId = `role:${string}`;

export type RoleAssignmentLike = {
  roleId: string;
  userId?: string;
  roleName?: string;
  isPrimary?: boolean;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    selamnewId?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export function roleColumnId(roleId: string): RolePipelineListColumnId {
  return `role:${roleId}`;
}

export function parseRoleColumnId(id: string): string | null {
  if (!id.startsWith('role:')) return null;
  return id.slice('role:'.length) || null;
}

export function roleAppliesToEntity(
  appliesTo: PipelineRoleAppliesTo | undefined,
  entity: 'LEAD' | 'DEAL',
): boolean {
  if (!appliesTo || appliesTo === 'BOTH') return true;
  return appliesTo === entity;
}

export function resolveRoleAssigneeDisplay(
  record: {
    roleAssignments?: RoleAssignmentLike[];
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
      avatarUrl?: string | null;
    } | null;
  },
  roleId: string,
  options?: { isPrimary?: boolean },
): { name: string; avatarUrl?: string | null } {
  const assignment = record.roleAssignments?.find(
    (row) => row.roleId === roleId,
  );
  const user = assignment?.user;
  if (user) {
    const name =
      user.name?.trim() || user.email?.trim() || user.selamnewId?.trim() || '';
    if (name) {
      return { name, avatarUrl: user.avatarUrl ?? null };
    }
  }

  const isPrimary = options?.isPrimary ?? assignment?.isPrimary;
  if (isPrimary && record.responsibleUser) {
    const name =
      record.responsibleUser.name?.trim() ||
      record.responsibleUser.email?.trim() ||
      record.responsibleUser.selamnewId?.trim() ||
      '';
    if (name) {
      return {
        name,
        avatarUrl: record.responsibleUser.avatarUrl ?? null,
      };
    }
  }

  return { name: '—' };
}
