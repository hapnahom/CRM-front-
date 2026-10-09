'use client';

import type { CSSProperties } from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { StagePresetSwatch } from '@/components/pipeline/StagePresetSwatch';

type SortableStageListItemProps = {
  stage: {
    id: string;
    name: string;
    color?: string | null;
    borderColor?: string | null;
  };
  isSelected: boolean;
  dealCount: number;
  onSelect: () => void;
  canDrag?: boolean;
  isDragOverlay?: boolean;
};

export function SortableStageListItem({
  stage,
  isSelected,
  dealCount,
  onSelect,
  canDrag = true,
  isDragOverlay = false,
}: SortableStageListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, disabled: !canDrag || isDragOverlay });

  const translateY = transform?.y ?? 0;

  const sortableStyle: CSSProperties = {
    transform: translateY ? `translate3d(0, ${translateY}px, 0)` : undefined,
    transition,
  };

  return (
    <button
      ref={isDragOverlay ? undefined : setNodeRef}
      type="button"
      onClick={onSelect}
      style={isDragOverlay ? undefined : sortableStyle}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left touch-none',
        isSelected
          ? 'border-brand bg-brand-muted'
          : 'border-border bg-surface-card hover:border-border-strong hover:bg-surface-elevated',
        isDragging &&
          !isDragOverlay &&
          'border border-dashed border-brand/30 bg-brand-muted/20 [&>*:not(.stage-drag-handle)]:invisible',
        isDragOverlay &&
          'cursor-grabbing border-brand/40 bg-surface-card shadow-lg ring-1 ring-brand/30',
      )}
    >
      {canDrag ? (
        isDragOverlay ? (
          <span
            className="stage-drag-handle inline-flex h-5 w-5 shrink-0 items-center justify-center text-brand"
            aria-hidden
          >
            <GripVertical size={13} />
          </span>
        ) : (
          <span
            {...attributes}
            {...listeners}
            aria-label="Drag stage to reorder"
            className={cn(
              'stage-drag-handle inline-flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded hover:bg-[#e9ecef] active:cursor-grabbing',
              isDragging && 'cursor-grabbing',
            )}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVertical
              size={13}
              className={cn(
                isDragging
                  ? 'text-brand'
                  : 'text-[#c4c7d4] group-hover:text-muted-foreground',
              )}
            />
          </span>
        )
      ) : (
        <span className="inline-flex h-5 w-5 shrink-0" aria-hidden />
      )}
      <StagePresetSwatch
        color={stage.color ?? '#7c3aed'}
        borderColor={stage.borderColor ?? '#5b21b6'}
        className="h-2.5 w-2.5"
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
        {stage.name}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {dealCount}
      </span>
    </button>
  );
}
