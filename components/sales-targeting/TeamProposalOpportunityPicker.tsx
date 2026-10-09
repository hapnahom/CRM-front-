'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useGetSalesForecast } from '@/store/server/features/salesTargeting/queries';
import { useCreateCustomForecast } from '@/store/server/features/salesTargeting/mutations';
import type {
  ForecastOpportunityRow,
  SalesTargetOpportunityType,
  SalesTargetRequestOpportunity,
} from '@/store/server/features/salesTargeting/types';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL } from '@/components/sales-targeting/targetSettingMethod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OpportunityPickerListSkeleton } from '@/components/sales-targeting/ui-kit';
import { Checkbox } from '@/components/ui/checkbox';
import type { TeamSelectGroup } from '@/components/pipeline/MultiTeamSelect';
import { ProposalManualTargetForm } from '@/components/sales-targeting/ProposalManualTargetForm';

const PICKER_CHECKBOX_CLASS =
  'mt-0.5 border-border shadow-none data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background focus-visible:border-foreground focus-visible:ring-foreground/20';

export type ProposalOpportunityLine = {
  opportunityType: SalesTargetOpportunityType;
  opportunityId: string;
  opportunityName?: string | null;
  opportunityValue?: number;
  forecastValue?: number;
  allocatedAmount: number;
  probability?: number | null;
  expectedCloseDate?: string | null;
  ownerId?: string | null;
  teamId?: string | null;
  departmentId?: string | null;
};

export type ForecastRowWithAllocation = Omit<
  ForecastOpportunityRow,
  'probability'
> & {
  allocatedAmount?: number;
  probability?: number | null;
};

export function resolvedAllocatedAmountForForecastRow(
  row: ForecastRowWithAllocation,
): number {
  const snapshotForecast = Number(row.forecastValue) || 0;
  const explicit =
    row.allocatedAmount != null && Number.isFinite(Number(row.allocatedAmount))
      ? Number(row.allocatedAmount)
      : snapshotForecast;
  const cap = Math.max(Number(row.opportunityValue) || 0, snapshotForecast);
  const normalized = Math.max(0, Math.round(explicit * 100) / 100);
  if (cap <= 0) return normalized;
  return Math.min(cap, normalized);
}

export function teamTargetOpportunityFromForecastRow(
  row: ForecastRowWithAllocation,
  teamId: string,
  departmentId: string | null = null,
): ProposalOpportunityLine {
  const forecastValue = Number(row.forecastValue) || 0;
  const opportunityValue = Number(row.opportunityValue) || forecastValue || 0;
  return {
    opportunityType:
      row.opportunityType as ProposalOpportunityLine['opportunityType'],
    opportunityId: row.opportunityId,
    opportunityName: row.opportunityName,
    opportunityValue,
    forecastValue,
    allocatedAmount: resolvedAllocatedAmountForForecastRow(row),
    probability: row.probability ?? null,
    expectedCloseDate: row.expectedCloseDate ?? null,
    ownerId: row.ownerId ?? null,
    teamId: row.salesTeamId ?? teamId,
    departmentId,
  };
}

export function opportunityKey(opportunityType: string, opportunityId: string) {
  return `${opportunityType}:${opportunityId}`;
}

export type OpportunityClaimHint = {
  teamLabel: string;
  pending: boolean;
  peerAllocatedTotal: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One row per opportunity — revision snapshots may contain duplicate lines. */
export function collapseDuplicateOpportunityLines(
  lines: ProposalOpportunityLine[],
): ProposalOpportunityLine[] {
  const byKey = new Map<string, ProposalOpportunityLine>();
  for (const line of lines) {
    const key = opportunityKey(line.opportunityType, line.opportunityId);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...line });
      continue;
    }
    byKey.set(key, {
      ...prev,
      opportunityName: prev.opportunityName || line.opportunityName,
      opportunityValue: Math.max(
        Number(prev.opportunityValue) || 0,
        Number(line.opportunityValue) || 0,
      ),
      forecastValue: Math.max(
        Number(prev.forecastValue) || 0,
        Number(line.forecastValue) || 0,
      ),
      allocatedAmount: roundMoney(
        (Number(prev.allocatedAmount) || 0) +
          (Number(line.allocatedAmount) || 0),
      ),
    });
  }
  return [...byKey.values()];
}

