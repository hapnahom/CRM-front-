import type { PipelinePeriodSelection } from '../pipeline-filter';

export type ReportPeriodMode = 'fiscal' | 'dateRange';

export type DateRangePreset =
  | 'this-week'
  | 'this-month'
  | 'this-quarter'
  | 'this-year'
  | 'last-quarter'
  | 'last-year'
  | 'custom';

export type ReportPeriodValue = {
  periodMode: ReportPeriodMode;
  fiscalPeriod: PipelinePeriodSelection;
  dateRange: DateRangePreset;
  from?: string;
  to?: string;
};

export const DATE_RANGE_PRESET_OPTIONS: Array<{
  id: DateRangePreset;
  label: string;
}> = [
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'this-quarter', label: 'This Quarter' },
  { id: 'this-year', label: 'This Year' },
  { id: 'last-quarter', label: 'Last Quarter' },
  { id: 'last-year', label: 'Last Year' },
  { id: 'custom', label: 'Custom Range' },
];

export const DEFAULT_REPORT_PERIOD_VALUE: ReportPeriodValue = {
  periodMode: 'dateRange',
  fiscalPeriod: { type: 'annual' },
  dateRange: 'this-quarter',
};
