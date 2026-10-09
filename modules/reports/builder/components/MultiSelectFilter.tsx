'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { FilterOption } from '../types';
import { FieldLabel } from './ui-bits';

type MultiSelectFilterProps = {
  label: string;
  placeholder?: string;
  options: FilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
};

export function MultiSelectFilter({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  max,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (max != null && value.length >= max) return;
    else onChange([...value, id]);
  };

  const selectAll = () =>
    onChange(
      max != null
        ? filtered.map((o) => o.id).slice(0, max)
        : filtered.map((o) => o.id),
    );
  const clear = () => onChange([]);

  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex min-h-9 w-full items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-left text-[12px] transition-colors hover:border-[#cbd5e1]',
              open && 'border-brand-border ring-2 ring-brand-muted',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="px-1 text-[#9ca3af]">{placeholder}</span>
              ) : (
                selected.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-1 rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] font-medium text-[#374151]"
                  >
                    <span className="truncate">{item.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${item.label}`}
                      className="rounded p-0.5 hover:bg-[#e5e7eb]"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(item.id);
                        }
                      }}
                    >
                      <X size={10} />
                    </span>
                  </span>
                ))
              )}
            </div>
            <ChevronsUpDown size={14} className="shrink-0 text-[#9ca3af]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-0">
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-2">
              <Search size={13} className="text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-8 w-full bg-transparent text-[12px] outline-none placeholder:text-[#9ca3af]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[11px]">
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={selectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="font-medium text-[#6b7280] hover:underline"
              onClick={clear}
            >
              Clear
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-[#9ca3af]">
                No matches
              </p>
            ) : (
              filtered.map((option) => {
                const checked = value.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[#f8fafc]',
                      checked && 'bg-brand-muted/60',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none"
                    />
                    <span className="flex-1 text-[#111827]">
                      {option.label}
                    </span>
                    {checked ? (
                      <Check size={13} className="text-brand" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-border px-3 py-2 text-[11px] text-[#6b7280]">
            {value.length} selected
            <span className="ml-2 text-[#9ca3af]">· OR within field</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
