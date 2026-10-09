import { cn } from '@/lib/utils';

export function DashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 text-[14px] font-bold leading-5 text-[#334155]">
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function CardFooter({
  label,
  value,
  valueClassName,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {value != null ? (
        <span
          className={cn(
            'text-xs font-semibold text-foreground',
            valueClassName,
          )}
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}
