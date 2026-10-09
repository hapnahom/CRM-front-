'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HomeRevenueVsTarget, PeriodFilter } from './types';
import {
  formatCompactNumber,
  formatMoney,
  HOME_ACHIEVED_COLOR,
  HOME_TARGET_COLOR,
} from './utils';

const PERIODS: Array<{ key: PeriodFilter; label: string }> = [
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annually', label: 'Annually' },
];

interface RevenueVsTargetCardProps {
  data: HomeRevenueVsTarget;
  currency: string;
  title?: string;
}

export const RevenueVsTargetCard: React.FC<RevenueVsTargetCardProps> = ({
  data,
  currency,
  title = 'Revenue vs Target',
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('quarterly');

  const currentPoints = data?.[period]?.length
    ? data[period]
    : (data?.quarterly ?? []);

  const highestValue = Math.max(
    ...currentPoints.flatMap((p) => [p.target, p.achieved]),
    1_000_000,
  );
  const maxScale = Math.ceil(highestValue / 1_000_000) * 1_000_000;

  const yLabels = [
    maxScale,
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0,
  ];

  return (
    <div className="flex h-full min-h-[300px] flex-col rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="min-w-0 truncate text-[14px] font-semibold text-foreground">
          {title}
        </h2>

        <Select
          value={period}
          onValueChange={(value) => setPeriod(value as PeriodFilter)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Revenue period"
            className="box-border h-8 min-h-8 max-h-8 w-[108px] shrink-0 border-border bg-white px-2 py-0 text-[11px] leading-none data-[size=default]:h-8 data-[size=sm]:h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIODS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: HOME_TARGET_COLOR }}
          />{' '}
          Target
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: HOME_ACHIEVED_COLOR }}
          />{' '}
          Achieved
        </span>
      </div>

      <div className="flex flex-1 items-end gap-2 pt-4">
        <div className="flex h-36 flex-col justify-between text-right text-[10px] text-muted-foreground">
          {yLabels.map((value) => (
            <span key={value}>{formatCompactNumber(value)}</span>
          ))}
        </div>

        <div className="flex h-36 flex-1 items-end justify-around border-b border-border">
          {currentPoints.length === 0 ? (
            <span className="self-center text-[11px] text-muted-foreground">
              No revenue data available.
            </span>
          ) : (
            currentPoints.map((item) => {
              const targetHeight = Math.min(
                100,
                Math.max(5, (item.target / maxScale) * 100),
              );
              const achievedHeight = Math.min(
                100,
                Math.max(5, (item.achieved / maxScale) * 100),
              );

              return (
                <div
                  key={item.label}
                  className="flex h-full flex-col items-center justify-end gap-1.5"
                >
                  <div className="flex h-32 items-end gap-1">
                    <div
                      className="w-3.5 rounded-t transition-all hover:opacity-90"
                      style={{
                        height: `${targetHeight}%`,
                        backgroundColor: HOME_TARGET_COLOR,
                      }}
                      title={`Target: ${formatMoney(item.target, currency)}`}
                    />
                    <div
                      className="w-3.5 rounded-t transition-all hover:opacity-90"
                      style={{
                        height: `${achievedHeight}%`,
                        backgroundColor: HOME_ACHIEVED_COLOR,
                      }}
                      title={`Achieved: ${formatMoney(item.achieved, currency)}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
