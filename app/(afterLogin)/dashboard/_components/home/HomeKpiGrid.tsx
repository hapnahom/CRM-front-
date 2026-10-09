'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const LG_COLS: Record<number, string> = {
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-7',
};

interface HomeKpiGridProps {
  showSdConversion: boolean;
  /** KPI cards excluding optional SD Conversion. Default 6. */
  baseCount?: 5 | 6;
  children: React.ReactNode;
}

export function HomeKpiGrid({
  showSdConversion,
  baseCount = 6,
  children,
}: HomeKpiGridProps) {
  const cols = showSdConversion ? baseCount + 1 : baseCount;

  return (
    <section
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-3',
        LG_COLS[cols] ?? 'lg:grid-cols-6',
      )}
    >
      {children}
    </section>
  );
}
