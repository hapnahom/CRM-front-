'use client';

import { Building2, Briefcase, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { cn } from '@/lib/utils';
import {
  personInitials,
  resolvePlanningScopeName,
  type PlanningPersonProfile,
} from '@/components/sales-targeting/planning/planningPersonProfiles';

type Props = {
  node: TargetPlanningHierarchyNode;
  profiles: Map<string, PlanningPersonProfile>;
  indentPx?: number;
  showScopeIcon?: boolean;
  className?: string;
  nameClassName?: string;
};

function ScopeLevelIcon({
  scopeLevel,
}: {
  scopeLevel: TargetPlanningHierarchyNode['scopeLevel'];
}) {
  switch (scopeLevel) {
    case 'company':
      return <Building2 size={14} className="text-muted-foreground" />;
    case 'department':
      return <Briefcase size={14} className="text-muted-foreground" />;
    case 'team':
      return <Users size={14} className="text-muted-foreground" />;
    default:
      return null;
  }
}

export function PlanningPersonCell({
  node,
  profiles,
  indentPx = 0,
  showScopeIcon = false,
  className,
  nameClassName,
}: Props) {
  const name = resolvePlanningScopeName(node, profiles);
  const isPerson = node.scopeLevel === 'person';
  const profile =
    isPerson && node.scopeId ? profiles.get(node.scopeId) : undefined;
  const avatarUrl = profile?.avatarUrl ?? null;

  if (!isPerson) {
    return (
      <span
        className={cn('flex min-w-0 items-center gap-2', className)}
        style={{ paddingLeft: indentPx > 0 ? `${indentPx}px` : undefined }}
      >
        {showScopeIcon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated">
            <ScopeLevelIcon scopeLevel={node.scopeLevel} />
          </span>
        ) : null}
        <span
          className={cn(
            'truncate text-sm font-medium text-foreground',
            nameClassName,
          )}
        >
          {name}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn('flex min-w-0 items-center gap-2.5', className)}
      style={{ paddingLeft: indentPx > 0 ? `${indentPx}px` : undefined }}
    >
      <Avatar className="size-8 shrink-0 rounded-full">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="bg-brand-muted text-[9px] font-bold text-brand">
          {personInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'truncate text-sm font-medium text-foreground',
          nameClassName,
        )}
      >
        {name}
      </span>
    </span>
  );
}
