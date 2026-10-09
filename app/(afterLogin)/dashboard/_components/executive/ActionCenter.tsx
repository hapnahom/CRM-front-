'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ActionItem } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { severityBadgeClass } from './utils';

export function ActionCenter({ items }: { items: ActionItem[] }) {
  return (
    <DashboardCard className="h-full">
      <SectionTitle>Action Center</SectionTitle>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item) => {
          const content = (
            <span className="flex w-full items-center justify-between gap-3">
              <span className="min-w-0 text-sm text-foreground">
                {item.label}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${severityBadgeClass(
                    item.severity,
                  )}`}
                >
                  {item.count}
                </span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </span>
            </span>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex rounded-lg border border-border px-3 py-2.5 transition hover:bg-surface-elevated"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex rounded-lg border border-border px-3 py-2.5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
