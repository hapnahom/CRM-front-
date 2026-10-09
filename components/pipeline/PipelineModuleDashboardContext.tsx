'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  usePipelineDashboardData,
  type PipelineDashboardData,
  type PipelineModule,
} from '@/hooks/usePipelineDashboardData';

const PipelineModuleDashboardContext =
  createContext<PipelineDashboardData | null>(null);

export function PipelineModuleDashboardProvider({
  module,
  children,
}: {
  module: PipelineModule;
  children: ReactNode;
}) {
  const dashboard = usePipelineDashboardData(module);
  return (
    <PipelineModuleDashboardContext.Provider value={dashboard}>
      {children}
    </PipelineModuleDashboardContext.Provider>
  );
}

export function usePipelineModuleDashboardContext(): PipelineDashboardData {
  const ctx = useContext(PipelineModuleDashboardContext);
  if (!ctx) {
    throw new Error(
      'usePipelineModuleDashboardContext must be used within PipelineModuleDashboardProvider',
    );
  }
  return ctx;
}

export function useOptionalPipelineModuleDashboardContext(): PipelineDashboardData | null {
  return useContext(PipelineModuleDashboardContext);
}
