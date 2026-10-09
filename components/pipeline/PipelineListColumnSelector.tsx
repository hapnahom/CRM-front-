'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns3, GripVertical, Search } from 'lucide-react';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type {
  PipelineListColumnDef,
  PipelineListColumnId,
} from '@/lib/pipeline/list-columns';

type PipelineListColumnSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: PipelineListColumnDef[];
  selected: PipelineListColumnId[];
  onSave: (next: PipelineListColumnId[]) => void;
  defaultColumnIds?: PipelineListColumnId[];
};

function SortableSelectedRow({
  col,
  onRemove,
}: {
  col: PipelineListColumnDef;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id, disabled: col.locked });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-surface-card px-2 py-1.5 text-[12px]',
        isDragging && 'z-10 shadow-md ring-1 ring-brand/30',
        col.locked && 'bg-surface-elevated',
      )}
    >
      {col.locked ? (
        <span className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground/40">
          <GripVertical size={13} />
        </span>
      ) : (
        <button
          type="button"
          className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Drag to reorder ${col.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={13} />
        </button>
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{col.label}</span>
      {col.locked ? (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          Required
        </span>
      ) : (
        <button
          type="button"
          className="shrink-0 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          onClick={onRemove}
        >
          Remove
        </button>
      )}
    </div>
  );
}

export function PipelineListColumnSelector({
  open,
  onOpenChange,
  columns,
  selected,
  onSave,
  defaultColumnIds,
}: PipelineListColumnSelectorProps) {
  const [draft, setDraft] = useState<PipelineListColumnId[]>(selected);
  const [query, setQuery] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery('');
    }
  }, [open, selected]);

  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  const selectedColumns = useMemo(
    () =>
      draft
        .map((id) => columnById.get(id))
        .filter((column): column is PipelineListColumnDef => Boolean(column)),
    [columnById, draft],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((c) => c.label.toLowerCase().includes(q));
  }, [columns, query]);

  const builtIn = filtered.filter((c) => c.group === 'built-in');
  const roles = filtered.filter((c) => c.group === 'role');
  const custom = filtered.filter((c) => c.group === 'custom');
  const leadCustom = custom.filter((c) => c.entityType === 'LEAD');
  const dealCustom = custom.filter((c) => c.entityType === 'DEAL');
  const plainCustom = custom.filter((c) => !c.entityType);

  const toggle = (col: PipelineListColumnDef) => {
    if (col.locked) return;
    setDraft((prev) => {
      if (prev.includes(col.id)) {
        return prev.filter((x) => x !== col.id);
      }
      return [...prev, col.id];
    });
  };

  const selectDefaults = () => {
    const preferred = (
      defaultColumnIds ??
      ([
        'name',
        'customer',
        'stage',
        'value',
        'expectedClose',
        'responsible',
      ] as PipelineListColumnId[])
    ).filter((id) => columns.some((column) => column.id === id));
    setDraft(preferred.length ? preferred : ['name']);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const oldIndex = prev.indexOf(String(active.id) as PipelineListColumnId);
      const newIndex = prev.indexOf(String(over.id) as PipelineListColumnId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const renderRow = (col: PipelineListColumnDef) => {
    const checked = draft.includes(col.id);
    return (
      <button
        key={col.id}
        type="button"
        disabled={col.locked}
        onClick={() => toggle(col)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px]',
          col.locked ? 'cursor-default' : 'hover:bg-muted',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={col.locked}
          className="pointer-events-none"
        />
        <span className="min-w-0 flex-1 truncate">{col.label}</span>
        {col.locked ? (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            Required
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select columns</DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          Choose which columns appear in the table and drag to set their order.
          Standard fields, assignment roles, and active custom fields appear
          below.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">
              Column order
            </span>
            <span className="text-muted-foreground">
              {draft.length} selected
            </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={draft}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-elevated/40 p-2">
                {selectedColumns.length ? (
                  selectedColumns.map((col) => (
                    <SortableSelectedRow
                      key={col.id}
                      col={col}
                      onRemove={() => toggle(col)}
                    />
                  ))
                ) : (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">
                    No columns selected.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search columns..."
            className="h-9 pl-8 text-[12px]"
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <button
            type="button"
            className="font-medium text-brand hover:underline"
            onClick={selectDefaults}
          >
            Reset to default
          </button>
        </div>

        <div className="max-h-56 space-y-3 overflow-y-auto rounded-md border border-border p-2">
          {builtIn.length ? (
            <div>
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Standard
              </div>
              <div className="space-y-0.5">{builtIn.map(renderRow)}</div>
            </div>
          ) : null}
          {roles.length ? (
            <div>
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Assignment roles
              </div>
              <div className="space-y-0.5">{roles.map(renderRow)}</div>
            </div>
          ) : null}
          {isLeadsEnabled() && leadCustom.length ? (
            <div>
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Lead custom fields
              </div>
              <div className="space-y-0.5">{leadCustom.map(renderRow)}</div>
            </div>
          ) : null}
          {dealCustom.length ? (
            <div>
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {dealUiLabel()} custom fields
              </div>
              <div className="space-y-0.5">{dealCustom.map(renderRow)}</div>
            </div>
          ) : null}
          {plainCustom.length ? (
            <div>
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Custom fields
              </div>
              <div className="space-y-0.5">{plainCustom.map(renderRow)}</div>
            </div>
          ) : null}
          {!builtIn.length && !roles.length && !custom.length ? (
            <div className="px-2 py-3 text-[11px] text-muted-foreground">
              No columns match your search.
            </div>
          ) : null}
          {!query.trim() && !columns.some((c) => c.group === 'custom') ? (
            <div className="px-2 py-2 text-[11px] text-muted-foreground">
              Custom fields created for this record type will appear here once
              they are active.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-white hover:bg-brand-hover"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Apply columns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PipelineListColumnsButtonProps = {
  onClick: () => void;
  className?: string;
};

export function PipelineListColumnsButton({
  onClick,
  className,
}: PipelineListColumnsButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Select columns"
      title="Select columns"
      className={cn(
        'size-7 text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={onClick}
    >
      <Columns3 size={14} />
    </Button>
  );
}
