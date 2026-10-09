'use client';

import { CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import { resolveFiscalSessionDisplay } from './fiscal-session-display';

export function FiscalSessionBadge({
  sessionId,
  className,
  compact = false,
}: {
  sessionId?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { fiscalYears, allSessions } = usePipelineFiscalSessions();
  const display = resolveFiscalSessionDisplay(
    sessionId,
    fiscalYears,
    allSessions,
  );

  if (!display) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        Not assigned
      </span>
    );
  }

  if (compact) {
    return (
      <span className={cn('text-sm font-medium text-foreground', className)}>
        {display.primaryLabel}
      </span>
    );
  }

  return (
    <div className={cn('flex min-w-0 items-start gap-2.5', className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
        <CalendarRange className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {display.primaryLabel}
          </p>
          {display.isCurrent ? (
            <Badge variant="brand" className="text-[10px]">
              Current
            </Badge>
          ) : null}
        </div>
        {display.sessionName && display.sessionName !== display.quarterLabel ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {display.sessionName}
          </p>
        ) : null}
        {display.dateRange ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {display.dateRange}
          </p>
        ) : null}
      </div>
    </div>
  );
}
