'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/** Shared with Create Lead/Deal inputs and Select triggers. */
export const catalogControlClass =
  'h-9 border-border bg-white text-sm dark:bg-surface-card';

export function CatalogFormField({
  label,
  required,
  children,
  className,
  error,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function CatalogFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
