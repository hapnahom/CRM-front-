'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { entityInitials } from './utils';
import { DetailSection } from './DetailSection';

export function ValueSummaryCard({
  label,
  value,
  children,
  action,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <DetailSection title="Summary" action={action}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 text-3xl font-semibold tracking-tight text-brand">
          {value}
        </div>
      </div>
      {children ? (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          {children}
        </div>
      ) : null}
    </DetailSection>
  );
}

export function SummaryStat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value || '—'}
      </div>
    </div>
  );
}

export function PersonRow({
  label,
  name,
  subtitle,
}: {
  label: string;
  name?: string | null;
  subtitle?: string | null;
}) {
  const display = name?.trim() || '—';
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="bg-brand-muted text-[10px] font-semibold text-brand">
            {entityInitials(display === '—' ? '?' : display)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {display}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ObserverChips({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <p className="text-sm text-muted-foreground">None assigned</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2 py-1"
        >
          <Avatar className="size-4">
            <AvatarFallback className="bg-brand-muted text-[7px] font-semibold text-brand">
              {entityInitials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground">{name}</span>
        </span>
      ))}
    </div>
  );
}

export function ContactCard({
  name,
  email,
  phone,
  role,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-brand-muted text-[10px] font-semibold text-brand">
            {entityInitials(name || email || '?')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {name || email || '—'}
            </p>
            {role ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {role}
              </span>
            ) : null}
          </div>
          {email ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {email}
            </p>
          ) : null}
          {phone ? (
            <p className="truncate text-xs text-muted-foreground">{phone}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
