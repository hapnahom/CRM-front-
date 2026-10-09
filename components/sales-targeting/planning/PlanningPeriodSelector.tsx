'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';

const MAX_SEGMENTED = 6;

type SegmentedOption = { id: string; label: string };

export function PlanningSegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentedOption[];
  value: string | null;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface-elevated/60 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1 text-[12px] font-medium transition-colors',
              active
                ? 'bg-surface-card text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.08)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type Props = {
  sessions: OrgFiscalSession[];
  value: string | null;
  onChange: (sessionId: string) => void;
  className?: string;
};

/** Segmented control for a few periods (quarters); dropdown when there are many. */
export function PlanningPeriodSelector({
  sessions,
  value,
  onChange,
  className,
}: Props) {
  if (sessions.length > MAX_SEGMENTED) {
    return (
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger
          size="sm"
          className={cn(
            'w-full text-[12px] data-[size=sm]:h-8 sm:w-[220px]',
            className,
          )}
          aria-label="Select period"
        >
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => (
            <SelectItem
              key={session.id}
              value={session.id}
              className="text-[12px]"
            >
              {session.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <PlanningSegmentedControl
      ariaLabel="Select period"
      className={className}
      value={value}
      onChange={onChange}
      options={sessions.map((session) => ({
        id: session.id,
        label: session.name,
      }))}
    />
  );
}
