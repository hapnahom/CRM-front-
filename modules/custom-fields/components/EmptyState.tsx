'use client';

import { LayoutTemplate, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onCreateField?: () => void;
}

export function EmptyState({
  hasFilters = false,
  onClearFilters,
  onCreateField,
}: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-card">
          <SlidersHorizontal size={22} className="text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          No fields match your filters
        </h3>
        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
          Try adjusting your search or filter criteria to find what you&apos;re
          looking for.
        </p>
        {onClearFilters && (
          <Button
            variant="outline"
            size="sm"
            className="mt-5 h-8 text-xs"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Decorative icon cluster */}
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted">
          <LayoutTemplate size={28} className="text-brand/70" />
        </div>
        <div className="absolute -bottom-1 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-page bg-brand">
          <Plus size={14} className="text-brand-foreground" strokeWidth={2.5} />
        </div>
      </div>

      <h3 className="text-[15px] font-semibold text-foreground">
        No custom fields yet
      </h3>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
        Extend your records with the exact data your team needs. Create your
        first custom field to get started.
      </p>

      {onCreateField && (
        <Button
          size="sm"
          className="mt-6 h-9 gap-2 bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
          onClick={onCreateField}
        >
          <Plus size={15} strokeWidth={2.5} />
          Create Custom Field
        </Button>
      )}

      {/* Decorative type hints */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 opacity-50">
        {['Text', 'Number', 'Date', 'Checkbox', 'Select', 'User'].map(
          (label) => (
            <span
              key={label}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
