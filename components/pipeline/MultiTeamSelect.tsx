'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';

export type TeamSelectOption = {
  value: string;
  label: string;
};

export type TeamSelectGroup = {
  label: string;
  options: TeamSelectOption[];
};

export function MultiTeamSelect({
  value = [],
  onChange,
  options,
  groups,
  placeholder = 'Select teams',
  emptyLabel = 'No teams available',
  countNoun = 'team',
  loading = false,
  disabled = false,
  className,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  /** Flat list of teams (used when `groups` is not provided) */
  options?: TeamSelectOption[];
  /** Teams categorized by department (or any group label) */
  groups?: TeamSelectGroup[];
  placeholder?: string;
  emptyLabel?: string;
  /** Singular noun used in group counts, e.g. "team" or "member". */
  countNoun?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const flatOptions = React.useMemo(() => {
    if (groups?.length) {
      return groups.flatMap((group) => group.options);
    }
    return options ?? [];
  }, [groups, options]);

  const selectedOptions = flatOptions.filter((o) => value.includes(o.value));

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const renderOption = (option: TeamSelectOption) => {
    const isSelected = value.includes(option.value);
    return (
      <button
        key={option.value}
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle(option.value);
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-sm py-1.5 pl-6 pr-2 text-left text-sm hover:bg-accent',
          isSelected && 'bg-accent',
        )}
      >
        <span
          className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {isSelected ? <Check className="size-4 shrink-0 text-brand" /> : null}
      </button>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 text-left text-[12.25px] shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-card',
          className,
        )}
      >
        {loading ? (
          <span className="px-1 text-muted-foreground">Loading…</span>
        ) : selectedOptions.length === 0 ? (
          <span className="px-1 text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded border border-brand-border bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand"
            >
              {option.label}
              <X
                className="size-3 cursor-pointer opacity-70"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggle(option.value);
                }}
              />
            </span>
          ))
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 self-center text-muted-foreground" />
      </button>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={() => setOpen(false)}
        className="overflow-y-auto p-1"
        preferredMaxHeight={288}
      >
        {flatOptions.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : groups?.length ? (
          groups.map((group) =>
            group.options.length === 0 ? null : (
              <div key={group.label || 'options'} className="mb-1.5 last:mb-0">
                {group.label ? (
                  <div className="sticky top-0 z-10 bg-popover px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {group.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">
                      {group.options.length} {countNoun}
                      {group.options.length === 1 ? '' : 's'}
                    </p>
                  </div>
                ) : null}
                <div
                  className={cn(
                    group.label && 'ml-3 border-l border-border/70',
                  )}
                >
                  {group.options.map(renderOption)}
                </div>
              </div>
            ),
          )
        ) : (
          (options ?? []).map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggle(option.value);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                  isSelected && 'bg-accent',
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })
        )}
      </PortaledDropdownPanel>
    </>
  );
}
