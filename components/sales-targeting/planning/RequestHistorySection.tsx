'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetTargetRequestHistory } from '@/store/server/features/salesTargeting/queries';
import { RequestHistoryTimeline } from '@/components/sales-targeting/planning/RequestHistoryTimeline';
import { RequestHistoryTimelineSkeleton } from '@/components/sales-targeting/ui-kit';

type Props = {
  planId?: string;
  requestId?: string | null;
  currencyCode: string;
  className?: string;
};

export function RequestHistorySection({
  planId,
  requestId,
  currencyCode,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGetTargetRequestHistory(
    planId,
    requestId,
    open && Boolean(planId && requestId),
  );

  if (!requestId) return null;

  return (
    <div className={cn('mt-4 border-t border-border pt-3', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Request history
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>
      {open ? (
        <div className="mt-3">
          {isLoading ? (
            <RequestHistoryTimelineSkeleton />
          ) : (
            <RequestHistoryTimeline
              events={[...(data?.timeline ?? [])].sort(
                (a, b) =>
                  new Date(b.occurredAt).getTime() -
                  new Date(a.occurredAt).getTime(),
              )}
              currencyCode={currencyCode}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
