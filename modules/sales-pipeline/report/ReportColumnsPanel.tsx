'use client';

import { useRef, useState } from 'react';
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  REPORT_COLUMN_GROUPS,
  reorderSelectedIdsInGroup,
  selectedIdsForGroup,
  type ReportColumnDef,
  type ReportColumnGroupId,
} from './columns';

type SelectionState = 'checked' | 'partial' | 'unchecked';

function ColumnCheckbox({
  state,
  size = 'sm',
}: {
  state: SelectionState;
  size?: 'sm' | 'md';
}) {
  const filled = state !== 'unchecked';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border',
        size === 'md' ? 'size-4' : 'size-3.5',
        filled ? 'border-brand bg-brand text-white' : 'border-border bg-white',
      )}
    >
      {state === 'checked' ? <Check size={10} strokeWidth={3} /> : null}
      {state === 'partial' ? <Minus size={10} strokeWidth={3} /> : null}
    </span>
  );
}

/** Selected row — hold & drag to reorder. */
function SortableColumnRow({
  column,
  onToggle,
}: {
  column: ReportColumnDef;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  const didDragRef = useRef(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex touch-none items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-accent',
        isDragging && 'z-10 bg-accent shadow-sm ring-1 ring-border',
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          onToggle();
        }}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left text-[12px]',
          'cursor-grab active:cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
      >
        <ColumnCheckbox state="checked" />
        <span className="min-w-0 truncate text-foreground">{column.label}</span>
      </button>
    </div>
  );
}

function StaticColumnRow({
  column,
  checked,
  onToggle,
}: {
  column: ReportColumnDef;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
    >
      <ColumnCheckbox state={checked ? 'checked' : 'unchecked'} />
      <span className="min-w-0 truncate text-foreground">{column.label}</span>
    </button>
  );
}

function GroupColumnGrid({
  groupColumns,
  selectedIds,
  onChange,
  onToggle,
}: {
  groupColumns: ReportColumnDef[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onToggle: (id: string) => void;
}) {
  const columnById = new Map(groupColumns.map((column) => [column.id, column]));
  const groupColumnIds = groupColumns.map((column) => column.id);
  const selectedOrderedIds = selectedIds.filter((id) => columnById.has(id));
  const selectedOrdered = selectedOrderedIds
    .map((id) => columnById.get(id))
    .filter((column): column is ReportColumnDef => Boolean(column));
  const unselected = groupColumns.filter(
    (column) => !selectedOrderedIds.includes(column.id),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(
      reorderSelectedIdsInGroup(
        selectedIds,
        groupColumnIds,
        String(active.id),
        String(over.id),
      ),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={selectedOrderedIds}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {selectedOrdered.map((column) => (
            <SortableColumnRow
              key={column.id}
              column={column}
              onToggle={() => onToggle(column.id)}
            />
          ))}
          {unselected.map((column) => (
            <StaticColumnRow
              key={column.id}
              column={column}
              checked={false}
              onToggle={() => onToggle(column.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function ReportColumnsPanel({
  columns,
  selectedIds,
  onChange,
}: {
  columns: ReportColumnDef[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Kept for call-site compatibility; PDF no longer limits column count. */
  exportFormat?: 'pdf' | 'xlsx';
}) {
  const [expandedGroups, setExpandedGroups] = useState<ReportColumnGroupId[]>(
    [],
  );
  const selectedSet = new Set(selectedIds);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    const column = columns.find((item) => item.id === id);
    if (!column) {
      onChange([...selectedIds, id]);
      return;
    }
    const groupColumnIds = new Set(
      columns
        .filter((item) => item.groupId === column.groupId)
        .map((item) => item.id),
    );
    let insertAt = selectedIds.length;
    for (let i = selectedIds.length - 1; i >= 0; i -= 1) {
      if (groupColumnIds.has(selectedIds[i]!)) {
        insertAt = i + 1;
        break;
      }
    }
    const next = [...selectedIds];
    next.splice(insertAt, 0, id);
    onChange(next);
  };

  const setGroup = (groupId: ReportColumnGroupId, selectAll: boolean) => {
    const groupColumns = columns.filter((column) => column.groupId === groupId);
    const groupIds = groupColumns.map((column) => column.id);
    if (!selectAll) {
      onChange(selectedIds.filter((id) => !groupIds.includes(id)));
      return;
    }
    const withoutGroup = selectedIds.filter((id) => !groupIds.includes(id));
    onChange([...withoutGroup, ...groupIds]);
  };

  const toggleExpanded = (groupId: ReportColumnGroupId) => {
    setExpandedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  };

  const selectAll = () => {
    onChange(columns.map((column) => column.id));
  };

  const clearAll = () => onChange([]);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[12px] font-semibold text-foreground">
          Tables & columns
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Choose which tables appear in the export, then expand a table to
          select and reorder its columns
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={selectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            Clear all
          </button>
          <span className="text-[11px] text-muted-foreground">
            {selectedIds.length} of {columns.length} columns selected
          </span>
        </div>

        <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
          {REPORT_COLUMN_GROUPS.map((group) => {
            const groupColumns = columns.filter(
              (column) => column.groupId === group.id,
            );
            if (!groupColumns.length) return null;

            const selectedCount = selectedIdsForGroup(
              selectedIds,
              group.id,
              columns,
            ).length;
            const allSelected = selectedCount === groupColumns.length;
            const state: SelectionState = allSelected
              ? 'checked'
              : selectedCount
                ? 'partial'
                : 'unchecked';
            const expanded = expandedGroups.includes(group.id);

            return (
              <div
                key={group.id}
                className="rounded-lg border border-border/70"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={state === 'partial' ? 'mixed' : allSelected}
                    aria-label={`Include ${group.title}`}
                    onClick={() => setGroup(group.id, !allSelected)}
                    className="flex shrink-0 items-center"
                  >
                    <ColumnCheckbox state={state} size="md" />
                  </button>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(group.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  >
                    <span className="min-w-0 truncate text-[12px] font-medium text-foreground">
                      {group.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                      {selectedCount}/{groupColumns.length}
                      <ChevronDown
                        size={14}
                        className={cn(
                          'transition-transform',
                          expanded && 'rotate-180',
                        )}
                      />
                    </span>
                  </button>
                </div>

                {expanded ? (
                  <div className="border-t border-border/70 px-2 py-1.5">
                    <GroupColumnGrid
                      groupColumns={groupColumns}
                      selectedIds={selectedIds}
                      onChange={onChange}
                      onToggle={toggle}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
