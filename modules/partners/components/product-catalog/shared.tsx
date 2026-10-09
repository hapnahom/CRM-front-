'use client';

import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CatalogStatus } from '@/modules/product-catalog/types';
import {
  MODULE_CONTENT_PAD,
  Panel,
  PanelHeader,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
  FILTER_TRIGGER_CLASS,
} from '../profile/shared';

export {
  MODULE_CONTENT_PAD,
  Panel,
  PanelHeader,
  ProfileKpiCard,
  TABLE_CELL_CLASS,
  TABLE_HEAD_CLASS,
  FILTER_TRIGGER_CLASS,
};

export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  if (status === 'active') {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  );
}

export type CatalogSegment = 'products' | 'families';

/** @deprecated Prefer Tabs / TabsList line variant (see ProductCatalogTab). */
export function CatalogSegmentControl({
  value,
  onChange,
  className,
}: {
  value: CatalogSegment;
  onChange: (value: CatalogSegment) => void;
  className?: string;
}) {
  const options: { id: CatalogSegment; label: string }[] = [
    { id: 'products', label: 'Products' },
    { id: 'families', label: 'Product Families' },
  ];

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1 border-b border-border',
        className,
      )}
      role="tablist"
      aria-label="Product catalog sections"
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CatalogListShell({
  title,
  toolbar,
  children,
  footer,
  className,
}: {
  title: string;
  toolbar: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="m-0 text-[12px] font-semibold text-foreground">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function CatalogDetailNav({
  backLabel,
  onBack,
  title,
  status,
  actions,
}: {
  backLabel: string;
  onBack: () => void;
  title: string;
  status: CatalogStatus;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-card px-4 py-3 sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-[12px] text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
        {backLabel}
      </Button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="max-w-[280px] truncate text-[12px] font-medium text-foreground">
        {title}
      </span>
      <CatalogStatusBadge status={status} />
      {actions ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function CatalogSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader title={title} description={description} />
      <div className="p-4">{children}</div>
    </Panel>
  );
}
