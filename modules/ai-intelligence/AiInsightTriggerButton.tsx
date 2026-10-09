'use client';

import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AiInsightTriggerButtonProps = {
  className?: string;
  /** Match surrounding header control height (Customers uses h-9). */
  size?: 'sm' | 'default';
  /** When the insights panel is open. */
  pressed?: boolean;
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>;

/**
 * Header entry point for Sales Hub / Customers AI Insights panel.
 * forwardRef so PopoverTrigger can attach refs/handlers via asChild.
 */
export const AiInsightTriggerButton = forwardRef<
  HTMLButtonElement,
  AiInsightTriggerButtonProps
>(function AiInsightTriggerButton(
  { className, size = 'sm', pressed = false, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      aria-expanded={pressed}
      aria-pressed={pressed}
      className={cn(
        'shrink-0 gap-1.5 border-border bg-surface-card text-foreground hover:bg-surface-elevated',
        size === 'default' ? 'h-9' : 'h-8 text-[12px]',
        pressed &&
          'border-brand/60 bg-brand/5 text-foreground ring-1 ring-brand/30',
        className,
      )}
      aria-label="Open AI Insight"
      title="Generate fresh AI insights for this view"
      {...props}
    >
      <Sparkles size={14} className="text-brand" aria-hidden />
      AI Insight
    </Button>
  );
});
