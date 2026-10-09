'use client';

import { useState } from 'react';
import type { TargetRejectionFeedbackEntry } from '@/components/sales-targeting/targetRequestRejectionFeedback';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function TargetRejectionFeedbackLink({
  entries,
  className,
}: {
  entries: TargetRejectionFeedbackEntry[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        className={cn(
          'h-7 shrink-0 px-1 text-[11px] font-semibold text-destructive',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        Rejection note
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejection note</DialogTitle>
            <DialogDescription>
              Comment from the approver who rejected this proposal.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[min(50vh,320px)] space-y-3 overflow-y-auto">
            {entries.map((entry, index) => (
              <li
                key={`${entry.label ?? 'note'}-${entry.decidedAt ?? index}`}
                className="rounded-md border border-border bg-surface-elevated/80 px-3 py-2.5"
              >
                {entry.label ? (
                  <p className="m-0 text-[11px] font-semibold text-foreground">
                    {entry.label}
                  </p>
                ) : null}
                <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {entry.comment}
                </p>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TargetDetailsTriggerRow({
  feedbackEntries,
  detailsTrigger,
}: {
  feedbackEntries: TargetRejectionFeedbackEntry[];
  detailsTrigger: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <TargetRejectionFeedbackLink entries={feedbackEntries} />
      {detailsTrigger}
    </div>
  );
}
