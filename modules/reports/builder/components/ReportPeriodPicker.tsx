'use client';

import {
  isPeriodFilterField,
  ReportPeriodPicker as SharedReportPeriodPicker,
} from '@/modules/sales-pipeline/report/ReportPeriodPicker';
import type { ReportPeriodValue } from '@/modules/sales-pipeline/report/period-selection';
import type { ReportCriteriaState } from '../types';

export { isPeriodFilterField };

type ReportPeriodPickerProps = {
  value: ReportCriteriaState;
  onChange: (next: ReportCriteriaState) => void;
};

export function ReportPeriodPicker({
  value,
  onChange,
}: ReportPeriodPickerProps) {
  return (
    <SharedReportPeriodPicker
      className="sm:col-span-2"
      value={value}
      onChange={(next: ReportPeriodValue) => onChange({ ...value, ...next })}
    />
  );
}
