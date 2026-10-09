'use client';

import { useMemo } from 'react';
import {
  useGetMemberTargetRequests,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import {
  ModuleEmptyState,
  TARGETS_CARD_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { PlanningStatusBadge } from '@/components/sales-targeting/planning/planningStatusDisplay';
import { cn } from '@/lib/utils';
import type { SalesTargetRequest } from '@/store/server/features/salesTargeting/types';

const TERMINAL_STATUSES = new Set([
  'COMPANY_APPROVED',
  'RECONCILED',
  'OFFICIAL',
  'TEAM_REJECTED',
  'DEPARTMENT_REJECTED',
  'COMPANY_REJECTED',
]);

const AWAITING_STATUSES = new Set([
  'PENDING_TEAM',
  'PENDING_DEPARTMENT',
  'PENDING_COMPANY',
  'PENDING_RECONCILIATION',
  'DEPARTMENT_APPROVED',
  'DRAFT',
]);

type Props = {
  planId: string;
  currencyId: string;
  currencyCode: string;
  usesMemberProposals: boolean;
};

function requestAmount(request: SalesTargetRequest): number {
  const revision = request.revisions?.find(
    (row) => row.id === request.currentRevisionId,
  );
  return Number(revision?.amount ?? 0);
}

function ProposalHistoryRow({
  request,
  currencyCode,
  label,
}: {
  request: SalesTargetRequest;
  currencyCode: string;
  label: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {request.horizon === 'session' ? 'Period' : 'Annual'} proposal
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCompactMoney(requestAmount(request), currencyCode)}
        </span>
        <PlanningStatusBadge status={request.status} />
      </div>
    </li>
  );
}

export function PlanningMyProposalsHistory({
  planId,
  currencyId,
  currencyCode,
  usesMemberProposals,
}: Props) {
  const userId = useAuthenticationStore((state) => state.userId);
  const { salesTeams } = useSalesTargeting();

  const { data: memberRequests = [], isLoading: memberLoading } =
    useGetMemberTargetRequests(
      planId,
      { currencyId, userId: userId ?? undefined },
      usesMemberProposals && Boolean(userId),
    );

  const { data: allRequests = [], isLoading: allLoading } =
    useGetTargetRequests(planId, Boolean(planId && currencyId));

  const myTeamRequests = useMemo(() => {
    if (!userId) return [];
    return allRequests.filter(
      (request) =>
        request.targetLevel === 'team' &&
        request.submittedBy === userId &&
        request.currencyId === currencyId,
    );
  }, [allRequests, currencyId, userId]);

  const teamLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      if (team.id && team.name) map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const awaiting = useMemo(() => {
    const rows: Array<{ request: SalesTargetRequest; label: string }> = [];
    for (const request of memberRequests) {
      if (!AWAITING_STATUSES.has(request.status)) continue;
      rows.push({ request, label: 'Personal target' });
    }
    for (const request of myTeamRequests) {
      if (!AWAITING_STATUSES.has(request.status)) continue;
      rows.push({
        request,
        label: teamLabelById.get(request.teamId ?? '') ?? 'Team target',
      });
    }
    return rows;
  }, [memberRequests, myTeamRequests, teamLabelById]);

  const history = useMemo(() => {
    const rows: Array<{ request: SalesTargetRequest; label: string }> = [];
    for (const request of memberRequests) {
      if (!TERMINAL_STATUSES.has(request.status)) continue;
      rows.push({ request, label: 'Personal target' });
    }
    for (const request of myTeamRequests) {
      if (!TERMINAL_STATUSES.has(request.status)) continue;
      rows.push({
        request,
        label: teamLabelById.get(request.teamId ?? '') ?? 'Team target',
      });
    }
    return rows.sort(
      (a, b) =>
        new Date(b.request.updatedAt ?? b.request.createdAt ?? 0).getTime() -
        new Date(a.request.updatedAt ?? a.request.createdAt ?? 0).getTime(),
    );
  }, [memberRequests, myTeamRequests, teamLabelById]);

  const isLoading = memberLoading || allLoading;

  if (isLoading) {
    return (
      <div
        className={cn(
          TARGETS_CARD_CLASS,
          'px-4 py-8 text-center text-sm text-muted-foreground',
        )}
      >
        Loading your proposals…
      </div>
    );
  }

  if (awaiting.length === 0 && history.length === 0) {
    return (
      <div className={cn(TARGETS_CARD_CLASS, 'flex min-h-0 flex-1 flex-col')}>
        <ModuleEmptyState
          title="No proposal history yet"
          description="Submitted and completed proposals will appear here."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {awaiting.length > 0 ? (
        <div className={TARGETS_CARD_CLASS}>
          <div className="border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold text-foreground">Awaiting</h4>
          </div>
          <ul className="divide-y divide-border/60">
            {awaiting.map(({ request, label }) => (
              <ProposalHistoryRow
                key={request.id}
                request={request}
                currencyCode={currencyCode}
                label={label}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {history.length > 0 ? (
        <div className={TARGETS_CARD_CLASS}>
          <div className="border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold text-foreground">
              Past proposals
            </h4>
          </div>
          <ul className="divide-y divide-border/60">
            {history.map(({ request, label }) => (
              <ProposalHistoryRow
                key={request.id}
                request={request}
                currencyCode={currencyCode}
                label={label}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
