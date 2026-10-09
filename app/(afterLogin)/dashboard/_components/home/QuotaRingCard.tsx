'use client';

import React from 'react';
import type { HomeQuotaAttainment, HomeQuotaYtd } from './types';
import { formatTargetPercent } from '@/lib/target-format';
import { formatMoney, HOME_ACHIEVED_COLOR, HOME_TARGET_COLOR } from './utils';

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface QuotaRingCardProps {
  quota: HomeQuotaYtd;
  quotaAttainment?: HomeQuotaAttainment | null;
  currency: string;
  /** Label for the third summary cell — "Remaining" for executives, "Pacing" for quota-owning views. */
  thirdCell?: 'remaining' | 'pacing';
  periodSelector?: React.ReactNode;
  sessionId?: string;
}

export const QuotaRingCard: React.FC<QuotaRingCardProps> = ({
  quota,
  quotaAttainment,
  currency,
  thirdCell = 'remaining',
  periodSelector,
  sessionId,
}) => {
  const activeQuota =
    quotaAttainment && sessionId && quotaAttainment.period
      ? quotaAttainment.period
      : (quotaAttainment?.annual ?? quota);

  const percent = Number.isFinite(activeQuota.percentAchieved)
    ? activeQuota.percentAchieved
    : 0;
  const arcLength = (Math.min(100, Math.max(0, percent)) / 100) * CIRCUMFERENCE;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="min-w-0 truncate text-[14px] font-semibold text-foreground">
          {activeQuota.title}
        </h2>

        {periodSelector}
      </div>

      <div className="flex justify-center pt-6">
        <div className="relative flex size-36 items-center justify-center">
          <svg
            width="144"
            height="144"
            viewBox="0 0 100 100"
            className="-rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={HOME_ACHIEVED_COLOR}
              strokeWidth="9"
              strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <strong className="text-2xl font-bold text-foreground">
              {formatTargetPercent(percent)}
            </strong>
            <span className="text-[10px] font-semibold uppercase text-emerald-600">
              {activeQuota.statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-2 rounded-lg bg-surface-elevated p-2.5 text-center text-xs">
        <div>
          <span className="block text-[10px] text-muted-foreground">
            Target
          </span>
          <strong
            className="font-semibold"
            style={{ color: HOME_TARGET_COLOR }}
          >
            {formatMoney(activeQuota.target, currency)}
          </strong>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground">
            Achieved
          </span>
          <strong
            className="font-semibold"
            style={{ color: HOME_ACHIEVED_COLOR }}
          >
            {formatMoney(activeQuota.achieved, currency)}
          </strong>
        </div>
        {thirdCell === 'pacing' ? (
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Pacing
            </span>
            <strong className="font-semibold text-emerald-600">
              {formatTargetPercent(percent)} Quota
            </strong>
          </div>
        ) : (
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Remaining
            </span>
            <strong className="font-semibold text-amber-600">
              {formatMoney(activeQuota.remaining, currency)}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};
