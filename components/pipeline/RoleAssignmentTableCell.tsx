'use client';

import type { CSSProperties } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TableCell } from '@/components/ui/table';
import {
  resolveRoleAssigneeDisplay,
  type RoleAssignmentLike,
} from '@/lib/pipeline/role-columns';

function initials(name: string): string {
  if (name === '—') return '—';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function RoleAssignmentTableCell({
  columnId,
  roleId,
  isPrimary,
  record,
  style,
  className,
}: {
  columnId: string;
  roleId: string;
  isPrimary?: boolean;
  record: {
    roleAssignments?: RoleAssignmentLike[];
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
  style?: CSSProperties;
  className?: string;
}) {
  const assignee = resolveRoleAssigneeDisplay(record, roleId, { isPrimary });

  return (
    <TableCell
      key={columnId}
      style={style}
      className={className ?? 'max-w-0 px-4 py-3'}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="size-6 shrink-0">
          {assignee.avatarUrl ? (
            <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
          ) : null}
          <AvatarFallback className="bg-brand-muted text-[9px] text-brand-hover">
            {assignee.name === '—' ? '—' : initials(assignee.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className="min-w-0 truncate text-xs text-foreground"
          title={assignee.name}
        >
          {assignee.name}
        </span>
      </div>
    </TableCell>
  );
}

export function RoleAssignmentInlineCell({
  roleId,
  isPrimary,
  record,
  className,
}: {
  roleId: string;
  isPrimary?: boolean;
  record: {
    roleAssignments?: RoleAssignmentLike[];
    responsibleUser?: {
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null;
  };
  className?: string;
}) {
  const assignee = resolveRoleAssigneeDisplay(record, roleId, { isPrimary });
  return (
    <span className={className ?? 'text-[11px] text-foreground'}>
      {assignee.name}
    </span>
  );
}
