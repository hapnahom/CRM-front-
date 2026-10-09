'use client';

import { Badge } from '@/components/ui/badge';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import {
  formatRequestStatusLabel,
  scopeLevelLabel,
} from '@/components/sales-targeting/planning/planningHierarchyUtils';
import { cn } from '@/lib/utils';

export function resolvePlanningStatusLabel(
  status: TargetPlanningHierarchyNode['requestStatus'],
  blocked?: boolean,
): string {
  if (blocked) return 'Blocked';
  if (!status) return 'Not started';
  if (
    status === 'OFFICIAL' ||
    status === 'COMPANY_APPROVED' ||
    status === 'RECONCILED' ||
    status === 'TEAM_APPROVED'
  ) {
    return 'Approved';
  }
  if (status === 'DRAFT') return 'Draft';
  if (status.includes('REJECTED')) return 'Rejected';
  if (
    status === 'PENDING_TEAM' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'PENDING_COMPANY' ||
    status === 'PENDING_RECONCILIATION'
  ) {
    return 'In review';
  }
  return formatRequestStatusLabel(status);
}

export function planningStatusTone(
  status: TargetPlanningHierarchyNode['requestStatus'],
  blocked?: boolean,
): 'success' | 'warning' | 'danger' | 'muted' {
  if (blocked) return 'warning';
  if (!status) return 'muted';
  if (
    status === 'OFFICIAL' ||
    status === 'COMPANY_APPROVED' ||
    status === 'RECONCILED' ||
    status === 'TEAM_APPROVED'
  ) {
    return 'success';
  }
  if (status.includes('REJECTED')) return 'danger';
  if (
    status === 'PENDING_TEAM' ||
    status === 'PENDING_DEPARTMENT' ||
    status === 'PENDING_COMPANY' ||
    status === 'PENDING_RECONCILIATION'
  ) {
    return 'warning';
  }
  return 'muted';
}

const TONE_BADGE_CLASS: Record<
  ReturnType<typeof planningStatusTone>,
  string
> = {
  success: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200/80 bg-amber-50 text-amber-800',
  danger: 'border-red-200/80 bg-red-50 text-red-600',
  muted: 'border-border bg-muted/50 text-muted-foreground',
};

const TONE_DOT_CLASS: Record<ReturnType<typeof planningStatusTone>, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  muted: 'bg-muted-foreground/45',
};

export function PlanningStatusBadge({
  status,
  blocked,
  className,
}: {
  status: TargetPlanningHierarchyNode['requestStatus'];
  blocked?: boolean;
  className?: string;
}) {
  const tone = planningStatusTone(status, blocked);
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        TONE_BADGE_CLASS[tone],
        className,
      )}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[tone])}
        aria-hidden
      />
      {resolvePlanningStatusLabel(status, blocked)}
    </Badge>
  );
}

export function PlanningStatusText({
  status,
  blocked,
  className,
}: {
  status: TargetPlanningHierarchyNode['requestStatus'];
  blocked?: boolean;
  className?: string;
}) {
  return (
    <PlanningStatusBadge
      status={status}
      blocked={blocked}
      className={className}
    />
  );
}

export function resolveInboxStatusTone(
  label: string,
): ReturnType<typeof planningStatusTone> {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'pending' || normalized.includes('submitted to company')) {
    return 'warning';
  }
  if (normalized === 'approved' || normalized === 'completed') {
    return 'success';
  }
  if (normalized === 'submitted') {
    return 'muted';
  }
  return 'muted';
}

export function ProposalInboxStatusText({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const tone = resolveInboxStatusTone(label);
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        TONE_BADGE_CLASS[tone],
        className,
      )}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[tone])}
        aria-hidden
      />
      {label}
    </Badge>
  );
}

const SCOPE_TYPE_BADGE_CLASS: Record<
  TargetPlanningHierarchyNode['scopeLevel'],
  string
> = {
  company: 'border-border bg-surface-elevated text-foreground',
  department: 'border-border bg-surface-elevated text-muted-foreground',
  team: 'border-border bg-surface-elevated text-muted-foreground',
  person: 'border-border bg-surface-elevated text-muted-foreground',
};

export function PlanningScopeTypeBadge({
  scopeLevel,
  className,
}: {
  scopeLevel: TargetPlanningHierarchyNode['scopeLevel'];
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md px-2 py-0.5 text-[10px] font-medium',
        SCOPE_TYPE_BADGE_CLASS[scopeLevel],
        className,
      )}
    >
      {scopeLevelLabel(scopeLevel)}
    </Badge>
  );
}
