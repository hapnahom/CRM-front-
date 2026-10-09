'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const headerBackClassName =
  'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function EntityDetailLayout({
  backLabel,
  backHref,
  onBack,
  breadcrumb,
  badges,
  children,
  className,
}: {
  backLabel: string;
  /** Prefer a real href so back navigation is reliable. */
  backHref?: string;
  onBack?: () => void;
  breadcrumb: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col bg-surface-card', className)}>
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface-card px-4 sm:px-6">
        {backHref ? (
          <a href={backHref} className={headerBackClassName}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </a>
        ) : (
          <button
            type="button"
            className={headerBackClassName}
            onClick={onBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </button>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[220px] truncate text-[12px] text-muted-foreground">
          {breadcrumb}
        </span>
        {badges}
      </div>
      <div className="w-full space-y-4 p-3 sm:p-5">{children}</div>
    </div>
  );
}

export function EntityNotFound({
  title,
  description,
  backLabel,
  backHref,
  onBack,
}: {
  title: string;
  description: string;
  backLabel: string;
  /** Prefer a real href so navigation works even if client routers/buttons misbehave. */
  backHref?: string;
  onBack?: () => void;
}) {
  const backClassName =
    'mt-5 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted';

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-surface-card">
      <div className="mx-4 max-w-sm rounded-xl border border-border bg-surface-card p-8 text-center shadow-xs">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        {backHref ? (
          <a href={backHref} className={backClassName}>
            <ArrowLeft size={13} />
            {backLabel}
          </a>
        ) : (
          <button type="button" className={backClassName} onClick={onBack}>
            <ArrowLeft size={13} />
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