/** Plan-wide split check before save (matches backend exclusivity rules). */
export function validateOpportunitySplitAllocations(
  lines: ProposalOpportunityLine[],
  peerHints?: Map<string, OpportunityClaimHint>,
): string | null {
  for (const line of collapseDuplicateOpportunityLines(lines)) {
    const key = opportunityKey(line.opportunityType, line.opportunityId);
    const source = roundMoney(
      Math.max(
        Number(line.opportunityValue) || 0,
        Number(line.forecastValue) || 0,
      ),
    );
    if (source <= 0) continue;
    const peer = roundMoney(peerHints?.get(key)?.peerAllocatedTotal ?? 0);
    const mine = roundMoney(Number(line.allocatedAmount) || 0);
    if (mine > source + 0.009) {
      const name = line.opportunityName?.trim() || line.opportunityId;
      return `"${name}" is worth ${source}, but this team allocates ${mine} on that deal. Set Allocated to at most ${source}.`;
    }
    const total = roundMoney(peer + mine);
    if (total > source + 0.009) {
      const name = line.opportunityName?.trim() || line.opportunityId;
      const remaining = roundMoney(Math.max(0, source - peer));
      return `"${name}" is worth ${source}, but other teams already claim ${peer} and this row allocates ${mine} (total ${total}). Set Allocated to at most ${remaining}.`;
    }
  }
  return null;
}

function defaultAllocatedForNewLine(
  line: ProposalOpportunityLine,
  peerHints?: Map<string, OpportunityClaimHint>,
): ProposalOpportunityLine {
  const key = opportunityKey(line.opportunityType, line.opportunityId);
  const hint = peerHints?.get(key);
  if (!hint) return line;
  const source = roundMoney(
    Math.max(
      Number(line.opportunityValue) || 0,
      Number(line.forecastValue) || 0,
    ),
  );
  const remaining = roundMoney(Math.max(0, source - hint.peerAllocatedTotal));
  return {
    ...line,
    allocatedAmount: Math.min(line.allocatedAmount, remaining),
  };
}

