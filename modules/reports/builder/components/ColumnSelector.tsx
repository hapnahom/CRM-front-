'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  defaultColumnsForCategories,
  getCategory,
  getColumnsGroupedByCategory,
  reorderSelectedIdsInCategory,
  type ColumnCategoryGroup,
  type ColumnSectionGroup,
} from '../definitions';
import type { ColumnDefinition, ColumnId, ParentCategoryId } from '../types';

type ColumnSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Selected report categories — required; columns nest under category → section. */
  categories: ParentCategoryId[];
  columns: ColumnDefinition[];
  selected: ColumnId[];
  columnsConfigured: boolean;
  onSave: (next: ColumnId[]) => void;
};

function ColumnCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex size-3.5 shrink-0 items-center justify-center rounded-full border',
        checked ? 'border-brand bg-brand text-white' : 'border-border bg-white',
      )}
    >
      {checked ? <Check size={10} strokeWidth={3} /> : null}
    </span>
  );
}

function SortableColumnRow({
  column,
  onToggle,
}: {
  column: ColumnDefinition;
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

  useEffect(() => {
    if (isDragging) didDragRef.current = true;
  }, [isDragging]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onToggle();
      }}
      className={cn(
        'flex touch-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
        'cursor-grab active:cursor-grabbing',
        isDragging && 'z-10 bg-accent shadow-sm ring-1 ring-border',
      )}
      {...attributes}
      {...listeners}
    >
      <ColumnCheckbox checked />
      <span className="min-w-0 truncate text-foreground">{column.label}</span>
    </button>
  );
}

function StaticColumnRow({
  column,
  onToggle,
}: {
  column: ColumnDefinition;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
    >
      <ColumnCheckbox checked={false} />
      <span className="min-w-0 truncate text-foreground">{column.label}</span>
    </button>
  );
}

function countSelectedInColumns(
  selectedIds: ColumnId[],
  columns: ColumnDefinition[],
): number {
  const set = new Set(columns.map((c) => c.id));
  return selectedIds.filter((id) => set.has(id)).length;
}

