'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOutcomeProgressState,
  getPathProgressState,
  splitStagesForProgress,
  type ProgressStageItem,
} from '@/lib/pipeline/progress-stages';
import {
  DEALS_STAGE_COLOR_PRESETS,
  pipelineStageAppearance,
  textOnStageColor,
} from '@/lib/stage-presets';

export type StageProgressItem = ProgressStageItem;

function StageStep({
  stage,
  index,
  presets,
  isComplete,
  isCurrent,
  isClickable,
  onStageClick,
}: {
  stage: StageProgressItem;
  index: number;
  presets: ReadonlyArray<{ color: string; borderColor: string }>;
  isComplete: boolean;
  isCurrent: boolean;
  isClickable: boolean;
  onStageClick?: (stageId: string) => void;
}) {
  const appearance = pipelineStageAppearance(stage, index, presets);

  const stageContent = (
    <>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
          isClickable && 'group-hover:ring-2 group-hover:ring-brand/30',
        )}
        style={
          isComplete
            ? {
                borderColor: appearance.borderColor,
                backgroundColor: appearance.borderColor,
                color: textOnStageColor(appearance.borderColor),
              }
            : isCurrent
              ? {
                  borderColor: appearance.borderColor,
                  backgroundColor: appearance.backgroundColor,
                  color: appearance.borderColor,
                  boxShadow: `0 0 0 2px ${appearance.backgroundColor}`,
                }
              : {
                  borderColor: appearance.borderColor,
                  backgroundColor: `${appearance.backgroundColor}33`,
                  color: appearance.borderColor,
                }
        }
        aria-current={isCurrent ? 'step' : undefined}
      >
        {isComplete ? <Check size={12} strokeWidth={2.5} /> : index + 1}
      </span>
      <span
        className={cn(
          'max-w-[88px] truncate text-center text-[11px] leading-tight',
          isCurrent
            ? 'font-semibold text-foreground'
            : isComplete
              ? 'font-medium text-foreground'
              : 'text-muted-foreground',
          isClickable &&
            'group-hover:font-semibold group-hover:text-foreground',
        )}
        title={stage.name}
      >
        {stage.name}
      </span>
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className="group flex min-w-0 flex-col items-center gap-1.5 rounded-md px-0.5 py-0.5 transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-label={`Move to ${stage.name}`}
        onClick={() => onStageClick?.(stage.id)}
      >
        {stageContent}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      {stageContent}
    </div>
  );
}

function StageProgressTrack({
  stages,
  getStepState,
  presets,
  onStageClick,
  disabled,
  className,
}: {
  stages: StageProgressItem[];
  getStepState: (
    index: number,
    stage: StageProgressItem,
  ) => { isComplete: boolean; isCurrent: boolean };
  presets: ReadonlyArray<{ color: string; borderColor: string }>;
  onStageClick?: (stageId: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (stages.length === 0) return null;

  return (
    <ol
      className={cn('flex items-start gap-0 overflow-x-auto pb-1', className)}
    >
      {stages.map((stage, index) => {
        const { isComplete, isCurrent } = getStepState(index, stage);
        const isLast = index === stages.length - 1;
        const isClickable = Boolean(onStageClick) && !disabled && !isCurrent;
        const appearance = pipelineStageAppearance(stage, index, presets);

        return (
          <li
            key={stage.id}
            className={cn(
              'flex min-w-0 items-start',
              isLast ? 'flex-none' : 'flex-1',
            )}
          >
            <StageStep
              stage={stage}
              index={index}
              presets={presets}
              isComplete={isComplete}
              isCurrent={isCurrent}
              isClickable={isClickable}
              onStageClick={onStageClick}
            />
            {!isLast ? (
              <div
                className={cn(
                  'mx-1.5 mt-3 h-0.5 min-w-4 flex-1 rounded-full',
                  !isComplete && 'bg-border',
                )}
                style={
                  isComplete
                    ? { backgroundColor: appearance.borderColor }
                    : undefined
                }
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function StageProgress({
  stages,
  currentStageId,
  className,
  presets = DEALS_STAGE_COLOR_PRESETS,
  onStageClick,
  disabled = false,
}: {
  stages: StageProgressItem[];
  currentStageId: string;
  className?: string;
  presets?: ReadonlyArray<{ color: string; borderColor: string }>;
  onStageClick?: (stageId: string) => void;
  disabled?: boolean;
}) {
  if (stages.length === 0) return null;

  const { pathStages, outcomeStages, usesCategorySplit } =
    splitStagesForProgress(stages);

  const progressStages = usesCategorySplit ? pathStages : stages;
  const pathState = usesCategorySplit
    ? getPathProgressState(pathStages, outcomeStages, currentStageId)
    : null;
  const outcomeState = usesCategorySplit
    ? getOutcomeProgressState(outcomeStages, currentStageId)
    : null;

  const legacyCurrentIndex = Math.max(
    0,
    progressStages.findIndex((stage) => stage.id === currentStageId),
  );

  const currentPathIndex = pathState?.currentPathIndex ?? legacyCurrentIndex;
  const completeThroughIndex =
    pathState?.completeThroughIndex ?? legacyCurrentIndex;

  const progressLabel = pathState?.isOnOutcome
    ? `Closed — ${stages.find((stage) => stage.id === currentStageId)?.name ?? 'Outcome'}`
    : `Step ${currentPathIndex + 1} of ${progressStages.length}`;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline progress
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {progressLabel}
        </p>
      </div>
      <StageProgressTrack
        stages={progressStages}
        getStepState={(index, stage) => ({
          isComplete:
            pathState != null
              ? pathState.isOnOutcome
                ? stage.category === 'open' && index <= completeThroughIndex
                : index < currentPathIndex
              : index < legacyCurrentIndex,
          isCurrent: index === currentPathIndex,
        })}
        presets={presets}
        onStageClick={onStageClick}
        disabled={disabled}
      />
      {usesCategorySplit && outcomeStages.length > 0 ? (
        <StageProgressTrack
          stages={outcomeStages}
          getStepState={(index) => ({
            isComplete: false,
            isCurrent: index === (outcomeState?.currentIndex ?? -1),
          })}
          presets={presets}
          onStageClick={onStageClick}
          disabled={disabled}
          className="mt-3 border-t border-border/70 pt-3"
        />
      ) : null}
    </div>
  );
}
