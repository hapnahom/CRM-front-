'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategory } from '../definitions';
import type { ParentCategoryId } from '../types';

type ReportScopeProps = {
  categories: ParentCategoryId[];
  defaultOpen?: boolean;
};

export function ReportScope({
  categories,
  defaultOpen = false,
}: ReportScopeProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (categories.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Layers3 size={14} className="text-brand" />
        <span className="text-[12px] font-semibold text-[#111827]">
          Report Scope
        </span>
        <span className="rounded-full bg-brand-muted/60 px-2 py-0.5 text-[10px] font-semibold text-brand">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
        </span>
        <span className="ml-auto text-[#9ca3af]">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      <div
        className={cn(
          'grid gap-3 border-t border-[#eef0f3] px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
          !open && 'hidden',
        )}
      >
        {categories.map((id) => {
          const category = getCategory(id);
          if (!category) return null;
          return (
            <div key={id} className="min-w-0">
              <p className="text-[11px] font-semibold text-[#111827]">
                {category.name}
              </p>
              <ul className="mt-1.5 space-y-1">
                {category.children.map((child) => (
                  <li
                    key={child}
                    className="flex items-center gap-1.5 text-[11px] text-[#4b5563]"
                  >
                    <span className="flex size-3.5 items-center justify-center rounded-sm bg-[#dcfce7] text-[9px] font-bold text-[#15803d]">
                      ✓
                    </span>
                    {child}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
