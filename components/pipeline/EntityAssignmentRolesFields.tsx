'use client';

import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { UserSingleSelect } from '@/components/pipeline/ObserversMultiSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  usePipelineRolesForStage,
  isEntityRole,
  type PipelineRoleDto,
  type PipelineRoleAssignmentEntityType,
} from '@/store/server/features/pipeline-roles/queries';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import { formatUserName } from '@/lib/format-user-name';
import { cn } from '@/lib/utils';
import { dealUiLabel } from '@/config/salesWorkflow';

export type RoleAssignmentValue = { roleId: string; userId: string };

export function mapAssignmentsFromQuery(
  rows: Array<{ roleId: string; userId: string }> | undefined,
): RoleAssignmentValue[] {
  return (rows ?? [])
    .filter((row) => row.roleId && row.userId)
    .map((row) => ({ roleId: row.roleId, userId: row.userId }));
}

/** Latest assignment per role (incoming overrides stored). */
/** Drop assignments for roles that no longer apply after a stage change (keep valid picks). */
export function pruneRoleAssignmentsToStage(
  assignments: RoleAssignmentValue[],
  roles: PipelineRoleDto[],
): RoleAssignmentValue[] {
  const allowed = new Set(roles.map((r) => r.id));
  return assignments.filter((a) => allowed.has(a.roleId));
}

/** Final payload for create/save — merges primary owner + form picks, drops empty rows. */
export function buildEntityRoleAssignmentsForSubmit(
  roles: PipelineRoleDto[],
  assignments: RoleAssignmentValue[],
  responsibleUserId?: string | null,
): RoleAssignmentValue[] {
  const primary = roles.find((r) => r.isPrimary);
  const layers: RoleAssignmentValue[][] = [assignments];
  if (primary?.id && responsibleUserId?.trim()) {
    layers.push([{ roleId: primary.id, userId: responsibleUserId.trim() }]);
  }
  return pruneRoleAssignmentsToStage(
    mergeRoleAssignmentValues(...layers),
    roles,
  ).filter((a) => Boolean(a.roleId && a.userId?.trim()));
}

export function mergeRoleAssignmentValues(
  ...layers: RoleAssignmentValue[][]
): RoleAssignmentValue[] {
  const byRole = new Map<string, string>();
  for (const layer of layers) {
    for (const row of layer) {
      if (!row.roleId) continue;
      if (row.userId?.trim()) {
        byRole.set(row.roleId, row.userId);
      } else {
        byRole.delete(row.roleId);
      }
    }
  }
  return [...byRole.entries()].map(([roleId, userId]) => ({ roleId, userId }));
}

/** Required roles for this stage that still have no assignee. */
export function rolesNeedingAssignmentPrompt(
  roles: PipelineRoleDto[],
  assignments: RoleAssignmentValue[],
): PipelineRoleDto[] {
  const byRole = new Map(assignments.map((a) => [a.roleId, a.userId]));
  return roles.filter((role) => {
    if (!role.required) return false;
    const userId = byRole.get(role.id);
    return !userId?.trim();
  });
}

export function hasMissingRequiredRoleAssignments(
  roles: PipelineRoleDto[],
  assignments: RoleAssignmentValue[],
): boolean {
  return rolesNeedingAssignmentPrompt(roles, assignments).length > 0;
}

interface EntityAssignmentRolesFieldsProps {
  entityType: PipelineRoleAssignmentEntityType;
  stageId: string | null | undefined;
  users: PlatformUser[];
  value: RoleAssignmentValue[];
  onChange: Dispatch<SetStateAction<RoleAssignmentValue[]>>;
  /** When true, hide the section if no roles are configured for the stage. */
  hideWhenEmpty?: boolean;
  disabled?: boolean;
  /** View-only: show assigned user names without pickers. */
  readOnly?: boolean;
  /**
   * When false, required-empty warning is hidden (e.g. until create/submit attempt).
   * Defaults to true so detail/edit screens keep immediate feedback.
   */
  showRequiredErrors?: boolean;
  /** When set, only these roles are shown (e.g. stage gate — missing assignees only). */
  roleIdsToShow?: string[];
  /**
   * `detail` includes prior-stage roles while on a lost stage (opportunity details).
   * Defaults to `transition` (lost isolated).
   */
  forStageMode?: 'transition' | 'detail';
  /**
   * When set (typically the current lost stage id), only roles bound to this stage
   * keep required enforcement in the UI; prior-stage roles stay optional.
   */
  enforceRequiredForStageId?: string | null;
  className?: string;
}

function setAssignment(
  rows: RoleAssignmentValue[],
  roleId: string,
  userId: string,
): RoleAssignmentValue[] {
  const next = rows.filter((r) => r.roleId !== roleId);
  if (!userId) return next;
  return [...next, { roleId, userId }];
}

