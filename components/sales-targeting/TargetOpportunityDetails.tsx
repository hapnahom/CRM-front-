'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { CustomOpportunityBadge } from '@/components/sales-targeting/forecastLayout';
import { useGetPlanCommit } from '@/store/server/features/salesTargeting/queries';
import type {
  ForecastSnapshot,
  ForecastSnapshotLine,
  SalesTargetPlan,
} from '@/store/server/features/salesTargeting/types';

export type TargetDetailsScope = {
  /** annual | session — omit to include both */
  horizon?: 'annual' | 'session';
  sessionId?: string | null;
  /** Filter snapshot orgUnit / line salesTeamId */
  teamId?: string | null;
  /** Filter snapshots belonging to any of these teams (e.g. a department rollup) */
  teamIds?: string[];
  /** When true, only company-scoped commits (no orgUnitId / userId). */
  companyOnly?: boolean;
  /** Filter lines by department name */
  department?: string | null;
  /** Prefer commits for this plan currency */
  currencyId?: string | null;
  /**
   * Prefer lines owned by this person; falls back to the full (team/parent)
   * line set with an automatic "derived from" note when the person has no
   * directly-attributed lines.
   */
  userId?: string | null;
  /**
   * When true (persons), show parent period/team opportunities
   * with an attribution note instead of person-scoped lines.
   */
  derivedFromParent?: boolean;
  parentLabel?: string;
};

function sortCommits(snaps: ForecastSnapshot[]) {
  return [...snaps].sort(
    (a, b) =>
      new Date(b.committedAt ?? b.createdAt).getTime() -
      new Date(a.committedAt ?? a.createdAt).getTime(),
  );
}

export function findRelevantCommits(
  plan: SalesTargetPlan | null | undefined,
  scope: TargetDetailsScope = {},
): ForecastSnapshot[] {
  const snaps = plan?.forecastSnapshots ?? [];
  if (!snaps.length) return [];

  return sortCommits(
    snaps.filter((snap) => {
      if (scope.horizon && (snap.horizon ?? 'annual') !== scope.horizon) {
        return false;
      }
      if (
        scope.sessionId != null &&
        scope.sessionId !== '' &&
        snap.sessionId !== scope.sessionId
      ) {
        return false;
      }
      // Annual company/team commits must not be period (session) snapshots.
      if (scope.horizon === 'annual' && snap.sessionId) {
        return false;
      }
      if (scope.companyOnly) {
        if (snap.orgUnitId || snap.userId) return false;
      }
      // Match currency exactly when requested — untagged snapshots never match.
      if (scope.currencyId?.trim()) {
        if (snap.currencyId?.trim() !== scope.currencyId.trim()) {
          return false;
        }
      }
      if (scope.userId) {
        // Prefer person-scoped commits; also allow team/parent when derivedFromParent.
        if (snap.userId && snap.userId !== scope.userId) return false;
        if (!scope.derivedFromParent && !snap.userId) return false;
      } else if (snap.userId) {
        // Non-person scopes ignore person commits.
        return false;
      }
      if (scope.teamId) {
        // Annual company commits apply to all teams; period/team commits are team-scoped.
        if (snap.orgUnitId && snap.orgUnitId !== scope.teamId) {
          return false;
        }
      }
      if (scope.teamIds && scope.teamIds.length) {
        // Company-level commits (no orgUnitId) apply broadly; team-scoped
        // commits must belong to one of the requested teams.
        if (snap.orgUnitId && !scope.teamIds.includes(snap.orgUnitId)) {
          return false;
        }
      }
      return true;
    }),
  );
}

function filterLines(
  lines: ForecastSnapshotLine[],
  scope: TargetDetailsScope,
): ForecastSnapshotLine[] {
  return lines.filter((line) => {
    if (scope.teamId && line.salesTeamId && line.salesTeamId !== scope.teamId) {
      return false;
    }
    if (
      scope.teamIds &&
      scope.teamIds.length &&
      line.salesTeamId &&
      !scope.teamIds.includes(line.salesTeamId)
    ) {
      return false;
    }
    if (
      scope.department &&
      line.department &&
      line.department.toLowerCase() !== scope.department.toLowerCase()
    ) {
      return false;
    }
    if (
      scope.sessionId &&
      line.sessionId &&
      line.sessionId !== scope.sessionId
    ) {
      return false;
    }
    return true;
  });
}

