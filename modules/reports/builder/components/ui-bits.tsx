'use client';

import { cn } from '@/lib/utils';

export const PANEL_HEADER_CLASS =
  'relative flex w-full items-center justify-between gap-2 border-b border-brand-border/80 bg-white px-4 py-3';

export function StepBadge({
  step,
  className,
}: {
  step: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white',
        className,
      )}
    >
      {step}
    </span>
  );
}

export function PanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectableRow({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-brand-muted' : 'hover:bg-[#f8fafc]',
        className,
      )}
    >
      {children}
      {selected ? (
        <span className="absolute inset-y-0 right-0 w-[3px] bg-brand" />
      ) : null}
    </button>
  );
}

export function PanelHeader({
  step,
  title,
  trailing,
}: {
  step?: number;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={PANEL_HEADER_CLASS}>
      <div className="flex min-w-0 items-center gap-2.5">
        {step != null ? <StepBadge step={step} /> : null}
        <h2 className="truncate text-[13px] font-semibold tracking-tight text-[#111827]">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium text-[#6b7280]">
      {children}
    </label>
  );
}
