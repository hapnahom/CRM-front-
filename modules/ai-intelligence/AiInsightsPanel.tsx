'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useGenerateDashboardInsights } from '@/store/server/features/ai-intelligence/mutations';
import {
  AI_INSIGHTS_SCROLLBAR_CLASS,
  AiInsightsEmptyState,
  AiInsightsScrollList,
  AiInsightsUnavailableState,
} from './AiInsightCard';
import { AiInsightsToolbar } from './AiInsightsToolbar';
import { isModuleEnabled } from '@/config/modules';
import { usePersistedAiInsights } from './usePersistedAiInsights';

type AiInsightsPanelProps = {
  title?: string;
  className?: string;
};

export function AiInsightsPanel({ title, className }: AiInsightsPanelProps) {
  const { result, persistResult, hydrated } =
    usePersistedAiInsights('dashboard');
  const generate = useGenerateDashboardInsights();

  const handleGenerate = useCallback(() => {
    generate.mutate(
      {},
      {
        onSuccess: (data) => persistResult(data),
      },
    );
  }, [generate, persistResult]);

  const showUnavailable =
    generate.isError || result?.emptyReason === 'ai_unavailable';
  const showList =
    !generate.isLoading && !showUnavailable && Boolean(result?.insights.length);
  const showEmptyScope =
    hydrated &&
    !generate.isLoading &&
    !showUnavailable &&
    result !== null &&
    !result.insights.length &&
    result.emptyReason !== 'ai_unavailable';
  const showPrompt =
    hydrated && !generate.isLoading && !result && !generate.isError;

  if (!isModuleEnabled('aiInsights')) return null;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white p-4 sm:p-5',
        className,
      )}
    >
      <div className="shrink-0">
        <AiInsightsToolbar
          title={title}
          scopeLabel={result?.scope.label}
          generatedAt={result?.generatedAt ?? null}
          isLoading={generate.isLoading}
          onGenerate={handleGenerate}
          generateLabel={result ? 'Regenerate insights' : 'Generate insights'}
        />
      </div>
      <div className={cn('mt-2.5 min-h-0 flex-1', AI_INSIGHTS_SCROLLBAR_CLASS)}>
        {generate.isLoading && !showList ? (
          <AiInsightsEmptyState
            message="Analyzing your dashboard data…"
            compact
          />
        ) : null}
        {showPrompt ? (
          <AiInsightsEmptyState
            message="Click Generate insights to see what deserves your attention right now."
            compact
          />
        ) : null}
        {showUnavailable && !generate.isLoading ? (
          <AiInsightsUnavailableState
            onRetry={handleGenerate}
            isLoading={generate.isLoading}
            retryLabel="Retry"
            compact
          />
        ) : null}
        {showList && result ? (
          <AiInsightsScrollList insights={result.insights} />
        ) : null}
        {showEmptyScope ? (
          <AiInsightsEmptyState
            message={
              result?.emptyReason === 'no_dashboard_access'
                ? 'You do not have permission to view dashboard insights.'
                : 'No urgent signals in your current scope.'
            }
            compact
          />
        ) : null}
      </div>
    </div>
  );
}