function OpportunityLinesTable({
  lines,
  currencyCode,
  teamNameById,
}: {
  lines: ForecastSnapshotLine[];
  currencyCode: string;
  teamNameById?: Map<string, string>;
}) {
  const money = (n: number) => formatCompactMoney(n, currencyCode || 'USD');

  if (!lines.length) {
    return (
      <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
        No opportunity lines for this scope.
      </p>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <table className="w-full table-fixed text-left text-[12px]">
        <thead className="border-b border-border bg-muted/30">
          <tr className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-[32%] px-3 py-2">Opportunity</th>
            <th className="hidden w-[18%] px-3 py-2 md:table-cell">Customer</th>
            <th className="hidden w-[14%] px-3 py-2 lg:table-cell">Stage</th>
            <th className="w-[12%] px-3 py-2 text-right">Weight</th>
            <th className="w-[12%] px-3 py-2 text-right">Value</th>
            <th className="w-[12%] px-3 py-2 text-right">Forecast</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const teamLabel = line.salesTeamId
              ? teamNameById?.get(line.salesTeamId)
              : undefined;
            return (
              <tr
                key={line.id}
                className={cn(
                  'border-b border-border last:border-b-0',
                  line.opportunityType === 'custom' && 'bg-amber-50/50',
                )}
              >
                <td className="px-3 py-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium text-foreground">
                      {line.opportunityName}
                    </span>
                    {line.opportunityType === 'custom' ? (
                      <CustomOpportunityBadge />
                    ) : null}
                    {line.isOverridden ? (
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 border-violet-200 bg-violet-50 px-1.5 text-[9px] font-medium text-violet-700"
                      >
                        Overridden
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {line.opportunityType === 'custom'
                      ? `Custom forecast${teamLabel ? ` · ${teamLabel}` : line.department ? ` · ${line.department}` : ''}`
                      : (line.ownerName ?? line.opportunityType)}
                    {line.customerName ? (
                      <span className="md:hidden"> · {line.customerName}</span>
                    ) : null}
                  </p>
                </td>
                <td className="hidden truncate px-3 py-2 text-muted-foreground md:table-cell">
                  {line.customerName ?? '—'}
                </td>
                <td className="hidden truncate px-3 py-2 text-muted-foreground lg:table-cell">
                  {line.stageName ?? '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {line.probability}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {money(Number(line.opportunityValue))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {money(Number(line.forecastValue))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline expandable panel showing forecast opportunity lines a target was
 * derived from. Renders nothing when no relevant commits exist (unless
 * `lines` is provided explicitly — used by company annual/period to mirror
 * the department "opportunities used" table).
 */
export function TargetOpportunityDetails({
  plan,
  scope = {},
  currencyCode,
  className,
  defaultOpen = false,
  alwaysOpen = false,
  label = 'Opportunity details',
  lines: linesOverride,
  updatedAt: updatedAtOverride,
  teamNameById,
}: {
  plan: SalesTargetPlan | null | undefined;
  scope?: TargetDetailsScope;
  currencyCode: string;
  className?: string;
  defaultOpen?: boolean;
  /** Renders the opportunity lines unconditionally, without a collapse toggle. */
  alwaysOpen?: boolean;
  label?: string;
  /**
   * When set, render these lines directly (same table as department details)
   * instead of resolving from plan commits.
   */
  lines?: ForecastSnapshotLine[];
  /** Optional timestamp label when using `lines` override. */
  updatedAt?: string | Date | null;
  /** Resolve salesTeamId → team name for custom multi-team rows. */
  teamNameById?: Map<string, string>;
}) {
  const commits = useMemo(() => {
    const all = findRelevantCommits(plan, scope);
    if (!scope.userId) return all;
    const personOnly = all.filter((snap) => snap.userId === scope.userId);
    if (personOnly.length) return personOnly;
    return scope.derivedFromParent ? all : [];
  }, [plan, scope]);

  const [open, setOpen] = useState(defaultOpen || alwaysOpen);
  const effectiveOpen = alwaysOpen || open;

  // Prefer the newest commit that actually has opportunity lines (or a
  // positive opportunityCount). Avoid blank sibling/null-currency snapshots.
  const latestCommit = useMemo(() => {
    if (!commits.length) return null;
    const withLines = commits.find((snap) => (snap.lines?.length ?? 0) > 0);
    if (withLines) return withLines;
    const withCount = commits.find((snap) => (snap.opportunityCount ?? 0) > 0);
    if (withCount) return withCount;
    return commits[0] ?? null;
  }, [commits]);

  const effectiveCommitId = latestCommit?.id ?? null;
  const commitStillOnPlan = Boolean(
    effectiveCommitId &&
      plan?.forecastSnapshots?.some((snap) => snap.id === effectiveCommitId),
  );

  const { data: commitDetail, isLoading } = useGetPlanCommit(
    plan?.id,
    effectiveCommitId ?? undefined,
    Boolean(
      effectiveOpen &&
        plan?.id &&
        effectiveCommitId &&
        commitStillOnPlan &&
        linesOverride == null,
    ),
  );

  // Never let an empty detail response wipe lines already present on the plan.
  const selected = useMemo(() => {
    const detailLines = commitDetail?.lines?.length ?? 0;
    const planLines = latestCommit?.lines?.length ?? 0;
    if (commitDetail && detailLines > 0) return commitDetail;
    if (latestCommit && planLines > 0) return latestCommit;
    return commitDetail ?? latestCommit;
  }, [commitDetail, latestCommit]);

  const scopedLines = useMemo(() => {
    if (linesOverride != null) return filterLines(linesOverride, scope);
    const raw = selected?.lines ?? [];
    return filterLines(raw, scope);
  }, [linesOverride, selected?.lines, scope]);

  const personLines = useMemo(() => {
    if (!scope.userId) return null;
    return scopedLines.filter((line) => line.ownerId === scope.userId);
  }, [scopedLines, scope.userId]);

  const usingPersonFallback =
    Boolean(scope.userId) &&
    (!personLines || personLines.length === 0) &&
    scopedLines.length > 0;

  const lines =
    personLines && personLines.length > 0 ? personLines : scopedLines;

  const hasOverrideLines = linesOverride != null;
  if (!hasOverrideLines && !commits.length) {
    return null;
  }

  const updatedLabel = hasOverrideLines
    ? updatedAtOverride
      ? `Updated ${new Date(updatedAtOverride).toLocaleString()}`
      : null
    : scope.derivedFromParent && scope.parentLabel
      ? `Derived from ${scope.parentLabel}`
      : latestCommit
        ? `Updated ${new Date(
            latestCommit.committedAt ?? latestCommit.createdAt,
          ).toLocaleString()}`
        : null;

  return (
    <div
      className={cn('rounded-md border border-border bg-muted/10', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        {alwaysOpen ? (
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            {label}
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[12px] font-medium"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {label}
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {updatedLabel}
        </span>
      </div>

      {effectiveOpen ? (
        <div className="space-y-2 border-t border-border px-3 py-3">
          {scope.derivedFromParent && !commits.some((c) => c.userId) ? (
            <p className="text-[11px] text-muted-foreground">
              Person targets inherit opportunity lines from the parent
              {scope.parentLabel
                ? ` (${scope.parentLabel})`
                : ' period/team'}{' '}
              forecast commit.
            </p>
          ) : null}
          {usingPersonFallback ? (
            <p className="text-[11px] text-muted-foreground">
              No opportunities are directly attributed to this person — showing
              {scope.parentLabel ? ` the ${scope.parentLabel}` : ' the team'}
              &apos;s opportunities instead.
            </p>
          ) : null}

          {isLoading && !hasOverrideLines && !lines.length ? (
            <p className="py-4 text-center text-[12px] text-muted-foreground">
              Loading opportunities…
            </p>
          ) : (
            <OpportunityLinesTable
              lines={lines}
              currencyCode={currencyCode}
              teamNameById={teamNameById}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
