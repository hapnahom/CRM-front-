'use client';

import { useMemo } from 'react';
import {
  resolveDashboardView,
  resolveDashboardDataScope,
  resolveReportDataScope,
  resolveTargetDataScope,
  DashboardView,
  type DataScope,
  type DataScopeLevel,
} from '@/utils/dataScope';

export { DashboardView, type DataScope, type DataScopeLevel };

export function useDashboardView(): DashboardView {
  return useMemo(() => resolveDashboardView(), []);
}

export function useDashboardDataScope(): DataScope {
  return useMemo(() => resolveDashboardDataScope(), []);
}

export function useReportDataScope(): DataScope {
  return useMemo(() => resolveReportDataScope(), []);
}

export function useTargetDataScope(): DataScope {
  return useMemo(() => resolveTargetDataScope(), []);
}
