'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PrimaryButton,
  TARGETS_PAGE_TITLE_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
} from '@/components/sales-targeting/ui-kit';
import type {
  DateForecastConfig,
  ManualForecastItem,
} from '@/components/sales-targeting/targetingUtils';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import {
  PeriodSelector,
  usePipelineFiscalSessions,
} from '@/modules/sales-pipeline/pipeline-filters';
import type { PipelinePeriodSelection } from '@/modules/sales-pipeline/pipeline-filter';
import { resolveFiscalPeriod } from '@/modules/sales-pipeline/report/period';
import {
  dealUiLabel,
  forecastEntitySourceOptions,
  isLeadsEnabled,
} from '@/config/salesWorkflow';

const { RangePicker } = DatePicker;

export const FORECAST_SETTINGS_CONTENT_CLASS = 'w-full';

type StageRow = { id: string; name: string };

export function ForecastSettingsToolbar({
  onBack,
  hasChanges,
  canManage,
  isSaving,
  onReset,
  onSave,
  saveLabel = 'Save Settings',
  title = 'Forecast Settings',
  currencyControl,
  embedded = false,
  tabs,
  showActions = true,
}: {
  onBack?: () => void;
  hasChanges: boolean;
  canManage: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
  saveLabel?: string;
  title?: string;
  /** Currency switcher — shown on forecast tab when configured. */
  currencyControl?: ReactNode;
  embedded?: boolean;
  tabs?: ReactNode;
  /** When false, hides reset/save (e.g. sequencing tab manages its own save). */
  showActions?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-stretch justify-between gap-3 border-b border-border bg-white',
        embedded ? 'px-0' : 'bg-surface-card px-4 sm:px-6',
      )}
    >
      <div className="flex min-w-0 items-stretch gap-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="my-2 h-8 w-8 shrink-0 self-center text-muted-foreground hover:text-foreground"
            onClick={onBack}
            title="Back to forecast"
            aria-label="Back to forecast"
          >
            <ArrowLeft size={16} />
          </Button>
        ) : null}
        {!embedded && title ? (
          <h1
            className={cn(
              'my-2 self-center truncate',
              TARGETS_PAGE_TITLE_CLASS,
            )}
          >
            {title}
          </h1>
        ) : null}
        {tabs}
        {hasChanges ? (
          <span className="my-2 hidden self-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 sm:inline-flex">
            Unsaved changes
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-center py-1.5">
        {currencyControl}
        {canManage && showActions ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasChanges}
              onClick={onReset}
              className="h-8 rounded-md px-3 text-[12px] font-semibold"
            >
              Reset
            </Button>
            <PrimaryButton
              type="button"
              onClick={onSave}
              disabled={!hasChanges || isSaving}
              className="h-8 gap-1.5 rounded-md px-3 text-[12px] font-semibold shadow-xs"
            >
              <Save className="size-3.5" />
              {isSaving ? 'Saving…' : saveLabel}
            </PrimaryButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ForecastMethodCard({
  title,
  enabled,
  disabled,
  onToggle,
}: {
  title: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface-card p-4 transition-colors',
        enabled
          ? 'border-brand/50 shadow-[0_1px_2px_rgba(255,90,0,0.08)]'
          : 'border-border opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}

export function ForecastCollapsibleSection({
  title,
  expanded,
  onToggle,
  action,
  enabled = true,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  enabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] transition-all',
      )}
    >
      <div
        onClick={onToggle}
        className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[13px] font-semibold tracking-tight text-foreground">
              {title}
            </p>
            {!enabled ? (
              <span className="rounded-full border border-border/80 bg-surface-elevated px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Method disabled
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {action ? (
            <div onClick={(e) => e.stopPropagation()}>{action}</div>
          ) : null}
          <div
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
          >
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </div>
      </div>
      {expanded ? (
        <div
          className={cn(
            'border-t border-border px-5 py-4',
            !enabled && 'pointer-events-none',
          )}
        >
          <div className={cn(!enabled && 'opacity-[0.72]')}>{children}</div>
        </div>
      ) : null}
    </section>
  );
}

function StageToggleList({
  title,
  stages,
  includedIds,
  allIds,
  disabled,
  onToggle,
  onIncludeAll,
  onExcludeAll,
}: {
  title: string;
  stages: StageRow[];
  includedIds: string[];
  allIds: string[];
  disabled?: boolean;
  onToggle: (stageId: string) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
}) {
  const isIncluded = (stageId: string) => {
    if (includedIds.length === 0) return allIds.length > 0;
    if (includedIds.includes('none')) return false;
    return includedIds.includes(stageId);
  };

  return (
    <div className="rounded-lg border border-border bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold text-foreground">{title}</p>
        {!disabled ? (
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <button
              type="button"
              onClick={onIncludeAll}
              className="text-brand hover:underline"
            >
              Include All
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={onExcludeAll}
              className="text-muted-foreground hover:underline"
            >
              Exclude All
            </button>
          </div>
        ) : null}
      </div>
      <div className="divide-y divide-border/70">
        {!stages.length ? (
          <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
            No stages configured.
          </p>
        ) : (
          stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-[12px] font-medium text-foreground">
                {stage.name}
              </span>
              <Switch
                checked={isIncluded(stage.id)}
                disabled={disabled}
                onCheckedChange={() => onToggle(stage.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function StageForecastConfigPanel({
  leadStages,
  dealStages,
  leadStageIds,
  dealStageIds,
  includeLeads,
  includeDeals,
  disabled,
  onToggleLeadStage,
  onToggleDealStage,
  onIncludeAllLeads,
  onExcludeAllLeads,
  onIncludeAllDeals,
  onExcludeAllDeals,
  onIncludeLeadsChange,
  onIncludeDealsChange,
}: {
  leadStages: StageRow[];
  dealStages: StageRow[];
  leadStageIds: string[];
  dealStageIds: string[];
  includeLeads: boolean;
  includeDeals: boolean;
  disabled?: boolean;
  onToggleLeadStage: (stageId: string) => void;
  onToggleDealStage: (stageId: string) => void;
  onIncludeAllLeads: () => void;
  onExcludeAllLeads: () => void;
  onIncludeAllDeals: () => void;
  onExcludeAllDeals: () => void;
  onIncludeLeadsChange?: (value: boolean) => void;
  onIncludeDealsChange?: (value: boolean) => void;
}) {
  const showLeads = isLeadsEnabled();
  const leadIds = leadStages.map((s) => s.id);
  const dealIds = dealStages.map((s) => s.id);
  const opportunityLabel = dealUiLabel({ plural: true });

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          showLeads ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
        )}
      >
        {showLeads ? (
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3">
            <span className="text-[11px] font-medium text-foreground">
              Include Leads
            </span>
            <Switch
              checked={includeLeads}
              disabled={disabled || !onIncludeLeadsChange}
              onCheckedChange={onIncludeLeadsChange}
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3">
          <span className="text-[11px] font-medium text-foreground">
            Include {opportunityLabel}
          </span>
          <Switch
            checked={includeDeals}
            disabled={disabled || !onIncludeDealsChange}
            onCheckedChange={onIncludeDealsChange}
          />
        </label>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          showLeads ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
        )}
      >
        {showLeads ? (
          <StageToggleList
            title="Lead Stages"
            stages={leadStages}
            includedIds={leadStageIds}
            allIds={leadIds}
            disabled={disabled || !includeLeads}
            onToggle={onToggleLeadStage}
            onIncludeAll={onIncludeAllLeads}
            onExcludeAll={onExcludeAllLeads}
          />
        ) : null}
        <StageToggleList
          title={`${opportunityLabel} Stages`}
          stages={dealStages}
          includedIds={dealStageIds}
          allIds={dealIds}
          disabled={disabled || !includeDeals}
          onToggle={onToggleDealStage}
          onIncludeAll={onIncludeAllDeals}
          onExcludeAll={onExcludeAllDeals}
        />
      </div>
    </div>
  );
}

export function ValueForecastConfigPanel({
  currencyCode,
  minValue,
  maxValue,
  source,
  disabled,
  onMinChange,
  onMaxChange,
  onSourceChange,
}: {
  currencyCode: string;
  minValue: number;
  maxValue: number | null;
  source: 'leads' | 'deals' | 'both';
  disabled?: boolean;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number | null) => void;
  onSourceChange: (value: 'leads' | 'deals' | 'both') => void;
}) {
  const sourceOptions = forecastEntitySourceOptions();

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Thresholds are configured per currency. Switch the currency above to set
        minimum and maximum values for each plan currency.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-foreground">
            Minimum Opportunity Value ({currencyCode})
          </span>
          <Input
            type="number"
            min={0}
            value={minValue}
            disabled={disabled}
            onChange={(e) => onMinChange(Number(e.target.value) || 0)}
            className="h-9 text-[12px]"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold text-foreground">
            Maximum Opportunity Value ({currencyCode})
          </span>
          <Input
            type="number"
            min={0}
            value={maxValue ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onMaxChange(e.target.value ? Number(e.target.value) : null)
            }
            className="h-9 text-[12px]"
            placeholder="No limit"
          />
        </label>
        {sourceOptions.length > 1 ? (
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-foreground">
              Opportunity Entity Scope
            </span>
            <Select
              value={source}
              onValueChange={(v) =>
                onSourceChange(v as 'leads' | 'deals' | 'both')
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function DateForecastConfigPanel({
  dateConfig,
  disabled,
  onDateConfigChange,
  onIncludeOverdueChange,
  onExcludeWithoutCloseDateChange,
  onSourceChange,
}: {
  dateConfig: DateForecastConfig;
  disabled?: boolean;
  onDateConfigChange: (next: Partial<DateForecastConfig>) => void;
  onIncludeOverdueChange: (value: boolean) => void;
  onExcludeWithoutCloseDateChange: (value: boolean) => void;
  onSourceChange?: (value: 'leads' | 'deals' | 'both') => void;
}) {
  const sourceOptions = forecastEntitySourceOptions();
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();
  const sessionPool = allSessions.length ? allSessions : sessions;

  const periodSelection: PipelinePeriodSelection = dateConfig.sessionId
    ? { type: 'session', sessionId: dateConfig.sessionId }
    : { type: 'annual', calendarId: dateConfig.calendarId ?? undefined };

  const periodHint =
    dateConfig.periodMode === 'fiscal'
      ? resolveFiscalPeriod(periodSelection, sessionPool, fiscalYears).label
      : dateConfig.customStartDate && dateConfig.customEndDate
        ? `${dateConfig.customStartDate} – ${dateConfig.customEndDate}`
        : 'Select a custom date range';

  const customRange: [Dayjs, Dayjs] | null =
    dateConfig.customStartDate && dateConfig.customEndDate
      ? [dayjs(dateConfig.customStartDate), dayjs(dateConfig.customEndDate)]
      : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4">
          <span className="text-[11px] font-semibold text-foreground">
            Date Horizon
          </span>
          <Select
            value={dateConfig.periodMode}
            onValueChange={(mode) =>
              onDateConfigChange({
                periodMode: mode as 'fiscal' | 'custom',
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fiscal">Fiscal year / session</SelectItem>
              <SelectItem value="custom">Custom date range</SelectItem>
            </SelectContent>
          </Select>

          {dateConfig.periodMode === 'fiscal' ? (
            <PeriodSelector
              value={periodSelection}
              onChange={(period) => {
                const resolved = resolveFiscalPeriod(
                  period,
                  sessionPool,
                  fiscalYears,
                );
                if (period.type === 'session') {
                  const year = fiscalYears.find((item) =>
                    item.sessions.some((s) => s.id === period.sessionId),
                  );
                  onDateConfigChange({
                    periodMode: 'fiscal',
                    sessionId: period.sessionId,
                    calendarId: year?.id ?? dateConfig.calendarId,
                    fiscalYearStart: resolved.from,
                    fiscalYearEnd: resolved.to,
                  });
                  return;
                }
                if (period.type === 'annual') {
                  onDateConfigChange({
                    periodMode: 'fiscal',
                    sessionId: null,
                    calendarId: period.calendarId ?? null,
                    fiscalYearStart: resolved.from,
                    fiscalYearEnd: resolved.to,
                  });
                  return;
                }
                onDateConfigChange({
                  periodMode: 'fiscal',
                  sessionId: null,
                  calendarId: dateConfig.calendarId ?? null,
                  fiscalYearStart: resolved.from,
                  fiscalYearEnd: resolved.to,
                });
              }}
              fullWidth
              align="start"
              variant="panel"
            />
          ) : (
            <RangePicker
              value={customRange}
              allowClear={false}
              disabled={disabled}
              className="h-9 w-full"
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (!dates?.[0] || !dates?.[1]) return;
                onDateConfigChange({
                  periodMode: 'custom',
                  customStartDate: dates[0].format('YYYY-MM-DD'),
                  customEndDate: dates[1].format('YYYY-MM-DD'),
                  fiscalYearStart: dates[0].format('YYYY-MM-DD'),
                  fiscalYearEnd: dates[1].format('YYYY-MM-DD'),
                });
              }}
            />
          )}
          <p className="text-[11px] text-muted-foreground">{periodHint}</p>
        </div>

        <div className="space-y-2">
          {onSourceChange && sourceOptions.length > 1 ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold text-foreground">
                Opportunity Entity Scope
              </span>
              <Select
                value={dateConfig.source}
                onValueChange={(v) =>
                  onSourceChange(v as 'leads' | 'deals' | 'both')
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-foreground">
              Match date field
            </span>
            <Select
              value={dateConfig.dateField ?? 'expectedClose'}
              onValueChange={(v) =>
                onDateConfigChange({
                  dateField: v as 'createdAt' | 'expectedClose',
                })
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expectedClose">
                  Expected close date
                </SelectItem>
                <SelectItem value="createdAt">Created date</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {(dateConfig.dateField ?? 'expectedClose') === 'expectedClose' ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3">
                <span className="text-[11px] font-medium text-foreground">
                  Include Overdue Opportunities
                </span>
                <Switch
                  checked={dateConfig.includeOverdue}
                  disabled={disabled}
                  onCheckedChange={onIncludeOverdueChange}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3">
                <span className="text-[11px] font-medium text-foreground">
                  Exclude Opportunities without Close Date
                </span>
                <Switch
                  checked={dateConfig.excludeWithoutCloseDate}
                  disabled={disabled}
                  onCheckedChange={onExcludeWithoutCloseDateChange}
                />
              </label>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ManualForecastTable({
  currencyCode,
  items,
  disabled,
  onAdd,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  currencyCode: string;
  items: ManualForecastItem[];
  disabled?: boolean;
  onAdd: () => void;
  onEdit?: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const money = (amount: number) => formatCompactMoney(amount, currencyCode);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div
          className={cn(
            'grid grid-cols-[minmax(180px,1.4fr)_minmax(90px,0.7fr)_minmax(130px,1fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(70px,auto)_minmax(72px,auto)] gap-3 px-4',
            TARGETS_TABLE_HEAD_ROW_CLASS,
            'py-3',
          )}
        >
          <span>Forecast name / definition</span>
          <span>Period</span>
          <span>Department &amp; team</span>
          <span>Owner / rep</span>
          <span className="text-right">Amount ({currencyCode})</span>
          <span className="text-center">Active</span>
          <span className="text-center">Actions</span>
        </div>

        {!items.length ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[12px] text-muted-foreground">
              No manual forecasts yet.
            </p>
            {!disabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="mt-3 h-8 text-[11px] font-semibold"
              >
                + Add Manual Forecast
              </Button>
            ) : null}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'grid grid-cols-[minmax(180px,1.4fr)_minmax(90px,0.7fr)_minmax(130px,1fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(70px,auto)_minmax(72px,auto)] items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0',
                !item.isActive && 'opacity-60',
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-foreground">
                  {item.name}
                </p>
                {item.notes ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    {item.notes}
                  </p>
                ) : null}
              </div>
              <p className="text-[11px] text-foreground">{item.period}</p>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-foreground">
                  {item.department || '—'}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {item.team || '—'}
                </p>
              </div>
              <p className="truncate text-[11px] text-foreground">
                {item.salesRep || '—'}
              </p>
              <p className="text-right text-[12px] font-bold tabular-nums text-foreground">
                {money(item.amount)}
              </p>
              <div className="flex justify-center">
                <Switch
                  checked={item.isActive}
                  disabled={disabled}
                  onCheckedChange={(val) => onToggleActive(item.id, val)}
                />
              </div>
              <div className="flex justify-center gap-1">
                {onEdit ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(item.id)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-brand hover:bg-muted disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDelete(item.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
