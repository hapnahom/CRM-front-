'use client';

import type { DashboardScope, LeaderboardRow } from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';
import { formatMoneyCompact } from './utils';
import { cn } from '@/lib/utils';

const MEDAL_COLORS = {
  1: {
    title: 'Gold',
    rim: '#C9A227',
    face: '#F5D76E',
    faceDark: '#E0B84A',
    ribbon: '#D4A017',
    number: '#7A5A00',
  },
  2: {
    title: 'Silver',
    rim: '#8B93A0',
    face: '#E5E7EB',
    faceDark: '#B0B7C3',
    ribbon: '#9CA3AF',
    number: '#374151',
  },
  3: {
    title: 'Bronze',
    rim: '#A65D2E',
    face: '#E0A06A',
    faceDark: '#B86B35',
    ribbon: '#B45309',
    number: '#5C2E0E',
  },
} as const;

function MedalIcon({
  rank,
  colors,
}: {
  rank: 1 | 2 | 3;
  colors: (typeof MEDAL_COLORS)[1 | 2 | 3];
}) {
  const id = `medal-${rank}`;
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-face`} x1="8" y1="6" x2="20" y2="24">
          <stop offset="0%" stopColor={colors.face} />
          <stop offset="100%" stopColor={colors.faceDark} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="6" y1="4" x2="22" y2="24">
          <stop offset="0%" stopColor={colors.face} />
          <stop offset="55%" stopColor={colors.rim} />
          <stop offset="100%" stopColor={colors.faceDark} />
        </linearGradient>
      </defs>
      {/* Ribbon */}
      <path d="M10 2 L12.5 9 L8 8.5 Z" fill={colors.ribbon} opacity="0.9" />
      <path d="M18 2 L16 9 L20 8.5 Z" fill={colors.ribbon} />
      {/* Medallion rim */}
      <circle cx="14" cy="16" r="10" fill={`url(#${id}-rim)`} />
      {/* Medallion face */}
      <circle cx="14" cy="16" r="7.5" fill={`url(#${id}-face)`} />
      {/* Inner ring */}
      <circle
        cx="14"
        cy="16"
        r="6.2"
        fill="none"
        stroke={colors.rim}
        strokeWidth="0.75"
        opacity="0.55"
      />
      {/* Rank number */}
      <text
        x="14"
        y="16.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.number}
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    const colors = MEDAL_COLORS[rank];
    return (
      <span
        className="inline-flex size-7 items-center justify-center"
        title={colors.title}
      >
        <MedalIcon rank={rank} colors={colors} />
      </span>
    );
  }

  return (
    <span className="inline-flex size-7 items-center justify-center text-xs font-medium text-muted-foreground">
      {rank}
    </span>
  );
}

export function TeamLeaderboard({
  rows,
  scope,
  currency,
}: {
  rows: LeaderboardRow[];
  scope: DashboardScope;
  currency: string;
}) {
  return (
    <DashboardCard className="h-full">
      <SectionTitle>
        {scope === 'individual' ? 'Seller Leaderboard' : 'Team Leaderboard'}
      </SectionTitle>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-[#718096]">
              <th className="pb-2 pr-2 font-semibold">#</th>
              <th className="pb-2 pr-2 font-semibold">
                {scope === 'individual' ? 'Seller' : 'Team'}
              </th>
              <th className="pb-2 pr-2 font-semibold">Closed</th>
              <th className="pb-2 pr-2 font-semibold">Target</th>
              <th className="pb-2 font-semibold">Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No leaderboard data yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.rank}-${row.teamName}`}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-2.5 pr-2">
                    <RankMedal rank={row.rank} />
                  </td>
                  <td className="py-2.5 pr-2 font-medium text-foreground">
                    {row.teamName}
                  </td>
                  <td className="py-2.5 pr-2 text-muted-foreground">
                    {formatMoneyCompact(row.closedRevenue, currency)}
                  </td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        row.targetAchievement >= 100
                          ? 'text-emerald-600'
                          : row.targetAchievement >= 80
                            ? 'text-amber-700'
                            : 'text-rose-600',
                      )}
                    >
                      {row.targetAchievement}%
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {row.winRate}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
