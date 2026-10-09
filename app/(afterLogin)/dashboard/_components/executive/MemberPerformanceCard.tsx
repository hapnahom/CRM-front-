'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MemberPerformance } from './types';
import { CardFooter, DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact } from './utils';

export function MemberPerformanceCard({
  data,
  currency,
}: {
  data?: MemberPerformance;
  currency: string;
}) {
  const rows = data?.rows ?? [];

  return (
    <DashboardCard className="flex h-full min-h-[320px] flex-col">
      <SectionTitle
        action={
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
            {data?.leadCount ?? 0} Members
          </span>
        }
      >
        Top Performers
      </SectionTitle>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Users size={18} strokeWidth={2.25} />
          </span>
          <p className="m-0 mt-3 text-sm font-medium text-foreground">
            No assigned pipeline yet.
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Members with open deals will appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-0">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <Avatar className="size-7 shrink-0">
                {row.avatarUrl ? (
                  <AvatarImage src={row.avatarUrl} alt={row.name} />
                ) : null}
                <AvatarFallback className="bg-brand-muted text-[10px] font-bold text-brand">
                  {row.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-medium text-foreground">
                  {row.name}
                </p>
                <p className="m-0 truncate text-xs text-muted-foreground">
                  {row.subtitle}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="m-0 text-sm font-medium text-foreground">
                  {formatMoneyCompact(row.pipelineValue, currency)}
                </p>
                <p className="m-0 text-xs text-muted-foreground">
                  {row.attainedPercent}% Attained
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CardFooter
        label="Pipeline Realization"
        value={`${data?.overallAttainment ?? 0}% Overall Attainment`}
        valueClassName="text-brand"
      />
    </DashboardCard>
  );
}
