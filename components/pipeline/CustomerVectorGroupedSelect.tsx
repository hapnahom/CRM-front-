'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortaledDropdownPanel } from '@/components/ui/portaled-dropdown';
import { cn } from '@/lib/utils';
import type { CustomerListItem } from '@/store/server/features/customers/types';

const NO_VECTOR_KEY = '__no_vector__';
const NO_VECTOR_LABEL = 'No Vector';

export type CustomerOption = { id: string; accountName: string };

type VectorGroup = {
  id: string;
  label: string;
  items: CustomerListItem[];
};

type CustomerVectorGroupedSelectProps = {
  value: string;
  onValueChange: (customerId: string, customer: CustomerOption) => void;
  customers: CustomerListItem[];
  selectedLabel?: string;
  placeholder?: string;
  controlClass?: string;
  onAddCustomer?: () => void;
  disabled?: boolean;
};

function groupCustomersByVector(customers: CustomerListItem[]): VectorGroup[] {
  const map = new Map<string, { label: string; items: CustomerListItem[] }>();

  for (const customer of customers) {
    const vectorId = customer.vectorId ?? customer.vector?.id ?? NO_VECTOR_KEY;
    const label =
      vectorId === NO_VECTOR_KEY
        ? NO_VECTOR_LABEL
        : (customer.vector?.name ?? NO_VECTOR_LABEL);
    const group = map.get(vectorId);
    if (group) {
      group.items.push(customer);
    } else {
      map.set(vectorId, { label, items: [customer] });
    }
  }

  return [...map.entries()]
    .map(([id, group]) => ({
      id,
      label: group.label,
      items: group.items.sort((a, b) =>
        a.accountName.localeCompare(b.accountName),
      ),
    }))
    .sort((a, b) => {
      if (a.id === NO_VECTOR_KEY) return 1;
      if (b.id === NO_VECTOR_KEY) return -1;
      return a.label.localeCompare(b.label);
    });
}

export function CustomerVectorGroupedSelect({
  value,
  onValueChange,
  customers,
  selectedLabel,
  placeholder = 'Select customer',
  controlClass,
  onAddCustomer,
  disabled = false,
}: CustomerVectorGroupedSelectProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupCustomersByVector(customers), [customers]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (customer) =>
            customer.accountName.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const selectedVectorId = useMemo(() => {
    if (!value) return null;
    const customer = customers.find((item) => item.id === value);
    if (!customer) return null;
    return customer.vectorId ?? customer.vector?.id ?? NO_VECTOR_KEY;
  }, [customers, value]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    if (selectedVectorId) {
      setExpanded(new Set([selectedVectorId]));
    } else {
      setExpanded(new Set());
    }
  }, [open, selectedVectorId]);

  const toggleExpanded = (vectorId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(vectorId)) next.delete(vectorId);
      else next.add(vectorId);
      return next;
    });
  };

  const selectCustomer = (customer: CustomerListItem) => {
    onValueChange(customer.id, {
      id: customer.id,
      accountName: customer.accountName,
    });
    setOpen(false);
    setSearch('');
  };

  const displayLabel =
    selectedLabel ??
    customers.find((item) => item.id === value)?.accountName ??
    placeholder;

  return (
    <div ref={triggerRef} className="w-full">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          'h-9 w-full justify-between border-border bg-white px-3 text-sm font-normal text-foreground dark:bg-surface-card',
          value && 'border-brand-border/60',
          disabled && 'cursor-not-allowed opacity-90',
          controlClass,
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate text-left',
            !value && 'text-muted-foreground',
          )}
        >
          {displayLabel}
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
      </Button>

      <PortaledDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={() => {
          setOpen(false);
          setSearch('');
        }}
        preferredMaxHeight={320}
      >
        <div className="relative shrink-0 border-b border-border p-2">
          <Search
            size={13}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vectors or customers…"
            className="h-8 pl-8 text-[12px]"
            autoFocus
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filteredGroups.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No customers found
            </p>
          ) : (
            filteredGroups.map((group) => {
              const isExpanded =
                expanded.has(group.id) || Boolean(search.trim());
              const hasSelection = group.items.some(
                (customer) => customer.id === value,
              );

              return (
                <div key={group.id} className="mb-0.5">
                  <div className="flex items-center gap-0.5 rounded-md transition-colors hover:bg-accent/70">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.id)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                      aria-label={
                        isExpanded ? 'Collapse vector' : 'Expand vector'
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.id)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition-colors',
                        hasSelection && 'bg-brand-muted/35',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                        {group.label}
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {group.items.length}
                      </span>
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="ml-3 border-l border-border/80 pl-1.5">
                      <div className="space-y-0.5 py-1">
                        {group.items.map((customer) => {
                          const selected = customer.id === value;
                          return (
                            <button
                              key={customer.id}
                              type="button"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={() => selectCustomer(customer)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-accent',
                                selected && 'bg-brand-muted/40 font-medium',
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate text-foreground">
                                {customer.accountName}
                              </span>
                              {selected ? (
                                <Check
                                  size={13}
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

        {onAddCustomer ? (
          <div className="shrink-0 border-t border-border p-1.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium text-brand transition-colors hover:bg-muted"
              onClick={() => {
                setOpen(false);
                setSearch('');
                onAddCustomer();
              }}
            >
              <Plus size={13} />
              Add customer
            </button>
          </div>
        ) : null}
      </PortaledDropdownPanel>
    </div>
  );
}
