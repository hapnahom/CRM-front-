'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Scale } from 'lucide-react';
import { DetailsGroupHeader } from '@/components/sales-targeting/TargetDetailsModal';
import {
  useGetCompanyReview,
  useGetReconciliation,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { partitionCompanyDetailsTeamsByDisplayRequest } from '@/components/sales-targeting/targetRequestProposalRows';
import {
  useApplyReconciliationAdjustment,
  useCompanyFinalize,
  useCreateTargetReview,
  useFinalizeReconciliation,
} from '@/store/server/features/salesTargeting/mutations';
import { useIsAssignedCompanyChief } from '@/components/sales-targeting/approvalPermissions';
import { useGetTargetApprovalWorkspaceAccess } from '@/store/server/features/salesTargeting/queries';
import {
  PrimaryButton,
  TARGETS_CARD_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TeamProposalOpportunityPicker,
  collapseDuplicateOpportunityLines,
  linesFromRequestOpportunities,
  normalizeOpportunityLinesForTargetRequestApi,
  sumAllocated,
  type ProposalOpportunityLine,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import type {
  SalesTargetRequestOpportunity,
  TargetReconciliationOpportunityRow,
  TargetReconciliationTeamRow,
} from '@/store/server/features/salesTargeting/types';
import {
  hybridAwaitingCompanyTeams,
  HybridReconciliationSummary,
  hybridReconciliationMetrics,
} from '@/components/sales-targeting/HybridReconciliationSummary';
import { isCompanyApprovedTargetRequestStatus } from '@/components/sales-targeting/hybridTargetApprovalWorkflow';
import { useHybridTargetApprovalWorkflow } from '@/components/sales-targeting/useHybridTargetApprovalWorkflow';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import {
  resolveCustomForecastSalesTeamId,
  TEAM_SCOPED_CUSTOM_OPPORTUNITY_HINT,
} from '@/components/sales-targeting/teamScopedCustomForecast';

type Props = {
  planId: string;
  currencyId: string;
  currencyCode: string;
  horizon?: 'annual' | 'session';
  sessionId?: string | null;
  /** Inside company Details modal (Hybrid or Bottom-to-Top). */
  embedded?: boolean;
  canEdit?: boolean;
  /** Hybrid: strategic gap + mark reconciled. B2T: company-approved edits only. */
  hybridStrategicMode?: boolean;
  /** Bottom-to-Top company Details: display snapshots + static dept categories. */
  bottomToTopWorkflow?: boolean;
};

type TeamDraft = {
  amount: string;
  approvedPool: ProposalOpportunityLine[];
  opportunities: ProposalOpportunityLine[];
};

function mergeHybridApprovedPool(
  pool: ProposalOpportunityLine[],
  selected: ProposalOpportunityLine[],
): ProposalOpportunityLine[] {
  const byKey = new Map<string, ProposalOpportunityLine>();
  for (const line of pool) {
    byKey.set(`${line.opportunityType}:${line.opportunityId}`, line);
  }
  for (const line of selected) {
    const key = `${line.opportunityType}:${line.opportunityId}`;
    if (!byKey.has(key)) {
      byKey.set(key, line);
    }
  }
  return collapseDuplicateOpportunityLines([...byKey.values()]);
}

function draftFromReconciliationTeam(
  team: TargetReconciliationTeamRow,
): TeamDraft {
  const approvedPool = collapseDuplicateOpportunityLines(
    linesFromRequestOpportunities(
      team.opportunities as SalesTargetRequestOpportunity[] | undefined,
    ),
  );
  return {
    amount: String(team.amount ?? 0),
    approvedPool,
    opportunities: approvedPool.map((line) => ({ ...line })),
  };
}

function groupTeamsByDepartment(teams: TargetReconciliationTeamRow[]) {
  const groups = new Map<
    string,
    {
      departmentId: string;
      departmentName: string;
      teams: TargetReconciliationTeamRow[];
    }
  >();
  for (const row of teams) {
    const departmentId = row.departmentId ?? 'unknown';
    if (!groups.has(departmentId)) {
      groups.set(departmentId, {
        departmentId,
        departmentName: row.departmentName?.trim() || 'Department',
        teams: [],
      });
    }
    groups.get(departmentId)!.teams.push(row);
  }
  return [...groups.values()].sort((a, b) =>
    a.departmentName.localeCompare(b.departmentName),
  );
}

export function HybridReconciliationSection({
  planId,
  currencyId,
  currencyCode,
  horizon = 'annual',
  sessionId = null,
  embedded = false,
  canEdit = false,
  hybridStrategicMode = false,
  bottomToTopWorkflow = false,
}: Props) {
  /** B2T company Details: view snapshots only — no reconcile / post-approve edits here. */
  const embeddedB2TViewOnly = embedded && !hybridStrategicMode;
  /** Hybrid company Details: adjust approved snapshots only (no forecast/custom adds). */
  const hybridEmbeddedReconciliationAdjust = embedded && hybridStrategicMode;
  const { plan, fiscalCalendar, salesTeams } = useSalesTargeting();
  const calendarId = plan?.calendarId ?? fiscalCalendar?.id;
  const { companyOnly } = useHybridTargetApprovalWorkflow();
  const { data, isLoading, refetch } = useGetReconciliation(
    planId,
    {
      currencyId,
      horizon,
      sessionId: sessionId ?? undefined,
    },
    Boolean(planId && currencyId && (horizon === 'annual' || sessionId)),
  );
  const { data: targetRequests = [] } = useGetTargetRequests(
    planId,
    Boolean(embedded && bottomToTopWorkflow && planId),
  );
  const isCompanyChief = useIsAssignedCompanyChief();
  const { data: approvalWorkspace } = useGetTargetApprovalWorkspaceAccess(
    planId,
    Boolean(planId),
  );
  const showFinalize = approvalWorkspace?.companyFinalize ?? isCompanyChief;
  const { data: companyReview, refetch: refetchCompanyReview } =
    useGetCompanyReview(
      planId,
      {
        currencyId,
        horizon,
        sessionId: sessionId ?? undefined,
      },
      Boolean(showFinalize && planId && currencyId),
    );
  const applyAdjustment = useApplyReconciliationAdjustment();
  const markReconciled = useFinalizeReconciliation();
  const createReview = useCreateTargetReview();
  const companyFinalize = useCompanyFinalize();

  const [strategicDraft, setStrategicDraft] = useState('');
  const [expandOverrides, setExpandOverrides] = useState<
    Record<string, boolean>
  >({});
  const [teamDrafts, setTeamDrafts] = useState<Record<string, TeamDraft>>({});

  useEffect(() => {
    if (data?.strategicTarget != null) {
      setStrategicDraft(String(data.strategicTarget));
    }
  }, [data?.strategicTarget]);

  const status = data?.reconciliationStatus ?? 'PENDING';
  const isReconciled = status === 'RECONCILED' || status === 'FINALIZED';

  const bottomUpTeams = useMemo(
    () => data?.bottomUpTeams ?? [],
    [data?.bottomUpTeams],
  );

  const teamCatalog = useMemo(
    () =>
      salesTeams.map((team) => ({
        id: team.id,
        name: team.name,
        parentDepartmentId: team.parentDepartmentId ?? null,
        parentDepartmentName: team.parentDepartmentName ?? null,
      })),
    [salesTeams],
  );

  const embeddedDisplaySections = useMemo(() => {
    if (!embedded || !bottomToTopWorkflow) {
      return null;
    }
    return partitionCompanyDetailsTeamsByDisplayRequest({
      targetRequests,
      reconciliationTeams: data?.teams ?? [],
      scope: {
        horizon,
        sessionId,
        currencyId,
      },
      companyOnlyApproval: companyOnly,
      teamCatalog,
    });
  }, [
    embedded,
    bottomToTopWorkflow,
    data?.teams,
    targetRequests,
    horizon,
    sessionId,
    currencyId,
    companyOnly,
    teamCatalog,
  ]);

  const awaitingCompanyTeams = useMemo(
    () =>
      embeddedDisplaySections?.awaitingCompany ??
      hybridAwaitingCompanyTeams(data, companyOnly),
    [embeddedDisplaySections, data, companyOnly],
  );

  const companyApprovedTeams = useMemo(
    () =>
      embeddedDisplaySections?.companyApproved ??
      bottomUpTeams.filter((row) =>
        isCompanyApprovedTargetRequestStatus(row.status),
      ),
    [embeddedDisplaySections, bottomUpTeams],
  );

  const companyApprovedByDepartment = useMemo(
    () => groupTeamsByDepartment(companyApprovedTeams),
    [companyApprovedTeams],
  );

  const embeddedHierarchyKeys = useMemo(() => {
    const keys: string[] = [];
    for (const dept of companyApprovedByDepartment) {
      keys.push(`dept:${dept.departmentId}`);
      for (const team of dept.teams) {
        keys.push(`team:${team.requestId}`);
      }
    }
    return keys;
  }, [companyApprovedByDepartment]);

  useEffect(() => {
    setExpandOverrides({});
  }, [embeddedHierarchyKeys.join('|')]);

  const isHierarchyExpanded = (key: string) => expandOverrides[key] ?? false;
  const toggleHierarchyExpanded = (key: string) =>
    setExpandOverrides((current) => ({
      ...current,
      [key]: !isHierarchyExpanded(key),
    }));
  const allHierarchyExpanded =
    embeddedHierarchyKeys.length > 0 &&
    embeddedHierarchyKeys.every((key) => isHierarchyExpanded(key));
  const setAllHierarchyExpanded = (value: boolean) =>
    setExpandOverrides(
      Object.fromEntries(embeddedHierarchyKeys.map((key) => [key, value])),
    );

  const selectedOpportunities = useMemo(() => {
    if (data?.selectedOpportunities?.length) {
      return data.selectedOpportunities;
    }
    const rows: TargetReconciliationOpportunityRow[] = [];
    for (const team of bottomUpTeams) {
      for (const line of linesFromRequestOpportunities(
        team.opportunities as SalesTargetRequestOpportunity[] | undefined,
      )) {
        rows.push({
          requestId: team.requestId,
          teamId: team.teamId,
          teamName: team.teamName,
          departmentId: team.departmentId,
          departmentName: team.departmentName,
          opportunityType: line.opportunityType,
          opportunityId: line.opportunityId,
          opportunityName: line.opportunityName,
          opportunityValue: line.opportunityValue,
          forecastValue: line.forecastValue,
          allocatedAmount: line.allocatedAmount,
        });
      }
    }
    return rows;
  }, [data?.selectedOpportunities, bottomUpTeams]);

  /** Seed drafts once per request — never wipe in-progress edits on reconciliation refetch. */
  useEffect(() => {
    const seed = embedded
      ? companyApprovedTeams
      : [...companyApprovedTeams, ...awaitingCompanyTeams];
    setTeamDrafts((prev) => {
      const next = { ...prev };
      const seen = new Set<string>();
      for (const team of seed) {
        if (!team.requestId || seen.has(team.requestId)) continue;
        seen.add(team.requestId);
        if (next[team.requestId]) continue;
        next[team.requestId] = draftFromReconciliationTeam(team);
      }
      return next;
    });
  }, [companyApprovedTeams, awaitingCompanyTeams, embedded]);

  const ensureTeamDraft = (team: TargetReconciliationTeamRow) => {
    if (!team.requestId) return;
    setTeamDrafts((prev) => {
      if (prev[team.requestId]) return prev;
      return { ...prev, [team.requestId]: draftFromReconciliationTeam(team) };
    });
  };

  const toggleExpandedTeam = (team: TargetReconciliationTeamRow) => {
    const key = `team:${team.requestId}`;
    if (!isHierarchyExpanded(key)) {
      ensureTeamDraft(team);
    }
    toggleHierarchyExpanded(key);
  };

  const saveEmbeddedCompanyApprovedTeam = async (
    team: TargetReconciliationTeamRow,
  ) => {
    if (!hybridStrategicMode) return;
    const draft =
      teamDrafts[team.requestId] ?? draftFromReconciliationTeam(team);
    const lines = collapseDuplicateOpportunityLines(draft.opportunities ?? []);
    if (lines.length === 0) {
      NotificationMessage.error({
        message: 'Opportunities required',
        description:
          'Select at least one approved opportunity or add a manual opportunity before saving.',
      });
      return;
    }
    const modifiedAmount =
      Math.round((Number(draft.amount) || sumAllocated(lines)) * 100) / 100;
    try {
      await applyAdjustment.mutateAsync({
        planId,
        currencyId,
        horizon,
        sessionId,
        requestId: team.requestId,
        modifiedAmount,
        modifiedOpportunityLines:
          normalizeOpportunityLinesForTargetRequestApi(lines),
        expectedRevisionId: team.currentRevisionId ?? undefined,
        comment: `Reconciliation adjustment for ${team.teamName}`,
      });
      NotificationMessage.success({
        message: `${team.teamName} updated`,
      });
      await refetch();
      setTeamDrafts((prev) => {
        const next = { ...prev };
        delete next[team.requestId];
        return next;
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Reload and retry.';
      NotificationMessage.error({
        message: 'Adjustment failed',
        description: message,
      });
    }
  };

  const metrics = hybridReconciliationMetrics(data);
  const { official } = metrics;

  const canMark =
    Boolean(data?.canMarkReconciled) &&
    !isReconciled &&
    !isLoading &&
    Boolean(data?.strategicTarget);
  const markReconciledHint =
    data?.markReconciledBlockers?.[0] ??
    (metrics.remaining !== 0
      ? 'Team totals must match the strategic target before you can mark reconciled.'
      : 'All team proposals must complete company approval first.');

  const renderTeamEditor = (
    team: TargetReconciliationTeamRow,
    options: {
      expanded: boolean;
      onToggle: () => void;
      onSave: () => void;
      saveLabel: string;
      showReturn?: boolean;
      statusHint?: string;
      layoutStyle?: 'card' | 'details';
      padClass?: string;
      contentPadClass?: string;
    },
  ) => {
    const layoutStyle = options.layoutStyle ?? 'card';
    const padClass = options.padClass ?? 'pl-4';
    const contentPadClass = options.contentPadClass ?? 'px-4 sm:px-5';
    const draft =
      teamDrafts[team.requestId] ?? draftFromReconciliationTeam(team);
    const approvedPool =
      draft.approvedPool ??
      collapseDuplicateOpportunityLines(draft.opportunities);
    const hybridCompanyEdit =
      hybridEmbeddedReconciliationAdjust && canEdit && !isReconciled;
    const editorDisabled = hybridCompanyEdit
      ? false
      : !canEdit || isReconciled || embeddedB2TViewOnly;
    const customForecastTeamId = resolveCustomForecastSalesTeamId(team.teamId);
    const opportunityCount = collapseDuplicateOpportunityLines(
      draft.opportunities,
    ).length;
    const teamSubtitle =
      options.statusHint ??
      `${opportunityCount} opportunit${opportunityCount === 1 ? 'y' : 'ies'}`;

    const editorBody = (
      <div className="space-y-3">
        <div className="max-w-xs">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Team target
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="mt-1.5 h-9"
            disabled={editorDisabled}
            value={draft.amount}
            onChange={(e) =>
              setTeamDrafts((prev) => {
                const current =
                  prev[team.requestId] ?? draftFromReconciliationTeam(team);
                return {
                  ...prev,
                  [team.requestId]: {
                    ...current,
                    amount: e.target.value,
                  },
                };
              })
            }
          />
        </div>
        <TeamProposalOpportunityPicker
          calendarId={calendarId}
          currencyCode={currencyCode}
          currencyId={currencyId}
          salesTeamId={customForecastTeamId}
          horizon={horizon}
          sessionId={sessionId ?? undefined}
          selected={draft.opportunities}
          onChange={(lines) => {
            const total = sumAllocated(lines);
            setTeamDrafts((prev) => {
              const current =
                prev[team.requestId] ?? draftFromReconciliationTeam(team);
              const basePool =
                current.approvedPool ??
                collapseDuplicateOpportunityLines(current.opportunities);
              return {
                ...prev,
                [team.requestId]: {
                  ...current,
                  approvedPool: mergeHybridApprovedPool(basePool, lines),
                  opportunities: lines,
                  amount: String(total),
                },
              };
            });
          }}
          {...(hybridEmbeddedReconciliationAdjust
            ? {
                flatApprovedPool: approvedPool,
                allowCustomAdd:
                  hybridCompanyEdit && Boolean(customForecastTeamId),
                planId,
                reviewMode: false as const,
                customAddTriggerLabel: 'Add Manual Opportunity',
                customAddFormHeading: 'Add custom forecast',
                customDefaultTeamLabel:
                  team.teamName ?? customForecastTeamId ?? '',
                customOpportunityHint: TEAM_SCOPED_CUSTOM_OPPORTUNITY_HINT,
              }
            : {
                reviewMode: embeddedB2TViewOnly,
                allowCustomAdd: false,
              })}
          disabled={editorDisabled}
        />
        {canEdit && !isReconciled && !embeddedB2TViewOnly ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <PrimaryButton
              className="h-8 px-3 text-[11px]"
              disabled={createReview.isLoading || applyAdjustment.isLoading}
              onClick={() => void options.onSave()}
            >
              {options.saveLabel}
            </PrimaryButton>
            {options.showReturn ? (
              <button
                type="button"
                className="h-8 rounded-md px-3 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border hover:bg-muted/60"
                disabled={createReview.isLoading || applyAdjustment.isLoading}
                onClick={() => void returnTeam(team)}
              >
                Return for revision
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );

    if (layoutStyle === 'details') {
      return (
        <li key={team.requestId}>
          <DetailsGroupHeader
            level="team"
            padClass={padClass}
            expanded={options.expanded}
            onToggleExpanded={options.onToggle}
            selectable={false}
            selection="none"
            onToggleSelection={() => {}}
            title={team.teamName ?? 'Team'}
            subtitle={teamSubtitle}
            amount={formatCompactMoney(Number(team.amount ?? 0), currencyCode)}
            progress={null}
            ariaLabel={`${team.teamName ?? 'Team'} proposals`}
          />
          {options.expanded ? (
            <div className="border-b border-border bg-surface-card">
              <div className={cn('py-4 pr-5', contentPadClass)}>
                {editorBody}
              </div>
            </div>
          ) : null}
        </li>
      );
    }

    return (
      <li key={team.requestId} className="px-4 py-2.5 sm:px-5 sm:py-3">
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors',
            'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            options.expanded && 'bg-muted/30',
          )}
          onClick={options.onToggle}
        >
          <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-muted-foreground">
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  options.expanded ? 'rotate-0' : '-rotate-90',
                )}
              />
            </span>
            <span className="truncate">{team.teamName}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[13px] font-semibold tabular-nums text-foreground">
              {formatCompactMoney(Number(team.amount ?? 0), currencyCode)}
            </span>
            {options.statusHint ? (
              <span className="mt-0.5 block text-[10px] font-medium text-amber-800">
                {options.statusHint}
              </span>
            ) : (
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {options.expanded ? 'Hide details' : 'View details'}
              </span>
            )}
          </span>
        </button>
        {options.expanded ? (
          <div className="mt-2 space-y-3 rounded-lg border border-border bg-surface-elevated/60 p-3 sm:p-4">
            {editorBody}
          </div>
        ) : null}
      </li>
    );
  };

  const renderEmbeddedDepartmentGroups = (
    departments: ReturnType<typeof groupTeamsByDepartment>,
    teamOptions: {
      onSave: (team: TargetReconciliationTeamRow) => void;
      saveLabel: string;
      showReturn?: boolean;
      statusHint?: (team: TargetReconciliationTeamRow) => string | undefined;
    },
  ) => (
    <ul>
      {departments.map((dept) => {
        const deptKey = `dept:${dept.departmentId}`;
        const deptExpanded = isHierarchyExpanded(deptKey);
        const deptTotal = dept.teams.reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0,
        );
        const teamCount = dept.teams.length;
        const opportunityCount = dept.teams.reduce((sum, team) => {
          const draft =
            teamDrafts[team.requestId] ?? draftFromReconciliationTeam(team);
          return (
            sum + collapseDuplicateOpportunityLines(draft.opportunities).length
          );
        }, 0);
        return (
          <li key={dept.departmentId}>
            <DetailsGroupHeader
              level="department"
              padClass="pl-4"
              expanded={deptExpanded}
              onToggleExpanded={() => toggleHierarchyExpanded(deptKey)}
              selectable={false}
              selection="none"
              onToggleSelection={() => {}}
              title={dept.departmentName}
              subtitle={[
                `${teamCount} team${teamCount === 1 ? '' : 's'}`,
                `${opportunityCount} opportunit${opportunityCount === 1 ? 'y' : 'ies'}`,
              ].join(' · ')}
              amount={formatCompactMoney(deptTotal, currencyCode)}
              progress={null}
              ariaLabel={`${dept.departmentName} proposals`}
            />
            {deptExpanded ? (
              dept.teams.length === 0 ? (
                <p className="border-b border-border py-3 pl-11 pr-5 text-[12px] text-muted-foreground">
                  No teams in this department.
                </p>
              ) : (
                <ul className="divide-y divide-border border-b border-border">
                  {dept.teams.map((team) =>
                    renderTeamEditor(team, {
                      expanded: isHierarchyExpanded(`team:${team.requestId}`),
                      onToggle: () => toggleExpandedTeam(team),
                      onSave: () => teamOptions.onSave(team),
                      saveLabel: teamOptions.saveLabel,
                      showReturn: teamOptions.showReturn,
                      statusHint: teamOptions.statusHint?.(team),
                      layoutStyle: 'details',
                      padClass: 'pl-11',
                      contentPadClass: 'pl-[4.5rem]',
                    }),
                  )}
                </ul>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  const returnTeam = async (team: TargetReconciliationTeamRow) => {
    if (!team.currentRevisionId) {
      NotificationMessage.error({
        message: 'Cannot return',
        description: 'Missing revision on this proposal.',
      });
      return;
    }
    try {
      await createReview.mutateAsync({
        requestId: team.requestId,
        reviewLevel: 'COMPANY',
        decision: 'RETURNED',
        expectedRevisionId: team.currentRevisionId,
        comment: `Returned ${team.teamName} for revision during hybrid reconciliation`,
      });
      await applyAdjustment.mutateAsync({
        planId,
        currencyId,
        horizon,
        sessionId,
        comment: `RETURNED ${team.teamName} for revision`,
      });
      NotificationMessage.success({
        message: `${team.teamName} returned`,
        description: 'Team can revise and resubmit through approvals.',
      });
      void refetch();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Could not return proposal.';
      NotificationMessage.error({
        message: 'Return failed',
        description: message,
      });
    }
  };

  return (
    <section className={cn('space-y-4', embedded && 'space-y-4')}>
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <p className="m-0 text-[13px] font-semibold tracking-tight text-foreground">
              Hybrid reconciliation
            </p>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                isReconciled
                  ? 'bg-emerald-500/10 text-emerald-900 ring-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-900 ring-amber-500/25',
              )}
            >
              {status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="m-0 text-[11px] text-muted-foreground">
            Strategic + bottom-up → reconcile → finalize → official
          </p>
        </div>
      ) : null}

      {!embedded ? (
        <HybridReconciliationSummary
          data={data}
          currencyCode={currencyCode}
          isLoading={isLoading}
          selectedOpportunityCount={selectedOpportunities.length}
        />
      ) : null}

      {/* Department + team totals */}
      {!embedded &&
      ((data?.departments ?? []).length > 0 || bottomUpTeams.length > 0) ? (
        <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
          <p className="border-b border-border px-5 py-3 text-[12px] font-semibold text-foreground">
            Department & team totals
          </p>
          {(data?.departments ?? []).length > 0 ? (
            <ul className="divide-y divide-border">
              {(data?.departments ?? []).map((dept) => (
                <li key={dept.departmentId} className="px-5 py-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">
                      {dept.departmentName}
                    </span>
                    <span className="text-[12px] tabular-nums text-muted-foreground">
                      {formatCompactMoney(
                        Number(dept.bottomUp ?? 0),
                        currencyCode,
                      )}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {(dept.teams ?? []).map((team) => (
                      <li
                        key={team.requestId}
                        className="flex justify-between text-[12px] text-muted-foreground"
                      >
                        <span>{team.teamName}</span>
                        <span className="tabular-nums">
                          {formatCompactMoney(
                            Number(team.amount ?? 0),
                            currencyCode,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border">
              {bottomUpTeams.map((team) => (
                <li
                  key={team.requestId}
                  className="flex justify-between px-5 py-2.5 text-[12px]"
                >
                  <span className="font-medium text-foreground">
                    {team.teamName}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCompactMoney(Number(team.amount ?? 0), currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {isReconciled && official != null ? (
            <div className="flex justify-between border-t border-border bg-emerald-500/[0.04] px-5 py-3 text-[12px]">
              <span className="font-semibold text-foreground">
                Official company target
              </span>
              <span className="font-bold tabular-nums text-foreground">
                {formatCompactMoney(official, currencyCode)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Selected opportunities */}
      {!embedded ? (
        <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <p className="m-0 text-[12px] font-semibold text-foreground">
              Selected opportunities
            </p>
            <p className="m-0 text-[11px] text-muted-foreground">
              Company-approved proposals
            </p>
          </div>
          {selectedOpportunities.length === 0 ? (
            <p className="m-0 px-5 py-8 text-center text-[12px] text-muted-foreground">
              {(data?.pendingBottomUpTeams ?? []).length > 0
                ? 'Waiting for company approval on team proposals.'
                : 'No company-approved opportunities yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Team</th>
                    <th className="px-3 py-2.5 font-medium">Department</th>
                    <th className="px-3 py-2.5 font-medium">Opportunity</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      Allocated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedOpportunities.map((row) => (
                    <tr
                      key={`${row.requestId}:${row.opportunityType}:${row.opportunityId}`}
                    >
                      <td className="px-5 py-2.5 font-medium text-foreground">
                        {row.teamName}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.departmentName ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">
                        {row.opportunityName?.trim() || row.opportunityId}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.opportunityType}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-foreground">
                        {formatCompactMoney(
                          Number(row.allocatedAmount ?? 0),
                          currencyCode,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {!embedded && awaitingCompanyTeams.length > 0 ? (
        <div className={cn(TARGETS_CARD_CLASS, 'px-5 py-4')}>
          <p className="m-0 text-[12px] font-semibold text-foreground">
            Awaiting company approval
          </p>
          <ul className="mt-2 space-y-1">
            {awaitingCompanyTeams.map((row) => (
              <li
                key={row.requestId || row.teamId}
                className="flex justify-between gap-2 text-[12px]"
              >
                <span>{row.teamName}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCompactMoney(Number(row.amount ?? 0), currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {embedded && companyApprovedByDepartment.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold text-foreground">
                {hybridStrategicMode
                  ? 'Company-approved proposals'
                  : 'Approved proposals by department'}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {hybridStrategicMode
                  ? 'Expand departments and teams to review or adjust proposals.'
                  : 'Expand departments and teams to review company-approved proposals.'}
              </p>
            </div>
            {embeddedHierarchyKeys.length > 0 ? (
              <button
                type="button"
                onClick={() => setAllHierarchyExpanded(!allHierarchyExpanded)}
                className="shrink-0 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {allHierarchyExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface-elevated py-2 pl-4 pr-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="min-w-0 flex-1 normal-case tracking-normal text-[12px] font-semibold text-foreground">
                Departments & teams
              </span>
              <span className="w-28 shrink-0 text-right normal-case tracking-normal">
                Target value
              </span>
            </div>
            {renderEmbeddedDepartmentGroups(companyApprovedByDepartment, {
              onSave: (team) => void saveEmbeddedCompanyApprovedTeam(team),
              saveLabel: 'Save adjustment',
              showReturn: hybridStrategicMode && !embedded,
            })}
          </div>
        </div>
      ) : !embedded && bottomUpTeams.length > 0 ? (
        <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
          <p className="border-b border-border px-5 py-3 text-[12px] font-semibold text-foreground">
            Adjust teams & opportunities
          </p>
          <ul className="divide-y divide-border">
            {bottomUpTeams.map((team) =>
              renderTeamEditor(team, {
                expanded: isHierarchyExpanded(`team:${team.requestId}`),
                onToggle: () => toggleExpandedTeam(team),
                onSave: () => void saveEmbeddedCompanyApprovedTeam(team),
                saveLabel: 'Apply adjustment',
                showReturn: true,
              }),
            )}
          </ul>
        </div>
      ) : embedded && companyApprovedTeams.length === 0 ? (
        <div
          className={cn(
            TARGETS_CARD_CLASS,
            'flex flex-col items-center px-6 py-10 text-center',
          )}
        >
          <p className="m-0 text-[13px] font-semibold text-foreground">
            No company-approved proposals yet
          </p>
          <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Teams still in department or company review stay in Requests. They
            appear here after company approval.
          </p>
        </div>
      ) : null}

      {embedded && bottomToTopWorkflow && showFinalize ? (
        <div
          className={cn(
            TARGETS_CARD_CLASS,
            'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold text-foreground">
              Company finalization
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Official company, department, and team targets are created only
              when you finalize. Approvals alone do not publish this plan.
            </p>
            {(companyReview?.finalizeBlockedReasons ?? []).length > 0 &&
            !companyReview?.canFinalize ? (
              <p className="mt-1 text-[11px] text-amber-900">
                {(companyReview.finalizeBlockedReasons as string[])
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
          <PrimaryButton
            className="h-9 shrink-0 px-3.5 text-[12px]"
            disabled={companyFinalize.isLoading || !companyReview?.canFinalize}
            onClick={() =>
              void companyFinalize
                .mutateAsync({
                  planId,
                  currencyId,
                  horizon,
                  sessionId: sessionId ?? undefined,
                })
                .then(() => {
                  NotificationMessage.success({
                    message: 'Plan finalized',
                    description: 'Official company and team targets published.',
                  });
                  void refetch();
                  void refetchCompanyReview();
                })
                .catch(
                  (error: { response?: { data?: { message?: string } } }) =>
                    NotificationMessage.error({
                      message: 'Finalize failed',
                      description:
                        error?.response?.data?.message ??
                        'Every required team request must finish company approval first.',
                    }),
                )
            }
          >
            Finalize official targets
          </PrimaryButton>
        </div>
      ) : null}

      {/* Actions */}
      {(embedded ? hybridStrategicMode : true) ? (
        <div
          className={cn(
            TARGETS_CARD_CLASS,
            embedded
              ? 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'
              : 'space-y-3 p-5',
          )}
        >
          {!embedded ? (
            <>
              <p className="m-0 text-[12px] font-semibold text-foreground">
                Reconciliation actions
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <Label
                    htmlFor="hybrid-strategic-amount"
                    className="text-[12px]"
                  >
                    Adjust strategic ({currencyCode})
                  </Label>
                  <Input
                    id="hybrid-strategic-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 h-9"
                    value={strategicDraft}
                    onChange={(e) => setStrategicDraft(e.target.value)}
                    disabled={isReconciled}
                  />
                </div>
                <PrimaryButton
                  className="h-9 px-3.5 text-[12px]"
                  disabled={
                    applyAdjustment.isLoading || isReconciled || !strategicDraft
                  }
                  onClick={() =>
                    void applyAdjustment
                      .mutateAsync({
                        planId,
                        currencyId,
                        horizon,
                        sessionId,
                        strategicAmount: Number(strategicDraft),
                        comment:
                          'Strategic target adjustment during reconciliation',
                      })
                      .then(() => {
                        NotificationMessage.success({
                          message: 'Strategic target saved',
                        });
                        void refetch();
                      })
                      .catch(() =>
                        NotificationMessage.error({
                          message: 'Could not save strategic target',
                        }),
                      )
                  }
                >
                  Save strategic
                </PrimaryButton>
              </div>
            </>
          ) : (
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold text-foreground">
                {isReconciled
                  ? 'Reconciliation complete'
                  : 'Close the gap to continue'}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {isReconciled
                  ? 'Finalize to publish official company and team targets.'
                  : markReconciledHint}
              </p>
            </div>
          )}
          <div className={cn('flex flex-wrap gap-2', embedded && 'shrink-0')}>
            {canEdit ? (
              <PrimaryButton
                className="h-9 px-3.5 text-[12px]"
                disabled={markReconciled.isLoading || !canMark}
                onClick={() =>
                  void markReconciled
                    .mutateAsync({
                      planId,
                      currencyId,
                      horizon,
                      sessionId: sessionId ?? undefined,
                    })
                    .then(() => {
                      NotificationMessage.success({
                        message: 'Marked reconciled',
                        description:
                          'Team totals now match the strategic target. Finalize to publish official targets.',
                      });
                      void refetch();
                      void refetchCompanyReview();
                    })
                    .catch(
                      (error: { response?: { data?: { message?: string } } }) =>
                        NotificationMessage.error({
                          message: 'Reconciliation failed',
                          description:
                            error?.response?.data?.message ??
                            'Team totals must match the strategic target.',
                        }),
                    )
                }
              >
                Mark reconciled
              </PrimaryButton>
            ) : null}
            {embedded && hybridStrategicMode && showFinalize && isReconciled ? (
              <PrimaryButton
                className="h-9 px-3.5 text-[12px]"
                disabled={
                  companyFinalize.isLoading ||
                  companyReview?.canFinalize === false
                }
                onClick={() =>
                  void companyFinalize
                    .mutateAsync({
                      planId,
                      currencyId,
                      horizon,
                      sessionId: sessionId ?? undefined,
                    })
                    .then(() => {
                      NotificationMessage.success({
                        message: 'Plan finalized',
                        description:
                          'Official company and team targets published.',
                      });
                      void refetch();
                      void refetchCompanyReview();
                    })
                    .catch(
                      (error: { response?: { data?: { message?: string } } }) =>
                        NotificationMessage.error({
                          message: 'Finalize failed',
                          description:
                            error?.response?.data?.message ??
                            'Complete reconciliation first.',
                        }),
                    )
                }
              >
                Finalize official targets
              </PrimaryButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* §14 Officialization */}
      {showFinalize && !embedded ? (
        <div
          className={cn(
            TARGETS_CARD_CLASS,
            'flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-semibold text-foreground">
              Company finalization
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Official targets only after reconciliation is complete. Approvals
              alone do not officialize Hybrid.
            </p>
            {(companyReview?.finalizeBlockedReasons ?? []).length > 0 &&
            !companyReview?.canFinalize ? (
              <p className="mt-1 text-[11px] text-amber-900">
                {(companyReview?.finalizeBlockedReasons as string[]).join(
                  ' · ',
                )}
              </p>
            ) : null}
          </div>
          <PrimaryButton
            className="h-9 shrink-0 px-3.5 text-[12px]"
            disabled={
              companyFinalize.isLoading ||
              companyReview?.canFinalize === false ||
              !isReconciled
            }
            onClick={() =>
              void companyFinalize
                .mutateAsync({
                  planId,
                  currencyId,
                  horizon,
                  sessionId: sessionId ?? undefined,
                })
                .then(() => {
                  NotificationMessage.success({
                    message: 'Plan finalized',
                    description: 'Official company and team targets published.',
                  });
                  void refetch();
                  void refetchCompanyReview();
                })
                .catch(
                  (error: { response?: { data?: { message?: string } } }) =>
                    NotificationMessage.error({
                      message: 'Finalize failed',
                      description:
                        error?.response?.data?.message ??
                        'Complete reconciliation and approvals first.',
                    }),
                )
            }
          >
            Finalize official targets
          </PrimaryButton>
        </div>
      ) : null}

      {!embedded && (data?.audits ?? []).length > 0 ? (
        <div className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
          <p className="border-b border-border px-5 py-3 text-[12px] font-semibold text-foreground">
            Audit trail
          </p>
          <ul className="divide-y divide-border">
            {(data?.audits ?? []).slice(0, 12).map((row) => (
              <li key={row.id} className="px-5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-foreground">
                    {row.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : ''}
                  </span>
                </div>
                {row.comment ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {row.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
