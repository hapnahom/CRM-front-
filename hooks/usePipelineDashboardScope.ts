'use client';

import { useMemo } from 'react';
import { DashboardView, resolveDashboardView } from '@/utils/dataScope';
import type { DashboardScope } from '@/modules/pipeline/dashboard-mock-data';

export function usePipelineDashboardScope(): DashboardScope {
  return useMemo(() => {
    const view = resolveDashboardView();
    if (view === DashboardView.Executive) return 'executive';
    if (view === DashboardView.Department) return 'department';
    if (view === DashboardView.TeamLeader) return 'team';
    return 'member';
  }, []);
}

export function dashboardScopeLabel(
  scope: DashboardScope,
  module: 'leads' | 'deals',
): string {
  const entity = module === 'leads' ? 'Lead' : 'Deal';
  switch (scope) {
    case 'executive':
      return `Executive ${entity} Dashboard`;
    case 'department':
      return `Department ${entity} Dashboard`;
    case 'team':
      return `Team ${entity} Dashboard`;
    case 'member':
      return `My ${entity} Dashboard`;
  }
}
