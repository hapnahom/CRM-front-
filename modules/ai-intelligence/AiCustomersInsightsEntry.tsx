'use client';

import { useCallback, useState } from 'react';
import { isModuleEnabled } from '@/config/modules';
import { useGenerateCustomersInsights } from '@/store/server/features/ai-intelligence/mutations';
import { AiInsightTriggerButton } from './AiInsightTriggerButton';
import { AiInsightsDropdown } from './AiInsightsDropdown';
import { usePersistedAiInsights } from './usePersistedAiInsights';

type AiCustomersInsightsEntryProps = {
  search?: string;
};

/**
 * Customers header control: opens anchored panel and regenerates customer insights.
 */
export function AiCustomersInsightsEntry({
  search,
}: AiCustomersInsightsEntryProps) {
  const [open, setOpen] = useState(false);
  const { result, persistResult } = usePersistedAiInsights('customers');
  const { mutate, isLoading, isError } = useGenerateCustomersInsights();

  const handleOpenGenerate = useCallback(() => {
    mutate(
      { search },
      {
        onSuccess: (data) => persistResult(data),
      },
    );
  }, [mutate, persistResult, search]);

  const emptyMessage =
    result?.emptyReason === 'no_customers_access'
      ? 'You do not have permission to view customer insights.'
      : 'No urgent customer health signals in your current scope.';

  if (!isModuleEnabled('aiInsights')) return null;

  return (
    <AiInsightsDropdown
      open={open}
      onOpenChange={setOpen}
      trigger={
        <AiInsightTriggerButton
          size="default"
          pressed={open}
          onClick={() => setOpen((prev) => !prev)}
        />
      }
      title="AI Customer Insights"
      isLoading={isLoading}
      isError={isError}
      result={result}
      onOpenGenerate={handleOpenGenerate}
      analyzingMessage="Analyzing customer accounts…"
      emptyMessage={emptyMessage}
    />
  );
}
