'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  confirmDisabled?: boolean;
  confirming?: boolean;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  className?: string;
};

/**
 * Confirm UI without Radix Dialog/FocusScope.
 * Avoids infinite update-depth loops from nested @radix-ui/react-compose-refs.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmingLabel,
  confirmDisabled = false,
  confirming = false,
  confirmVariant = 'default',
  onConfirm,
  className,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, confirming, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        disabled={confirming}
        onClick={() => {
          if (!confirming) onOpenChange(false);
        }}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'relative z-10 grid w-full max-w-[440px] gap-4 rounded-lg border border-border bg-background p-6 shadow-lg',
          className,
        )}
      >
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={
              confirmVariant === 'destructive' ? 'destructive' : 'default'
            }
            className={
              confirmVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            disabled={confirmDisabled || confirming}
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
