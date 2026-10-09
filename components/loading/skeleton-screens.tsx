import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
        'rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabbedModulePageSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border bg-surface-card px-6 py-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((unused, i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-surface-page p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function KpiCardsRowSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        count === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }, (unused, index) => (
        <Skeleton key={index} className="h-[72px] rounded-lg" />
      ))}
    </div>
  );
}

export function PipelineToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Skeleton className="h-[31.5px] w-full max-w-[320px] rounded-md" />
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-[31.5px] w-[140px] rounded-md" />
        <Skeleton className="h-[31.5px] w-[100px] rounded-md" />
      </div>
    </div>
  );
}

function PeriodCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: 4 }, (unused, index) => (
        <div
          key={index}
          className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface-elevated/60 px-3 py-2.5"
        >
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

function PipelineSidebarSkeleton() {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[20%] lg:min-w-[220px] lg:max-w-[320px] lg:flex-none">
      <div className="flex h-[min(50vh,480px)] w-full shrink-0 flex-col rounded-2xl border border-border bg-surface-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
        <div className="flex h-full min-h-0 flex-col gap-1 p-3 sm:p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="mt-1 space-y-2">
            {Array.from({ length: 5 }, (unused, index) => (
              <div
                key={index}
                className="space-y-1.5 rounded-lg border border-border px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex h-[18rem] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex h-full min-h-0 flex-col gap-1 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="mt-1 space-y-1.5">
            {Array.from({ length: 3 }, (unused, index) => (
              <div
                key={index}
                className="space-y-1.5 rounded-lg border border-border px-2.5 py-2"
              >
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PipelineKanbanSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-[10.5px] overflow-hidden px-3 pb-4 sm:px-5">
      {Array.from({ length: columns }, (unused, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-1 basis-0 flex-col rounded-lg border border-border bg-surface-card/50 p-3"
        >
          <Skeleton className="h-4 w-28 max-w-full" />
          <Skeleton className="mt-1.5 h-3 w-16 max-w-full" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-[88px] w-full rounded-lg" />
            <Skeleton className="h-[88px] w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelinePageContentSkeleton({
  view = 'kanban',
}: {
  view?: 'kanban' | 'list';
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-hidden p-[10.5px] sm:p-[17.5px]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:w-[80%] lg:flex-[4]">
          <PeriodCardsSkeleton />
          <PipelineToolbarSkeleton />
          {view === 'kanban' ? (
            <div className="min-w-0 overflow-hidden">
              <PipelineKanbanSkeleton />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b border-border">
                    {Array.from({ length: 6 }, (unused, index) => (
                      <th key={index} className="h-10 px-4 text-left">
                        <Skeleton className="h-3 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <TableRowsSkeleton rows={8} columns={6} />
              </table>
            </div>
          )}
        </div>
        <PipelineSidebarSkeleton />
      </div>
    </div>
  );
}

/** Sales Hub Pipeline tab — same skeleton for chunk load and data load. */
export function PipelineDashboardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <main className="w-full space-y-5 overflow-hidden p-4 sm:p-6">
        <section className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3">
          <SkeletonCard className="min-h-[122px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-3 w-28" />
          </SkeletonCard>

          <SkeletonCard className="min-h-[122px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((cell) => (
                <Skeleton key={cell} className="h-12 rounded-md" />
              ))}
            </div>
          </SkeletonCard>

          <SkeletonCard className="min-h-[122px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((cell) => (
                <Skeleton key={cell} className="h-12 rounded-md" />
              ))}
            </div>
          </SkeletonCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-3 xl:items-stretch">
          <SkeletonCard className="flex h-[25rem] flex-col overflow-hidden p-5 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-7 overflow-hidden pt-3 xl:grid-cols-[240px_minmax(0,1fr)]">
              <Skeleton className="mx-auto size-[220px] max-w-full rounded-full" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {Array.from({ length: 6 }, (unused, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-lg border border-border bg-surface-elevated px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-2.5 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SkeletonCard>

          <SkeletonCard className="flex h-[25rem] flex-col overflow-hidden p-5">
            <Skeleton className="h-4 w-48" />
            <div className="flex min-h-0 flex-1 flex-col items-center space-y-6 overflow-hidden pt-10">
              <Skeleton className="size-[108px] rounded-full" />
              <div className="grid w-full grid-cols-3 gap-3 border-y border-border py-4 text-center">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="mx-auto h-2.5 w-12" />
                    <Skeleton className="mx-auto h-3.5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </SkeletonCard>
        </section>

        <section>
          <SkeletonCard className="overflow-hidden p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (unused, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                    <Skeleton className="h-3 w-28 max-w-full" />
                  </div>
                  <Skeleton className="hidden h-3 w-16 sm:block" />
                  <Skeleton className="hidden h-3 w-20 md:block" />
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </section>
      </main>
    </div>
  );
}

/** Generic bordered data table — no horizontal scrollbar while loading. */
export function DataTableSkeleton({
  rows = 8,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface-card',
        className,
      )}
    >
      <table className="w-full table-fixed caption-bottom text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated">
            {Array.from({ length: columns }, (unused, index) => (
              <th key={index} className="h-10 px-4 text-left">
                <Skeleton className="h-3 w-20 max-w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <TableRowsSkeleton rows={rows} columns={columns} />
      </table>
    </div>
  );
}

export function MarketingDashboardSkeleton() {
  return (
    <div className="space-y-4 overflow-hidden p-4 sm:p-6">
      <KpiCardsRowSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 overflow-hidden lg:grid-cols-12">
        <SkeletonCard className="h-72 overflow-hidden p-5 lg:col-span-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mx-auto mt-8 size-[180px] rounded-full" />
        </SkeletonCard>
        <SkeletonCard className="h-72 overflow-hidden p-5 lg:col-span-7">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1 h-3 w-64 max-w-full" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }, (unused, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard className="overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (unused, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (unused, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

export function MarketingDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-3 border-b border-border bg-surface-card px-4 py-4 sm:px-6">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <KpiCardsRowSkeleton count={4} className="pt-2" />
      </div>
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 3 }, (unused, index) => (
            <Skeleton key={index} className="h-9 w-28 rounded-md" />
          ))}
        </div>
        <DataTableSkeleton rows={6} columns={5} />
      </div>
    </div>
  );
}

export function AssetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (unused, index) => (
        <SkeletonCard key={index} className="overflow-hidden p-0">
          <Skeleton className="aspect-[16/10] w-full rounded-none rounded-t-xl" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function CustomersDashboardSkeleton() {
  return (
    <div className="space-y-4 overflow-hidden p-[10.5px] sm:p-[17.5px]">
      <KpiCardsRowSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 overflow-hidden xl:grid-cols-2">
        <SkeletonCard className="h-64 overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="mx-auto size-[160px] rounded-full" />
        </SkeletonCard>
        <SkeletonCard className="h-64 overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-44" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (unused, index) => (
              <Skeleton key={index} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </SkeletonCard>
      </div>
      <SkeletonCard className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          <Skeleton className="h-[31.5px] w-full max-w-xs rounded-md" />
          <Skeleton className="h-[31.5px] w-36 rounded-md" />
          <Skeleton className="h-[31.5px] w-36 rounded-md" />
        </div>
        <DataTableSkeleton
          rows={8}
          columns={7}
          className="rounded-none border-0"
        />
      </SkeletonCard>
    </div>
  );
}

export function PartnersTableSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Skeleton className="h-[31.5px] w-full max-w-xs rounded-md" />
        <Skeleton className="h-[31.5px] w-32 rounded-md" />
        <Skeleton className="ml-auto h-[31.5px] w-32 rounded-md" />
      </div>
      <DataTableSkeleton rows={8} columns={6} />
    </div>
  );
}

export function PRMOverviewSkeleton() {
  return (
    <div className="flex-1 space-y-5 overflow-hidden bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (unused, index) => (
          <Skeleton key={index} className="h-[100px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard className="overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-32" />
          <DataTableSkeleton rows={5} columns={3} className="border-0" />
        </SkeletonCard>
        <SkeletonCard className="overflow-hidden p-5">
          <Skeleton className="mb-4 h-4 w-36" />
          <DataTableSkeleton rows={5} columns={3} className="border-0" />
        </SkeletonCard>
      </div>
    </div>
  );
}

export function NotificationsInboxSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (unused, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (unused, index) => (
          <SkeletonCard key={index} className="overflow-hidden p-4">
            <div className="flex gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-full max-w-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

export function EmailListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-2 border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: rows }, (unused, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border px-4 py-3"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-32 max-w-[40%]" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-3 w-full max-w-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarMonthSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {Array.from({ length: 7 }, (unused, index) => (
          <div key={`h-${index}`} className="bg-surface-elevated px-2 py-2">
            <Skeleton className="mx-auto h-3 w-8" />
          </div>
        ))}
        {Array.from({ length: 35 }, (unused, index) => (
          <div
            key={index}
            className="min-h-[4.5rem] space-y-1.5 bg-surface-card p-2"
          >
            <Skeleton className="h-3 w-6" />
            {index % 4 === 0 ? (
              <Skeleton className="h-5 w-full rounded" />
            ) : null}
            {index % 7 === 2 ? (
              <Skeleton className="h-5 w-3/4 rounded" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableRowsSkeleton({
  rows = 8,
  columns = 7,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (unused, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (unusedCol, colIndex) => (
            <TableCell key={colIndex} className="px-4 py-3">
              <Skeleton
                className={cn(
                  'h-4',
                  colIndex === 0
                    ? 'w-40'
                    : colIndex === columns - 1
                      ? 'w-8'
                      : 'w-24',
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function UserManagementTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full max-w-xs rounded-md" />
        <Skeleton className="h-9 w-[140px] rounded-md" />
        <Skeleton className="h-9 w-[140px] rounded-md" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <KpiCardsRowSkeleton />
      <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
        <TableRowsSkeleton rows={8} columns={7} />
      </div>
    </div>
  );
}

export function UserTableBodySkeleton() {
  return <TableRowsSkeleton rows={8} columns={7} />;
}

export function RolesPermissionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1.5">
          {Array.from({ length: 5 }, (unused, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-lg" />
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
          <div className="border-b border-border px-5 py-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-3 w-48" />
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }, (unused, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RolePermissionsPanelSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="border-b border-border px-5 py-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-3 w-48" />
      </div>
      <div className="border-b border-border bg-surface-elevated px-4 py-2.5">
        <div className="flex gap-8">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }, (unused, index) => (
          <div
            key={index}
            className="grid grid-cols-[220px_1fr] gap-4 px-4 py-3"
          >
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
              {Array.from({ length: 4 }, (unused, chipIndex) => (
                <Skeleton key={chipIndex} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgStructureSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }, (unused, index) => (
            <Skeleton key={index} className="h-16 w-40 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 3 }, (unused, index) => (
            <Skeleton key={index} className="h-4 w-24" />
          ))}
        </div>
      </div>
      <Skeleton className="min-h-[360px] flex-1 rounded-lg" />
    </div>
  );
}

export function DetailPageHeaderSkeleton() {
  return (
    <div className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border bg-surface-card px-6">
      <Skeleton className="h-7 w-16 rounded-md" />
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="ml-1 h-5 w-20 rounded-full" />
    </div>
  );
}

export function DetailPageTabsSkeleton() {
  return (
    <div className="flex-1 overflow-auto bg-surface-card p-3 sm:p-5">
      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 3 }, (unused, index) => (
            <Skeleton key={index} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }, (unused, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DetailPageHeaderSkeleton />
      <DetailPageTabsSkeleton />
    </div>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card">
      <div className="flex-1 overflow-auto bg-[#f8f9fb] p-4">
        <div className="rounded-lg border border-border bg-surface-card p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 10 }, (unused, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {Array.from({ length: 5 }, (unused, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pb-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsSplitPanelSkeleton() {
  return (
    <div className="flex gap-5">
      <div className="flex w-[240px] shrink-0 flex-col gap-1.5">
        {Array.from({ length: 6 }, (unused, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-lg" />
        ))}
        <Skeleton className="mt-1 h-10 w-full rounded-lg border border-dashed" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-5 p-5">
          {Array.from({ length: 4 }, (unused, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 7 }, (unused, dotIndex) => (
                <Skeleton key={dotIndex} className="h-5 w-5 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormModalSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: fields }, (unused, index) => (
        <div key={index} className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ComboboxListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: rows }, (unused, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-md px-3 py-2.5"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsListSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-lg border border-border bg-surface-card">
      {Array.from({ length: rows }, (unused, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SettingsListTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-card p-4">
      {Array.from({ length: rows }, (unused, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttachedFilesSkeleton() {
  return (
    <div className="ml-2 mr-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }, (unused, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function FilterModalSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {Array.from({ length: 5 }, (unused, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FiscalYearSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
