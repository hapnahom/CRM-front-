'use client';

import { useCallback, useMemo, useState } from 'react';
import { isModuleEnabled } from '@/config/modules';
import AccessGuard from '@/utils/permissionGuard';
import { useGeneratePipelineInsights } from '@/store/server/features/ai-intelligence/mutations';
import type { GeneratePipelineInsightsBody } from '@/store/server/features/ai-intelligence/types';
import { usePipelineOrgListParams } from '@/modules/sales-pipeline/pipeline-filters';
import { AiInsightTriggerButton } from './AiInsightTriggerButton';
import { AiInsightsDropdown } from './AiInsightsDropdown';
import { usePersistedAiInsights } from './usePersistedAiInsights';

/**
 * Sales Hub header control: opens anchored panel and regenerates pipeline insights.
 */
export function AiPipelineInsightsEntry() {
  const canViewPipeline = useMemo(
    () =>
      AccessGuard.checkAnyAccess({ permissions: ['view-leads', 'view-deals'] }),
    [],
  );

  const [open, setOpen] = useState(false);
  const orgParams = usePipelineOrgListParams();
  const filters = useMemo(
    () => orgParams as GeneratePipelineInsightsBody,
    [orgParams],
  );

  const { result, persistResult } = usePersistedAiInsights('pipeline');
  const { mutate, isLoading, isError } = useGeneratePipelineInsights();

  const handleOpenGenerate = useCallback(() => {
    mutate(filters, {
      onSuccess: (data) => persistResult(data),
    });
  }, [filters, mutate, persistResult]);

  if (!isModuleEnabled('aiInsights') || !canViewPipeline) return null;

  const emptyMessage =
    result?.emptyReason === 'no_pipeline_module_access'
      ? 'Pipeline insights are unavailable without leads or deals access.'
      : 'No critical pipeline alerts for your current filters.';

  return (
    <AiInsightsDropdown
      open={open}
      onOpenChange={setOpen}
      trigger={
        <AiInsightTriggerButton
          pressed={open}
          onClick={() => setOpen((prev) => !prev)}
        />
      }
      title="AI Pipeline Insights"
      isLoading={isLoading}
      isError={isError}
      result={result}
      onOpenGenerate={handleOpenGenerate}
      analyzingMessage="Analyzing pipeline data…"
      emptyMessage={emptyMessage}
    />
  );
}
