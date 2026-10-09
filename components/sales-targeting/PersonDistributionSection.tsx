'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { alignedOpportunitiesFootnote } from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  memberDisplayName,
  useSalesTargeting,
} from '@/components/sales-targeting/SalesTargetingContext';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import {
  TargetAmountField,
  type TargetSelectionSavePayload,
} from '@/components/sales-targeting/shared';
import {
  EqualSplitButton,
  formatFiscalYearLabel,
  PeopleTargetsBar,
  SalesRepresentativesTable,
  type SalesRepresentativeRow,
  TARGETS_CONTENT_CLASS,
  TargetDetailsButton,
  MissingDepartmentAssignmentHint,
  TeamTargetAllocationPanel,
} from '@/components/sales-targeting/targetLayout';
import {
  ModuleEmptyState,
  PersonTabSkeleton,
  SALES_TARGETING_PAGE_CLASS,
  SalesRepsTableSkeleton,
  TARGETS_PAGE_PADDING_CLASS,
} from '@/components/sales-targeting/ui-kit';
import {
  computeLeadTargetPct,
  formatCompactMoney,
} from '@/components/sales-targeting/targetingUtils';
import { formatTargetPercent, targetSharePercent } from '@/lib/target-format';
import {
  dedupeForecastRowsByOpportunity,
  findLatestPersonSessionCommit,
  findLatestTeamSessionCommit,
  getTeamSessionTarget,
  membersForPersonTargetDistribution,
  opportunityKey,
  uniqueOpportunityCountFromRows,
  snapshotLineToForecastRow,
  teamHasDepartmentAssignment,
  teamsForDepartmentPeopleTab,
} from '@/components/sales-targeting/targetingSectionHelpers';
import {
  useCommitPersonSession,
  useCreateTargetRequest,
  useEqualSplitPersonAllocations,
  useReviseTargetRequest,
  useSubmitTargetRequest,
} from '@/store/server/features/salesTargeting/mutations';
import {
  useGetPersonProgress,
  useGetSalesForecast,
  useGetSalesTeamMembers,
  useGetTargetRequests,
} from '@/store/server/features/salesTargeting/queries';
import { persistMemberTargetProposal } from '@/components/sales-targeting/memberTargetProposalSave';
import {
  collapseDuplicateOpportunityLines,
  teamTargetOpportunityFromForecastRow,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import { useGetMyTeam } from '@/store/server/features/orgStructure/commercialQueries';
import { useGetCrmTeam } from '@/store/server/features/teams/queries';
import type {
  ForecastOpportunityRow,
  SalesTargetPlan,
} from '@/store/server/features/salesTargeting/types';
import { useManualTargetGuards } from '@/components/sales-targeting/useManualTargetGuards';
import {
  isRequestWorkflowMethod,
  isTopToBottomMethod,
} from '@/components/sales-targeting/targetSettingMethod';
import { resolveTargetDataScope } from '@/utils/dataScope';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

const EMPTY_FORECAST_ROWS: ForecastOpportunityRow[] = [];

function memberId(member: {
  id?: string | null;
  selamnewId?: string;
}): string | null {
  return member.id || null;
}

function getPersonAmount(
  plan: SalesTargetPlan,
  planCurrencyId: string,
  sessionId: string,
  teamId: string,
  userId: string,
): number {
  const match = (plan.allocations ?? []).find(
    (a) =>
      a.planCurrencyId === planCurrencyId &&
      a.sessionId === sessionId &&
      a.orgDepartmentId === teamId &&
      a.userId === userId &&
      a.level === 'person',
  );
  return Number(match?.amount ?? 0);
}

export function PersonDistributionSection() {
  const {
    plan,
    selectedPlanId,
    setSelectedPlanId,
    sessions,
    fiscalCalendar,
    salesTeams,
    departmentOptions,
    activeCurrencyCode,
    activeCurrencyId,
    setActiveCurrencyId,
    currencyOptions,
    activePlanCurrency,
    isPlanEditable,
    canManageCompany,
    canManageCompanyAnnual,
    canManageTeamSessions,
    canManageOwnTargets,
    orgTargetSettingMethod,
    isLoading,
    refetchAll,
  } = useSalesTargeting();

  const [sessionId, setSessionId] = useState('');
  const [teamId, setTeamId] = useState('');
  /** Live draft totals from open person editors (`null` = use saved amount). */
  const [draftAmountsByUser, setDraftAmountsByUser] = useState<
    Record<string, number | null>
  >({});

  const equalSplit = useEqualSplitPersonAllocations();
  const commitPersonSession = useCommitPersonSession();
  const createTargetRequest = useCreateTargetRequest();
  const reviseTargetRequest = useReviseTargetRequest();
  const submitTargetRequest = useSubmitTargetRequest();
  const { personSessionReason } = useManualTargetGuards(sessionId);

  const planWorkflowMethodEarly =
    plan?.targetSettingMethod ?? orgTargetSettingMethod;
  const usesRequestWorkflowEarly = isRequestWorkflowMethod(
    planWorkflowMethodEarly,
  );
  const { data: targetRequests = [], refetch: refetchTargetRequests } =
    useGetTargetRequests(
      plan?.id,
      Boolean(plan?.id && usesRequestWorkflowEarly),
    );
  useEffect(() => {
    setDraftAmountsByUser({});
  }, [sessionId, teamId, activeCurrencyId]);

  const handlePersonDraftAmount = useCallback(
    (userId: string, amount: number | null) => {
      setDraftAmountsByUser((prev) => {
        if (prev[userId] === amount) return prev;
        if (amount === null && !(userId in prev)) return prev;
        if (amount === null) {
          const next = { ...prev };
          delete next[userId];
          return next;
        }
        return { ...prev, [userId]: amount };
      });
    },
    [],
  );

  useEffect(() => {
    if (plan?.id && selectedPlanId !== plan.id) {
      setSelectedPlanId(plan.id);
    }
  }, [plan?.id, selectedPlanId, setSelectedPlanId]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    [sessions],
  );

  useEffect(() => {
    if (!sessionId && sortedSessions[0]?.id) {
      const now = Date.now();
      const active =
        sortedSessions.find((s) => {
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          return now >= start && now <= end;
        }) ?? sortedSessions[0];
      setSessionId(active.id);
    } else if (
      sessionId &&
      sortedSessions.length > 0 &&
      !sortedSessions.some((s) => s.id === sessionId)
    ) {
      setSessionId(sortedSessions[0]!.id);
    }
  }, [sortedSessions, sessionId]);

  /** Department → team groups for the People tab team picker. */
  const teamFilterGroups = useMemo(() => {
    if (departmentOptions.length === 0) {
      return salesTeams.length > 0
        ? [
            {
              label: '',
              options: salesTeams.map((team) => ({
                value: team.id,
                label: team.name,
              })),
            },
          ]
        : [];
    }
    return departmentOptions
      .map((department) => ({
        label: department,
        options: teamsForDepartmentPeopleTab(salesTeams, department).map(
          (team) => ({ value: team.id, label: team.name }),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [departmentOptions, salesTeams]);

  useEffect(() => {
    const available = teamFilterGroups.flatMap((group) => group.options);
    if (!available.some((team) => team.value === teamId)) {
      setTeamId(available[0]?.value ?? '');
    }
  }, [teamFilterGroups, teamId]);

  const departmentFilter =
    teamFilterGroups.find((group) =>
      group.options.some((team) => team.value === teamId),
    )?.label ?? '';

  const { data: members = [], isLoading: membersLoading } =
    useGetSalesTeamMembers(teamId || undefined);

  const selectedTeam = salesTeams.find((t) => t.id === teamId);
  const needsTeamLeadLookup =
    Boolean(teamId) && !selectedTeam?.teamLeadId?.trim();
  const { data: myTeam } = useGetMyTeam(needsTeamLeadLookup);
  const needsCrmTeamLookup =
    needsTeamLeadLookup && Boolean(teamId) && myTeam?.id !== teamId;
  const { data: teamDetail } = useGetCrmTeam(
    needsCrmTeamLookup ? teamId : undefined,
  );
  const teamLeadId =
    selectedTeam?.teamLeadId?.trim() ||
    (myTeam?.id === teamId ? myTeam.teamLeadId?.trim() : undefined) ||
    teamDetail?.teamLeadId?.trim() ||
    null;
  const targetScope = useMemo(() => resolveTargetDataScope(), []);
  const currentUserId = useAuthenticationStore((state) => state.userId);
  const distributionMembers = useMemo(() => {
    if (targetScope.level === 'personal' && currentUserId) {
      return members.filter((member) => member.id?.trim() === currentUserId);
    }
    return membersForPersonTargetDistribution(members, teamLeadId);
  }, [members, teamLeadId, targetScope.level, currentUserId]);

  const { data: personProgress = [] } = useGetPersonProgress(
    plan?.id,
    {
      sessionId: sessionId || undefined,
      salesTeamId: teamId || undefined,
      currencyId: activePlanCurrency?.currencyId,
    },
    Boolean(plan?.id && sessionId && teamId),
  );

  const planWorkflowMethod =
    plan?.targetSettingMethod ?? orgTargetSettingMethod;
  const isTTB = isTopToBottomMethod(planWorkflowMethod);
  const usesRequestWorkflow = isRequestWorkflowMethod(planWorkflowMethod);

  const canEdit =
    isPlanEditable &&
    (canManageCompanyAnnual ||
      canManageCompany ||
      canManageTeamSessions ||
      canManageOwnTargets);
  const canEditPersonTarget = canEdit && !isTTB;

  const currencyId = activePlanCurrency?.currencyId;

  // Same source as Periods tab team amount (team session allocation only).
  const sessionTarget =
    plan && activePlanCurrency && sessionId && teamId
      ? getTeamSessionTarget(plan, activePlanCurrency.id, sessionId, teamId)
      : 0;

  const teamCommit = useMemo(
    () =>
      plan && sessionId && teamId
        ? findLatestTeamSessionCommit(plan, sessionId, teamId, currencyId)
        : undefined,
    [plan, sessionId, teamId, currencyId],
  );

  const personalForecastUserId =
    targetScope.level === 'personal' && currentUserId
      ? currentUserId
      : undefined;

  const { data: sessionLiveForecast } = useGetSalesForecast(
    {
      horizon: 'session',
      sessionId,
      calendarId: fiscalCalendar?.id,
      currency: activeCurrencyCode,
      salesTeamId: teamId,
      salespersonId: personalForecastUserId,
    },
    Boolean(
      usesRequestWorkflow &&
        sessionId &&
        teamId &&
        fiscalCalendar?.id &&
        activeCurrencyCode &&
        !teamCommit?.lines?.length,
    ),
  );

  /**
   * Person EDIT pool = last team-saved period opportunities (TTB seating).
   * Bottom-to-top / hybrid: fall back to live forecast when the team has not
   * published a period pool yet.
   */
  const teamPoolRows = useMemo(() => {
    const lines = teamCommit?.lines ?? [];
    if (lines.length) {
      return dedupeForecastRowsByOpportunity(
        lines.map((line) =>
          snapshotLineToForecastRow(line, activeCurrencyCode),
        ),
      );
    }
    if (usesRequestWorkflow && sessionLiveForecast?.rows?.length) {
      return dedupeForecastRowsByOpportunity(sessionLiveForecast.rows);
    }
    return EMPTY_FORECAST_ROWS;
  }, [
    teamCommit,
    activeCurrencyCode,
    usesRequestWorkflow,
    sessionLiveForecast?.rows,
  ]);

  const progressByUser = useMemo(() => {
    const map = new Map<string, (typeof personProgress)[number]>();
    for (const row of personProgress) {
      map.set(row.userId, row);
    }
    return map;
  }, [personProgress]);

  const amounts = useMemo(() => {
    const next: Record<string, number> = {};
    if (!plan || !activePlanCurrency || !sessionId || !teamId) {
      return next;
    }
    for (const member of distributionMembers) {
      const id = memberId(member);
      if (!id) continue;
      next[id] = getPersonAmount(
        plan,
        activePlanCurrency.id,
        sessionId,
        teamId,
        id,
      );
    }
    return next;
  }, [plan, activePlanCurrency, sessionId, teamId, distributionMembers]);

  const preferredKeysByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!plan || !sessionId || !teamId) return map;
    const poolKeys = new Set(
      teamPoolRows.map((row) =>
        opportunityKey(row.opportunityType, row.opportunityId),
      ),
    );
    for (const member of distributionMembers) {
      const id = memberId(member);
      if (!id) continue;
      const commit = findLatestPersonSessionCommit(
        plan,
        sessionId,
        teamId,
        id,
        currencyId,
      );
      map.set(
        id,
        commit
          ? (commit.lines ?? [])
              .map((line) =>
                opportunityKey(line.opportunityType, line.opportunityId),
              )
              .filter((key) => poolKeys.has(key))
          : [],
      );
    }
    return map;
  }, [plan, sessionId, teamId, distributionMembers, currencyId, teamPoolRows]);

  const preferredAmountsByUser = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    if (!plan || !sessionId || !teamId) return map;
    for (const member of distributionMembers) {
      const id = memberId(member);
      if (!id) continue;
      const commit = findLatestPersonSessionCommit(
        plan,
        sessionId,
        teamId,
        id,
        currencyId,
      );
      const amountsMap: Record<string, number> = {};
      for (const line of commit?.lines ?? []) {
        amountsMap[opportunityKey(line.opportunityType, line.opportunityId)] =
          Number(line.forecastValue) || 0;
      }
      map.set(id, amountsMap);
    }
    return map;
  }, [plan, sessionId, teamId, distributionMembers, currencyId]);

  const liveAmounts = useMemo(() => {
    const next: Record<string, number> = { ...amounts };
    for (const [userId, draft] of Object.entries(draftAmountsByUser)) {
      if (draft != null && Number.isFinite(draft)) {
        next[userId] = draft;
      }
    }
    return next;
  }, [amounts, draftAmountsByUser]);

  const allocated = Object.values(liveAmounts).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
  const remaining = sessionTarget - allocated;
  const offTarget =
    sessionTarget > 0 && Math.abs(allocated - sessionTarget) > 0.005;
  const overAllocated = offTarget && allocated > sessionTarget;

  const memberIds = useMemo(
    () => [
      ...new Set(
        distributionMembers
          .map(memberId)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    [distributionMembers],
  );

  const canEqualSplit =
    memberIds.length > 0 &&
    sessionTarget > 0 &&
    teamPoolRows.length > 0 &&
    !membersLoading;

  /**
   * Blur Equal split only when this team/period is already fully & evenly
   * allocated from a prior equal split (or equivalent). Otherwise keep it
   * clickable whenever the team has members and a period target.
   */
  const isAlreadyEquallySplit = useMemo(() => {
    if (!canEqualSplit || memberIds.length < 1) return false;
    if (Math.abs(sessionTarget - allocated) > 0.05) return false;

    const expected = Math.round((sessionTarget / memberIds.length) * 100) / 100;

    for (const id of memberIds) {
      const amount = Number(liveAmounts[id] ?? 0);
      if (Math.abs(amount - expected) > 0.05) return false;
    }

    if (teamPoolRows.length === 0) return true;

    const teamKeys = new Set(
      teamPoolRows.map((row) =>
        opportunityKey(row.opportunityType, row.opportunityId),
      ),
    );

    for (const id of memberIds) {
      const commit = findLatestPersonSessionCommit(
        plan,
        sessionId,
        teamId,
        id,
        currencyId,
      );
      const personKeys = new Set(
        (commit?.lines ?? []).map((line) =>
          opportunityKey(line.opportunityType, line.opportunityId),
        ),
      );
      for (const key of teamKeys) {
        if (!personKeys.has(key)) return false;
      }
    }
    return true;
  }, [
    canEqualSplit,
    memberIds,
    sessionTarget,
    allocated,
    liveAmounts,
    teamPoolRows,
    plan,
    sessionId,
    teamId,
    currencyId,
  ]);

  const equalSplitDisabledReason = equalSplit.isLoading
    ? 'Splitting…'
    : membersLoading
      ? 'Loading team members…'
      : memberIds.length === 0
        ? 'No team members available to split'
        : sessionTarget <= 0
          ? 'Set the team period target first'
          : teamPoolRows.length === 0
            ? 'Set the team period target from forecast opportunities first'
            : isAlreadyEquallySplit
              ? 'Already split equally for this team and period'
              : undefined;

  const money = (n: number) =>
    formatCompactMoney(n, activeCurrencyCode || 'USD');

  const showError = (error: unknown) => {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Something went wrong';
    NotificationMessage.error({ message: 'Error', description: message });
  };

  const savePersonSelection = async (
    userId: string,
    payload: TargetSelectionSavePayload,
  ) => {
    if (!plan || !activePlanCurrency || !sessionId || !teamId) return;
    try {
      if (isTTB) {
        NotificationMessage.info({
          message: 'Read-only on person Details',
          description:
            'Top to Bottom: set the company target from Forecast on Annual or Periods. Person quotas are seated automatically from the company selection.',
        });
        return;
      }
      if (payload.sourceType === 'manual') {
        NotificationMessage.error({
          message: 'Select opportunities',
          description:
            'Set the person target from the team’s forecast opportunities. A quota cannot be entered as a number alone.',
        });
        return;
      }

      if (usesRequestWorkflow) {
        const member = distributionMembers.find((m) => memberId(m) === userId);
        const displayName = member ? memberDisplayName(member) : null;
        const rowSource = [
          ...payload.rows,
          ...(payload.selectedCustomRows ?? []),
        ];
        if (!rowSource.length) {
          NotificationMessage.error({
            message: 'Select opportunities',
            description:
              'Choose at least one forecast opportunity for your target proposal.',
          });
          return;
        }
        const opportunities = collapseDuplicateOpportunityLines(
          rowSource.map((row) =>
            teamTargetOpportunityFromForecastRow(
              {
                ...row,
                salesTeamId: row.salesTeamId ?? teamId,
                ownerId: row.ownerId ?? userId,
              },
              teamId,
            ),
          ),
        );
        const amount =
          Math.round(
            opportunities.reduce(
              (sum, line) => sum + (Number(line.allocatedAmount) || 0),
              0,
            ) * 100,
          ) / 100;

        await persistMemberTargetProposal({
          planId: plan.id,
          currencyId: activePlanCurrency.currencyId,
          teamId,
          userId,
          horizon: 'session',
          sessionId,
          amount,
          description: displayName?.trim()
            ? `${displayName.trim()} period target proposal`
            : 'Member period target proposal',
          opportunities,
          targetRequests,
          refetchTargetRequests: async () => {
            const result = await refetchTargetRequests();
            return { data: result.data ?? targetRequests };
          },
          createTargetRequest: (body) => createTargetRequest.mutateAsync(body),
          reviseTargetRequest: (body) => reviseTargetRequest.mutateAsync(body),
          submitTargetRequest: (body) => submitTargetRequest.mutateAsync(body),
        });
        NotificationMessage.success({
          message: 'Proposal submitted',
          description:
            'Your period target was sent to your team lead for approval (same request workflow as team proposals).',
        });
        refetchAll();
        return;
      }

      const teamCeilingByKey = new Map(
        teamPoolRows.map((row) => [
          opportunityKey(row.opportunityType, row.opportunityId),
          Number(row.forecastValue) || 0,
        ]),
      );
      const clampedRows = payload.rows
        .map((row) => {
          const key = opportunityKey(row.opportunityType, row.opportunityId);
          const ceiling = teamCeilingByKey.get(key);
          if (ceiling === undefined) return null;
          const forecastValue = Math.min(
            Math.max(0, Number(row.forecastValue) || 0),
            Math.max(0, ceiling),
          );
          return { ...row, forecastValue };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      const amount =
        Math.round(
          clampedRows.reduce(
            (sum, row) => sum + (Number(row.forecastValue) || 0),
            0,
          ) * 100,
        ) / 100;

      await commitPersonSession.mutateAsync({
        planId: plan.id,
        sessionId,
        planCurrencyId: activePlanCurrency.id,
        orgDepartmentId: teamId,
        userId,
        sourceType: 'edited_forecast',
        targetValue: amount,
        opportunityRefs: clampedRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
        })),
        overrides: clampedRows.map((row) => ({
          opportunityType: row.opportunityType,
          opportunityId: row.opportunityId,
          forecastValue: Number(row.forecastValue) || 0,
        })),
      });
      NotificationMessage.success({
        message: 'Person target saved',
        description: 'Custom allocation updated for this period.',
      });
      refetchAll();
    } catch (error) {
      showError(error);
    }
  };

  const handleEqualSplit = async () => {
    if (!plan || !activePlanCurrency || !sessionId || !teamId) return;
    if (isTTB) {
      NotificationMessage.info({
        message: 'Read-only on person targets',
        description:
          'Top to Bottom: person quotas are seated automatically when the company target is saved.',
      });
      return;
    }
    if (teamPoolRows.length === 0) {
      NotificationMessage.error({
        message: 'No team opportunities',
        description:
          'Equal split assigns every team opportunity to every member. Set the team period target from forecast opportunities first.',
      });
      return;
    }
    const userIds = memberIds;
    if (!userIds.length) {
      NotificationMessage.error({
        message: 'No team members',
        description: 'This team has no members available for equal split.',
      });
      return;
    }
    try {
      await equalSplit.mutateAsync({
        planId: plan.id,
        planCurrencyId: activePlanCurrency.id,
        sessionId,
        orgDepartmentId: teamId,
        userIds,
      });
      NotificationMessage.success({
        message: 'Equal split applied',
        description: `Each of ${uniqueOpportunityCountFromRows(teamPoolRows)} opportunit${
          uniqueOpportunityCountFromRows(teamPoolRows) === 1
            ? 'y was'
            : 'ies were'
        } split evenly across ${userIds.length} member${
          userIds.length === 1 ? '' : 's'
        }. Every member is assigned every opportunity at their share.`,
      });
      refetchAll();
    } catch (error) {
      showError(error);
    }
  };

  if (isLoading) {
    return <PersonTabSkeleton />;
  }

  if (!plan) {
    return (
      <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
        <ModuleEmptyState
          title="No annual target yet"
          description="Set annual and period targets first, then assign person targets here."
        />
      </div>
    );
  }

  const teamName = selectedTeam?.name ?? 'Team';
  const selectedTeamMissingDepartment =
    Boolean(teamId) && !teamHasDepartmentAssignment(selectedTeam ?? {});
  const periodName = sessions.find((s) => s.id === sessionId)?.name ?? 'Period';
  const fiscalYearLabel = formatFiscalYearLabel(fiscalCalendar);
  const periodBadgeLabel = `${fiscalYearLabel} ${periodName}`;
  const teamContextLabel = departmentFilter
    ? `${departmentFilter} · ${teamName}`
    : teamName;
  const allocatedSharePct =
    sessionTarget > 0 ? targetSharePercent(allocated, sessionTarget) : 0;
  const sessionOptions = sortedSessions.map((session) => ({
    value: session.id,
    label: session.name,
  }));

  const repRows: SalesRepresentativeRow[] = distributionMembers.flatMap(
    (member) => {
      const id = memberId(member);
      if (!id) return [];
      const displayName = memberDisplayName(member);
      const amount = Number(liveAmounts[id] ?? amounts[id] ?? 0);
      const progress = progressByUser.get(id);
      const alignedCount =
        progress?.dealCount ??
        findLatestPersonSessionCommit(plan!, sessionId, teamId, id, currencyId)
          ?.lines?.length ??
        0;
      const hasPersonCommit = Boolean(
        findLatestPersonSessionCommit(plan!, sessionId, teamId, id, currencyId)
          ?.lines?.length,
      );
      const quotaSharePct = computeLeadTargetPct(amount, sessionTarget);
      const avatarUrl =
        (member as { avatarUrl?: string | null }).avatarUrl ?? null;

      return [
        {
          id,
          name: displayName,
          avatarUrl,
          quotaShareLabel:
            sessionTarget > 0 && amount > 0
              ? `${formatTargetPercent(quotaSharePct)} of team quota`
              : 'No quota assigned',
          role: member.email?.trim() || 'Sales Representative',
          alignedDealsLabel: alignedOpportunitiesFootnote(alignedCount),
          definition: hasPersonCommit
            ? 'Configured from selected opportunities'
            : 'Set quota and strategy in Details',
          targetValue: amount > 0 ? money(amount) : 'Not set',
          action: (
            <TargetAmountField
              key={`person-${sessionId}-${teamId}-${id}`}
              value={Number(amounts[id] ?? 0)}
              currency={activeCurrencyCode}
              editable={canEditPersonTarget}
              savedSourceType={
                amount > 0 && !hasPersonCommit
                  ? 'manual'
                  : findLatestPersonSessionCommit(
                      plan!,
                      sessionId,
                      teamId,
                      id,
                      currencyId,
                    )?.sourceType
              }
              forecastRows={teamPoolRows}
              allowPartialAllocation
              requireManualEdit
              preferredSelectedKeys={preferredKeysByUser.get(id) ?? []}
              preferredAllocatedAmounts={preferredAmountsByUser.get(id)}
              currencyOptions={currencyOptions}
              activeCurrencyId={activeCurrencyId}
              onCurrencyChange={setActiveCurrencyId}
              modalTitle={`${displayName} Details & Target Management`}
              modalDescription={`${teamName} opportunities and ${displayName}'s share of each, for ${fiscalYearLabel} ${periodName}.`}
              memberShare={{ memberName: displayName, teamName }}
              hideSummaryAmount
              renderTrigger={(openEditor) => (
                <TargetDetailsButton
                  onClick={openEditor}
                  label="Details"
                  tone="outline"
                />
              )}
              onDraftAmountChange={
                canEditPersonTarget
                  ? (draft) => handlePersonDraftAmount(id, draft)
                  : undefined
              }
              emptyMessage={
                usesRequestWorkflow
                  ? 'No forecast opportunities in scope for this period yet. Check Forecast or add a custom opportunity from Planning.'
                  : 'No team-included opportunities for this person yet.'
              }
              targetBlockedReason={personSessionReason(teamId, id)}
              onSaveSelection={
                canEditPersonTarget
                  ? (payload) => savePersonSelection(id, payload)
                  : undefined
              }
            />
          ),
        },
      ];
    },
  );

  return (
    <div className={cn(SALES_TARGETING_PAGE_CLASS)}>
      <SalesTargetingCurrencyToolbar />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            TARGETS_CONTENT_CLASS,
            TARGETS_PAGE_PADDING_CLASS,
            'space-y-6',
          )}
        >
          <PeopleTargetsBar
            periodLabel={periodBadgeLabel}
            teamContextLabel={teamContextLabel}
            sessionOptions={sessionOptions}
            sessionId={sessionId}
            onSessionChange={setSessionId}
            teamGroups={teamFilterGroups}
            teamId={teamId}
            onTeamChange={setTeamId}
          />

          {isTTB ? (
            <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-[12px] text-muted-foreground">
              Top to Bottom: person targets are view-only here. Set the company
              target from Forecast on Annual or Periods to seat quotas by team
              member automatically.
            </div>
          ) : null}

          {!isTTB ? (
            <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-[12px] text-muted-foreground">
              Person proposals are approved by the team leader.
            </div>
          ) : null}

          {selectedTeamMissingDepartment ? (
            <MissingDepartmentAssignmentHint className="rounded-xl border border-amber-200" />
          ) : null}

          {targetScope.level === 'personal' ? null : (
            <TeamTargetAllocationPanel
              sectionLabel={`Team target allocation (${teamName.toUpperCase()})`}
              teamName={teamName}
              meta={`${periodBadgeLabel} · ${activeCurrencyCode}`}
              equalSplitAction={
                canEditPersonTarget ? (
                  <EqualSplitButton
                    onClick={() => void handleEqualSplit()}
                    loading={equalSplit.isLoading}
                    disabled={!canEqualSplit || isAlreadyEquallySplit}
                    title={equalSplitDisabledReason}
                  />
                ) : undefined
              }
              periodTarget={{
                value: money(sessionTarget),
                hint: 'Allocated from period target',
              }}
              allocated={{
                value: money(allocated),
                hint:
                  sessionTarget > 0
                    ? `${formatTargetPercent(allocatedSharePct)} of team target`
                    : 'No team target set',
              }}
              remaining={{
                value: sessionTarget > 0 ? money(Math.abs(remaining)) : '—',
                hint:
                  remaining < 0
                    ? 'Over-allocated vs team target'
                    : 'Available to distribute',
                warn: overAllocated,
              }}
            />
          )}

          {!sessionId || !teamId ? (
            <ModuleEmptyState
              title="Select period and team"
              description="Choose a fiscal period and sales team to assign person targets."
            />
          ) : membersLoading ? (
            <SalesRepsTableSkeleton rows={4} />
          ) : distributionMembers.length === 0 ? (
            <ModuleEmptyState
              title={
                members.length > 0
                  ? 'No distributable members'
                  : 'No team members'
              }
              description={
                members.length > 0
                  ? 'Team targets are managed at the team level for the team lead. Add other members to distribute the team quota.'
                  : 'This sales team has no members to assign.'
              }
            />
          ) : (
            <SalesRepresentativesTable
              teamName={teamName}
              currencyCode={activeCurrencyCode}
              rows={repRows}
            />
          )}
        </div>
      </div>
    </div>
  );
}
