'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePipelineSettings,
  useUpdatePipelineSettings,
  type PipelineEntityType,
  type StageMovementPolicy,
} from '@/store/server/features/pipeline/settings';

const POLICY_OPTIONS: {
  value: StageMovementPolicy;
  label: string;
}[] = [
  {
    value: 'any',
    label: 'Any stage',
  },
  {
    value: 'forward_only',
    label: 'Forward only (no moving backward)',
  },
  {
    value: 'forward_adjacent',
    label: 'Next stage only (forward adjacent)',
  },
];

interface StageMovementRulesCardProps {
  entityType: PipelineEntityType;
}

export function StageMovementRulesCard({
  entityType,
}: StageMovementRulesCardProps) {
  const settingsQuery = usePipelineSettings(entityType);
  const updateSettings = useUpdatePipelineSettings();

  const policy = settingsQuery.data?.movementPolicy ?? 'any';

  return (
    <div className="rounded-xl border border-border bg-surface-card px-5 py-3.5">
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-foreground">
          Stage movement rules
        </h3>
        <div className="space-y-1.5">
          <Select
            value={policy}
            disabled={settingsQuery.isLoading || updateSettings.isLoading}
            onValueChange={(value) => {
              updateSettings.mutate({
                entityType,
                movementPolicy: value as StageMovementPolicy,
              });
            }}
          >
            <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
              <SelectValue placeholder="Select policy" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {POLICY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