export function EntityAssignmentRolesFields({
  entityType,
  stageId,
  users,
  value,
  onChange,
  hideWhenEmpty = true,
  disabled = false,
  readOnly = false,
  showRequiredErrors = true,
  roleIdsToShow,
  forStageMode = 'transition',
  enforceRequiredForStageId,
  className,
}: EntityAssignmentRolesFieldsProps) {
  const rolesQuery = usePipelineRolesForStage(entityType, stageId, {
    enabled: Boolean(stageId),
    mode: forStageMode,
  });
  const roles = useMemo(() => {
    const showSet = roleIdsToShow?.length ? new Set(roleIdsToShow) : null;
    return [...(rolesQuery.data ?? [])]
      .filter(isEntityRole)
      .filter((role) => !showSet || showSet.has(role.id))
      .map((role) => {
        if (
          enforceRequiredForStageId &&
          role.dealStageId !== enforceRequiredForStageId &&
          role.leadStageId !== enforceRequiredForStageId
        ) {
          return { ...role, required: false };
        }
        return role;
      })
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.displayOrder - b.displayOrder ||
          a.name.localeCompare(b.name),
      );
  }, [rolesQuery.data, roleIdsToShow, enforceRequiredForStageId]);

  const valueByRole = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of value) map.set(row.roleId, row.userId);
    return map;
  }, [value]);

  if (!stageId) return null;
  if (hideWhenEmpty && !rolesQuery.isLoading && roles.length === 0) return null;

  return (
    <div className={className ?? 'contents'}>
      {rolesQuery.isLoading ? (
        <p className="text-[12px] text-muted-foreground md:col-span-2">
          Loading roles…
        </p>
      ) : roles.length === 0 ? (
        <p className="text-[12px] text-muted-foreground md:col-span-2">
          No assignment roles configured for this stage.
        </p>
      ) : (
        roles.map((role) => (
          <RoleUserField
            key={role.id}
            entityType={entityType}
            role={role}
            users={users}
            value={valueByRole.get(role.id) ?? ''}
            disabled={disabled}
            readOnly={readOnly}
            showRequiredError={showRequiredErrors}
            onChange={(userId) =>
              onChange((prev) => setAssignment(prev, role.id, userId))
            }
          />
        ))
      )}
    </div>
  );
}

function primaryRoleOwnerHint(
  entityType: PipelineRoleAssignmentEntityType,
): string {
  return entityType === 'LEAD'
    ? 'Owner of the lead'
    : `Owner of the ${dealUiLabel({ lowercase: true })}`;
}

function userInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function AssignedUserCard({ user }: { user: PlatformUser | undefined }) {
  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-elevated/60 px-3 py-2.5">
        <p className="text-sm text-muted-foreground">No assignee</p>
      </div>
    );
  }

  const name = formatUserName(user, '—');
  const email = user.email?.trim() || null;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={name} />
          ) : null}
          <AvatarFallback className="bg-brand-muted text-[10px] font-semibold text-brand">
            {userInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {email ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {email}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RoleUserField({
  entityType,
  role,
  users,
  value,
  disabled = false,
  readOnly = false,
  showRequiredError = true,
  onChange,
}: {
  entityType: PipelineRoleAssignmentEntityType;
  role: PipelineRoleDto;
  users: PlatformUser[];
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  showRequiredError?: boolean;
  onChange: (userId: string) => void;
}) {
  const hint = role.isPrimary
    ? primaryRoleOwnerHint(entityType)
    : role.description;
  const assignedUser = users.find((u) => u.id === value);
  const showRequiredWarning =
    showRequiredError && !readOnly && role.required && !value.trim();

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[12px] font-medium text-foreground">
        <span>{role.name}</span>
        {role.required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {readOnly ? (
        <AssignedUserCard user={assignedUser} />
      ) : (
        <div
          className={cn(
            showRequiredWarning &&
              'rounded-md ring-1 ring-destructive/40 ring-offset-1 ring-offset-background',
          )}
        >
          <UserSingleSelect
            users={users}
            value={value}
            disabled={disabled}
            onChange={onChange}
            placeholder="No assignee"
            allowClear
            clearLabel="No assignee"
          />
        </div>
      )}
      {showRequiredWarning ? (
        <p className="text-[11px] font-medium text-destructive">
          This can&apos;t be left with no assignee.
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Returns true when every required role for the list has a userId. */
export function validateRequiredRoleAssignments(
  roles: PipelineRoleDto[],
  assignments: RoleAssignmentValue[],
  existing: RoleAssignmentValue[] = [],
): string | null {
  const merged = mergeRoleAssignmentValues(existing, assignments);
  const byRole = new Map(merged.map((a) => [a.roleId, a.userId]));
  const missing = roles.filter((r) => r.required && !byRole.get(r.id)?.trim());
  if (!missing.length) return null;
  return `Assign users to required roles: ${missing.map((r) => r.name).join(', ')}`;
}

export function hasPrimaryRole(roles: PipelineRoleDto[]): boolean {
  return roles.some((r) => r.isPrimary);
}
