'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Inbox,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiTeamSelect } from '@/components/pipeline/MultiTeamSelect';
import { Badge } from '@/components/ui/badge';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { opportunityKey } from '@/components/sales-targeting/targetingSectionHelpers';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type DetailsStage = {
  label: string;
  tone: 'positive' | 'pending' | 'neutral';
};

export type DetailsOpp<R> = {
  key: string;
  row: R;
  name: string;
  isCustom: boolean;
  customer: string | null;
  owner: string | null;
  teamLabel: string | null;
  stage: DetailsStage | null;
  closeDate: string | null;
  /** Full opportunity amount available in this scope. */
  poolAmount: number;
  /** Amount currently counted toward the target (the member share for people). */
  amount: number;
  checked: boolean;
  solutions?: Array<{
    name: string;
    amount: number;
    assigneeNames?: string[];
  }>;
};

export type DetailsTeamGroup<R> = {
  key: string;
  label: string;
  opps: DetailsOpp<R>[];
};

export type DetailsDeptGroup<R> = {
  key: string;
  label: string;
  teams: DetailsTeamGroup<R>[];
};

export type DetailsLayout<R> =
  | { kind: 'flat'; opps: DetailsOpp<R>[] }
  | { kind: 'teams'; teams: DetailsTeamGroup<R>[] }
  | { kind: 'departments'; departments: DetailsDeptGroup<R>[] };

export type DetailsStat = {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
};

