'use client';

import { useMemo } from 'react';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { formatTargetSettingMethod } from '@/components/sales-targeting/targetSettingMethod';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';
import { cn } from '@/lib/utils';

/** Read-only context from Settings (method) + active FY (+ optional period). Not editable here. */
export function useTargetModuleContextText(periodSegment?: string) {
  const { orgTargetSettingMethod, fiscalCalendar } = useSalesTargeting();
  return useMemo(() => {
    const method = formatTargetSettingMethod(orgTargetSettingMethod);
    const fy = formatFiscalYearLabel(fiscalCalendar);
    const period = periodSegment?.trim();
    if (period) return `${method} · ${fy} · ${period}`;
    return `${method} · ${fy}`;
  }, [orgTargetSettingMethod, fiscalCalendar, periodSegment]);
}

export function TargetModuleContextLabel({
  periodSegment,
  className,
}: {
  /** Session / period name on the Periods tab. */
  periodSegment?: string;
  className?: string;
}) {
  const text = useTargetModuleContextText(periodSegment);
  return (
    <span
      className={cn(
        'inline-flex h-9 max-w-[min(100%,28rem)] items-center truncate text-[12px] font-medium text-muted-foreground',
        className,
      )}
      title={text}
    >
      {text}
    </span>
  );
}
