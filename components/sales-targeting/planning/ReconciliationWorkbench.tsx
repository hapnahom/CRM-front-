'use client';

import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { HybridReconciliationSection } from '@/components/sales-targeting/HybridReconciliationSection';
import {
  HybridReconciliationSummary,
  hybridReconciliationMetrics,
} from '@/components/sales-targeting/HybridReconciliationSummary';
import { useGetReconciliationMatrix } from '@/store/server/features/salesTargeting/queries';
import {
  TARGETS_CARD_CLASS,
  ReconciliationMatrixSkeleton,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { cn } from '@/lib/utils';
import type { TargetReconciliationMatrixRow } from '@/store/server/features/salesTargeting/types';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';

type Props = {
  planId: string;
  currencyId: string;
  currencyCode: string;
  horizon?: 'annual' | 'session';
  sessionId?: string | null;
};

function MatrixRow({
  row,
  currencyCode,
  depth = 0,
}: {
  row: TargetReconciliationMatrixRow;
  currencyCode: string;
  depth?: number;
}) {
  return (
    <>
      <tr className="border-b border-border/60">
        <td
          className="px-3 py-2 text-sm"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <span className="capitalize text-foreground">{row.scopeName}</span>
          <span className="ml-2 text-[10px] uppercase text-muted-foreground">
            {row.scopeLevel}
          </span>
        </td>
        <td className="px-3 py-2 text-right text-sm tabular-nums">
          {row.proposedTarget != null
            ? formatCompactMoney(row.proposedTarget, currencyCode)
            : '—'}
        </td>
        <td className="px-3 py-2 text-right text-sm tabular-nums">
          {row.reviewedTarget != null
            ? formatCompactMoney(row.reviewedTarget, currencyCode)
            : '—'}
        </td>
        <td className="px-3 py-2 text-right text-sm tabular-nums">
          {row.gap != null ? formatCompactMoney(row.gap, currencyCode) : '—'}
        </td>
        <td className="px-3 py-2 text-[11px] text-muted-foreground">
          {row.status?.replace(/_/g, ' ') ?? '—'}
        </td>
      </tr>
      {(row.children ?? []).map((child) => (
        <MatrixRow
          key={`${child.scopeLevel}:${child.scopeId}`}
          row={child}
          currencyCode={currencyCode}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function ReconciliationWorkbench({
  planId,
  currencyId,
  currencyCode,
  horizon = 'annual',
  sessionId = null,
}: Props) {
  const { salesTeams } = useSalesTargeting();
  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      if (team.id && team.name) map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const { data, isLoading } = useGetReconciliationMatrix(
    planId,
    { currencyId, horizon, sessionId: sessionId ?? undefined },
    Boolean(planId && currencyId),
  );

  const metrics = hybridReconciliationMetrics(data ?? undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className={cn(TARGETS_CARD_CLASS, 'px-4 py-3')}>
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-brand" />
          <h3 className="text-base font-semibold text-foreground">
            Hybrid reconciliation
          </h3>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Align company strategic target with approved team proposals using
          scoped adjustments.
        </p>
      </div>

      <HybridReconciliationSummary
        data={data ?? undefined}
        currencyCode={currencyCode}
        isLoading={isLoading}
        metrics={metrics}
      />

      <div className={TARGETS_CARD_CLASS}>
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">
            Reconciliation matrix
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Department and team rows with adjustment deltas from reconciliation
            actions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 text-right font-medium">Proposed</th>
                <th className="px-3 py-2 text-right font-medium">Adjusted</th>
                <th className="px-3 py-2 text-right font-medium">Delta</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <ReconciliationMatrixSkeleton rows={5} />
              ) : (data?.matrix?.rows?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-sm text-muted-foreground"
                  >
                    No team proposals available for reconciliation yet.
                  </td>
                </tr>
              ) : (
                data!.matrix.rows.map((row) => (
                  <MatrixRow
                    key={`${row.scopeLevel}:${row.scopeId}`}
                    row={row}
                    currencyCode={currencyCode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.adjustments?.length ?? 0) > 0 ? (
        <div className={TARGETS_CARD_CLASS}>
          <div className="border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold text-foreground">
              Scoped adjustments
            </h4>
          </div>
          <ul className="divide-y divide-border/60">
            {data!.adjustments.map((adjustment) => (
              <li key={adjustment.id} className="px-4 py-3 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {adjustment.scopeLevel === 'team' && adjustment.teamId
                      ? (teamNameById.get(adjustment.teamId) ?? 'Team')
                      : adjustment.scopeLevel}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCompactMoney(
                      Number(adjustment.previousAmount ?? 0),
                      currencyCode,
                    )}
                    {' → '}
                    {formatCompactMoney(
                      Number(adjustment.newAmount ?? 0),
                      currencyCode,
                    )}
                    {' ('}
                    {formatCompactMoney(
                      Number(adjustment.amountDelta ?? 0),
                      currencyCode,
                    )}
                    {')'}
                  </span>
                </div>
                {adjustment.reason ? (
                  <p className="mt-1 text-muted-foreground">
                    {adjustment.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <HybridReconciliationSection
        planId={planId}
        currencyId={currencyId}
        currencyCode={currencyCode}
        horizon={horizon}
        sessionId={sessionId}
        embedded
        canEdit
        hybridStrategicMode
      />
    </div>
  );
}
