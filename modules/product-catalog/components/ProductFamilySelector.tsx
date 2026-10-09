'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { catalogControlClass } from '@/modules/product-catalog/components/CatalogFormPrimitives';
import type { ProductFamily } from '@/modules/product-catalog/types';

export function ProductFamilySelector({
  families,
  value,
  onChange,
  disabled,
  placeholder = 'Select product family',
  className,
}: {
  families: ProductFamily[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families
      .filter((f) => f.status === 'active' || f.id === value)
      .filter((f) =>
        !q
          ? true
          : f.name.toLowerCase().includes(q) ||
            (f.description ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [families, search, value]);

  return (
    <div className={cn('w-full', className)}>
      <Select
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
        value={value ?? undefined}
        onValueChange={(next) => onChange(next)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(catalogControlClass, 'w-full')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className="w-[var(--radix-select-trigger-width)]"
          position="popper"
          align="start"
        >
          <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search families…"
              className="h-8"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {search.trim()
                ? 'No families match your search'
                : 'No families available'}
            </div>
          ) : (
            filtered.map((family) => (
              <SelectItem key={family.id} value={family.id}>
                {family.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