export type DetailsPendingManual = {
  id: string;
  name: string;
  meta: string;
  amount: number;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const round2 = (value: number) => Math.round(value * 100) / 100;

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function selectionState<R>(opps: DetailsOpp<R>[]): 'all' | 'some' | 'none' {
  if (opps.length === 0) return 'none';
  let selected = 0;
  for (const opp of opps) if (opp.checked) selected += 1;
  if (selected === 0) return 'none';
  return selected === opps.length ? 'all' : 'some';
}

function checkboxValue(state: 'all' | 'some' | 'none') {
  if (state === 'all') return true;
  if (state === 'some') return 'indeterminate' as const;
  return false;
}

function teamOpps<R>(team: DetailsTeamGroup<R>) {
  return team.opps;
}

function deptOpps<R>(dept: DetailsDeptGroup<R>) {
  return dept.teams.flatMap(teamOpps);
}

function detailsOppKey<
  R extends { opportunityType: string; opportunityId: string },
>(opp: DetailsOpp<R>): string {
  return opportunityKey(opp.row.opportunityType, opp.row.opportunityId);
}

function uniqueDetailsOppCount<R>(opps: DetailsOpp<R>[]): number {
  const keys = new Set<string>();
  for (const opp of opps) {
    keys.add(
      detailsOppKey(
        opp as DetailsOpp<{ opportunityType: string; opportunityId: string }>,
      ),
    );
  }
  return keys.size;
}

function sumPool<R>(opps: DetailsOpp<R>[]) {
  const byKey = new Map<string, number>();
  for (const opp of opps) {
    const key = detailsOppKey(
      opp as DetailsOpp<{ opportunityType: string; opportunityId: string }>,
    );
    if (!byKey.has(key)) {
      byKey.set(key, opp.poolAmount);
    }
  }
  return round2([...byKey.values()].reduce((sum, amount) => sum + amount, 0));
}

function sumSelected<R>(opps: DetailsOpp<R>[]) {
  return round2(
    opps.reduce((sum, opp) => (opp.checked ? sum + opp.amount : sum), 0),
  );
}

const STAGE_TONE_CLASS: Record<DetailsStage['tone'], string> = {
  positive: 'border-success/30 bg-success-bg text-success',
  pending: 'border-warning/40 bg-warning-bg text-foreground',
  neutral: 'border-border bg-surface-elevated text-muted-foreground',
};

const FIELD_CLASS =
  'h-9 border-border bg-surface-card text-sm shadow-none focus-visible:ring-brand/30';

/* -------------------------------------------------------------------------- */
/* Rows and group headers                                                     */
/* -------------------------------------------------------------------------- */

function CustomOpportunityBadge() {
  return (
    <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
      <PenLine className="mr-0.5 size-2.5 shrink-0" aria-hidden />
      Custom
    </Badge>
  );
}

type ColumnFlags = {
  showStage: boolean;
  member: boolean;
};

const STAGE_COL = 'hidden w-28 shrink-0 md:block';
const AMOUNT_COL = 'w-24 shrink-0 text-right';
const SHARE_COL = 'w-40 shrink-0';

function OpportunityRow<R>({
  opp,
  padClass,
  selectable,
  shareEditable,
  showTeam,
  currency,
  columns,
  onToggle,
  onShareChange,
}: {
  opp: DetailsOpp<R>;
  padClass: string;
  selectable: boolean;
  shareEditable: boolean;
  showTeam: boolean;
  currency: string;
  columns: ColumnFlags;
  onToggle: (opp: DetailsOpp<R>) => void;
  onShareChange: (opp: DetailsOpp<R>, raw: string) => void;
}) {
  const closes = formatDate(opp.closeDate);
  const meta = [
    opp.customer,
    opp.owner,
    showTeam ? opp.teamLabel : null,
    closes ? `Closes ${closes}` : null,
  ].filter((part): part is string => Boolean(part?.trim()));
  const sharePct =
    opp.poolAmount > 0 ? Math.round((opp.amount / opp.poolAmount) * 100) : 0;
  const dimmed = selectable && !opp.checked;

  return (
    <li
      className={cn(
        'flex items-center gap-3 border-l-2 py-2.5 pr-5 transition-colors',
        padClass,
        selectable && 'cursor-pointer',
        selectable && opp.checked
          ? 'border-brand bg-brand-muted/30'
          : 'border-transparent hover:bg-surface-hover',
      )}
      onClick={selectable ? () => onToggle(opp) : undefined}
    >
      {selectable ? (
        <Checkbox
          checked={opp.checked}
          onCheckedChange={() => onToggle(opp)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${opp.name}`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate text-[13px] font-medium text-foreground',
              dimmed && 'text-muted-foreground',
            )}
          >
            {opp.name}
          </p>
          {opp.isCustom ? <CustomOpportunityBadge /> : null}
        </div>
        {meta.length > 0 ? (
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {meta.join(' · ')}
          </p>
        ) : null}
        {opp.solutions && opp.solutions.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {opp.solutions.map((solution) => (
              <li
                key={`${solution.name}-${solution.amount}`}
                className="truncate text-[11px] text-muted-foreground"
              >
                {solution.name} ·{' '}
                {formatCompactMoney(solution.amount, currency)}
                {solution.assigneeNames && solution.assigneeNames.length > 0
                  ? ` · ${solution.assigneeNames.join(', ')}`
                  : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {columns.showStage ? (
        <div className={STAGE_COL}>
          {opp.stage ? (
            <span
              className={cn(
                'inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[10.5px] font-semibold',
                STAGE_TONE_CLASS[opp.stage.tone],
              )}
            >
              {opp.stage.label}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          )}
        </div>
      ) : null}

      {columns.member ? (
        <>
          <div
            className={cn(
              AMOUNT_COL,
              'text-[13px] tabular-nums text-muted-foreground',
            )}
          >
            {formatCompactMoney(opp.poolAmount, currency)}
          </div>
          <div className={cn(SHARE_COL, 'flex items-center justify-end gap-2')}>
            {!opp.checked ? (
              <span className="text-[12px] text-muted-foreground">
                Not assigned
              </span>
            ) : shareEditable ? (
              <Input
                type="number"
                min={0}
                max={opp.poolAmount}
                step="0.01"
                value={opp.amount}
                aria-label={`Share of ${opp.name}`}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onShareChange(opp, event.target.value)}
                className="h-8 w-24 border-border bg-surface-card px-2 text-right text-[13px] font-semibold tabular-nums shadow-none"
              />
            ) : (
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {formatCompactMoney(opp.amount, currency)}
              </span>
            )}
            {opp.checked ? (
              <span className="w-10 shrink-0 rounded-full bg-brand-muted px-1.5 py-0.5 text-center text-[10.5px] font-semibold tabular-nums text-brand">
                {sharePct}%
              </span>
            ) : (
              <span className="w-10 shrink-0" />
            )}
          </div>
        </>
      ) : (
        <div
          className={cn(
            AMOUNT_COL,
            'text-[13px] font-semibold tabular-nums',
            dimmed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {formatCompactMoney(
            opp.checked ? opp.amount : opp.poolAmount,
            currency,
          )}
        </div>
      )}
    </li>
  );
}

export function DetailsGroupHeader({
  level,
  padClass,
  expanded,
  onToggleExpanded,
  selectable,
  selection,
  onToggleSelection,
  title,
  subtitle,
  amount,
  amountHint,
  progress,
  ariaLabel,
}: {
  level: 'department' | 'team';
  padClass: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  selectable: boolean;
  selection: 'all' | 'some' | 'none';
  onToggleSelection: () => void;
  title: string;
  subtitle: string;
  amount: string;
  amountHint?: string;
  progress: number | null;
  ariaLabel: string;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 pr-5 transition-colors',
        padClass,
        level === 'department'
          ? 'border-y border-border bg-surface-elevated'
          : 'bg-surface-card',
      )}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Chevron className="size-4" />
      </button>
      {selectable ? (
        <Checkbox
          checked={checkboxValue(selection)}
          onCheckedChange={onToggleSelection}
          aria-label={ariaLabel}
        />
      ) : null}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
      >
        <span className="min-w-0">
          <span
            className={cn(
              'block truncate text-foreground',
              level === 'department'
                ? 'text-[13.5px] font-semibold'
                : 'text-[13px] font-semibold',
            )}
          >
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {amount}
          </span>
          {progress !== null ? (
            <span className="h-1 w-24 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </span>
          ) : null}
          {amountHint ? (
            <span className="text-[10.5px] text-muted-foreground">
              {amountHint}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Manual target                                                              */
/* -------------------------------------------------------------------------- */

type ManualSelectGroup = {
  label: string;
  options: { value: string; label: string }[];
};

function ManualFieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string;
  children: string;
  required?: boolean;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[12px] font-medium text-foreground"
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-error" aria-hidden>
          *
        </span>
      ) : null}
    </Label>
  );
}

export type ManualSolutionDraft = {
  productFamilyId: string;
  amount: string;
};

export type ManualFamilyOption = {
  value: string;
  label: string;
  responsibleTeamIds: string[];
  responsibleUserIds: string[];
};

export type ManualTargetPanelProps = {
  currency: string;
  name: string;
  onNameChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  amountHint?: string | null;
  teamIds: string[];
  teamLocked: boolean;
  teamLockedLabel: string;
  teamGroups: ManualSelectGroup[];
  onTeamIdsChange: (value: string[]) => void;
  memberIds: string[];
  memberGroups: ManualSelectGroup[];
  memberPlaceholder: string;
  memberEmptyLabel: string;
  memberDisabled: boolean;
  memberLoading: boolean;
  onMemberIdsChange: (value: string[]) => void;
  solutions: ManualSolutionDraft[];
  onSolutionsChange: (value: ManualSolutionDraft[]) => void;
  familyOptions: ManualFamilyOption[];
  canAdd: boolean;
  onAdd: () => void;
  onCancel: () => void;
  /** Primary action label (default: Add target). */
  addLabel?: string;
  /** Proposals inbox: neutral chrome instead of brand accent. */
  appearance?: 'default' | 'neutral';
};

function ManualSolutionsEditor({
  currency,
  solutions,
  onChange,
  familyOptions,
}: {
  currency: string;
  solutions: ManualSolutionDraft[];
  onChange: (value: ManualSolutionDraft[]) => void;
  familyOptions: ManualFamilyOption[];
}) {
  const update = (index: number, patch: Partial<ManualSolutionDraft>) => {
    onChange(
      solutions.map((solution, solutionIndex) =>
        solutionIndex === index ? { ...solution, ...patch } : solution,
      ),
    );
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium text-foreground">Solutions</p>
          <p className="text-[11.5px] text-muted-foreground">
            Optional. Each amount is credited to the product family&apos;s
            responsible teams and people.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() =>
            onChange([...solutions, { productFamilyId: '', amount: '' }])
          }
        >
          <Plus className="mr-1 size-3.5" />
          Add solution
        </Button>
      </div>
      {solutions.map((solution, index) => {
        return (
          <div
            key={`solution-${index}`}
            className="grid gap-3 rounded-lg border border-border bg-surface-card p-3 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <ManualFieldLabel required>Product family</ManualFieldLabel>
              <select
                value={solution.productFamilyId}
                onChange={(event) =>
                  update(index, { productFamilyId: event.target.value })
                }
                className={cn(FIELD_CLASS, 'w-full')}
              >
                <option value="">Select a product family</option>
                {familyOptions.map((family) => (
                  <option key={family.value} value={family.value}>
                    {family.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <ManualFieldLabel required>Amount</ManualFieldLabel>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={solution.amount}
                    onChange={(event) =>
                      update(index, { amount: event.target.value })
                    }
                    placeholder="0.00"
                    className={cn(FIELD_CLASS, 'pl-12 tabular-nums')}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Remove solution"
                  onClick={() =>
                    onChange(
                      solutions.flatMap((currentSolution, itemIndex) =>
                        itemIndex === index ? [] : [currentSolution],
                      ),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ManualTargetPanel({
  currency,
  name,
  onNameChange,
  amount,
  onAmountChange,
  amountHint,
  teamIds,
  teamLocked,
  teamLockedLabel,
  teamGroups,
  onTeamIdsChange,
  memberIds,
  memberGroups,
  memberPlaceholder,
  memberEmptyLabel,
  memberDisabled,
  memberLoading,
  onMemberIdsChange,
  solutions,
  onSolutionsChange,
  familyOptions,
  canAdd,
  onAdd,
  onCancel,
  addLabel = 'Add target',
  appearance = 'default',
}: ManualTargetPanelProps) {
  const neutral = appearance === 'neutral';
  return (
    <section
      aria-label="Manual target"
      className={cn(
        'rounded-xl border p-4',
        neutral
          ? 'border-border bg-muted/20'
          : 'border-brand-border bg-brand-muted/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg',
              neutral
                ? 'bg-muted text-foreground'
                : 'bg-brand-muted text-brand',
            )}
          >
            <PenLine className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Manual target
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Add a value that is not in the forecast. Each selected team and
              member receives that value. Solutions are optional.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="Close manual target"
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <ManualFieldLabel htmlFor="manual-target-name" required>
            Name
          </ManualFieldLabel>
          <Input
            id="manual-target-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Partner referral"
            className={FIELD_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <ManualFieldLabel htmlFor="manual-target-amount" required>
            Amount
          </ManualFieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
              {currency}
            </span>
            <Input
              id="manual-target-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0.00"
              className={cn(FIELD_CLASS, 'pl-12 tabular-nums')}
            />
          </div>
          {amountHint ? (
            <p className="text-[11.5px] text-muted-foreground">{amountHint}</p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <ManualFieldLabel required>Teams</ManualFieldLabel>
          {teamLocked ? (
            <Input readOnly value={teamLockedLabel} className={FIELD_CLASS} />
          ) : (
            <MultiTeamSelect
              value={teamIds}
              onChange={onTeamIdsChange}
              groups={teamGroups}
              placeholder="Select teams"
              emptyLabel="No teams available"
              countNoun="team"
              className="border-border bg-surface-card text-sm shadow-none"
            />
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <ManualFieldLabel>Members</ManualFieldLabel>
          <MultiTeamSelect
            value={memberIds}
            onChange={onMemberIdsChange}
            groups={memberGroups}
            placeholder={memberPlaceholder}
            emptyLabel={memberEmptyLabel}
            countNoun="member"
            loading={memberLoading}
            disabled={memberDisabled}
            className="border-border bg-surface-card text-sm shadow-none"
          />
        </div>
      </div>

      <ManualSolutionsEditor
        currency={currency}
        solutions={solutions}
        onChange={onSolutionsChange}
        familyOptions={familyOptions}
      />

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 px-4 text-sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="h-9 bg-brand px-4 text-sm text-brand-foreground hover:bg-brand-hover"
          disabled={!canAdd}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>
    </section>
  );
}

function PendingManualList({
  items,
  currency,
  onRemove,
}: {
  items: DetailsPendingManual[];
  currency: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="border-b border-border">
      <div className="flex items-center justify-between bg-surface-elevated px-6 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Manual targets · {items.length}
        </p>
        <p className="text-[11px] text-muted-foreground">Saved with Save</p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-l-2 border-brand bg-brand-muted/20 py-2.5 pl-5 pr-5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-muted text-brand">
              <PenLine className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {item.name}
                </p>
                <span className="shrink-0 rounded-full border border-brand-border bg-brand-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-brand">
                  New
                </span>
              </div>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {item.meta}
              </p>
            </div>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
              {formatCompactMoney(item.amount, currency)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-error"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item.id)}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export type TargetDetailsDialogProps<R> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  currency: string;
  currencyControl?: ReactNode;
  blockedReason?: string | null;
  stats: DetailsStat[];
  layout: DetailsLayout<R>;
  /** Checkboxes are interactive. */
  selectable: boolean;
  /** Team-member view: show each opportunity next to the member's share. */
  member?: boolean;
  /** Member share inputs are editable. */
  shareEditable?: boolean;
  showStageColumn: boolean;
  stageColumnLabel: string;
  selectedCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  emptyMessage: string;
  onToggleOpp: (opp: DetailsOpp<R>) => void;
  onToggleMany: (opps: DetailsOpp<R>[]) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onShareChange: (opp: DetailsOpp<R>, raw: string) => void;
  manualTrigger?: ReactNode;
  manualPanel?: ReactNode;
  pendingManual: DetailsPendingManual[];
  onRemovePending: (id: string) => void;
  footerSummary: ReactNode;
  footerActions: ReactNode;
  /** Rendered inside the dialog (e.g. nested confirmation dialogs). */
  children?: ReactNode;
};

export function TargetDetailsDialog<R>({
  open,
  onOpenChange,
  title,
  description,
  currency,
  currencyControl,
  blockedReason,
  stats,
  layout,
  selectable,
  member = false,
  shareEditable = false,
  showStageColumn,
  stageColumnLabel,
  selectedCount,
  totalCount,
  searchQuery,
  onSearchChange,
  emptyMessage,
  onToggleOpp,
  onToggleMany,
  onSelectAll,
  onClear,
  onShareChange,
  manualTrigger,
  manualPanel,
  pendingManual,
  onRemovePending,
  footerSummary,
  footerActions,
  children,
}: TargetDetailsDialogProps<R>) {
  const searching = searchQuery.trim().length > 0;
  const columns: ColumnFlags = { showStage: showStageColumn, member };

  // Expansion: user overrides on top of a sensible default.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const groupKeys = useMemo(() => {
    const keys: string[] = [];
    if (layout.kind === 'departments') {
      for (const dept of layout.departments) {
        keys.push(dept.key);
        for (const team of dept.teams) keys.push(team.key);
      }
    } else if (layout.kind === 'teams') {
      for (const team of layout.teams) keys.push(team.key);
    }
    return keys;
  }, [layout]);

  useEffect(() => {
    setOverrides({});
  }, [groupKeys.join('|')]);

  const isExpanded = (key: string) =>
    searching ? true : (overrides[key] ?? false);
  const toggleExpanded = (key: string) =>
    setOverrides((current) => ({ ...current, [key]: !isExpanded(key) }));
  const allExpanded =
    groupKeys.length > 0 && groupKeys.every((key) => isExpanded(key));
  const setAllExpanded = (value: boolean) =>
    setOverrides(Object.fromEntries(groupKeys.map((key) => [key, value])));

  const hierarchical = layout.kind !== 'flat';

  const visibleDepartments =
    layout.kind === 'departments'
      ? layout.departments
          .map((dept) => ({
            ...dept,
            teams: searching
              ? dept.teams.filter((team) => team.opps.length > 0)
              : dept.teams,
          }))
          .filter((dept) => !searching || dept.teams.length > 0)
      : [];
  const visibleTeams =
    layout.kind === 'teams'
      ? searching
        ? layout.teams.filter((team) => team.opps.length > 0)
        : layout.teams
      : [];

  const hasListContent =
    layout.kind === 'flat'
      ? layout.opps.length > 0
      : layout.kind === 'teams'
        ? visibleTeams.length > 0
        : visibleDepartments.length > 0;

  const allOpps: DetailsOpp<R>[] =
    layout.kind === 'flat'
      ? layout.opps
      : layout.kind === 'teams'
        ? visibleTeams.flatMap(teamOpps)
        : visibleDepartments.flatMap(deptOpps);

  const renderTeam = (
    team: DetailsTeamGroup<R>,
    padClass: string,
    oppPadClass: string,
  ) => {
    const expanded = isExpanded(team.key);
    const selection = selectionState(team.opps);
    const poolTotal = sumPool(team.opps);
    const selectedTotal = sumSelected(team.opps);
    const selectedInTeam = team.opps.filter((opp) => opp.checked).length;
    const showSelected = selectable;
    return (
      <li key={team.key}>
        <DetailsGroupHeader
          level="team"
          padClass={padClass}
          expanded={expanded}
          onToggleExpanded={() => toggleExpanded(team.key)}
          selectable={selectable}
          selection={selection}
          onToggleSelection={() => onToggleMany(team.opps)}
          title={team.label}
          subtitle={
            selectable && team.opps.length > 0
              ? `${selectedInTeam} of ${pluralize(uniqueDetailsOppCount(team.opps), 'opportunity', 'opportunities')} selected`
              : pluralize(
                  uniqueDetailsOppCount(team.opps),
                  'opportunity',
                  'opportunities',
                )
          }
          amount={formatCompactMoney(
            showSelected ? selectedTotal : poolTotal,
            currency,
          )}
          amountHint={
            showSelected && poolTotal > 0 && selectedTotal !== poolTotal
              ? `of ${formatCompactMoney(poolTotal, currency)}`
              : undefined
          }
          progress={
            showSelected && poolTotal > 0
              ? (selectedTotal / poolTotal) * 100
              : null
          }
          ariaLabel={`Select all opportunities for ${team.label}`}
        />
        {expanded ? (
          <div className="border-b border-border bg-surface-card">
            {team.opps.length === 0 ? (
              <p
                className={cn(
                  'py-3 pr-5 text-[12px] text-muted-foreground',
                  oppPadClass,
                )}
              >
                No opportunities in this team for the selected period.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {team.opps.map((opp) => (
                  <OpportunityRow
                    key={opp.key}
                    opp={opp}
                    padClass={oppPadClass}
                    selectable={selectable}
                    shareEditable={shareEditable}
                    showTeam={false}
                    currency={currency}
                    columns={columns}
                    onToggle={onToggleOpp}
                    onShareChange={onShareChange}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </li>
    );
  };

  const listHeader = (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-y border-border bg-surface-elevated py-2 pl-4 pr-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {selectable ? (
        <Checkbox
          checked={checkboxValue(
            selectedCount === 0
              ? 'none'
              : selectedCount >= totalCount
                ? 'all'
                : 'some',
          )}
          onCheckedChange={() =>
            selectedCount >= totalCount && totalCount > 0
              ? onClear()
              : onSelectAll()
          }
          disabled={totalCount === 0}
          aria-label="Select all opportunities"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-3 normal-case tracking-normal">
        <span className="text-[12px] font-semibold text-foreground">
          {selectable
            ? selectedCount === 0
              ? 'Select all'
              : `${selectedCount} of ${totalCount} selected`
            : pluralize(allOpps.length, 'opportunity', 'opportunities')}
        </span>
        {selectable && selectedCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-medium text-brand hover:text-brand-hover hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      {showStageColumn ? (
        <span className={STAGE_COL}>{stageColumnLabel}</span>
      ) : null}
      {member ? (
        <>
          <span className={AMOUNT_COL}>Forecast</span>
          <span className={cn(SHARE_COL, 'text-right')}>Member share</span>
        </>
      ) : (
        <span className={AMOUNT_COL}>Target value</span>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(88vh,52rem)] w-[calc(100vw-2rem)] max-w-[70rem] flex-col gap-0 overflow-hidden bg-surface-card p-0 text-foreground shadow-lg sm:max-w-[70rem]"
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-border bg-surface-card px-6 py-4 pr-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {title}
            </DialogTitle>
            {currencyControl}
          </div>
          <DialogDescription
            title={description}
            className="line-clamp-2 text-[12.5px] text-muted-foreground"
          >
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-border bg-surface-card px-6 py-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-lg border px-4 py-3',
                stat.highlight
                  ? 'border-brand-border bg-brand-muted/30'
                  : 'border-border bg-surface-elevated',
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </p>
              {stat.hint ? (
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {stat.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {blockedReason ? (
          <div className="flex shrink-0 items-start gap-2 border-b border-border bg-warning-bg px-6 py-2.5 text-[12.5px] text-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="leading-relaxed">{blockedReason}</p>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface-card px-6 py-3">
          <div className="relative min-w-[14rem] max-w-md flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search opportunity, customer, owner or team"
              aria-label="Search opportunities"
              className="h-9 border-border bg-surface-card pl-9 pr-9 text-sm"
            />
            {searching ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-4">
            {hierarchical && groupKeys.length > 0 ? (
              <button
                type="button"
                onClick={() => setAllExpanded(!allExpanded)}
                disabled={searching}
                className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            ) : null}
            {manualTrigger}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-card">
          {manualPanel ? <div className="px-6 pt-4">{manualPanel}</div> : null}
          <div className={cn(manualPanel && 'pt-4')}>
            <PendingManualList
              items={pendingManual}
              currency={currency}
              onRemove={onRemovePending}
            />

            {!hasListContent && pendingManual.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-surface-elevated text-muted-foreground">
                  <Inbox className="size-5" />
                </span>
                <p className="max-w-sm text-[13px] text-muted-foreground">
                  {searching
                    ? 'No opportunities match your search.'
                    : emptyMessage}
                </p>
              </div>
            ) : hasListContent ? (
              <>
                {listHeader}
                {layout.kind === 'flat' ? (
                  <ul className="divide-y divide-border/70">
                    {layout.opps.map((opp) => (
                      <OpportunityRow
                        key={opp.key}
                        opp={opp}
                        padClass="pl-4"
                        selectable={selectable}
                        shareEditable={shareEditable}
                        showTeam
                        currency={currency}
                        columns={columns}
                        onToggle={onToggleOpp}
                        onShareChange={onShareChange}
                      />
                    ))}
                  </ul>
                ) : null}

                {layout.kind === 'teams' ? (
                  <ul className="divide-y divide-border">
                    {visibleTeams.map((team) =>
                      renderTeam(team, 'pl-4', 'pl-11'),
                    )}
                  </ul>
                ) : null}

                {layout.kind === 'departments' ? (
                  <ul>
                    {visibleDepartments.map((dept) => {
                      const expanded = isExpanded(dept.key);
                      const opps = deptOpps(dept);
                      const poolTotal = sumPool(opps);
                      const selectedTotal = sumSelected(opps);
                      const selectedInDept = opps.filter(
                        (opp) => opp.checked,
                      ).length;
                      return (
                        <li key={dept.key}>
                          <DetailsGroupHeader
                            level="department"
                            padClass="pl-4"
                            expanded={expanded}
                            onToggleExpanded={() => toggleExpanded(dept.key)}
                            selectable={selectable}
                            selection={selectionState(opps)}
                            onToggleSelection={() => onToggleMany(opps)}
                            title={dept.label}
                            subtitle={[
                              pluralize(dept.teams.length, 'team'),
                              selectable && opps.length > 0
                                ? `${selectedInDept} of ${pluralize(uniqueDetailsOppCount(opps), 'opportunity', 'opportunities')} selected`
                                : pluralize(
                                    uniqueDetailsOppCount(opps),
                                    'opportunity',
                                    'opportunities',
                                  ),
                            ].join(' · ')}
                            amount={formatCompactMoney(
                              selectable ? selectedTotal : poolTotal,
                              currency,
                            )}
                            amountHint={
                              selectable &&
                              poolTotal > 0 &&
                              selectedTotal !== poolTotal
                                ? `of ${formatCompactMoney(poolTotal, currency)}`
                                : undefined
                            }
                            progress={
                              selectable && poolTotal > 0
                                ? (selectedTotal / poolTotal) * 100
                                : null
                            }
                            ariaLabel={`Select all opportunities in ${dept.label}`}
                          />
                          {expanded ? (
                            dept.teams.length === 0 ? (
                              <p className="border-b border-border py-3 pl-11 pr-5 text-[12px] text-muted-foreground">
                                No teams in this department.
                              </p>
                            ) : (
                              <ul className="divide-y divide-border border-b border-border">
                                {dept.teams.map((team) =>
                                  renderTeam(team, 'pl-11', 'pl-[4.5rem]'),
                                )}
                              </ul>
                            )
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border bg-surface-card px-6 py-3.5 sm:justify-between">
          <div className="min-w-0 text-[13px] text-muted-foreground">
            {footerSummary}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {footerActions}
          </div>
        </DialogFooter>
        {children}
      </DialogContent>
    </Dialog>
  );
}
