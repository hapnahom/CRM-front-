'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';

export type ReportSelectOption = { id: string; name: string };

export function ReportMultiSelect({
  items,
  value,
  onChange,
  allLabel,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No options',
  className,
}: {
  items: ReportSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => (!q ? true : item.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? (items.find((item) => item.id === value[0])?.name ??
          `${value.length} selected`)
        : `${value.length} selected`;

  const toggle = (id: string) => {
    onChange(
      selectedSet.has(id)
        ? value.filter((item) => item !== id)
        : [...value, id],
    );
  };

  return (
    <div ref={triggerRef} className={cn('w-full', className)}>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="h-9 w-full justify-between border-border bg-white px-3 text-[12px] font-normal text-foreground"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronsUpDown size={14} className="text-muted-foreground" />
      </Button>
      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        minWidth={240}
      >
        <div className="relative shrink-0 border-b border-border p-2">
          <Search
            size={13}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-[12px]"
            autoFocus
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              {emptyLabel}
            </p>
          ) : (
            filtered.map((item) => {
              const checked = selectedSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-muted',
                    checked && 'bg-brand-muted/40',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {checked ? (
                    <Check size={13} className="shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PortaledDropdownPanel>
    </div>
  );
}
