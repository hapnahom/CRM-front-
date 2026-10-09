'use client';

import { type ReactNode } from 'react';
import { BriefcaseBusiness, Filter, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pipelineStageAppearance } from '@/lib/stage-presets';
import { Badge } from '@/components/ui/badge';
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
import {
  type FilterChip,
  type PipelineDashboardData,
  type PipelineModule,
} from '@/hooks/usePipelineDashboardData';
import {
  PipelineModuleDashboardProvider,
  useOptionalPipelineModuleDashboardContext,
  usePipelineModuleDashboardContext,
} from '@/components/pipeline/PipelineModuleDashboardContext';
import { PipelineApprovalRequestsCard } from '@/components/pipeline/PipelineApprovalRequestsCard';
import {
  formatDashboardValue,
  type DashboardCurrency,
  type DashboardPeriod,
  type HighValueRecord,
} from '@/modules/pipeline/dashboard-mock-data';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import type { PipelineStage as DealPipelineStage } from '@/store/server/features/deals/pipeline/types';
import type { PipelineStage as LeadPipelineStage } from '@/store/server/features/leads/pipeline/types';

/** Tall panel (~half viewport) so the vertical high-value list can scroll. */
const HIGH_VALUE_PANEL_HEIGHT = 'h-[min(50vh,480px)]';

function PanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-surface-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Period totals as a row of read-only mini-cards (count + compact value). */
function PeriodCards({
  periodTotals,
  periodValueTotals,
  currency,
  periodOptions,
}: {
  periodTotals: Record<DashboardPeriod, number>;
  periodValueTotals: Record<DashboardPeriod, number>;
  currency: string;
  periodOptions: Array<{ value: DashboardPeriod; label: string }>;
}) {
  return (
    <div
      aria-label="Period totals"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {periodOptions.map((option) => (
        <div
          key={option.value}
          className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface-elevated/60 px-3 py-2.5 text-left"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {option.label}
          </span>
          <span className="text-[18px] font-bold leading-none tabular-nums tracking-tight text-foreground">
            {periodTotals[option.value]}
          </span>
          <span className="truncate text-[10px] font-medium tabular-nums text-muted-foreground">
            {formatDashboardValue(periodValueTotals[option.value], currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-full border-border bg-surface-card text-[12px] shadow-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FiltersPopover({ dashboard }: { dashboard: PipelineDashboardData }) {
  const {
    entityLabel,
    showSalesTeamFilter,
    showSalesRepFilter,
    showSolutionFilter,
    filterSalesTeamId,
    setFilterSalesTeamId,
    filterSalesRepId,
    setFilterSalesRepId,
    filterSolutionId,
    setFilterSolutionId,
    salesTeams,
    salesRepsForTeam,
    solutionOptions,
    activeFilterChips,
    clearAllFilters,
  } = dashboard;

  const hasActiveFilters = activeFilterChips.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter by assignment"
          className={cn(
            'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors',
            hasActiveFilters
              ? 'border-brand-border bg-brand-muted text-brand'
              : 'border-border bg-surface-card text-foreground hover:border-border-strong hover:bg-surface-elevated',
          )}
        >
          <Filter size={14} aria-hidden="true" />
          Filter
          {hasActiveFilters ? (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
              {activeFilterChips.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              Filter {entityLabel}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[10.5px] font-medium text-brand hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <div className="max-h-[420px] space-y-4 overflow-y-auto scrollbar-hide pr-0.5">
          {showSalesTeamFilter || showSalesRepFilter ? (
            <>
              <FilterSection
                label="Assignment"
                icon={<BriefcaseBusiness size={11} aria-hidden="true" />}
              >
                {showSalesTeamFilter ? (
                  <FilterField label="Team">
                    <FilterSelect
                      value={filterSalesTeamId}
                      onValueChange={(value) => {
                        setFilterSalesTeamId(value);
                        setFilterSalesRepId('all');
                      }}
                      placeholder="All teams"
                      options={[
                        { value: 'all', label: 'All teams' },
                        ...salesTeams.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                    />
                  </FilterField>
                ) : null}
                {showSalesRepFilter ? (
                  <FilterField label="Member (Responsible)">
                    <FilterSelect
                      value={filterSalesRepId}
                      onValueChange={setFilterSalesRepId}
                      placeholder="All members"
                      options={[
                        { value: 'all', label: 'All members' },
                        ...salesRepsForTeam.map((r) => ({
                          value: r.id,
                          label: r.name,
                        })),
                      ]}
                    />
                  </FilterField>
                ) : null}
              </FilterSection>
            </>
          ) : null}

          {showSolutionFilter ? (
            <FilterSection
              label="Solution"
              icon={<BriefcaseBusiness size={11} aria-hidden="true" />}
            >
              <FilterField label="Solution">
                <FilterSelect
                  value={filterSolutionId}
                  onValueChange={setFilterSolutionId}
                  placeholder="All solutions"
                  options={[
                    { value: 'all', label: 'All solutions' },
                    ...solutionOptions.map((s) => ({
                      value: s.value,
                      label: s.label,
                    })),
                  ]}
                />
              </FilterField>
            </FilterSection>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: DashboardCurrency;
  onChange: (value: DashboardCurrency) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as DashboardCurrency)}
    >
      <SelectTrigger className="h-8 w-[96px] border-border bg-surface-card text-[12px] font-medium shadow-none">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ETB">ETB</SelectItem>
        <SelectItem value="USD">USD</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PipelineOverviewCard({
  dashboard,
}: {
  dashboard: PipelineDashboardData;
}) {
  const {
    entityLabel,
    currency,
    periodTotals,
    periodValueTotals,
    periodOptions,
    isLoading,
    isError,
    refetch,
  } = dashboard;

  return (
    <div className="w-full min-w-0 shrink-0">
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-center text-[12px] text-red-700">
          Failed to load {entityLabel} dashboard metrics.{' '}
          <button
            type="button"
            onClick={() => refetch()}
            className="font-medium underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className={cn(isLoading && 'animate-pulse opacity-70')}>
          <PeriodCards
            periodTotals={periodTotals}
            periodValueTotals={periodValueTotals}
            currency={currency}
            periodOptions={periodOptions}
          />
        </div>
      )}
    </div>
  );
}

export function PipelineModuleDashboardToolbar({
  className,
  hideCurrency = false,
}: {
  className?: string;
  hideCurrency?: boolean;
} = {}) {
  const dashboard = usePipelineModuleDashboardContext();
  return (
    <DashboardFiltersBar
      dashboard={dashboard}
      className={className}
      hideCurrency={hideCurrency}
    />
  );
}

function DashboardFiltersBar({
  dashboard,
  className,
  hideCurrency = false,
}: {
  dashboard: PipelineDashboardData;
  className?: string;
  hideCurrency?: boolean;
}) {
  const { currency, setCurrency } = dashboard;

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
    >
      {hideCurrency ? null : (
        <CurrencySelect value={currency} onChange={setCurrency} />
      )}
      <FiltersPopover dashboard={dashboard} />
    </div>
  );
}

function activeFilterDescription(
  chips: FilterChip[],
  fallback: string,
): string {
  if (chips.length === 0) return fallback;

  return chips
    .map((chip) => {
      if (chip.kind === 'team') return chip.team.name;
      if (chip.kind === 'person') return chip.person.name;
      return chip.label;
    })
    .join(', ');
}

type HighValueStageRef = Pick<
  DealPipelineStage | LeadPipelineStage,
  'name' | 'color' | 'borderColor'
>;

function resolveHighValueStageAppearance(
  stageName: string,
  stages: HighValueStageRef[],
) {
  const normalized = stageName.trim().toLowerCase();
  const stageIndex = stages.findIndex(
    (stage) => stage.name.trim().toLowerCase() === normalized,
  );
  const stage = stageIndex >= 0 ? stages[stageIndex] : null;
  return pipelineStageAppearance(stage ?? {}, stageIndex >= 0 ? stageIndex : 0);
}

function HighValueListItem({
  record,
  module,
  rank,
  maxValueAmount,
  stages,
}: {
  record: HighValueRecord;
  module: PipelineModule;
  rank: number;
  maxValueAmount: number;
  stages: HighValueStageRef[];
}) {
  const stageAppearance = resolveHighValueStageAppearance(record.stage, stages);
  const relativeWidth = Math.max(
    6,
    Math.round((record.valueAmount / maxValueAmount) * 100),
  );

  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-2.5 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums',
            rank === 1
              ? 'bg-brand text-brand-foreground'
              : 'bg-white text-muted-foreground',
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {record.name}
            </p>
            <p className="shrink-0 text-[11px] font-bold tabular-nums text-foreground">
              {record.value}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="shrink-0 border px-1.5 py-0 text-[9px] font-medium text-foreground"
              style={{
                backgroundColor: stageAppearance.backgroundColor,
                borderColor: stageAppearance.borderColor,
              }}
            >
              {record.stage}
            </Badge>
            <span className="truncate text-[10px] text-muted-foreground">
              {record.customer}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full"
              style={{
                width: `${relativeWidth}%`,
                backgroundColor: stageAppearance.backgroundColor,
              }}
            />
          </div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {record.owner}
            {module === 'deals' && record.solutionId
              ? ` · ${record.solutionId}`
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function PipelineHighValueCard({
  dashboard,
  className,
}: {
  dashboard: PipelineDashboardData;
  className?: string;
}) {
  const {
    module,
    entityLabel,
    highValueRecords,
    activeFilterChips,
    activeScopeLabel,
    isLoading,
    isError,
  } = dashboard;
  const { data: dealStages = [] } = useDealStages();
  const { data: leadStages = [] } = useLeadStages();
  const stages = module === 'deals' ? dealStages : leadStages;
  const filteredLabel = activeFilterDescription(
    activeFilterChips,
    activeScopeLabel,
  );
  const maxValueAmount = Math.max(
    1,
    ...highValueRecords.map((r) => r.valueAmount),
  );

  return (
    <PanelShell
      className={cn('w-full shrink-0', HIGH_VALUE_PANEL_HEIGHT, className)}
    >
      <div className="flex h-full min-h-0 flex-col gap-1 p-3 sm:p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Trophy size={14} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground">
              Highest value {entityLabel}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide">
          {isError ? (
            <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-red-600">
              Unable to load high-value {entityLabel}.
            </div>
          ) : isLoading ? (
            <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-muted-foreground">
              Loading…
            </div>
          ) : highValueRecords.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6 text-center text-[10.5px] text-muted-foreground">
              No {entityLabel} match the {filteredLabel} filters.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {highValueRecords.map((record, index) => (
                <HighValueListItem
                  key={record.id}
                  record={record}
                  module={module}
                  rank={index + 1}
                  maxValueAmount={maxValueAmount}
                  stages={stages}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

export function PipelineModuleDashboard({
  module,
  children,
}: {
  module?: PipelineModule;
  children?: React.ReactNode;
}) {
  const existing = useOptionalPipelineModuleDashboardContext();

  if (!existing) {
    if (!module) {
      throw new Error(
        'PipelineModuleDashboard requires a module prop when used outside PipelineModuleDashboardProvider',
      );
    }
    return (
      <PipelineModuleDashboardProvider module={module}>
        <PipelineModuleDashboardContent>
          {children}
        </PipelineModuleDashboardContent>
      </PipelineModuleDashboardProvider>
    );
  }

  return (
    <PipelineModuleDashboardContent>{children}</PipelineModuleDashboardContent>
  );
}

function PipelineModuleDashboardContent({
  children,
}: {
  children?: React.ReactNode;
}) {
  const dashboard = usePipelineModuleDashboardContext();

  return (
    <div className="flex min-h-full flex-1 flex-col gap-3 xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3 xl:w-[80%] xl:flex-[4]">
        <PipelineOverviewCard dashboard={dashboard} />
        {children}
      </div>
      <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[20%] xl:min-w-[220px] xl:max-w-[320px] xl:flex-none">
        <PipelineHighValueCard dashboard={dashboard} />
        <PipelineApprovalRequestsCard
          entityType={dashboard.module === 'leads' ? 'LEAD' : 'DEAL'}
        />
      </div>
    </div>
  );
}

export { PipelineModuleDashboardProvider } from '@/components/pipeline/PipelineModuleDashboardContext';
export { useOptionalPipelineModuleDashboardContext } from '@/components/pipeline/PipelineModuleDashboardContext';
