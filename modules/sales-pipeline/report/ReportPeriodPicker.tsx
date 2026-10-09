'use client';

import { useMemo } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PeriodSelector,
  usePipelineFiscalSessions,
} from '@/modules/sales-pipeline/pipeline-filters';
import { resolveReportPeriodValue } from './period';
import {
  DATE_RANGE_PRESET_OPTIONS,
  type DateRangePreset,
  type ReportPeriodValue,
} from './period-selection';

const { RangePicker } = DatePicker;

const PERIOD_FIELDS = new Set(['dateRange', 'fromTo', 'fiscalYear', 'quarter']);
const FISCAL_PERIOD_OPTION = 'fiscal' as const;

export function isPeriodFilterField(fieldId: string): boolean {
  return PERIOD_FIELDS.has(fieldId);
}

type ReportPeriodPickerProps = {
  value: ReportPeriodValue;
  onChange: (next: ReportPeriodValue) => void;
  className?: string;
  /** Hide the inline “Reporting period” label when a parent section heading is used. */
  hideLabel?: boolean;
};

export function ReportPeriodPicker({
  value,
  onChange,
  className,
  hideLabel = false,
}: ReportPeriodPickerProps) {
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();
  const periodSessions = allSessions.length ? allSessions : sessions;

  const selectedPeriod =
    value.periodMode === 'fiscal' ? FISCAL_PERIOD_OPTION : value.dateRange;

  const periodHint = useMemo(
    () => resolveReportPeriodValue(value, periodSessions, fiscalYears).label,
    [value, periodSessions, fiscalYears],
  );

  const customRange = useMemo<[Dayjs, Dayjs] | null>(() => {
    if (!value.from || !value.to) return null;
    return [dayjs(value.from), dayjs(value.to)];
  }, [value.from, value.to]);

  const handlePeriodChange = (next: string) => {
    if (next === FISCAL_PERIOD_OPTION) {
      onChange({ ...value, periodMode: 'fiscal' });
      return;
    }

    const dateRange = next as DateRangePreset;
    if (dateRange === 'custom') {
      const now = dayjs();
      onChange({
        ...value,
        periodMode: 'dateRange',
        dateRange,
        from: value.from ?? now.startOf('month').format('YYYY-MM-DD'),
        to: value.to ?? now.format('YYYY-MM-DD'),
      });
      return;
    }

    onChange({
      ...value,
      periodMode: 'dateRange',
      dateRange,
    });
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface-elevated/40 p-3',
        className,
      )}
    >
      {hideLabel ? null : (
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          Reporting period
        </label>
      )}

      <div className="w-full space-y-2">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="h-9 w-full min-w-0 border-border bg-white text-[12px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
          >
            <SelectItem value={FISCAL_PERIOD_OPTION}>Fiscal year</SelectItem>
            <SelectSeparator />
            {DATE_RANGE_PRESET_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value.periodMode === 'fiscal' ? (
          <div className="w-full">
            <PeriodSelector
              value={value.fiscalPeriod}
              onChange={(fiscalPeriod) => onChange({ ...value, fiscalPeriod })}
              fullWidth
              align="start"
              variant="panel"
            />
          </div>
        ) : value.dateRange === 'custom' ? (
          <RangePicker
            value={customRange}
            allowClear={false}
            className="h-9 w-full"
            style={{ width: '100%' }}
            getPopupContainer={() => document.body}
            onChange={(dates) => {
              if (!dates?.[0] || !dates?.[1]) return;
              onChange({
                ...value,
                from: dates[0].format('YYYY-MM-DD'),
                to: dates[1].format('YYYY-MM-DD'),
              });
            }}
          />
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">{periodHint}</p>
    </div>
  );
}
