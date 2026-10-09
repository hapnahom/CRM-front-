'use client';

import { pipelineEntityCountLabel } from '@/config/salesWorkflow';

import React from 'react';
import { cn } from '@/lib/utils';
import type { HomeTeamMember, TeamMemberStatus } from './types';
import { formatMoney } from './utils';

const STATUS_BADGE: Record<TeamMemberStatus, string> = {
  Exceeding: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Track': 'bg-brand-muted text-brand border-brand-border',
  Attention: 'bg-amber-50 text-amber-700 border-amber-200',
  Ramping: 'bg-sky-50 text-sky-700 border-sky-200',
};

const STATUS_BAR: Record<TeamMemberStatus, string> = {
  Exceeding: 'bg-emerald-500',
  'On Track': 'bg-brand',
  Attention: 'bg-amber-500',
  Ramping: 'bg-sky-500',
};

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

interface TeamMemberPerformanceCardProps {
  members: HomeTeamMember[];
  currency: string;
  title?: string;
}

export const TeamMemberPerformanceCard: React.FC<
  TeamMemberPerformanceCardProps
> = ({ members, currency, title = 'Team Member Performance' }) => {
  return (
    <article className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </span>
      </div>

      <div className="mt-2.5 space-y-2">
        {members.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">
            No team members to report on.
          </p>
        ) : (
          members.map((member) => {
            const pacing = Number.isFinite(member.quotaPacing)
              ? member.quotaPacing
              : 0;

            return (
              <div
                key={member.id}
                className="rounded-lg border border-border/50 bg-surface-elevated p-2 text-xs transition-all hover:bg-surface-hover/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-muted text-[10px] font-semibold text-brand">
                      {initialsOf(member.name)}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-xs font-semibold text-foreground">
                        {member.name}
                      </strong>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="whitespace-nowrap text-right">
                    <strong className="text-xs font-semibold text-foreground">
                      {formatMoney(member.pipeline, currency)}
                    </strong>
                    <span className="block text-[10px] text-muted-foreground">
                      {pipelineEntityCountLabel(
                        member.dealsCount,
                        member.leadsCount,
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          STATUS_BAR[member.status] ?? 'bg-brand',
                        )}
                        style={{
                          width: `${Math.min(100, Math.max(0, pacing))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="font-semibold text-foreground">
                      {Math.round(pacing)}%
                    </span>
                    <span
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[9.5px] font-medium',
                        STATUS_BADGE[member.status] ??
                          'bg-surface-elevated text-muted-foreground border-border',
                      )}
                    >
                      {member.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
};
