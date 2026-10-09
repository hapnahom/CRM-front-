'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { alignedOpportunitiesColumnLabel } from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { formatOrgFiscalYearLabel } from '@/lib/orgFiscalSettings';
import {
  TARGETS_TABLE_HEAD_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import { targetSharePercent } from '@/lib/target-format';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

const SEGMENT_COLORS = tokens.chart.palette;
const EMPTY_SEGMENT_COLOR = tokens.color.textMuted;
const TRACK_COLOR = tokens.color.borderDefault;

/** Shared min-height for the two overview cards at the top of Annual / Period tabs. */
export const TARGET_OVERVIEW_CARD_HEIGHT = 'min-h-[16rem] lg:min-h-[18rem]';

export const TARGETS_CONTENT_CLASS = 'w-full';

export function segmentColor(index: number, amount: number) {
  if (amount <= 0) return EMPTY_SEGMENT_COLOR;
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length]!;
}

function share(amount: number, total: number) {
  return targetSharePercent(amount, total);
}

export type DistributionSegment = {
  name: string;
  amount: number;
};

/**
 * Donut of how a scope total is split across departments (whole-company view)
 * or across the teams of one department.
 */
export function TargetDistributionCard({
  label,
  total,
  totalLabel,
  currency,
  centerLabel,
  segments,
  filter,
  emptyMessage = 'Nothing allocated yet.',
  className,
}: {
  label: string;
  total: number;
  /** Trailing copy after the amount, e.g. "total company target". */
  totalLabel: string;
  currency: string;
  /** Caption under the donut percentage, e.g. "Company all". */
  centerLabel: string;
  segments: DistributionSegment[];
  filter?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  emptyMessage?: string;
  className?: string;
}) {
  const allocated = segments.reduce((sum, item) => sum + item.amount, 0);
  const denominator = total > 0 ? total : allocated;
  const colored = segments.map((item, index) => ({
    ...item,
    color: segmentColor(index, item.amount),
  }));

  let cursor = 0;
  const stops =
    denominator > 0
      ? colored
          .filter((item) => item.amount > 0)
          .map((item) => {
            const start = cursor;
            cursor += (item.amount / denominator) * 100;
            return `${item.color} ${start}% ${cursor}%`;
          })
          .concat(cursor < 100 ? [`${TRACK_COLOR} ${cursor}% 100%`] : [])
          .join(', ')
      : `${TRACK_COLOR} 0% 100%`;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {formatCompactMoney(denominator, currency)}
            </span>{' '}
            {totalLabel}
          </p>
        </div>
        {filter &&
        filter.options.length > 0 &&
        filter.options.some((option) => option.value === filter.value) ? (
          <Select
            value={filter.value}
            onValueChange={(next) => {
              if (next !== filter.value) filter.onChange(next);
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[8.25rem] shrink-0 border-border bg-surface-card px-2 text-[11px] font-medium data-[size=sm]:h-8 [&_[data-slot=select-value]]:truncate"
            >
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              {filter.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-[12px] font-medium"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-6 sm:flex-row sm:items-stretch">
        <div
          role="img"
          aria-label={`${label} donut chart`}
          className="relative mx-auto flex size-[176px] shrink-0 items-center justify-center self-center rounded-full sm:mx-0"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="absolute inset-[14px] rounded-full bg-white" />
          <div className="relative z-10 max-w-[72px] text-center">
            <p className="text-[17px] font-bold leading-none tabular-nums text-foreground">
              {denominator > 0 ? `${share(allocated, denominator)}%` : '—'}
            </p>
            <p className="mt-1.5 text-[7px] font-bold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
              {centerLabel}
            </p>
          </div>
        </div>

        {colored.length === 0 ? (
          <p className="flex-1 text-center text-[12px] text-muted-foreground sm:text-left">
            {emptyMessage}
          </p>
        ) : (
          <div className="min-h-0 max-h-[10.5rem] flex-1 overflow-y-auto no-scrollbar sm:max-h-none">
            <div className="space-y-0 pr-0.5">
              {colored.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {item.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[12px] font-semibold tabular-nums text-foreground">
                      {formatCompactMoney(item.amount, currency)}
                    </span>
                    <span className="block text-[10px] tabular-nums text-muted-foreground">
                      {share(item.amount, denominator)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Company annual / period target headline with its contributing-opportunity panel. */
export function ScopeTargetCard({
  label,
  badge,
  amount,
  currency,
  meta,
  count,
  countLabel,
  countMeta,
  hybridAccounting,
  action,
  className,
  showZeroAmount,
}: {
  label: string;
  badge?: { label: string; className?: string } | null;
  amount: number;
  currency: string;
  meta?: string;
  count: number;
  countLabel: string;
  countMeta: string;
  /** Hybrid company card: company-approved proposal total vs strategic gap (not the Details modal list). */
  hybridAccounting?: {
    proposalAmount: number;
    remainingGap: number;
  };
  action?: ReactNode;
  className?: string;
  /** Hybrid strategic: show ETB 0 instead of "Not set". */
  showZeroAmount?: boolean;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-xl border border-border bg-surface-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {badge ? (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]',
              badge.className ?? 'bg-brand-muted text-brand',
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      {hybridAccounting ? (
        <div className="mt-2.5 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-3">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Strategic target
            </p>
            <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-[26px]">
              {amount > 0 || showZeroAmount
                ? formatCompactMoney(amount, currency)
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Proposal amount
            </p>
            <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-[26px]">
              {formatCompactMoney(hybridAccounting.proposalAmount, currency)}
            </p>
          </div>
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Remaining gap
            </p>
            <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight tabular-nums text-foreground sm:text-[26px]">
              {formatCompactMoney(hybridAccounting.remainingGap, currency)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight tabular-nums text-foreground">
          {amount > 0 || showZeroAmount
            ? formatCompactMoney(amount, currency)
            : 'Not set'}
        </p>
      )}
      {meta ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{meta}</p>
      ) : null}

      {hybridAccounting ? (
        <div className="mt-auto flex justify-end pt-3">{action}</div>
      ) : (
        <div className="mt-auto flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-3.5 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[11px] font-bold tabular-nums text-brand">
            {count}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {countLabel}
            </p>
            <p className="truncate text-[10.5px] text-muted-foreground">
              {countMeta}
            </p>
          </div>
          {action}
        </div>
      )}
    </section>
  );
}

export function TargetDetailsButton({
  onClick,
  label = 'Details',
  tone = 'solid',
  disabled,
}: {
  onClick: () => void;
  label?: string;
  tone?: 'solid' | 'outline';
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={tone === 'solid' ? 'default' : 'outline'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-7 shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold',
        tone === 'solid'
          ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
          : 'border-brand/50 bg-surface-card text-brand hover:bg-brand-muted hover:text-brand',
      )}
    >
      <Search className="size-3" />
      {label}
    </Button>
  );
}

export function TargetsSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function DepartmentTargetTile({
  name,
  amount,
  currency,
  managerName,
  managerAvatarUrl,
  meta,
  selected,
  onSelect,
}: {
  name: string;
  amount: number;
  currency: string;
  managerName: string | null;
  managerAvatarUrl?: string | null;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const managerLabel = managerName?.trim() || 'No manager';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'min-w-[15rem] shrink-0 rounded-xl border-2 bg-surface-card p-4 text-left transition-all sm:min-w-[16.5rem] xl:min-w-0',
        selected
          ? 'border-brand shadow-[0_1px_3px_rgba(237,105,37,0.12)]'
          : 'border-border hover:border-border-strong hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-foreground">
          {name}
        </span>
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-brand">
          {formatCompactMoney(amount, currency)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <Avatar className="size-8 rounded-md">
          {managerAvatarUrl ? (
            <AvatarImage src={managerAvatarUrl} alt={managerLabel} />
          ) : null}
          <AvatarFallback className="rounded-md bg-surface-elevated text-[9px] font-bold text-muted-foreground">
            {initials(managerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-medium text-foreground">
            {managerLabel}
          </p>
          <p className="truncate text-[10px] tabular-nums text-muted-foreground">
            {meta}
          </p>
        </div>
      </div>
    </button>
  );
}

/** Selected department headline + the teams that roll up into it. */
export function DepartmentTargetPanel({
  label,
  name,
  meta,
  action,
  teamsLabel,
  children,
}: {
  label: string;
  name: string;
  meta: string;
  action?: ReactNode;
  teamsLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <h3 className="mt-1.5 text-[20px] font-semibold tracking-tight text-foreground">
            {name}
          </h3>
          <p className="mt-1 text-[11.5px] text-muted-foreground">{meta}</p>
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>

      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {teamsLabel}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export function MissingDepartmentAssignmentHint({
  className,
}: {
  className?: string;
}) {
  return (
    <p
      className={cn(
        'border-t border-amber-200 bg-amber-50 px-4 py-2 text-[10.5px] leading-relaxed text-amber-900',
        className,
      )}
    >
      Assign this team to a department in Org Structure before setting targets
      or applying sequencing rules.
    </p>
  );
}

export function TeamTargetCard({
  name,
  amount,
  currency,
  color,
  managerName,
  targetLabel,
  footnote,
  notice,
  action,
}: {
  name: string;
  amount: number;
  currency: string;
  color: string;
  managerName: string | null;
  targetLabel: string;
  footnote: string;
  notice?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card">
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="truncate text-[13px] font-semibold text-foreground">
              {name}
            </span>
          </span>
          <span className="shrink-0 text-[13px] font-bold tabular-nums text-brand">
            {formatCompactMoney(amount, currency)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 pl-[18px]">
          <span className="truncate text-[10.5px] text-muted-foreground">
            Manager: {managerName?.trim() || 'Unassigned'}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {targetLabel}
          </span>
        </div>
      </div>
      {notice}
      <div className="flex items-center justify-between gap-2 bg-surface-elevated px-4 py-2.5">
        <span className="truncate text-[10.5px] text-muted-foreground">
          {footnote}
        </span>
        {action}
      </div>
    </div>
  );
}

/** Period picker strip shown above the period target cards. */
export function PeriodTargetsBar({
  label,
  periodName,
  periodRange,
  options,
  value,
  onChange,
  emptyLabel = 'No periods configured',
  action,
}: {
  label: string;
  periodName: string | null;
  periodRange: string | null;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-5 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {periodName ? (
          <span className="flex min-w-0 items-center gap-2 rounded-full bg-brand-muted px-3 py-1">
            <span className="size-1.5 shrink-0 rounded-full bg-brand" />
            <span className="truncate text-[11px] font-bold text-brand">
              {periodName}
            </span>
            {periodRange ? (
              <span className="truncate text-[10px] tabular-nums text-brand/70">
                ({periodRange})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {emptyLabel}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {action}
        {options.length > 0 &&
        options.some((option) => option.value === value) ? (
          <Select
            value={value}
            onValueChange={(next) => {
              if (next !== value) onChange(next);
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter period"
              className="w-auto shrink-0 gap-1.5 border-border bg-surface-card px-3 text-[11px] font-semibold data-[size=sm]:h-8"
            >
              <ListFilter className="size-3.5 text-muted-foreground" />
              Filter Period
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-[12px] font-medium"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </section>
  );
}

const PEOPLE_FILTER_TRIGGER_CLASS =
  'flex h-8 max-w-[18rem] shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-card px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50';

function PeoplePeriodPicker({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter period"
          disabled={options.length === 0}
          className={PEOPLE_FILTER_TRIGGER_CLASS}
        >
          <ListFilter className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            {selected?.label ?? 'Select period'}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search periods"
              className="h-9 border-border bg-surface-card pl-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              {needle
                ? 'No periods match your search.'
                : 'No periods configured'}
            </p>
          ) : (
            visible.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-hover',
                    active &&
                      'bg-brand-muted font-semibold text-brand hover:bg-brand-muted',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {active ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type PeopleTeamGroup = {
  label: string;
  options: { value: string; label: string }[];
};

/**
 * One field for department + team: departments expand to reveal their teams.
 * Only teams are selectable.
 */
function PeopleTeamPicker({
  groups,
  value,
  onChange,
}: {
  groups: PeopleTeamGroup[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const selectedGroup = groups.find((group) =>
    group.options.some((option) => option.value === value),
  );
  const selectedTeam = selectedGroup?.options.find(
    (option) => option.value === value,
  );
  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  const visibleGroups = useMemo(() => {
    if (!searching) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.label.toLowerCase().includes(needle)
          ? group.options
          : group.options.filter((option) =>
              option.label.toLowerCase().includes(needle),
            ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, needle, searching]);

  const isExpanded = (group: PeopleTeamGroup) =>
    searching ||
    !group.label ||
    (expanded[group.label] ?? group.label === selectedGroup?.label);

  const renderTeam = (
    option: { value: string; label: string },
    nested: boolean,
  ) => {
    const active = option.value === value;
    return (
      <button
        key={option.value}
        type="button"
        onClick={() => {
          onChange(option.value);
          setOpen(false);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-[13px] transition-colors hover:bg-surface-hover',
          nested ? 'pl-8' : 'pl-2',
          active &&
            'bg-brand-muted font-semibold text-brand hover:bg-brand-muted',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {active ? <Check className="size-3.5 shrink-0" /> : null}
      </button>
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter team"
          disabled={groups.length === 0}
          className={PEOPLE_FILTER_TRIGGER_CLASS}
        >
          <Users className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            {selectedTeam ? (
              <>
                {selectedGroup?.label ? (
                  <span className="font-medium text-muted-foreground">
                    {selectedGroup.label} /{' '}
                  </span>
                ) : null}
                {selectedTeam.label}
              </>
            ) : (
              'Select team'
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search departments or teams"
              className="h-9 border-border bg-surface-card pl-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {visibleGroups.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              {searching ? 'No teams match your search.' : 'No teams available'}
            </p>
          ) : (
            visibleGroups.map((group) => {
              if (!group.label) {
                return group.options.map((option) => renderTeam(option, false));
              }
              const open = isExpanded(group);
              return (
                <div key={group.label} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [group.label]: !open,
                      }))
                    }
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-hover"
                  >
                    {open ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                      {group.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {group.options.length}
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-0.5 space-y-0.5">
                      {group.options.map((option) => renderTeam(option, true))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** People tab — context bar with inline period and team filters. */
export function PeopleTargetsBar({
  periodLabel,
  teamContextLabel,
  sessionOptions,
  sessionId,
  onSessionChange,
  teamGroups,
  teamId,
  onTeamChange,
}: {
  periodLabel: string;
  teamContextLabel: string;
  sessionOptions: { value: string; label: string }[];
  sessionId: string;
  onSessionChange: (value: string) => void;
  teamGroups: PeopleTeamGroup[];
  teamId: string;
  onTeamChange: (value: string) => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-5 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Sales rep targets
        </p>
        <span className="flex min-w-0 items-center gap-2 rounded-full bg-brand-muted px-3 py-1">
          <span className="size-1.5 shrink-0 rounded-full bg-brand" />
          <span className="truncate text-[11px] font-bold text-brand">
            {periodLabel}
          </span>
        </span>
        <span className="truncate rounded-full border border-border bg-surface-elevated px-3 py-1 text-[11px] font-medium text-foreground">
          {teamContextLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PeoplePeriodPicker
          options={sessionOptions}
          value={sessionId}
          onChange={onSessionChange}
        />
        <PeopleTeamPicker
          groups={teamGroups}
          value={teamId}
          onChange={onTeamChange}
        />
      </div>
    </section>
  );
}

export function formatFiscalYearLabel(
  calendar:
    | { name?: string; startDate: string; endDate: string }
    | null
    | undefined,
  fallbackYear?: number,
) {
  if (!calendar) {
    return fallbackYear ? `FY ${fallbackYear}` : 'FY';
  }
  const label = formatOrgFiscalYearLabel(calendar);
  if (label !== 'FY' || !fallbackYear) return label;
  return `FY ${fallbackYear}`;
}

export function TeamTargetAllocationPanel({
  sectionLabel,
  teamName,
  meta,
  equalSplitAction,
  periodTarget,
  allocated,
  remaining,
}: {
  sectionLabel: string;
  teamName: string;
  meta: string;
  equalSplitAction?: ReactNode;
  periodTarget: { value: string; hint: string };
  allocated: { value: string; hint: string };
  remaining: { value: string; hint: string; warn?: boolean };
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {sectionLabel}
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {teamName}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">{meta}</p>
        </div>
        {equalSplitAction ? (
          <div className="shrink-0 self-start">{equalSplitAction}</div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Team period target
          </p>
          <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-foreground">
            {periodTarget.value}
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {periodTarget.hint}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Allocated to sales reps
          </p>
          <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-brand">
            {allocated.value}
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {allocated.hint}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Remaining / unassigned
          </p>
          <p
            className={cn(
              'mt-1.5 text-[22px] font-bold leading-none tabular-nums',
              remaining.warn ? 'text-error' : 'text-foreground',
            )}
          >
            {remaining.value}
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {remaining.hint}
          </p>
        </div>
      </div>
    </section>
  );
}

export function EqualSplitButton({
  onClick,
  disabled,
  loading,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || loading}
      title={title}
      onClick={onClick}
      className="h-8 gap-1.5 border-brand/40 bg-surface-card px-3 text-[12px] font-semibold text-brand hover:bg-brand-muted hover:text-brand"
    >
      <Sparkles className="size-3.5" />
      {loading ? 'Splitting…' : 'Equal Split'}
    </Button>
  );
}

export type SalesRepresentativeRow = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  quotaShareLabel: string;
  role: string;
  alignedDealsLabel: string;
  definition: string;
  targetValue: string;
  action?: ReactNode;
};

function repInitials(name: string) {
  if (!name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

/** People tab — sales rep quota table. */
export function SalesRepresentativesTable({
  teamName,
  currencyCode,
  rows,
}: {
  teamName: string;
  currencyCode?: string;
  rows: SalesRepresentativeRow[];
}) {
  const quotaColumnLabel = currencyCode
    ? `Target quota (${currencyCode})`
    : 'Target quota';
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-card shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      <div className="border-b border-border px-5 py-4">
        <h3
          className={cn(
            'uppercase tracking-wider text-foreground',
            TARGETS_TABLE_HEAD_CLASS,
          )}
        >
          Sales representatives ({rows.length})
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Individual quotas, pipeline allocations, and definitions for{' '}
          {teamName}.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div
            className={cn(
              'grid grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(160px,1.2fr)_minmax(110px,0.8fr)_minmax(88px,auto)] gap-3 px-5 py-3',
              TARGETS_TABLE_HEAD_ROW_CLASS,
            )}
          >
            <span>Sales representative</span>
            <span>Role / responsibility</span>
            <span>{alignedOpportunitiesColumnLabel()}</span>
            <span>Quota definition &amp; strategy</span>
            <span className="text-right">{quotaColumnLabel}</span>
            <span className="text-right">Actions</span>
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
              No sales representatives on this team yet.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_minmax(90px,0.7fr)_minmax(160px,1.2fr)_minmax(110px,0.8fr)_minmax(88px,auto)] items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8 rounded-full">
                    {row.avatarUrl ? (
                      <AvatarImage src={row.avatarUrl} alt={row.name} />
                    ) : null}
                    <AvatarFallback className="bg-brand-muted text-[9px] font-bold text-brand">
                      {repInitials(row.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {row.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {row.quotaShareLabel}
                    </p>
                  </div>
                </div>
                <p className="truncate text-xs text-foreground">{row.role}</p>
                <p className="text-xs text-foreground">
                  {row.alignedDealsLabel}
                </p>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {row.definition}
                </p>
                <div className="text-right">
                  <p className="text-[13px] font-semibold tabular-nums text-foreground">
                    {row.targetValue}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Target</p>
                </div>
                <div className="flex justify-end">{row.action}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
