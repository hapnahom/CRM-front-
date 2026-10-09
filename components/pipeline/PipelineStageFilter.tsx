'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STAGE_COLOR_PRESETS } from '@/lib/stage-presets';
import { cn } from '@/lib/utils';

export type PipelineStageFilterOption = {
  id: string;
  name: string;
  color?: string | null;
};

function stageColor(option?: PipelineStageFilterOption): string {
  if (option?.color?.trim()) {
    const raw = option.color.trim();
    return raw.startsWith('#') ? raw : `#${raw}`;
  }
  return STAGE_COLOR_PRESETS[0]!.color;
}

function StageOptionLabel({
  option,
  className,
}: {
  option: Pick<PipelineStageFilterOption, 'name' | 'color'>;
  className?: string;
}) {
  const color = stageColor(option as PipelineStageFilterOption);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{option.name}</span>
    </span>
  );
}

interface PipelineStageFilterProps {
  stages: PipelineStageFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PipelineStageFilter({
  stages,
  value,
  onChange,
  className,
}: PipelineStageFilterProps) {
  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === value),
    [stages, value],
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'h-[31.5px] w-full min-w-[160px] border-border bg-white text-[12.25px] dark:bg-surface-card',
          className,
        )}
      >
        <SelectValue placeholder="All stages">
          {value !== 'all' && selectedStage ? (
            <StageOptionLabel option={selectedStage} />
          ) : value === 'all' ? (
            'All stages'
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
      >
        <SelectItem value="all">All stages</SelectItem>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            <StageOptionLabel option={stage} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
