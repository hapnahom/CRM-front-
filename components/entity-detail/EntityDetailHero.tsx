'use client';

import { cn } from '@/lib/utils';
import { entityInitials } from './utils';

export function EntityDetailHero({
  name,
  fallbackInitial = '—',
  meta,
  actions,
  footer,
  className,
}: {
  name: string;
  fallbackInitial?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface-card shadow-xs',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-sm font-bold tracking-wide text-brand">
            {entityInitials(name) || fallbackInitial}
          </div>
          <div className="min-w-0 pt-0.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {name}
            </h1>
            {meta ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {meta}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {footer ? (
        <div className="border-t border-border bg-surface-elevated/70 px-4 py-3.5 sm:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function HeroMetaItem({
  icon,
  children,
  className,
}: {
  icon?: React.ElementType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  const MetaIcon = icon;
  return (
    <span
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-1.5',
        className,
      )}
    >
      {MetaIcon ? <MetaIcon size={13} className="shrink-0 opacity-70" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
