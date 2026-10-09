'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useQueries } from 'react-query';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ManualTargetPanel,
  type ManualSolutionDraft,
} from '@/components/sales-targeting/TargetDetailsModal';
import {
  draftCustomCreateExtras,
  type DraftCustomForecast,
} from '@/components/sales-targeting/shared';
import { WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL } from '@/components/sales-targeting/targetSettingMethod';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  PeriodSelector,
  usePipelineFiscalSessions,
} from '@/modules/sales-pipeline/pipeline-filters';
import type { PipelinePeriodSelection } from '@/modules/sales-pipeline/pipeline-filter';
import { resolveFiscalPeriod } from '@/modules/sales-pipeline/report/period';
import {
  useCreateCustomForecast,
  useUpdateCustomForecast,
} from '@/store/server/features/salesTargeting/mutations';
import { fetchSalesTeamMembers } from '@/store/server/features/salesTargeting/queries';
import type {
  CommercialTeamMember,
  CustomForecast,
  SalesTeam,
} from '@/store/server/features/salesTargeting/types';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';

const { RangePicker } = DatePicker;

type ManualPeriodMode = 'fiscal' | 'custom';

function parseCustomPeriodLabel(
  label: string | null | undefined,
): { start: string; end: string } | null {
  if (!label) return null;
  const match = label
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { start: match[1]!, end: match[2]! };
}

function departmentForTeam(
  salesTeams: SalesTeam[],
  teamId: string,
): string | null {
  const team = salesTeams.find((row) => row.id === teamId);
  return team?.parentDepartmentName?.trim() || null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | null;
  currencyOptions: Array<{ id: string; code: string }>;
  defaultCurrencyId: string;
  currencyCode: string;
  teamGroups: TeamSelectGroup[];
  salesTeams: SalesTeam[];
  editingItem: CustomForecast | null;
};

