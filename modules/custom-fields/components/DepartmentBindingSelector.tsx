'use client';

import { useMemo, useState } from 'react';
import { Search, X, Check, Building2, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DepartmentRef, FieldBinding } from '../types';

interface DepartmentBindingSelectorProps {
  availableDepartments: DepartmentRef[];
  bindings: FieldBinding[];
  onChange: (bindings: FieldBinding[]) => void;
  preventRemoval?: boolean;
}

export function DepartmentBindingSelector({
  availableDepartments,
  bindings,
  onChange,
  preventRemoval = false,
}: DepartmentBindingSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedDeptIds = useMemo(
    () => new Set(bindings.map((b) => b.bindingId)),
    [bindings],
  );

  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return availableDepartments;
    const q = search.toLowerCase();
    return availableDepartments.filter((d) => d.name.toLowerCase().includes(q));
  }, [availableDepartments, search]);

  const selectedDepartments = useMemo(
    () => availableDepartments.filter((d) => selectedDeptIds.has(d.id)),
    [availableDepartments, selectedDeptIds],
  );

  const addDepartment = (dept: DepartmentRef) => {
    if (selectedDeptIds.has(dept.id)) return;
    onChange([
      ...bindings,
      {
        bindingType: 'DEPARTMENT',
        bindingId: dept.id,
        sortOrder: bindings.length,
      },
    ]);
  };

  const removeDepartment = (deptId: string) => {
    if (preventRemoval) return;
    onChange(bindings.filter((b) => b.bindingId !== deptId));
  };

  const toggleDepartment = (dept: DepartmentRef) => {
    if (selectedDeptIds.has(dept.id)) {
      if (!preventRemoval) removeDepartment(dept.id);
      return;
    }
    addDepartment(dept);
  };

  return (
    <div className="space-y-2">
      {selectedDepartments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDepartments.map((dept) => (
            <span
              key={dept.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-card px-2.5 py-1 text-xs"
            >
              <Building2 size={11} className="text-muted-foreground" />
              <span className="max-w-[120px] truncate">{dept.name}</span>
              {!preventRemoval ? (
                <button
                  type="button"
                  onClick={() => removeDepartment(dept.id)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}

      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-full justify-between border-border bg-surface-card px-3 font-normal text-foreground hover:bg-surface-card"
          >
            <span className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground">
              <Search size={13} className="shrink-0" />
              {availableDepartments.length
                ? `Search departments… (${availableDepartments.length})`
                : 'No departments available'}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="pointer-events-auto z-[2147483647] w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-border p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments…"
              className="h-8 border-border bg-surface-card text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredDepartments.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {availableDepartments.length === 0
                  ? 'No departments found in this CRM workspace'
                  : 'No departments match your search'}
              </p>
            ) : (
              filteredDepartments.map((dept) => {
                const isSelected = selectedDeptIds.has(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDepartment(dept);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated',
                      isSelected && 'bg-brand-muted/30',
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-[10px] font-semibold text-brand">
                      <Building2 size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {dept.name}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={13} className="shrink-0 text-brand" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
