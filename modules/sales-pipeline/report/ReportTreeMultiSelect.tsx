'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ReportTreeGroup = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function ReportTreeMultiSelect({
  groups,
  parentIds,
  childIds,
  onParentChange,
  onChildChange,
  allLabel,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No options',
  className,
}: {
  groups: ReportTreeGroup[];
  parentIds: string[];
  childIds: string[];
  onParentChange: (ids: string[]) => void;
  onChildChange: (ids: string[]) => void;
  allLabel: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const parentSet = useMemo(() => new Set(parentIds), [parentIds]);
  const childSet = useMemo(() => new Set(childIds), [childIds]);

  const groupById = useMemo(() => {
    const map = new Map<string, ReportTreeGroup>();
    for (const group of groups) map.set(group.id, group);
    return map;
  }, [groups]);

  const childNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups) {
      for (const child of group.children) map.set(child.id, child.name);
    }
    return map;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const parentMatch = group.name.toLowerCase().includes(q);
        const children = group.children.filter(
          (child) => parentMatch || child.name.toLowerCase().includes(q),
        );
        if (!parentMatch && children.length === 0) return null;
        return { ...group, children };
      })
      .filter((group): group is ReportTreeGroup => group !== null);
  }, [groups, search]);

  // Count only leaf/internal selections (members/products), never parent+child as two.
  const leafIds = useMemo(() => {
    if (childIds.length) return childIds;
    // Team selected with no explicit members → count that team's members as covered.
    const covered: string[] = [];
    for (const parentId of parentIds) {
      const group = groupById.get(parentId);
      if (!group?.children?.length) {
        covered.push(parentId);
        continue;
      }
      for (const child of group.children) covered.push(child.id);
    }
    return uniqueIds(covered);
  }, [childIds, parentIds, groupById]);

  const selectionCount = leafIds.length;

  const label = useMemo(() => {
    if (selectionCount === 0) return allLabel;
    if (selectionCount === 1) {
      const onlyId = leafIds[0]!;
      return (
        childNameById.get(onlyId) ?? groupById.get(onlyId)?.name ?? allLabel
      );
    }
    return `${selectionCount} selected`;
  }, [allLabel, childNameById, groupById, leafIds, selectionCount]);

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleParent = (id: string) => {
    const group = groupById.get(id);
    if (!group) return;

    if (!group.children.length) {
      onParentChange(
        parentSet.has(id)
          ? parentIds.filter((item) => item !== id)
          : [...parentIds, id],
      );
      return;
    }

    const childIdList = group.children.map((child) => child.id);
    const allSelected = childIdList.every((childId) => childSet.has(childId));

    if (allSelected) {
      const nextChildren = childIds.filter(
        (item) => !childIdList.includes(item),
      );
      onChildChange(nextChildren);
      onParentChange(parentIds.filter((item) => item !== id));
      return;
    }

    const nextChildren = uniqueIds([...childIds, ...childIdList]);
    onChildChange(nextChildren);
    onParentChange(uniqueIds([...parentIds.filter((item) => item !== id), id]));
  };

  const toggleChild = (id: string, parentId: string) => {
    const nextChildren = childSet.has(id)
      ? childIds.filter((item) => item !== id)
      : [...childIds, id];
    onChildChange(nextChildren);

    const group = groupById.get(parentId);
    if (!group?.children?.length) return;
    const nextChildSet = new Set(nextChildren);
    const allSelected = group.children.every((child) =>
      nextChildSet.has(child.id),
    );
    if (allSelected) {
      onParentChange(uniqueIds([...parentIds, parentId]));
    } else {
      onParentChange(parentIds.filter((item) => item !== parentId));
    }
  };

  const clearAll = () => {
    onParentChange([]);
    onChildChange([]);
  };

  const isParentChecked = (group: ReportTreeGroup) => {
    if (!group.children.length) return parentSet.has(group.id);
    return group.children.every((child) => childSet.has(child.id));
  };

  return (
    <div className={cn('w-full', className)}>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'h-9 w-full justify-between border-border bg-white px-3 text-[12px] font-normal text-foreground',
          selectionCount > 0 && 'border-brand-border bg-brand-muted/30',
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="relative border-b border-border p-2">
            <Search
              size={13}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-[12px]"
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>

          <div className="max-h-[220px] space-y-0.5 overflow-y-auto p-2">
            <button
              type="button"
              onClick={clearAll}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
                selectionCount === 0 && 'bg-brand-muted/40',
              )}
            >
              <span className="flex-1 font-semibold text-foreground">
                {allLabel}
              </span>
              {selectionCount === 0 ? (
                <Check size={12} className="shrink-0 text-brand" />
              ) : null}
            </button>

            {filteredGroups.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                {emptyLabel}
              </p>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded =
                  expanded.has(group.id) || Boolean(search.trim());
                const parentSelected = isParentChecked(group);

                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-0.5 rounded-sm transition-colors hover:bg-accent">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.id)}
                        className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {group.children.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )
                        ) : (
                          <span className="size-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleParent(group.id)}
                        className={cn(
                          'flex flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors',
                          parentSelected && 'bg-brand-muted/40',
                        )}
                      >
                        <span className="flex-1 font-medium text-foreground">
                          {group.name}
                        </span>
                        {group.children.length > 0 ? (
                          <span className="text-[10px] text-muted-foreground">
                            {group.children.length}
                          </span>
                        ) : null}
                        {parentSelected ? (
                          <Check size={12} className="shrink-0 text-brand" />
                        ) : null}
                      </button>
                    </div>

                    {isExpanded && group.children.length > 0 ? (
                      <div className="ml-4 border-l border-border pl-2">
                        <div className="space-y-0.5 py-1">
                          {group.children.map((child) => {
                            const childSelected = childSet.has(child.id);
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => toggleChild(child.id, group.id)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
                                  childSelected && 'bg-brand-muted/40',
                                )}
                              >
                                <span className="flex-1 truncate text-foreground">
                                  {child.name}
                                </span>
                                {childSelected ? (
                                  <Check
                                    size={12}
                                    className="shrink-0 text-brand"
                                  />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {selectionCount > 0 ? (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-md bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Reset to {allLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
