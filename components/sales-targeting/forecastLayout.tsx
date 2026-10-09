'use client';

import { useState, type ReactNode } from 'react';
import {
  Briefcase,
  Clock,
  LineChart,
  Lock,
  PenLine,
  Settings2,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DepartmentFilter } from '@/modules/sales-pipeline/pipeline-filters';
import type { PipelineFilterSelection } from '@/modules/sales-pipeline/pipeline-filter';
import { formatCompactMoney } from '@/components/sales-targeting/targetingUtils';
import {
  TARGETS_CARD_CLASS,
  TARGETS_KPI_LABEL_CLASS,
  TARGETS_KPI_VALUE_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
} from '@/components/sales-targeting/ui-kit';

export const FORECAST_CONTENT_CLASS = 'w-full';

/** Badge for custom/manual forecast lines on the Forecast page. */
export function CustomOpportunityBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn('text-[9px] uppercase', className)}>
      <PenLine className="mr-0.5 size-2.5 shrink-0" aria-hidden />
      Custom
    </Badge>
  );
}

export type ForecastViewMode = 'annual' | 'period' | 'monthly';

export type ForecastTableRow = {
  id: string;
  /** Stable table key: opportunityType:opportunityId */
  rowKey: string;
  opportunityType?: 'lead' | 'deal' | 'custom' | string;
  name: string;
  isCustom?: boolean;
  definition?: string | null;
  customerName: string;
  ownerName: string;
  teamName: string;
  stageName: string;
  opportunityValue: number;
  forecastValue: number;
  expectedCloseDate: string | null;
  isEligible?: boolean;
  solutions?: Array<{
    name: string;
    amount: number;
    assigneeNames?: string[];
  }>;
};

export function ForecastToolbar({
  viewMode,
  onViewModeChange,
  periodOptions,
  selectedPeriodId,
  onPeriodChange,
  monthOptions,
  selectedMonthId,
  onMonthChange,
  orgFilter,
  onOrgFilterChange,
  status,
  onGenerate,
  onRecalculate,
  onLock,
  onOpenForecast,
  onOpenRules,
  canManage,
}: {
  viewMode: ForecastViewMode;
  onViewModeChange: (mode: ForecastViewMode) => void;
  periodOptions: { id: string; label: string }[];
  selectedPeriodId: string;
  onPeriodChange: (id: string) => void;
  monthOptions: { id: string; label: string }[];
  selectedMonthId: string;
  onMonthChange: (id: string) => void;
  orgFilter: PipelineFilterSelection;
  onOrgFilterChange: (filter: PipelineFilterSelection) => void;
  status: 'draft' | 'generated' | 'locked';
  onGenerate: () => void;
  onRecalculate: () => void;
  onLock: () => void;
  onOpenForecast: () => void;
  onOpenRules?: () => void;
  canManage: boolean;
}) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-card px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
          {(['annual', 'period', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors',
                viewMode === mode
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode === 'period' ? 'Period' : mode}
            </button>
          ))}
        </div>

        {viewMode === 'period' && periodOptions.length > 0 ? (
          <select
            value={selectedPeriodId}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface-card px-3 text-[12px] font-medium text-foreground outline-none focus:border-brand"
          >
            {periodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {viewMode === 'monthly' && monthOptions.length > 0 ? (
          <select
            value={selectedMonthId}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface-card px-3 text-[12px] font-medium text-foreground outline-none focus:border-brand"
          >
            {monthOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        <DepartmentFilter
          filter={orgFilter}
          onFilterChange={onOrgFilterChange}
          triggerClassName="h-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onOpenRules ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-[11px] text-muted-foreground"
            onClick={onOpenRules}
          >
            <Settings2 size={14} />
            Forecast rules
          </Button>
        ) : null}

        {status === 'generated' ? (
          <Badge variant="secondary" className="text-[10px]">
            Generated
          </Badge>
        ) : null}
        {status === 'locked' ? (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Lock className="size-3" />
            Locked
          </Badge>
        ) : null}

        {canManage && status === 'draft' ? (
          <Button type="button" size="sm" className="h-8" onClick={onGenerate}>
            Build forecast
          </Button>
        ) : null}

        {canManage && status === 'generated' ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onRecalculate}
            >
              Refresh from pipeline
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              onClick={onLock}
            >
              <Lock className="size-3.5" />
              Lock forecast
            </Button>
          </>
        ) : null}

        {canManage && status === 'locked' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onOpenForecast}
          >
            Unlock for editing
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ForecastKpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className={cn(TARGETS_CARD_CLASS, 'px-4 py-3.5')}>
      <div className="flex items-start justify-between gap-2">
        <p className={TARGETS_KPI_LABEL_CLASS}>{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn('mt-2', TARGETS_KPI_VALUE_CLASS)}>{value}</p>
    </div>
  );
}

