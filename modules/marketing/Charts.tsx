'use client';

import { useState } from 'react';
import { DashboardCard } from './ui-kit';
import { cn } from '@/lib/utils';

export interface ChannelMixItem {
  name: string;
  value: number;
  color: string;
  leads?: number;
  secondaryColor?: string;
}

export function LeadChannelPieChart({
  data = [],
  className,
}: {
  data?: ChannelMixItem[];
  className?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = data.map((item) => ({
    ...item,
    leads:
      typeof item.leads === 'number'
        ? item.leads
        : Math.round((item.value / 100) * 100),
  }));

  const totalLeads = chartData.reduce(
    (sum, item) => sum + (item.leads || 0),
    0,
  );
  const hasData = chartData.some(
    (item) => item.value > 0 || (item.leads || 0) > 0,
  );

  const cx = 100;
  const cy = 100;
  const R = 78;
  const r = 48;

  let cumulativeAngle = -Math.PI / 2;

  const slices = chartData.map((item, idx) => {
    const weight =
      totalLeads > 0
        ? (item.leads || 0) / totalLeads
        : item.value /
          Math.max(
            chartData.reduce((s, c) => s + c.value, 0),
            1,
          );
    const angle = Math.max(weight, 0) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy + r * Math.sin(endAngle);
    const x4 = cx + r * Math.cos(startAngle);
    const y4 = cy + r * Math.sin(startAngle);
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return { ...item, path, idx };
  });

  const activeItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <DashboardCard className={cn('bg-white p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-semibold text-foreground">
            Lead channel mix
          </h2>
          <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
            Attributed leads by activity channel
          </p>
        </div>
      </div>

      {!hasData ? (
        <p className="m-0 mt-4 text-[12px] text-muted-foreground">
          No channel attribution data yet. Create campaigns and activities to
          see the mix.
        </p>
      ) : (
        <div className="mt-5 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-center">
          <div className="relative flex size-[180px] shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="size-full overflow-visible drop-shadow-xs"
            >
              {slices.map((slice) => {
                const isHovered = hoveredIndex === slice.idx;
                return (
                  <path
                    key={slice.name}
                    d={slice.path}
                    fill={slice.color}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredIndex(slice.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={cn(
                      'cursor-pointer transition-all duration-200',
                      isHovered
                        ? 'opacity-100 brightness-110 drop-shadow-md filter'
                        : hoveredIndex !== null
                          ? 'opacity-40'
                          : 'opacity-95 hover:opacity-100',
                    )}
                    style={{
                      transformOrigin: '100px 100px',
                      transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      transition: 'transform 0.2s ease, opacity 0.2s ease',
                    }}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[22px] font-bold leading-none text-foreground tabular-nums">
                {activeItem ? activeItem.leads : totalLeads}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {activeItem ? activeItem.name : 'Total Leads'}
              </span>
            </div>
          </div>

          <div className="w-full flex-1 space-y-3">
            {chartData.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-all',
                    isHovered
                      ? 'bg-slate-50 ring-1 ring-border/80'
                      : 'hover:bg-slate-50/60',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-3 shrink-0 rounded-xs transition-transform"
                      style={{
                        backgroundColor: item.color,
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                    <span
                      className={cn(
                        'truncate text-[13px] font-medium',
                        isHovered
                          ? 'font-bold text-foreground'
                          : 'text-slate-700',
                      )}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[13px] font-semibold text-foreground">
                      {item.leads}
                    </span>
                    <span className="w-9 text-right text-[12px] font-semibold text-muted-foreground">
                      {item.value}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

/** Backward compatibility alias */
export const ChannelMixChart = LeadChannelPieChart;
