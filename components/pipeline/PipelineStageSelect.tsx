'use client';

import {
  DEALS_STAGE_COLOR_PRESETS,
  pipelineStageAppearance,
  type STAGE_COLOR_PRESETS,
} from '@/lib/stage-presets';
import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/modules/pipeline/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StageLike = Pick<PipelineStage, 'id' | 'name' | 'color' | 'borderColor'>;

export function PipelineStageOptionLabel({
  stage,
  index,
  presets = DEALS_STAGE_COLOR_PRESETS,
}: {
  stage: StageLike;
  index: number;
  presets?: typeof STAGE_COLOR_PRESETS;
}) {
  const appearance = pipelineStageAppearance(stage, index, presets);

  return (
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border"
        style={{
          backgroundColor: stage.color || appearance.backgroundColor,
          borderColor: appearance.borderColor,
        }}
      />
      <span className="truncate">{stage.name}</span>
    </span>
  );
}

export function PipelineStageSelect({
  stages,
  value,
  onValueChange,
  excludeStageIds = [],
  allowEmpty = false,
  emptyLabel = 'None',
  disabled,
  triggerClassName,
  presets = DEALS_STAGE_COLOR_PRESETS,
  placeholder = 'Select stage',
}: {
  stages: StageLike[];
  value?: string | null;
  onValueChange: (stageId: string | null) => void;
  excludeStageIds?: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
  presets?: typeof STAGE_COLOR_PRESETS;
  placeholder?: string;
}) {
  const availableStages = stages.filter(
    (stage) => !excludeStageIds.includes(stage.id),
  );
  const selectedStage = value
    ? stages.find((stage) => stage.id === value)
    : undefined;
  const selectedIndex = selectedStage
    ? stages.findIndex((stage) => stage.id === selectedStage.id)
    : -1;

  return (
    <Select
      value={value ?? (allowEmpty ? '__none__' : undefined)}
      onValueChange={(next) => onValueChange(next === '__none__' ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('h-9 border-border', triggerClassName)}>
        <SelectValue placeholder={placeholder}>
          {selectedStage ? (
            <PipelineStageOptionLabel
              stage={selectedStage}
              index={Math.max(0, selectedIndex)}
              presets={presets}
            />
          ) : allowEmpty ? (
            emptyLabel
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[var(--radix-select-trigger-width)]"
        position="popper"
        align="start"
      >
        {allowEmpty ? (
          <SelectItem value="__none__">{emptyLabel}</SelectItem>
        ) : null}
        {availableStages.map((stage, index) => (
          <SelectItem key={stage.id} value={stage.id}>
            <PipelineStageOptionLabel
              stage={stage}
              index={index}
              presets={presets}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
