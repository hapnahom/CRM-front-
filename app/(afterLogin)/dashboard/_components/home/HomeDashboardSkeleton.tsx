'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const KPI_SLOTS = Array.from({ length: 6 }, (unused, index) => index);
const MIDDLE_SLOTS = Array.from({ length: 3 }, (unused, index) => index);

export const HomeDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {KPI_SLOTS.map((slot) => (
          <div
            key={slot}
            className="rounded-xl border border-border bg-white p-4 sm:p-5"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {MIDDLE_SLOTS.map((slot) => (
          <div
            key={slot}
            className="rounded-xl border border-border bg-white p-4 sm:p-5"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-4 h-48 w-full" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:h-[44rem]">
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5 lg:col-span-7">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-[36rem] w-full" />
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden lg:col-span-5">
          <div className="shrink-0 rounded-xl border border-border bg-white p-4 sm:p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
          <div className="min-h-0 flex-1 rounded-xl border border-border bg-white p-4 sm:p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-full min-h-[12rem] w-full" />
          </div>
        </div>
      </section>
    </div>
  );
};
