'use client';

import { tokens } from '@/lib/design-tokens';

import * as React from 'react';
import { Check, ChevronDown, Search, User, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FieldLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

export function FieldLabel({ children, required }: FieldLabelProps) {
  return (
    <div>
      <div className="text-foreground text-sm">
        {children}{' '}
        {required && <span style={{ color: tokens.color.error }}>*</span>}
      </div>
    </div>
  );
}

interface FormFieldRowProps {
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
  dataCy?: string;
}

/**
 * Lightweight replacement for antd's <Form.Item>: renders a label, the control,
 * and a validation message. Validation wiring is handled by react-hook-form's
 * Controller at the call-site.
 */
export function FormFieldRow({
  label,
  required,
  error,
  className,
  children,
  dataCy,
}: FormFieldRowProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} data-cy={dataCy}>
      {label !== undefined && (
        <FieldLabel required={required}>{label}</FieldLabel>
      )}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  dataCy?: string;
  notFoundContent?: React.ReactNode;
  /** Rendered at the bottom of the dropdown (e.g. "Add Company" action). */
  footer?: React.ReactNode;
  invalid?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  loading,
  disabled,
  className,
  dataCy,
  notFoundContent,
  footer,
  invalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    (o.label ?? '').toString().toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-cy={dataCy}
          data-invalid={invalid ? 'true' : undefined}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-surface-card py-2 pr-2 pl-3 text-sm whitespace-nowrap shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-[3px] data-[invalid=true]:ring-destructive/20',
            className,
          )}
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {loading ? 'Loading...' : selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-9 w-full bg-surface-card px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {notFoundContent ?? 'No results found'}
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                  option.value === value && 'bg-accent',
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="size-4 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        {footer}
      </PopoverContent>
    </Popover>
  );
}

interface MultiSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  dataCy?: string;
  notFoundContent?: React.ReactNode;
  invalid?: boolean;
}

export function MultiSelect({
  value = [],
  onChange,
  options,
  placeholder,
  loading,
  disabled,
  className,
  dataCy,
  notFoundContent,
  invalid,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedOptions = options.filter((o) => value.includes(o.value));
  const filtered = options.filter((o) =>
    (o.label ?? '').toString().toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-cy={dataCy}
          data-invalid={invalid ? 'true' : undefined}
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-surface-card py-1.5 pr-2 pl-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-[3px] data-[invalid=true]:ring-destructive/20',
            className,
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="px-1 text-muted-foreground">
              {loading ? 'Loading...' : placeholder}
            </span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                data-cy="user-tag"
                className="inline-flex items-center gap-1 rounded border border-[#d9d9d9] bg-[#fafafa] px-1.5 py-0.5 text-xs"
              >
                <User className="size-3 text-[#8c8c8c]" />
                {option.label}
                <X
                  className="size-3 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option.value);
                  }}
                />
              </span>
            ))
          )}
          <ChevronDown className="ml-auto size-4 shrink-0 self-center text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-9 w-full bg-surface-card px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {notFoundContent ?? 'No results found'}
            </div>
          ) : (
            filtered.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                    isSelected && 'bg-accent',
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    {option.label}
                  </span>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
