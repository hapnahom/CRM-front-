'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { IS_CORE } from '@/utils/constants';
import { cn } from '@/lib/utils';

/**
 * Reserves the real Nav chrome dimensions (220px sidebar + h-14 header)
 * so page content can paint without a layout jump while the Nav chunk loads.
 */
export function NavChromeSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-page">
      <aside
        className={cn(
          'hidden md:flex h-full w-[220px] min-w-[220px] flex-col',
          'bg-primary-muted text-foreground',
        )}
        aria-hidden
      >
        {!IS_CORE && (
          <div className="flex h-14 flex-shrink-0 items-center border-b border-primary-border px-4">
            <div className="flex w-full items-center gap-2.5">
              <Skeleton className="h-7 w-7 shrink-0 rounded-md bg-primary/20" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-16 bg-foreground/10" />
                <Skeleton className="h-2.5 w-20 bg-foreground/10" />
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-4 overflow-hidden px-2 py-3">
          {[0, 1, 2].map((groupIndex) => (
            <div key={groupIndex} className="space-y-1.5">
              <Skeleton className="mx-2 mb-1 h-2.5 w-14 bg-foreground/10" />
              {[0, 1, 2].map((itemIndex) => (
                <Skeleton
                  key={itemIndex}
                  className="h-9 w-full rounded-md bg-foreground/10"
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 space-y-1 border-t border-primary-border p-2">
          <Skeleton className="h-9 w-full rounded-md bg-foreground/10" />
          <Skeleton className="h-9 w-full rounded-md bg-foreground/10" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-page">
        {!IS_CORE && (
          <div className="hidden h-14 flex-shrink-0 items-center border-b border-border bg-surface-card px-6 md:flex">
            <Skeleton className="h-8 w-40" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
