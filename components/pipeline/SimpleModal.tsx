'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SimpleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Extra class for the scrollable body region. */
  bodyClassName?: string;
};

/**
 * Portaled modal without Radix Dialog/FocusScope/Slot.
 * Avoids infinite update-depth loops from nested @radix-ui/react-compose-refs.
 */
export function SimpleModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: SimpleModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-10 grid w-full max-h-[90vh] max-w-lg gap-0 overflow-hidden rounded-xl border border-border bg-background text-sm shadow-lg',
          className,
        )}
      >
        <div className="relative border-b border-border px-6 py-4 pr-12">
          <h2
            id={titleId}
            className="text-lg font-semibold leading-none text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-2 text-sm text-muted-foreground"
            >
              {description}
            </p>
          ) : null}
          <button
            type="button"
            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div
          className={cn(
            'max-h-[min(70vh,560px)] overflow-y-auto px-6 py-4',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
