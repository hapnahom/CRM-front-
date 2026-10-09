'use client';

import { useMemo } from 'react';
import { CustomFieldsModule } from '@/modules/custom-fields';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';

export function CustomFieldsSettingsTab() {
  const leadStagesQuery = useLeadStages();
  const dealStagesQuery = useDealStages();

  const leadStages = useMemo(
    () =>
      [...(leadStagesQuery.data ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color ?? undefined,
          category: stage.category,
        })),
    [leadStagesQuery.data],
  );

  const dealStages = useMemo(
    () =>
      [...(dealStagesQuery.data ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color ?? undefined,
          category: stage.category,
        })),
    [dealStagesQuery.data],
  );

  return (
    <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Custom Fields</h2>
      </div>
      <CustomFieldsModule leadStages={leadStages} dealStages={dealStages} />
    </div>
  );
}
