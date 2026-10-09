'use client';

import { cn } from '@/lib/utils';

function Pulse({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-100', className)}
      style={style}
    />
  );
}

function SkeletonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <SkeletonCard className="min-h-[132px] p-3.5 sm:p-4">
      <div className="flex items-start justify-between">
        <Pulse className="h-3 w-24" />
        <Pulse className="size-9 rounded-lg" />
      </div>
      <Pulse className="mt-3 h-7 w-28" />
      <Pulse className="mt-2 h-3 w-20" />
      <Pulse className="mt-3 h-3 w-32" />
    </SkeletonCard>
  );
}

function MiddleCardSkeleton({
  variant = 'donut',
}: {
  variant?: 'donut' | 'quota' | 'bars';
}) {
  return (
    <SkeletonCard className="min-h-[310px]">
      <Pulse className="mb-4 h-4 w-40" />
      {variant === 'donut' ? (
        <div className="flex items-center gap-4 pt-2">
          <Pulse className="size-[140px] shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            {Array.from({ length: 3 }).map((unused, index) => (
              <div key={index}>
                <Pulse className="h-3 w-36" />
                <Pulse className="mt-1.5 h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : variant === 'quota' ? (
        <div className="flex flex-col items-center pt-8">
          <Pulse className="h-10 w-24" />
          <Pulse className="mt-3 h-3 w-28" />
          <div className="mt-10 flex w-full items-center justify-between">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-24" />
          </div>
          <Pulse className="mt-3 h-2 w-full rounded-full" />
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {Array.from({ length: 4 }).map((unused, index) => (
            <div key={index}>
              <div className="mb-1.5 flex items-center justify-between">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-14" />
              </div>
              <Pulse
                className="h-1.5 rounded-full"
                style={{ width: `${70 - index * 10}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-3">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-3 w-24" />
      </div>
    </SkeletonCard>
  );
}

function BottomCardSkeleton({
  variant = 'deals',
}: {
  variant?: 'deals' | 'rows';
}) {
  return (
    <SkeletonCard className="min-h-[350px]">
      <div className="mb-4 flex items-start justify-between">
        <Pulse className="h-4 w-36" />
        <Pulse className="h-4 w-12" />
      </div>
      {variant === 'deals' ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((unused, index) => (
            <div
              key={index}
              className="rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <Pulse className="h-3.5 w-36" />
                <Pulse className="h-3.5 w-16" />
              </div>
              <Pulse className="mt-2 h-4 w-24 rounded" />
            </div>
          ))}
          <Pulse className="mt-4 h-3 w-28" />
          <Pulse className="h-9 w-full rounded-md" />
          <Pulse className="h-9 w-full rounded-md" />
        </div>
      ) : (
        <div className="space-y-0">
          {Array.from({ length: 4 }).map((unused, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <Pulse className="size-8 rounded-lg" />
              <div className="flex-1">
                <Pulse className="h-3.5 w-32" />
                <Pulse className="mt-1.5 h-2.5 w-24" />
              </div>
              <div className="text-right">
                <Pulse className="ml-auto h-3.5 w-16" />
                <Pulse className="ml-auto mt-1.5 h-1.5 w-[70px] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
    </SkeletonCard>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((unused, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiddleCardSkeleton variant="donut" />
        <MiddleCardSkeleton variant="quota" />
        <MiddleCardSkeleton variant="bars" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BottomCardSkeleton variant="deals" />
        <BottomCardSkeleton variant="rows" />
        <BottomCardSkeleton variant="rows" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SkeletonCard className="min-h-[260px]">
            <div className="mb-4 flex items-start justify-between">
              <Pulse className="h-4 w-28" />
              <Pulse className="h-5 w-24 rounded-md" />
            </div>
            <div className="flex flex-col items-center pt-6">
              <Pulse className="size-12 rounded-full" />
              <Pulse className="mt-3 h-3.5 w-48" />
              <Pulse className="mt-2 h-3 w-56" />
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-border pt-3">
              <Pulse className="h-3 w-36" />
              <Pulse className="h-3 w-28" />
            </div>
          </SkeletonCard>
        </div>
        <div className="lg:col-span-2">
          <SkeletonCard className="min-h-[260px]">
            <div className="mb-4 flex items-start justify-between">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-5 w-16 rounded-md" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((unused, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                >
                  <div>
                    <Pulse className="h-3.5 w-36" />
                    <Pulse className="mt-2 h-4 w-16 rounded" />
                  </div>
                  <Pulse className="h-3.5 w-14" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </section>
    </div>
  );
}