function SectionColumnGrid({
  section,
  selectedIds,
  query,
  onChange,
  onToggle,
}: {
  section: ColumnSectionGroup;
  selectedIds: ColumnId[];
  query: string;
  onChange: (ids: ColumnId[]) => void;
  onToggle: (id: ColumnId) => void;
}) {
  const columnById = useMemo(
    () => new Map(section.columns.map((c) => [c.id, c])),
    [section.columns],
  );
  const sectionColumnIds = useMemo(
    () => section.columns.map((c) => c.id),
    [section.columns],
  );

  const q = query.trim().toLowerCase();
  const selectedOrderedIds = selectedIds.filter((id) => columnById.has(id));
  const selectedOrdered = selectedOrderedIds
    .map((id) => columnById.get(id))
    .filter((c): c is ColumnDefinition => Boolean(c))
    .filter((c) => !q || c.label.toLowerCase().includes(q));
  const selectedVisibleIds = selectedOrdered.map((c) => c.id);

  const unselected = section.columns.filter((c) => {
    if (selectedOrderedIds.includes(c.id)) return false;
    if (!q) return true;
    return c.label.toLowerCase().includes(q);
  });

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
      reorderSelectedIdsInCategory(
        selectedIds,
        sectionColumnIds,
        String(active.id),
        String(over.id),
      ),
    );
  };

  if (!selectedOrdered.length && !unselected.length) return null;

  const selectedCount = selectedOrderedIds.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold text-foreground">
          {section.sectionLabel}{' '}
          <span className="font-normal text-muted-foreground">
            ({selectedCount})
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {selectedCount} selected
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selectedVisibleIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {selectedOrdered.map((column) => (
              <SortableColumnRow
                key={`${section.reportTypeId}-${column.id}`}
                column={column}
                onToggle={() => onToggle(column.id)}
              />
            ))}
            {unselected.map((column) => (
              <StaticColumnRow
                key={`${section.reportTypeId}-${column.id}`}
                column={column}
                onToggle={() => onToggle(column.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function CategoryColumnBlock({
  group,
  selectedIds,
  query,
  onChange,
  onToggle,
}: {
  group: ColumnCategoryGroup;
  selectedIds: ColumnId[];
  query: string;
  onChange: (ids: ColumnId[]) => void;
  onToggle: (id: ColumnId) => void;
}) {
  const meta = getCategory(group.categoryId);
  const allColumns = group.sections.flatMap((s) => s.columns);
  const categorySelectedCount = countSelectedInColumns(selectedIds, allColumns);

  const visibleSections = group.sections.filter((section) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return section.columns.some((c) => c.label.toLowerCase().includes(q));
  });

  if (!visibleSections.length) return null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-white p-2">
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: meta?.iconColor ?? '#9ca3af' }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-foreground">
            {group.categoryLabel}{' '}
            <span className="font-semibold text-brand">
              ({categorySelectedCount})
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {group.sections.length} sections · drag within a section to reorder
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-2">
        {visibleSections.map((section) => (
          <SectionColumnGrid
            key={section.reportTypeId}
            section={section}
            selectedIds={selectedIds}
            query={query}
            onChange={onChange}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

export function ColumnSelector({
  open,
  onOpenChange,
  categories,
  columns,
  selected,
  columnsConfigured,
  onSave,
}: ColumnSelectorProps) {
  const [draft, setDraft] = useState<ColumnId[]>(selected);
  const [query, setQuery] = useState('');

  const groups = useMemo(
    () => getColumnsGroupedByCategory(categories),
    [categories],
  );

  const allowedIds = useMemo(
    () => new Set(columns.map((c) => c.id)),
    [columns],
  );

  const orderedSelectedIds = useMemo(
    () => draft.filter((id) => allowedIds.has(id)),
    [draft, allowedIds],
  );

  const handleOpenChange = (next: boolean) => {
    if (next) {
      if (!columnsConfigured && selected.length === 0) {
        setDraft(defaultColumnsForCategories(categories));
      } else {
        setDraft(selected);
      }
      setQuery('');
    }
    onOpenChange(next);
  };

  const toggle = (id: ColumnId) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllInCategories = () => {
    const seen = new Set<ColumnId>();
    const next: ColumnId[] = [];
    for (const group of groups) {
      for (const section of group.sections) {
        for (const col of section.columns) {
          if (seen.has(col.id)) continue;
          seen.add(col.id);
          next.push(col.id);
        }
      }
    }
    setDraft(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Columns</DialogTitle>
        </DialogHeader>

        {categories.length === 0 ? (
          <p className="px-1 py-8 text-center text-[12px] text-muted-foreground">
            Select at least one report category first. Columns are grouped by
            category and section.
          </p>
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground">
              Grouped like the report sections (e.g. Summary Overview, Leads
              &amp; Acquisition). Counts show selected columns per category and
              section. Drag within a section to reorder.
            </p>

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
              <div className="flex gap-3">
                <button
                  type="button"
                  className="font-medium text-brand hover:underline"
                  onClick={selectAllInCategories}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="font-medium text-muted-foreground hover:underline"
                  onClick={() => setDraft([])}
                >
                  Clear
                </button>
              </div>
              <span className="text-muted-foreground">
                Total {orderedSelectedIds.length} selected
              </span>
            </div>

            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-0.5">
              {groups.length === 0 ? (
                <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                  No columns for the selected categories.
                </p>
              ) : (
                groups.map((group) => (
                  <CategoryColumnBlock
                    key={group.categoryId}
                    group={group}
                    selectedIds={draft}
                    query={query}
                    onChange={setDraft}
                    onToggle={toggle}
                  />
                ))
              )}

              {orderedSelectedIds.length === 0 && !query.trim() ? (
                <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">
                  No columns selected. Generate stays hidden until you select at
                  least one.
                </p>
              ) : null}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-brand text-white hover:bg-brand-hover"
            disabled={categories.length === 0 || groups.length === 0}
            onClick={() => {
              onSave(orderedSelectedIds);
              onOpenChange(false);
            }}
          >
            Apply Columns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