export function ForecastKpiGrid({
  currencyCode,
  totalPipelineValue,
  forecastValue,
  expectedRevenue,
  opportunityCount,
}: {
  currencyCode: string;
  totalPipelineValue: number;
  forecastValue: number;
  expectedRevenue: number;
  opportunityCount: number;
}) {
  const money = (amount: number) => formatCompactMoney(amount, currencyCode);

  return (
    <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
      <ForecastKpiCard
        label="Total Pipeline Value"
        value={money(totalPipelineValue)}
        icon={<Wallet className="size-4" />}
      />
      <ForecastKpiCard
        label="Forecast Value"
        value={money(forecastValue)}
        icon={<LineChart className="size-4 text-brand" />}
      />
      <ForecastKpiCard
        label="Expected Revenue"
        value={money(expectedRevenue)}
        icon={<Clock className="size-4" />}
      />
      <ForecastKpiCard
        label="Total Opportunities"
        value={opportunityCount}
        icon={<Briefcase className="size-4" />}
      />
    </div>
  );
}

export function ForecastOpportunitiesTable({
  currencyCode,
  rows,
  canRemove = false,
  removingRowKey = null,
  onRemove,
}: {
  currencyCode: string;
  rows: ForecastTableRow[];
  canRemove?: boolean;
  removingRowKey?: string | null;
  onRemove?: (row: ForecastTableRow) => void;
}) {
  const [rowToRemove, setRowToRemove] = useState<ForecastTableRow | null>(null);
  const money = (amount: number) => formatCompactMoney(amount, currencyCode);
  const isConfirmingRemove =
    rowToRemove != null && removingRowKey === rowToRemove.rowKey;
  const gridCols = canRemove
    ? 'grid-cols-[minmax(90px,0.7fr)_minmax(180px,1.3fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_72px]'
    : 'grid-cols-[minmax(90px,0.7fr)_minmax(180px,1.3fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(110px,0.9fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)]';

  return (
    <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <div className={cn(canRemove ? 'min-w-[980px]' : 'min-w-[900px]')}>
          <div
            className={cn(
              'grid gap-3 px-5 py-3',
              gridCols,
              TARGETS_TABLE_HEAD_ROW_CLASS,
            )}
          >
            <span>Stage</span>
            <span>Opportunity</span>
            <span>Customer</span>
            <span>Owner</span>
            <span>Team</span>
            <span className="text-right">Opportunity Value</span>
            <span className="text-right">Expected Close</span>
            {canRemove ? <span className="text-right">Actions</span> : null}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No forecast opportunities for this period.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.rowKey}
                className={cn(
                  'grid items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0',
                  gridCols,
                  row.isEligible === false && 'opacity-50',
                  row.isCustom && 'bg-muted/30',
                )}
              >
                <p className="truncate text-xs text-foreground">
                  {row.isCustom ? (
                    <span className="font-medium">Custom</span>
                  ) : (
                    row.stageName
                  )}
                </p>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {row.name}
                    </p>
                    {row.isCustom ? <CustomOpportunityBadge /> : null}
                  </div>
                  {row.solutions && row.solutions.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {row.solutions.map((solution) => (
                        <li
                          key={`${row.rowKey}-${solution.name}-${solution.amount}`}
                          className="truncate text-[11px] text-muted-foreground"
                        >
                          {solution.name} · {money(solution.amount)}
                          {solution.assigneeNames &&
                          solution.assigneeNames.length > 0
                            ? ` · ${solution.assigneeNames.join(', ')}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <p className="truncate text-xs text-foreground">
                  {row.isCustom ? '—' : row.customerName}
                </p>
                <p className="truncate text-xs text-foreground">
                  {row.ownerName}
                </p>
                <p className="truncate text-xs text-foreground">
                  {row.teamName}
                </p>
                <p className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                  {money(row.opportunityValue)}
                </p>
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {row.expectedCloseDate?.slice(0, 10) || '—'}
                </p>
                {canRemove ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={removingRowKey === row.rowKey}
                      onClick={() => setRowToRemove(row)}
                      aria-label={`Remove ${row.name} from forecast`}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog
        open={rowToRemove != null}
        onOpenChange={(open) => {
          if (!open && !isConfirmingRemove) setRowToRemove(null);
        }}
      >
        <AlertDialogContent
          className="sm:max-w-[440px]"
          overlayClassName="bg-black/40"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {rowToRemove?.name ?? 'opportunity'} from forecast?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This opportunity will be removed from the current forecast. You
              can add it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingRemove}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isConfirmingRemove || !rowToRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!rowToRemove) return;
                onRemove?.(rowToRemove);
                setRowToRemove(null);
              }}
            >
              {isConfirmingRemove ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
