'use client';

import { ArrowRight, Briefcase, Users, X } from 'lucide-react';
import { PrimaryButton } from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import {
  isHybridMethod,
  isRequestWorkflowMethod,
} from '@/components/sales-targeting/targetSettingMethod';
import type { TargetPlanningHierarchyNode } from '@/store/server/features/salesTargeting/types';
import { Button } from '@/components/ui/button';
import {
  PlanningStatusBadge,
  PlanningScopeTypeBadge,
} from '@/components/sales-targeting/planning/planningStatusDisplay';
import { PlanningPersonCell } from '@/components/sales-targeting/planning/PlanningPersonCell';
import { scopeLevelLabel } from '@/components/sales-targeting/planning/planningHierarchyUtils';
import {
  resolvePlanningScopeName,
  type PlanningPersonProfile,
} from '@/components/sales-targeting/planning/planningPersonProfiles';
import { cn } from '@/lib/utils';

type Props = {
  node: TargetPlanningHierarchyNode;
  currencyCode: string;
  profiles?: Map<string, PlanningPersonProfile>;
  showRequestsAction?: boolean;
  onOpenRequests?: () => void;
  onClose?: () => void;
  /** Render without outer card chrome (inside a dialog). */
  embedded?: boolean;
  /** Side panel layout for org explorer. */
  panel?: boolean;
  /** Optional parent department/company label for team/person scopes. */
  parentLabel?: string | null;
  /** Active target setting method — decides which metrics are relevant. */
  method?: string | null;
};

function primaryMetrics(
  node: TargetPlanningHierarchyNode,
  method: string | null | undefined,
  currencyCode: string,
): Array<{ label: string; value: string }> {
  const money = (value: number | null | undefined) =>
    value == null ? '—' : formatCompactMoney(value, currencyCode);

  if (isHybridMethod(method)) {
    return [
      { label: 'Official', value: money(node.officialTarget) },
      {
        label: 'Proposed',
        value: money(node.proposedTarget ?? node.originalProposal),
      },
      { label: 'Forecast', value: money(node.currentForecast) },
      { label: 'Gap', value: money(node.gap) },
    ];
  }

  if (isRequestWorkflowMethod(method)) {
    return [
      {
        label: 'Proposed',
        value: money(node.proposedTarget ?? node.originalProposal),
      },
      { label: 'Official', value: money(node.officialTarget) },
      { label: 'Forecast', value: money(node.currentForecast) },
      { label: 'Won to date', value: money(node.actualWon) },
    ];
  }

  const target = node.officialTarget ?? node.strategicTarget;
  const coverage =
    target != null && target > 0 && node.currentForecast != null
      ? `${Math.round((node.currentForecast / target) * 100)}%`
      : '—';
  return [
    { label: 'Target', value: money(target) },
    { label: 'Forecast', value: money(node.currentForecast) },
    { label: 'Won to date', value: money(node.actualWon) },
    { label: 'Forecast coverage', value: coverage },
  ];
}

export function PlanningScopeSummary({
  node,
  currencyCode,
  profiles = new Map(),
  showRequestsAction = false,
  onOpenRequests,
  onClose,
  embedded = false,
  panel = false,
  parentLabel = null,
  method,
}: Props) {
  const usesRequests = isRequestWorkflowMethod(method);
  const metrics = primaryMetrics(node, method, currencyCode);
  const displayName = resolvePlanningScopeName(node, profiles);
  const memberCount = node.children.filter(
    (child) => child.scopeLevel === 'person',
  ).length;
  const teamCount = node.children.filter(
    (child) => child.scopeLevel === 'team',
  ).length;

  const isPerson = node.scopeLevel === 'person';
  const needsAction =
    isPerson &&
    (!node.requestStatus ||
      node.requestStatus === 'DRAFT' ||
      node.requestStatus === 'TEAM_REJECTED');

  const typeLine =
    node.scopeLevel === 'team' && memberCount > 0
      ? `Team · ${memberCount} member${memberCount === 1 ? '' : 's'}`
      : node.scopeLevel === 'department' && teamCount > 0
        ? `Department · ${teamCount} team${teamCount === 1 ? '' : 's'}`
        : scopeLevelLabel(node.scopeLevel);

  const header = (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isPerson ? (
            <PlanningPersonCell
              node={node}
              profiles={profiles}
              nameClassName="text-base font-semibold"
            />
          ) : (
            <h2 className="text-base font-semibold leading-snug text-foreground">
              {displayName}
            </h2>
          )}
          <p className="mt-1 text-[12px] text-muted-foreground">{typeLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {usesRequests ? (
            <PlanningStatusBadge status={node.requestStatus} />
          ) : null}
          {panel && onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={16} />
            </Button>
          ) : null}
        </div>
      </div>
      {!panel && !embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <PlanningScopeTypeBadge scopeLevel={node.scopeLevel} />
          {memberCount > 0 ? (
            <span className="text-[12px] text-muted-foreground">
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const body = (
    <div className="flex h-full flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2.5">
        {metrics.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-3"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-1.5 text-[15px] font-bold tabular-nums text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {(parentLabel || memberCount > 0 || teamCount > 0) && (
        <ul className="space-y-2.5 border-t border-border pt-4">
          {parentLabel ? (
            <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Briefcase size={14} className="shrink-0" aria-hidden />
              <span className="truncate">
                {parentLabel}
                <span className="text-muted-foreground/70"> · Department</span>
              </span>
            </li>
          ) : null}
          {memberCount > 0 ? (
            <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Users size={14} className="shrink-0" aria-hidden />
              <span>
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </span>
            </li>
          ) : null}
          {teamCount > 0 && memberCount === 0 ? (
            <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Users size={14} className="shrink-0" aria-hidden />
              <span>
                {teamCount} team{teamCount === 1 ? '' : 's'}
              </span>
            </li>
          ) : null}
        </ul>
      )}

      {showRequestsAction && onOpenRequests ? (
        <PrimaryButton
          type="button"
          className={cn('mt-auto w-full gap-1.5', panel && 'mt-6')}
          onClick={onOpenRequests}
        >
          {needsAction || isPerson ? 'Open proposals' : 'View proposals'}
          <ArrowRight size={14} />
        </PrimaryButton>
      ) : null}
    </div>
  );

  if (panel) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-white">
        <div className="border-b border-border px-5 py-4">{header}</div>
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
          {body}
        </div>
      </aside>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-4">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="flex min-h-[280px] flex-col rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      <div className="border-b border-border px-4 py-3">{header}</div>
      <div className="px-4 py-4">{body}</div>
    </div>
  );
}
