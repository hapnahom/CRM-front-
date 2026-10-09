'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePartnerRoles } from '../hooks/usePartnerRoles';
import { normalizePartnerRoleIds } from '../services/roleMapping';
import { cn } from '@/lib/utils';

interface PartnerRoleBadgesProps {
  roleIds?: string[];
  className?: string;
  compact?: boolean;
}

export function PartnerRoleBadges({
  roleIds,
  className,
  compact = false,
}: PartnerRoleBadgesProps) {
  const { roles } = usePartnerRoles();
  const ids = normalizePartnerRoleIds(roleIds);
  const assigned = roles.filter((r) => ids.includes(r.id));

  if (assigned.length === 0) {
    return (
      <Badge variant="outline" className={cn(className)}>
        No roles
      </Badge>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {assigned.map((role) => (
        <Badge
          key={role.id}
          variant="outline"
          className={cn(
            compact ? 'text-[10px] px-1.5 py-0' : 'text-[11px]',
            'border-border bg-surface-elevated text-foreground',
          )}
        >
          {role.name}
        </Badge>
      ))}
    </div>
  );
}

interface PartnerRoleCheckboxGroupProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  error?: string;
  activeOnly?: boolean;
}

export function PartnerRoleCheckboxGroup({
  selectedRoleIds,
  onChange,
  error,
  activeOnly = true,
}: PartnerRoleCheckboxGroupProps) {
  const { roles, activeRoles } = usePartnerRoles();
  const options = activeOnly ? activeRoles : roles;

  const toggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-foreground">
        Partner Roles <span className="text-destructive">*</span>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((role) => {
          const checked = selectedRoleIds.includes(role.id);
          return (
            <label
              key={role.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                checked
                  ? 'border-brand/40 bg-brand-muted/40'
                  : 'border-border bg-surface-card hover:border-brand/20',
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                onChange={() => toggle(role.id)}
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {role.name}
                </span>
                {role.description ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {role.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
