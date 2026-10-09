'use client';

export default function ReportsLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-[1500px] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-28 animate-pulse rounded bg-surface-elevated" />
              <div className="h-3 w-64 animate-pulse rounded bg-surface-elevated" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-36 animate-pulse rounded-md bg-surface-elevated" />
              <div className="h-9 w-32 animate-pulse rounded-md bg-surface-elevated" />
              <div className="h-9 w-28 animate-pulse rounded-md bg-surface-elevated" />
              <div className="h-9 w-24 animate-pulse rounded-md bg-brand/20" />
            </div>
          </div>
          <div className="h-9 animate-pulse rounded-lg bg-surface-elevated" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 })
            .keys()
            .map((index) => (
              <div
                key={index}
                className="h-[118px] animate-pulse rounded-xl border border-border bg-surface-elevated"
              />
            ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-[360px] animate-pulse rounded-xl border border-border bg-surface-elevated xl:col-span-2" />
          <div className="h-[360px] animate-pulse rounded-xl border border-border bg-surface-elevated" />
        </div>
        <div className="h-[320px] animate-pulse rounded-xl border border-border bg-surface-elevated" />
      </div>
    </div>
  );
}
