'use client';

import { cn } from '@/lib/utils';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function DetailSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const showHeader = Boolean(title || description || action);

  return (
    <Card
      size="sm"
      className={cn(
        'gap-0 border-border bg-surface-card py-0 shadow-none ring-1 ring-border',
        className,
      )}
    >
      {showHeader ? (
        <CardHeader
          className={cn(
            'border-b border-border px-4 py-3 sm:px-5',
            action && 'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
          )}
        >
          <div className="min-w-0">
            {title ? (
              <CardTitle className="text-sm font-semibold text-foreground">
                {title}
              </CardTitle>
            ) : null}
            {description ? (
              <p
                className={cn(
                  'text-xs text-muted-foreground',
                  title ? 'mt-0.5' : undefined,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          'px-4 py-4 sm:px-5',
          !showHeader && 'pt-4',
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
