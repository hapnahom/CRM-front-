'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import {
  ManualTargetPanel,
  type ManualSolutionDraft,
} from '@/components/sales-targeting/TargetDetailsModal';
import {
  draftCustomCreateExtras,
  type DraftCustomForecast,
} from '@/components/sales-targeting/shared';
import {
  opportunityKey,
  type ProposalOpportunityLine,
} from '@/components/sales-targeting/TeamProposalOpportunityPicker';
import { useCreateCustomForecast } from '@/store/server/features/salesTargeting/mutations';
import { fetchSalesTeamMembers } from '@/store/server/features/salesTargeting/queries';
import type { CommercialTeamMember } from '@/store/server/features/salesTargeting/types';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';

type Props = {
  planId: string;
  currencyId: string;
  currencyCode: string;
  horizon?: 'annual' | 'session';
  sessionId?: string | null;
  lockedTeamId: string;
  lockedTeamLabel: string;
  initialMemberIds?: string[];
  teamGroups: TeamSelectGroup[];
  ownerId?: string | null;
  selectedKeys: Set<string>;
  onLinesAdded: (lines: ProposalOpportunityLine[]) => void;
  onClose: () => void;
};

export function ProposalManualTargetForm({
  planId,
  currencyId,
  currencyCode,
  horizon = 'annual',
  sessionId,
  lockedTeamId,
  lockedTeamLabel,
  initialMemberIds = [],
  teamGroups,
  ownerId,
  selectedKeys,
  onLinesAdded,
  onClose,
}: Props) {
  const createCustomForecast = useCreateCustomForecast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds);
  const [solutions, setSolutions] = useState<ManualSolutionDraft[]>([]);

  const familiesQuery = useProductFamilies();
  const productFamilies = familiesQuery.data ?? [];

  const familyForSolution = useCallback(
    (productFamilyId: string) =>
      productFamilies.find((item) => item.id === productFamilyId),
    [productFamilies],
  );

  const resolveSolutionTeamIds = (solution: ManualSolutionDraft) =>
    familyForSolution(solution.productFamilyId)?.responsibleTeamIds ?? [];
  const resolveSolutionMemberIds = (solution: ManualSolutionDraft) =>
    familyForSolution(solution.productFamilyId)?.responsibleUserIds ?? [];
  const solutionHasResponsibleParties = (solution: ManualSolutionDraft) => {
    const teamIds = resolveSolutionTeamIds(solution);
    const memberIdsForSolution = resolveSolutionMemberIds(solution);
    return teamIds.length > 0 || memberIdsForSolution.length > 0;
  };
  const isManualSolutionComplete = (solution: ManualSolutionDraft) => {
    const touched =
      Boolean(solution.productFamilyId) ||
      Boolean(String(solution.amount).trim());
    if (!touched) return true;
    return (
      Boolean(solution.productFamilyId) &&
      Number(solution.amount) > 0 &&
      solutionHasResponsibleParties(solution)
    );
  };

  const memberQueryOptions = useMemo(
    () =>
      lockedTeamId
        ? [
            {
              queryKey: ['sales-team-members', lockedTeamId],
              queryFn: () => fetchSalesTeamMembers(lockedTeamId),
              staleTime: 30_000,
            },
          ]
        : [],
    [lockedTeamId],
  );
  const memberQueries = useQueries(memberQueryOptions);
  const manualMembersLoading = memberQueries.some(
    (query) => query.isLoading || query.isFetching,
  );

  const manualMemberGroups = useMemo(() => {
    const members =
      (memberQueries[0]?.data as CommercialTeamMember[] | undefined) ?? [];
    const options = members.flatMap((member) => {
      const id = member.id?.trim();
      if (!id) return [];
      const label =
        [member.firstName, member.middleName, member.lastName]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' ') ||
        member.email?.trim() ||
        id;
      return [{ value: id, label }];
    });
    if (options.length === 0) return [];
    return [{ label: lockedTeamLabel, options }];
  }, [lockedTeamLabel, memberQueries]);

  const manualMemberOptions = manualMemberGroups.flatMap(
    (group) => group.options,
  );
  const manualMemberOptionKey = manualMemberOptions
    .map((option) => option.value)
    .join('|');

  useEffect(() => {
    if (manualMembersLoading) return;
    const allowed = new Set(manualMemberOptionKey.split('|').filter(Boolean));
    setMemberIds((current) => {
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length ? current : next;
    });
  }, [manualMembersLoading, manualMemberOptionKey]);

  const canAdd =
    Boolean(name.trim()) &&
    Boolean(lockedTeamId) &&
    Number(amount) > 0 &&
    solutions.every(isManualSolutionComplete) &&
    !createCustomForecast.isLoading;

  const persistDraft = async (draft: DraftCustomForecast) => {
    const newLines: ProposalOpportunityLine[] = [];
    for (const [index, team] of draft.teams.entries()) {
      const created = await createCustomForecast.mutateAsync({
        planId,
        currencyId,
        sessionId: horizon === 'session' ? (sessionId ?? null) : null,
        groupId: draft.groupId,
        opportunityName: draft.opportunityName,
        forecastValue: Number(team.amount) || 0,
        salesTeamId: team.salesTeamId,
        ...draftCustomCreateExtras(draft, index),
      });
      const key = opportunityKey('custom', created.id);
      if (selectedKeys.has(key)) continue;
      const lineAmount = Number(team.amount) || 0;
      newLines.push({
        opportunityType: 'custom',
        opportunityId: created.id,
        opportunityName: created.opportunityName ?? draft.opportunityName,
        opportunityValue: lineAmount,
        forecastValue: lineAmount,
        allocatedAmount: lineAmount,
        probability: null,
        expectedCloseDate: null,
        ownerId: ownerId?.trim() || null,
        teamId: team.salesTeamId,
        departmentId: null,
      });
    }
    if (newLines.length) onLinesAdded(newLines);
    onClose();
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    const value = Number(amount) || 0;
    if (!trimmedName || !lockedTeamId || value <= 0) return;

    const assignees = memberIds
      .filter((id) => manualMemberOptions.some((option) => option.value === id))
      .map((userId) => ({ userId, amount: value }));

    const draftSolutions = solutions
      .filter(
        (solution) =>
          solution.productFamilyId &&
          Number(solution.amount) > 0 &&
          solutionHasResponsibleParties(solution),
      )
      .map((solution) => ({
        productFamilyId: solution.productFamilyId,
        name: familyForSolution(solution.productFamilyId)?.name || 'Solution',
        amount: Number(solution.amount) || 0,
        teamIds: resolveSolutionTeamIds(solution),
        memberIds: resolveSolutionMemberIds(solution),
      }));

    const draft: DraftCustomForecast = {
      localId: `proposal-manual-${Date.now()}`,
      opportunityName: trimmedName,
      groupId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `group-${Date.now()}`,
      value,
      teams: [{ salesTeamId: lockedTeamId, amount: value }],
      assignees,
      solutions: draftSolutions,
    };

    void persistDraft(draft);
  };

  return (
    <ManualTargetPanel
      currency={currencyCode}
      name={name}
      onNameChange={setName}
      amount={amount}
      onAmountChange={setAmount}
      amountHint="Each selected team and member receives this value. The company counts it once."
      teamIds={[lockedTeamId]}
      teamLocked
      teamLockedLabel={lockedTeamLabel}
      teamGroups={teamGroups}
      onTeamIdsChange={() => undefined}
      memberIds={memberIds}
      memberGroups={manualMemberGroups}
      memberPlaceholder={
        manualMembersLoading
          ? 'Loading members…'
          : manualMemberOptions.length === 0
            ? 'No members on this team'
            : 'Select members'
      }
      memberEmptyLabel="No members on this team"
      memberDisabled={manualMembersLoading || manualMemberOptions.length === 0}
      memberLoading={manualMembersLoading}
      onMemberIdsChange={setMemberIds}
      solutions={solutions}
      onSolutionsChange={setSolutions}
      familyOptions={productFamilies.map((family) => ({
        value: family.id,
        label: family.name,
        responsibleTeamIds: family.responsibleTeamIds ?? [],
        responsibleUserIds: family.responsibleUserIds ?? [],
      }))}
      canAdd={canAdd}
      onAdd={handleAdd}
      onCancel={onClose}
      appearance="neutral"
    />
  );
}
