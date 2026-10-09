'use client';

import { useMemo } from 'react';
import { resolveReportDataScope, type DataScopeLevel } from '@/utils/dataScope';

export type ReportExportScopeLevel = DataScopeLevel;

export type ReportExportScope = {
  level: ReportExportScopeLevel;
  label: string;
};

export function useReportExportScope(): ReportExportScope {
  return useMemo(() => {
    const scope = resolveReportDataScope();
    return { level: scope.level, label: scope.label };
  }, []);
}
