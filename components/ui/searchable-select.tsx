'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
  clearLabel?: string;
  footer?: ReactNode;
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  disabled = false,
  className,
  triggerClassName,
  allowClear = false,
  clearLabel = 'None',
  footer,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.keywords ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const pick = (next: string) => {
    onValueChange(next);
    close();
  };

  return (
    <div className={cn('w-full', className)}>
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'h-auto min-h-9 w-full justify-between border-border bg-white px-3 py-1.5 text-sm font-normal hover:bg-white aria-expanded:bg-white dark:bg-surface-card dark:hover:bg-surface-card dark:aria-expanded:bg-surface-card',
            triggerClassName,
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left',
              !selected && 'text-muted-foreground',
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </div>
      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        className="overflow-hidden p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
          <Search className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1" role="listbox">
          {allowClear ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent',
                !value && 'bg-accent',
              )}
              onClick={() => pick('')}
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {clearLabel}
              </span>
              {!value ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {emptyText}
            </p>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent',
                    isSelected && 'bg-accent',
                  )}
                  onClick={() => pick(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {isSelected ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
        {footer ? <div className="border-t border-border">{footer}</div> : null}
      </PortaledDropdownPanel>
    </div>
  );
}
