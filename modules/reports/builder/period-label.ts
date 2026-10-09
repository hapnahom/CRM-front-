'use client';

import { useMemo } from 'react';
import { DATE_RANGE_PRESET_OPTIONS } from '@/modules/sales-pipeline/report/period-selection';
import type { ReportCriteriaState } from './types';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import { resolveReportPeriodValue } from '@/modules/sales-pipeline/report/period';

export function useReportPeriodLabel(criteria: ReportCriteriaState): string {
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();
  const periodSessions = allSessions.length ? allSessions : sessions;

  return useMemo(
    () => resolveReportPeriodValue(criteria, periodSessions, fiscalYears).label,
    [criteria, fiscalYears, periodSessions],
  );
}

/** Non-hook label for places that already have fiscal data loaded. */
export function formatReportPeriodLabel(
  criteria: ReportCriteriaState,
  fiscalYears: ReturnType<typeof usePipelineFiscalSessions>['fiscalYears'],
  sessions: ReturnType<typeof usePipelineFiscalSessions>['sessions'],
): string {
  if (criteria.periodMode === 'fiscal') {
    return resolveReportPeriodValue(criteria, sessions, fiscalYears).label;
  }
  if (criteria.dateRange === 'custom' && criteria.from && criteria.to) {
    return `${criteria.from} – ${criteria.to}`;
  }
  return (
    DATE_RANGE_PRESET_OPTIONS.find((o) => o.id === criteria.dateRange)?.label ??
    criteria.dateRange
  );
}
