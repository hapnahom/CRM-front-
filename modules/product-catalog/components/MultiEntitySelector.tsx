'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';

type NamedEntity = { id: string; name: string; status?: string };

export interface MultiEntitySelectorProps {
  items: NamedEntity[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  activeOnly?: boolean;
  disabled?: boolean;
  className?: string;
  hint?: string;
}

export function MultiEntitySelector({
  items,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No items found',
  activeOnly = true,
  disabled,
  className,
  hint,
}: MultiEntitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedSet.has(i.id)),
    [items, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (activeOnly ? i.status !== 'inactive' : true))
      .filter((i) => (!q ? true : i.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, activeOnly, search]);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs"
            >
              <span className="max-w-[140px] truncate">{item.name}</span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== item.id))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${item.name}`}
                >
                  <X size={11} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            catalogControlClass,
            'w-full justify-between font-normal text-muted-foreground',
          )}
        >
          <span>
            {selectedItems.length > 0
              ? `${selectedItems.length} selected`
              : placeholder}
          </span>
          <ChevronsUpDown size={14} className="opacity-50" />
        </Button>
      </div>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        minWidth={240}
      >
        <div className="relative shrink-0 border-b border-border p-2">
          <Search
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto py-1"
          role="listbox"
          aria-multiselectable="true"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </p>
          ) : (
            filtered.map((item) => {
              const checked = selectedSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                    checked && 'bg-brand-muted/40',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded-[2px] border',
                      checked
                        ? 'border-primary bg-primary text-brand-foreground'
                        : 'border-primary/60 bg-background',
                    )}
                  >
                    {checked ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                </button>
              );
            })
          )}
        </div>
      </PortaledDropdownPanel>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
