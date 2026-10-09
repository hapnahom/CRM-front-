import { cn } from '@/lib/utils';

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn('grid size-7 place-items-center rounded-md', tone)}>
          {icon}
        </span>
      </div>
      <div className="mt-1.5 tracking-tight text-foreground">
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-xl font-semibold">{value}</p>
        ) : (
          value
        )}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </article>
  );
}