export function ForecastManualForecastDialog({
  open,
  onOpenChange,
  planId,
  currencyOptions,
  defaultCurrencyId,
  currencyCode,
  teamGroups,
  salesTeams,
  editingItem,
}: Props) {
  const createCustom = useCreateCustomForecast();
  const updateCustom = useUpdateCustomForecast();
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();
  const sessionPool = allSessions.length ? allSessions : sessions;

  const familiesQuery = useProductFamilies();
  const productFamilies = familiesQuery.data ?? [];

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState(defaultCurrencyId);
  const [periodMode, setPeriodMode] = useState<ManualPeriodMode>('fiscal');
  const [periodSelection, setPeriodSelection] =
    useState<PipelinePeriodSelection>({ type: 'annual' });
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [solutions, setSolutions] = useState<ManualSolutionDraft[]>([]);

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
    const t = resolveSolutionTeamIds(solution);
    const m = resolveSolutionMemberIds(solution);
    return t.length > 0 || m.length > 0;
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

  const selectedTeamIds = teamIds.map((id) => id.trim()).filter(Boolean);
  const memberQueryOptions = useMemo(
    () =>
      selectedTeamIds.map((teamId) => ({
        queryKey: ['sales-team-members', teamId],
        queryFn: () => fetchSalesTeamMembers(teamId),
        staleTime: 30_000,
      })),
    [selectedTeamIds.join('|')],
  );
  const memberQueries = useQueries(memberQueryOptions);
  const manualMembersLoading = memberQueries.some(
    (query) => query.isLoading || query.isFetching,
  );

  const teamLabel = useCallback(
    (teamId: string) =>
      teamGroups.flatMap((g) => g.options).find((t) => t.value === teamId)
        ?.label ?? teamId,
    [teamGroups],
  );

  const manualMemberGroups = useMemo(() => {
    const seen = new Set<string>();
    return selectedTeamIds.flatMap((teamId, index) => {
      const members =
        (memberQueries[index]?.data as CommercialTeamMember[] | undefined) ??
        [];
      const options = members.flatMap((member) => {
        const id = member.id?.trim();
        if (!id || seen.has(id)) return [];
        seen.add(id);
        const label =
          [member.firstName, member.middleName, member.lastName]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(' ') ||
          member.email?.trim() ||
          id;
        return [{ value: id, label }];
      });
      if (!options.length) return [];
      return [{ label: teamLabel(teamId), options }];
    });
  }, [selectedTeamIds, memberQueries, teamLabel]);

  const manualMemberOptions = manualMemberGroups.flatMap((g) => g.options);
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

  const resetForm = useCallback(() => {
    setName('');
    setAmount('');
    setCurrencyId(defaultCurrencyId);
    setPeriodMode('fiscal');
    setPeriodSelection({ type: 'annual' });
    setCustomStartDate(null);
    setCustomEndDate(null);
    setNotes('');
    setIsActive(true);
    setTeamIds([]);
    setMemberIds([]);
    setSolutions([]);
  }, [defaultCurrencyId]);

  useEffect(() => {
    if (!open) return;
    if (!editingItem) {
      resetForm();
      return;
    }
    const customRange = parseCustomPeriodLabel(editingItem.periodLabel);
    let periodModeNext: ManualPeriodMode = 'fiscal';
    let periodSelectionNext: PipelinePeriodSelection = { type: 'annual' };
    if (customRange) {
      periodModeNext = 'custom';
      setCustomStartDate(customRange.start);
      setCustomEndDate(customRange.end);
    } else if (editingItem.sessionId) {
      periodSelectionNext = {
        type: 'session',
        sessionId: editingItem.sessionId,
      };
    } else if (editingItem.periodLabel) {
      const matchYear = fiscalYears.find(
        (year) => year.label === editingItem.periodLabel,
      );
      if (matchYear) {
        periodSelectionNext = { type: 'annual', calendarId: matchYear.id };
      } else {
        const matchSession = sessionPool.find(
          (session) => session.label === editingItem.periodLabel,
        );
        if (matchSession) {
          periodSelectionNext = {
            type: 'session',
            sessionId: matchSession.id,
          };
        }
      }
    }
    setName(editingItem.opportunityName ?? '');
    setAmount(String(Number(editingItem.forecastValue) || 0));
    setCurrencyId(editingItem.currencyId || defaultCurrencyId);
    setPeriodMode(periodModeNext);
    setPeriodSelection(periodSelectionNext);
    setNotes(editingItem.notes ?? '');
    setIsActive(editingItem.isActive !== false);
    setTeamIds(editingItem.salesTeamId ? [editingItem.salesTeamId] : []);
    setMemberIds([]);
    setSolutions([]);
  }, [
    open,
    editingItem,
    resetForm,
    defaultCurrencyId,
    fiscalYears,
    sessionPool,
  ]);

  const manualPeriodHint = useMemo(() => {
    if (periodMode === 'custom') {
      return customStartDate && customEndDate
        ? `${customStartDate} – ${customEndDate}`
        : 'Select a custom date range';
    }
    return resolveFiscalPeriod(periodSelection, sessionPool, fiscalYears).label;
  }, [
    periodMode,
    customStartDate,
    customEndDate,
    periodSelection,
    fiscalYears,
    sessionPool,
  ]);

  const manualCustomRange: [Dayjs, Dayjs] | null =
    customStartDate && customEndDate
      ? [dayjs(customStartDate), dayjs(customEndDate)]
      : null;

  const resolveManualPeriod = () => {
    if (periodMode === 'custom') {
      if (!customStartDate || !customEndDate) {
        return { sessionId: null as string | null, periodLabel: null };
      }
      return {
        sessionId: null as string | null,
        periodLabel: `${customStartDate} – ${customEndDate}`,
      };
    }
    const resolved = resolveFiscalPeriod(
      periodSelection,
      sessionPool,
      fiscalYears,
    );
    return {
      sessionId: resolved.sessionId ?? null,
      periodLabel: resolved.label ?? null,
    };
  };

  const canAdd =
    Boolean(name.trim()) &&
    selectedTeamIds.length > 0 &&
    Number(amount) > 0 &&
    solutions.every(isManualSolutionComplete) &&
    !createCustom.isLoading &&
    !updateCustom.isLoading;

  const handleSave = async () => {
    const trimmedName = name.trim();
    const value = Number(amount) || 0;
    if (!trimmedName || value <= 0 || !selectedTeamIds.length) {
      NotificationMessage.error({
        message: 'Invalid input',
        description:
          'Enter a name, amount greater than zero, and at least one team.',
      });
      return;
    }
    if (!planId || !currencyId) {
      NotificationMessage.error({
        message: 'Missing plan or currency',
        description: 'Select a fiscal plan and currency first.',
      });
      return;
    }

    const { sessionId, periodLabel } = resolveManualPeriod();
    if (!periodLabel) {
      NotificationMessage.error({
        message: 'Period required',
        description:
          periodMode === 'custom'
            ? 'Select a custom start and end date.'
            : 'Select a fiscal year or session.',
      });
      return;
    }

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

    try {
      if (editingItem) {
        const teamId = selectedTeamIds[0]!;
        await updateCustom.mutateAsync({
          id: editingItem.id,
          currencyId,
          sessionId,
          opportunityName: trimmedName,
          forecastValue: value,
          salesTeamId: teamId,
          department: departmentForTeam(salesTeams, teamId),
          notes: notes.trim() || null,
          periodLabel,
          isActive,
        });
      } else {
        const groupId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `group-${Date.now()}`;
        const draft: DraftCustomForecast = {
          localId: `forecast-manual-${Date.now()}`,
          opportunityName: trimmedName,
          groupId,
          value,
          teams: selectedTeamIds.map((salesTeamId) => ({
            salesTeamId,
            amount: value,
          })),
          assignees,
          solutions: draftSolutions,
        };
        for (const [index, team] of draft.teams.entries()) {
          await createCustom.mutateAsync({
            planId,
            currencyId,
            sessionId,
            groupId,
            opportunityName: trimmedName,
            forecastValue: team.amount,
            salesTeamId: team.salesTeamId,
            department: departmentForTeam(salesTeams, team.salesTeamId),
            notes: notes.trim() || null,
            periodLabel,
            isActive,
            ...draftCustomCreateExtras(draft, index),
          });
        }
      }
      onOpenChange(false);
      NotificationMessage.success({
        message: editingItem
          ? 'Manual forecast updated'
          : 'Manual forecast added',
        description: 'Saved to forecast rules.',
      });
    } catch {
      NotificationMessage.error({
        message: 'Save failed',
        description: 'Could not save the manual forecast.',
      });
    }
  };

  const flatTeamOptions = teamGroups.flatMap((group) => group.options);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,52rem)] w-[calc(100vw-2rem)] max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            {editingItem ? 'Edit manual forecast' : 'Add manual forecast'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-[12px] font-medium text-foreground">
              Forecast period
            </p>
            <Select
              value={periodMode}
              onValueChange={(mode) => setPeriodMode(mode as ManualPeriodMode)}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fiscal">Fiscal year / session</SelectItem>
                <SelectItem value="custom">Custom date range</SelectItem>
              </SelectContent>
            </Select>
            {periodMode === 'fiscal' ? (
              <PeriodSelector
                value={periodSelection}
                onChange={(period) => {
                  setPeriodSelection(period);
                  setPeriodMode('fiscal');
                }}
                fullWidth
                align="start"
                variant="panel"
              />
            ) : (
              <RangePicker
                value={manualCustomRange}
                allowClear={false}
                className="h-9 w-full"
                style={{ width: '100%' }}
                onChange={(dates) => {
                  const start = dates?.[0];
                  const end = dates?.[1];
                  if (!start || !end) return;
                  setCustomStartDate(start.format('YYYY-MM-DD'));
                  setCustomEndDate(end.format('YYYY-MM-DD'));
                }}
              />
            )}
            <p className="text-[11px] text-muted-foreground">
              {manualPeriodHint}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold">Currency</span>
                <Select
                  value={currencyId || undefined}
                  onValueChange={setCurrencyId}
                >
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-end gap-2 pb-1">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-[12px] text-foreground">Active</span>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold">
                Notes (optional)
              </span>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Internal definition or context"
                className="h-9 text-[12px]"
              />
            </label>
          </div>

          <ManualTargetPanel
            currency={currencyCode}
            name={name}
            onNameChange={setName}
            amount={amount}
            onAmountChange={setAmount}
            amountHint="Each selected team and member receives this value. The company counts it once."
            teamIds={selectedTeamIds}
            teamLocked={Boolean(editingItem)}
            teamLockedLabel={
              editingItem?.salesTeamId
                ? teamLabel(editingItem.salesTeamId)
                : 'Team'
            }
            teamGroups={
              teamGroups.length > 0
                ? teamGroups
                : [{ label: 'Teams', options: flatTeamOptions }]
            }
            onTeamIdsChange={setTeamIds}
            memberIds={memberIds}
            memberGroups={manualMemberGroups}
            memberPlaceholder={
              selectedTeamIds.length === 0
                ? 'Select a team first'
                : manualMembersLoading
                  ? 'Loading members…'
                  : manualMemberOptions.length === 0
                    ? 'No members on these teams'
                    : 'Select members'
            }
            memberEmptyLabel={
              selectedTeamIds.length === 0
                ? 'Select a team first'
                : 'No members on these teams'
            }
            memberDisabled={
              Boolean(editingItem) ||
              selectedTeamIds.length === 0 ||
              (!manualMembersLoading && manualMemberOptions.length === 0)
            }
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
            onAdd={() => void handleSave()}
            onCancel={() => onOpenChange(false)}
            appearance="neutral"
            addLabel={
              editingItem
                ? 'Save changes'
                : WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
