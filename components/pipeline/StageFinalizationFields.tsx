'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PipelineStageCategory } from '@/modules/pipeline/types';

export type FinalizationOutcome = 'won' | 'lost';

export type StageKind = PipelineStageCategory;

export const STAGE_KIND_OPTIONS: Array<{
  value: StageKind;
  label: string;
  description: string;
}> = [
  {
    value: 'open',
    label: 'Open',
    description: 'Active pipeline stage included in open opportunity counts',
  },
  {
    value: 'won',
    label: 'Won (finalization)',
    description: 'Closing stage — deal is won',
  },
  {
    value: 'lost',
    label: 'Lost (finalization)',
    description: 'Closing stage — deal is lost',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    description:
      'Out of the active pipeline — use for stages like Dropped or On Hold',
  },
];

export function categoryToStageKind(
  category: PipelineStageCategory,
): StageKind {
  return category;
}

export function stageKindToCategory(kind: StageKind): PipelineStageCategory {
  return kind;
}

export function categoryToFinalization(category: PipelineStageCategory): {
  isFinalization: boolean;
  outcome: FinalizationOutcome;
} {
  return {
    isFinalization: category === 'won' || category === 'lost',
    outcome: category === 'lost' ? 'lost' : 'won',
  };
}

export function finalizationToCategory(
  isFinalization: boolean,
  outcome: FinalizationOutcome,
): PipelineStageCategory {
  return isFinalization ? outcome : 'open';
}

export function stageKindLabel(kind: StageKind): string {
  return (
    STAGE_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
  );
}

export function StageCategoryFields({
  stageKind,
  onStageKindChange,
  disabled = false,
  readOnly = false,
}: {
  stageKind: StageKind;
  onStageKindChange: (value: StageKind) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const selected = STAGE_KIND_OPTIONS.find(
    (option) => option.value === stageKind,
  );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-elevated px-3 py-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stage type
        </label>
        {readOnly ? (
          <p className="text-sm font-medium text-foreground">
            {selected?.label ?? stageKind}
          </p>
        ) : (
          <Select
            value={stageKind}
            onValueChange={(value) => onStageKindChange(value as StageKind)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {STAGE_KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use StageCategoryFields instead */
export function StageFinalizationFields({
  isFinalization,
  outcome,
  onFinalizationChange,
  onOutcomeChange,
  disabled = false,
}: {
  isFinalization: boolean;
  outcome: FinalizationOutcome;
  onFinalizationChange: (value: boolean) => void;
  onOutcomeChange: (value: FinalizationOutcome) => void;
  disabled?: boolean;
}) {
  const stageKind = finalizationToCategory(isFinalization, outcome);

  return (
    <StageCategoryFields
      stageKind={stageKind}
      onStageKindChange={(kind) => {
        const finalization = categoryToFinalization(kind);
        onFinalizationChange(finalization.isFinalization);
        onOutcomeChange(finalization.outcome);
      }}
      disabled={disabled}
    />
  );
}
