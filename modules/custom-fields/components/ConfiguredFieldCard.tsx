'use client';

import type { CSSProperties } from 'react';
import { Pencil, Trash2, Power, PowerOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { getFieldDefinition } from '../constants';
import type { CustomFieldConfig } from '../types';

interface ConfiguredFieldCardProps {
  field: CustomFieldConfig;
  appliesToLabel?: string;
  stageName?: string;
  stageColor?: string;
  onEdit: (field: CustomFieldConfig) => void;
  onDelete: (field: CustomFieldConfig) => void;
  onToggleActive: (field: CustomFieldConfig) => void;
  showDragHandle?: boolean;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
  };
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: CSSProperties;
  isDragging?: boolean;
  isDragOverlay?: boolean;
}

export function ConfiguredFieldCard({
  field,
  appliesToLabel,
  stageName,
  stageColor,
  onEdit,
  onDelete,
  onToggleActive,
  showDragHandle = false,
  dragHandleProps,
  sortableRef,
  sortableStyle,
  isDragging = false,
  isDragOverlay = false,
}: ConfiguredFieldCardProps) {
  const def = getFieldDefinition(field.type);

  return (
    <div
      ref={sortableRef}
      style={sortableStyle}
      className={cn(
        'group grid items-center gap-4 px-4 py-3.5',
        showDragHandle
          ? 'grid-cols-[auto_2fr_0.9fr_1fr_1fr_1fr_auto] touch-none'
          : 'grid-cols-[2fr_0.9fr_1fr_1fr_1fr_auto]',
        !isDragOverlay && 'transition-colors hover:bg-surface-elevated/60',
        !field.active && !isDragging && !isDragOverlay && 'opacity-60',
        isDragging &&
          'border border-dashed border-brand/30 bg-brand-muted/20 [&>*]:invisible',
        isDragOverlay &&
          'cursor-grabbing bg-surface-card shadow-lg ring-1 ring-brand/30',
      )}
    >
      {showDragHandle &&
        (isDragOverlay ? (
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground"
            aria-hidden
          >
            <GripVertical size={14} />
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={`Drag to reorder ${field.label}`}
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
          >
            <GripVertical size={14} />
          </button>
        ))}

      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: def ? `${def.color}18` : '#f3f4f6',
            color: def?.color ?? '#6b7280',
          }}
        >
          {def && <def.icon size={15} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-foreground leading-snug">
              {field.label}
            </p>
            {field.required && (
              <span className="shrink-0 text-[10px] font-semibold text-destructive">
                *
              </span>
            )}
            {field.settings.allowValueDescription && (
              <Badge
                variant="outline"
                className="shrink-0 px-1.5 py-0 text-[9px] font-medium"
              >
                + Details
              </Badge>
            )}
          </div>
          {field.description && (
            <p className="truncate text-[11px] text-muted-foreground leading-snug mt-0.5">
              {field.description}
            </p>
          )}
        </div>
      </div>

      <div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: def ? `${def.color}18` : '#f3f4f6',
            color: def?.color ?? '#6b7280',
          }}
        >
          {def && <def.icon size={11} />}
          {def?.label ?? field.type}
        </span>
      </div>

      <span className="truncate text-[11px] text-muted-foreground">
        {appliesToLabel ?? '—'}
      </span>

      <div className="flex items-center gap-1.5 min-w-0">
        {stageName ? (
          <>
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: stageColor ?? '#6b7280' }}
            />
            <span className="truncate text-[11px] text-muted-foreground">
              {stageName}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground/50">—</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {field.active ? (
          <Badge variant="success" className="text-[10px] px-2 py-0">
            Active
          </Badge>
        ) : (
          <Badge variant="muted" className="text-[10px] px-2 py-0">
            Inactive
          </Badge>
        )}
        {field.required && (
          <Badge variant="danger" className="text-[10px] px-2 py-0">
            Required
          </Badge>
        )}
      </div>

      <div
        className={cn(
          'flex w-[72px] items-center justify-end gap-0.5',
          !isDragOverlay &&
            'opacity-0 transition-opacity group-hover:opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onToggleActive(field)}
          title={field.active ? 'Deactivate' : 'Activate'}
        >
          {field.active ? <PowerOff size={13} /> : <Power size={13} />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onEdit(field)}
          title="Edit field"
        >
          <Pencil size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(field)}
          title="Delete field"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

interface SortableConfiguredFieldCardProps
  extends Omit<
    ConfiguredFieldCardProps,
    | 'showDragHandle'
    | 'dragHandleProps'
    | 'sortableRef'
    | 'sortableStyle'
    | 'isDragging'
  > {}

export function SortableConfiguredFieldCard(
  props: SortableConfiguredFieldCardProps,
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.field.id });

  const translateY = transform?.y ?? 0;

  return (
    <ConfiguredFieldCard
      {...props}
      showDragHandle
      dragHandleProps={{ attributes, listeners }}
      sortableRef={setNodeRef}
      sortableStyle={{
        transform: translateY
          ? `translate3d(0, ${translateY}px, 0)`
          : undefined,
        transition,
      }}
      isDragging={isDragging}
    />
  );
}