/** API DTO expects numbers; snapshots may return strings or empty values. */
export function coerceOptionalProbability(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeOpportunityLinesForTargetRequestApi(
  lines: ProposalOpportunityLine[],
) {
  return lines.map((line) => ({
    opportunityType: line.opportunityType,
    opportunityId: line.opportunityId,
    opportunityName: line.opportunityName ?? null,
    opportunityValue: Number(line.opportunityValue) || 0,
    forecastValue: Number(line.forecastValue) || 0,
    allocatedAmount: Number(line.allocatedAmount) || 0,
    probability: coerceOptionalProbability(line.probability),
    expectedCloseDate: line.expectedCloseDate ?? null,
    ownerId: line.ownerId ?? null,
    teamId: line.teamId ?? null,
    departmentId: line.departmentId ?? null,
  }));
}

type TeamProposalOpportunityPickerProps = {
  calendarId?: string;
  currencyCode?: string;
  currencyId?: string;
  salesTeamId?: string;
  horizon?: 'annual' | 'session';
  sessionId?: string;
  /** Opportunities already on other teams' proposals in this plan scope. */
  claimedByTeam?: Map<string, string>;
  selected: ProposalOpportunityLine[];
  onChange: (lines: ProposalOpportunityLine[]) => void;
  /**
   * When true, hide live forecast search (view-only snapshot).
   * Set false during review modify so approvers can add forecast/custom lines.
   */
  reviewMode?: boolean;
  disabled?: boolean;
  /** Other teams' allocated amounts for the same opportunity in this plan scope. */
  opportunityClaimHints?: Map<string, OpportunityClaimHint>;
  /** Persist manual/custom forecast lines and attach to the proposal. */
  allowCustomAdd?: boolean;
  planId?: string;
  /** Snapshot-only: compact flat table (Hybrid company reconciliation). */
  flatSnapshotOnly?: boolean;
  /**
   * Hybrid company Details only: flat checkbox list of company-approved lines
   * (default all selected). B2T/TTB must not set this.
   */
  flatApprovedPool?: ProposalOpportunityLine[];
  /** TTB-style labels (Hybrid company Details uses these; workflow picker unchanged). */
  customAddTriggerLabel?: string;
  customAddFormHeading?: string;
  customOpportunityHint?: string | null;
  /** When set (Hybrid company team row), custom is pinned to this team — no Teams field (TTB team Details parity). */
  customDefaultTeamLabel?: string;
  /** Member proposals: only show forecast rows owned by this user. */
  ownerId?: string | null;
  /** Proposal inbox edit: full manual target panel (teams/members/solutions). */
  useManualTargetForm?: boolean;
  manualTargetTeamGroups?: TeamSelectGroup[];
  manualTargetTeamLabel?: string;
  initialManualMemberIds?: string[];
};

function rowToLine(row: ForecastOpportunityRow): ProposalOpportunityLine {
  return {
    opportunityType: row.opportunityType,
    opportunityId: row.opportunityId,
    opportunityName: row.opportunityName,
    opportunityValue: Number(row.opportunityValue) || 0,
    forecastValue: Number(row.forecastValue) || 0,
    allocatedAmount: Number(row.forecastValue) || 0,
    probability: row.probability ?? null,
    expectedCloseDate: row.expectedCloseDate,
    ownerId: row.ownerId,
    teamId: row.salesTeamId,
    departmentId: null,
  };
}

export function linesFromRequestOpportunities(
  rows: SalesTargetRequestOpportunity[] | undefined,
): ProposalOpportunityLine[] {
  const mapped = (rows ?? []).map((row) => ({
    opportunityType: row.opportunityType,
    opportunityId: row.opportunityId,
    opportunityName: row.opportunityName,
    opportunityValue: Number(row.opportunityValue) || 0,
    forecastValue: Number(row.forecastValue) || 0,
    allocatedAmount: Number(row.allocatedAmount) || 0,
    probability: coerceOptionalProbability(row.probability),
    expectedCloseDate: row.expectedCloseDate,
    ownerId: row.ownerId,
    teamId: row.teamId,
    departmentId: row.departmentId,
  }));
  return collapseDuplicateOpportunityLines(mapped);
}

export function sumAllocated(lines: ProposalOpportunityLine[]): number {
  return (
    Math.round(
      lines.reduce(
        (sum, line) => sum + (Number(line.allocatedAmount) || 0),
        0,
      ) * 100,
    ) / 100
  );
}

export function TeamProposalOpportunityPicker({
  calendarId,
  currencyCode = 'ETB',
  currencyId,
  salesTeamId,
  horizon = 'annual',
  sessionId,
  claimedByTeam,
  selected,
  onChange,
  reviewMode = false,
  disabled = false,
  opportunityClaimHints,
  allowCustomAdd = false,
  planId,
  flatSnapshotOnly = false,
  flatApprovedPool,
  customAddTriggerLabel,
  customAddFormHeading,
  customOpportunityHint,
  customDefaultTeamLabel,
  ownerId,
  useManualTargetForm = false,
  manualTargetTeamGroups = [],
  manualTargetTeamLabel,
  initialManualMemberIds,
}: TeamProposalOpportunityPickerProps) {
  const hybridFlatApprovedPool = flatApprovedPool !== undefined;
  const customAddButtonLabel =
    customAddTriggerLabel?.trim() || WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL;
  const customAddPanelHeading =
    customAddFormHeading?.trim() || WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL;
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const createCustomForecast = useCreateCustomForecast();

  const selectedKeys = useMemo(
    () =>
      new Set(
        selected.map((line) =>
          opportunityKey(line.opportunityType, line.opportunityId),
        ),
      ),
    [selected],
  );

  const { data: forecast, isLoading } = useGetSalesForecast(
    {
      horizon,
      sessionId: horizon === 'session' ? sessionId : undefined,
      calendarId,
      currency: currencyCode || currencyId,
      salesTeamId,
      salespersonId: ownerId?.trim() || undefined,
    },
    Boolean(
      !hybridFlatApprovedPool &&
        !reviewMode &&
        calendarId &&
        (currencyCode || currencyId) &&
        salesTeamId &&
        (horizon === 'annual' || Boolean(sessionId)),
    ),
  );

  const approvedPoolRows = useMemo(
    () => collapseDuplicateOpportunityLines(flatApprovedPool ?? []),
    [flatApprovedPool],
  );

  const rows = useMemo(() => {
    let all = forecast?.rows ?? [];
    if (ownerId?.trim()) {
      all = all.filter((row) => row.ownerId === ownerId);
    }
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (row) =>
        row.opportunityName?.toLowerCase().includes(q) ||
        row.customerName?.toLowerCase().includes(q) ||
        row.ownerName?.toLowerCase().includes(q),
    );
  }, [forecast?.rows, ownerId, search]);

  const toggleRow = (row: ForecastOpportunityRow) => {
    if (disabled) return;
    const key = opportunityKey(row.opportunityType, row.opportunityId);
    if (selectedKeys.has(key)) {
      onChange(
        selected.filter(
          (line) =>
            opportunityKey(line.opportunityType, line.opportunityId) !== key,
        ),
      );
      return;
    }
    onChange([
      ...selected,
      defaultAllocatedForNewLine(rowToLine(row), opportunityClaimHints),
    ]);
  };

  const updateAllocated = (key: string, value: number) => {
    if (disabled) return;
    onChange(
      selected.map((line) =>
        opportunityKey(line.opportunityType, line.opportunityId) === key
          ? { ...line, allocatedAmount: Math.max(0, value) }
          : line,
      ),
    );
  };

  const removeSelected = (key: string) => {
    if (disabled) return;
    onChange(
      selected.filter(
        (line) =>
          opportunityKey(line.opportunityType, line.opportunityId) !== key,
      ),
    );
  };

  const canPersistCustom =
    allowCustomAdd &&
    !disabled &&
    Boolean(planId?.trim()) &&
    Boolean(currencyId?.trim()) &&
    Boolean(salesTeamId?.trim());

  const lineForKey = (key: string) =>
    selected.find(
      (line) =>
        opportunityKey(line.opportunityType, line.opportunityId) === key,
    );

  const toggleApprovedPoolLine = (line: ProposalOpportunityLine) => {
    if (disabled) return;
    const key = opportunityKey(line.opportunityType, line.opportunityId);
    if (selectedKeys.has(key)) {
      onChange(
        selected.filter(
          (row) =>
            opportunityKey(row.opportunityType, row.opportunityId) !== key,
        ),
      );
      return;
    }
    const prev = lineForKey(key);
    onChange([
      ...selected,
      prev ?? {
        ...line,
        allocatedAmount: roundMoney(
          Number(line.allocatedAmount) || Number(line.forecastValue) || 0,
        ),
      },
    ]);
  };

  const selectAllApprovedPool = () => {
    if (disabled) return;
    onChange(
      approvedPoolRows.map((line) => {
        const key = opportunityKey(line.opportunityType, line.opportunityId);
        const prev = lineForKey(key);
        return (
          prev ?? {
            ...line,
            allocatedAmount: roundMoney(
              Number(line.allocatedAmount) || Number(line.forecastValue) || 0,
            ),
          }
        );
      }),
    );
  };

  const deselectAllApprovedPool = () => {
    if (disabled) return;
    onChange([]);
  };

  const addCustomLine = async () => {
    if (!canPersistCustom) return;
    const name = customName.trim();
    const amount = Math.round((Number(customValue) || 0) * 100) / 100;
    if (!name || amount <= 0) return;
    try {
      const created = await createCustomForecast.mutateAsync({
        planId: planId!,
        currencyId: currencyId!,
        sessionId: horizon === 'session' ? (sessionId ?? null) : null,
        opportunityName: name,
        forecastValue: amount,
        salesTeamId: salesTeamId!,
      });
      const key = opportunityKey('custom', created.id);
      if (selectedKeys.has(key)) {
        setCustomName('');
        setCustomValue('');
        setShowCustomForm(false);
        return;
      }
      onChange([
        ...selected,
        {
          opportunityType: 'custom',
          opportunityId: created.id,
          opportunityName: created.opportunityName ?? name,
          opportunityValue: amount,
          forecastValue: amount,
          allocatedAmount: amount,
          probability: null,
          expectedCloseDate: null,
          ownerId: ownerId?.trim() || null,
          teamId: salesTeamId ?? null,
          departmentId: null,
        },
      ]);
      setCustomName('');
      setCustomValue('');
      setShowCustomForm(false);
    } catch {
      // Parent surfaces API errors via global handlers when present.
    }
  };

  if (hybridFlatApprovedPool) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[11px] font-medium text-muted-foreground">
            {selected.length} of {approvedPoolRows.length} approved ·{' '}
            {formatCompactMoney(sumAllocated(selected), currencyCode)} allocated
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {canPersistCustom && !showCustomForm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border bg-surface-card px-3 text-[11px] font-medium text-foreground shadow-none hover:bg-muted/60"
                onClick={() => setShowCustomForm(true)}
              >
                <Plus className="size-3.5" />
                {customAddButtonLabel}
              </Button>
            ) : null}
            {!disabled ? (
              <span className="flex items-center gap-2 text-[11.5px] font-medium">
                <button
                  type="button"
                  className="text-foreground underline-offset-2 hover:underline"
                  onClick={selectAllApprovedPool}
                >
                  Select All
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  className="text-foreground underline-offset-2 hover:underline"
                  onClick={deselectAllApprovedPool}
                >
                  Deselect All
                </button>
              </span>
            ) : null}
          </div>
        </div>

        {showCustomForm && canPersistCustom ? (
          <div className="space-y-3 border-t border-border bg-muted/20 px-3 py-3">
            <p className="text-[11px] font-semibold text-foreground">
              {customAddPanelHeading}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="hybrid-company-custom-forecast-name"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Opportunity name
                </Label>
                <Input
                  id="hybrid-company-custom-forecast-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Strategic account pipeline"
                  className="h-9 border-border bg-surface-card text-[12px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="hybrid-company-custom-forecast-value"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Value ({currencyCode})
                </Label>
                <Input
                  id="hybrid-company-custom-forecast-value"
                  type="number"
                  min={0}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="0.00"
                  className="h-9 border-border bg-surface-card text-[12px] tabular-nums"
                />
              </div>
            </div>
            {customDefaultTeamLabel?.trim() ? (
              <p className="text-[10px] text-muted-foreground">
                {customOpportunityHint?.trim() ||
                  'Attached to this team only (uses this row’s team id — same as My Approvals / team Details).'}
                <span className="mt-1 block font-medium text-foreground">
                  Team: {customDefaultTeamLabel.trim()}
                </span>
              </p>
            ) : customOpportunityHint?.trim() ? (
              <p className="text-[10px] text-muted-foreground">
                {customOpportunityHint}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[11px]"
                onClick={() => setShowCustomForm(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px]"
                disabled={
                  createCustomForecast.isLoading ||
                  !customName.trim() ||
                  !(Number(customValue) > 0)
                }
                onClick={() => void addCustomLine()}
              >
                <Plus className="mr-1 size-3" />
                Add custom
              </Button>
            </div>
          </div>
        ) : null}

        {approvedPoolRows.length === 0 && selected.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-[12px] text-muted-foreground">
            No company-approved opportunities for this team yet.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {[
              ...approvedPoolRows,
              ...selected.filter(
                (line) =>
                  !approvedPoolRows.some(
                    (poolLine) =>
                      opportunityKey(
                        poolLine.opportunityType,
                        poolLine.opportunityId,
                      ) ===
                      opportunityKey(line.opportunityType, line.opportunityId),
                  ),
              ),
            ].map((line) => {
              const key = opportunityKey(
                line.opportunityType,
                line.opportunityId,
              );
              const checked = selectedKeys.has(key);
              const selectedLine = lineForKey(key);
              const sourceValue = roundMoney(
                Math.max(
                  Number(line.opportunityValue) || 0,
                  Number(line.forecastValue) || 0,
                ),
              );
              return (
                <div
                  key={key}
                  className={cn(
                    'flex flex-wrap items-start gap-3 px-3 py-2.5',
                    checked && 'bg-muted/40',
                    disabled && 'opacity-60',
                  )}
                >
                  <Checkbox
                    className={PICKER_CHECKBOX_CLASS}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleApprovedPoolLine(line)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground">
                      {line.opportunityName?.trim() || line.opportunityId}
                    </p>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {line.opportunityType} · Forecast{' '}
                      {formatCompactMoney(
                        Number(line.forecastValue) || 0,
                        currencyCode,
                      )}
                    </p>
                  </div>
                  {checked && selectedLine ? (
                    <div className="shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={sourceValue > 0 ? sourceValue : undefined}
                        step="0.01"
                        className="h-8 w-28 rounded border border-border bg-background px-2 text-[12px] tabular-nums"
                        disabled={disabled}
                        value={selectedLine.allocatedAmount}
                        onChange={(e) =>
                          updateAllocated(key, Number(e.target.value) || 0)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flatSnapshotOnly ? (
        <p className="m-0 text-[11px] font-medium text-muted-foreground">
          {selected.length} opportunit{selected.length === 1 ? 'y' : 'ies'} ·{' '}
          {formatCompactMoney(sumAllocated(selected), currencyCode)} allocated
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              Opportunities
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canPersistCustom && !showCustomForm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border bg-surface-card px-3 text-[11px] font-medium text-foreground shadow-none hover:bg-muted/60"
                onClick={() => setShowCustomForm(true)}
              >
                <Plus className="size-3.5" />
                {customAddButtonLabel}
              </Button>
            ) : null}
            <p className="text-[12px] font-medium text-foreground">
              {selected.length} selected ·{' '}
              {formatCompactMoney(sumAllocated(selected), currencyCode)}
            </p>
          </div>
        </div>
      )}

      {showCustomForm && canPersistCustom ? (
        useManualTargetForm && planId && currencyId && salesTeamId ? (
          <ProposalManualTargetForm
            planId={planId}
            currencyId={currencyId}
            currencyCode={currencyCode}
            horizon={horizon}
            sessionId={sessionId}
            lockedTeamId={salesTeamId}
            lockedTeamLabel={manualTargetTeamLabel?.trim() || 'This team'}
            initialMemberIds={initialManualMemberIds}
            teamGroups={
              manualTargetTeamGroups.length > 0
                ? manualTargetTeamGroups
                : [
                    {
                      label: '',
                      options: [
                        {
                          value: salesTeamId,
                          label: manualTargetTeamLabel?.trim() || salesTeamId,
                        },
                      ],
                    },
                  ]
            }
            ownerId={ownerId}
            selectedKeys={selectedKeys}
            onLinesAdded={(lines) => onChange([...selected, ...lines])}
            onClose={() => setShowCustomForm(false)}
          />
        ) : (
          <div className="space-y-3 border border-border bg-muted/20 px-3 py-3">
            <p className="text-[11px] font-semibold text-foreground">
              {customAddPanelHeading}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="approval-custom-forecast-name"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Name
                </Label>
                <Input
                  id="approval-custom-forecast-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Strategic account pipeline"
                  className="h-9 border-border bg-surface-card text-[12px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="approval-custom-forecast-value"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Amount ({currencyCode})
                </Label>
                <Input
                  id="approval-custom-forecast-value"
                  type="number"
                  min={0}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="0.00"
                  className="h-9 border-border bg-surface-card text-[12px] tabular-nums"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Attached to this team proposal and included when you save
              modifications.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[11px]"
                onClick={() => setShowCustomForm(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px]"
                disabled={
                  createCustomForecast.isLoading ||
                  !customName.trim() ||
                  !(Number(customValue) > 0)
                }
                onClick={() => void addCustomLine()}
              >
                <Plus className="mr-1 size-3" />
                Add manual target
              </Button>
            </div>
          </div>
        )
      ) : null}

      {selected.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Opportunity</th>
                <th className="px-3 py-2 font-medium">Forecast</th>
                <th className="px-3 py-2 font-medium">Allocated</th>
                {!disabled && !flatSnapshotOnly ? (
                  <th className="px-3 py-2 font-medium"> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {selected.map((line) => {
                const key = opportunityKey(
                  line.opportunityType,
                  line.opportunityId,
                );
                const claimHint = opportunityClaimHints?.get(key);
                const sourceValue = roundMoney(
                  Math.max(
                    Number(line.opportunityValue) || 0,
                    Number(line.forecastValue) || 0,
                  ),
                );
                const peerAllocated = roundMoney(
                  claimHint?.peerAllocatedTotal ?? 0,
                );
                const maxAllocated = roundMoney(
                  Math.max(0, sourceValue - peerAllocated),
                );
                return (
                  <tr key={key} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">
                        {line.opportunityName || line.opportunityId}
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {line.opportunityType}
                      </div>
                      {claimHint ? (
                        <div
                          className={cn(
                            'mt-0.5 text-[10px] font-medium',
                            claimHint.pending
                              ? 'text-amber-700'
                              : 'text-muted-foreground',
                          )}
                        >
                          {claimHint.pending ? 'Pending' : 'Also used'} ·{' '}
                          {claimHint.teamLabel}
                          {claimHint.peerAllocatedTotal > 0 ? (
                            <>
                              {' '}
                              · peers{' '}
                              {formatCompactMoney(
                                claimHint.peerAllocatedTotal,
                                currencyCode,
                              )}
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {formatCompactMoney(
                        Number(line.forecastValue) || 0,
                        currencyCode,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {disabled ? (
                        formatCompactMoney(line.allocatedAmount, currencyCode)
                      ) : (
                        <div>
                          <input
                            type="number"
                            min={0}
                            max={sourceValue > 0 ? maxAllocated : undefined}
                            step="0.01"
                            className="h-8 w-28 rounded border border-border bg-background px-2"
                            value={line.allocatedAmount}
                            onChange={(e) =>
                              updateAllocated(key, Number(e.target.value) || 0)
                            }
                          />
                          {sourceValue > 0 ? (
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              Max{' '}
                              {formatCompactMoney(maxAllocated, currencyCode)}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                    {!disabled && !flatSnapshotOnly ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => removeSelected(key)}
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : reviewMode ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
          No opportunities selected.
        </p>
      ) : null}

      {!reviewMode ? (
        <div className="space-y-2">
          <input
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-[12px]"
            placeholder="Search forecast opportunities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {isLoading ? (
              <OpportunityPickerListSkeleton rows={6} />
            ) : rows.length === 0 ? (
              <p className="p-3 text-[12px] text-muted-foreground">
                No forecast opportunities for this team/currency.
              </p>
            ) : (
              rows.map((row) => {
                const key = opportunityKey(
                  row.opportunityType,
                  row.opportunityId,
                );
                const checked = selectedKeys.has(key);
                const claimedBy = claimedByTeam?.get(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2 last:border-b-0',
                      checked && 'bg-muted/40',
                      disabled && 'cursor-not-allowed opacity-60',
                      claimedBy && !checked && 'opacity-80',
                    )}
                  >
                    <Checkbox
                      className={PICKER_CHECKBOX_CLASS}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleRow(row)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-foreground">
                        {row.opportunityName}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.customerName || '—'} · {row.ownerName || '—'} ·{' '}
                        {row.stageName || row.status}
                      </span>
                      {claimedBy ? (
                        <span className="mt-0.5 block text-[10px] font-medium text-amber-700">
                          Also proposed by {claimedBy} — split allocated amount
                          if sharing.
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12px] font-medium">
                      {formatCompactMoney(
                        Number(row.forecastValue) || 0,
                        currencyCode,
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
