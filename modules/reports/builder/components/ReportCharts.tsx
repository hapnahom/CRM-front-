'use client';

import { tokens } from '@/lib/design-tokens';
import type { ReportChart, ReportChartSlice } from '../types';

/** Single-line legend text: Label · amount · share% */
export function formatSliceLegendLine(slice: ReportChartSlice): string {
  const amount = String(slice.amount ?? slice.value ?? '').trim();
  const hideShare =
    /\bdeal/i.test(amount) ||
    /remaining quota gap/i.test(slice.label) ||
    slice.share < 0;
  if (!amount) return slice.label;
  if (hideShare) return `${slice.label} · ${amount}`;
  return `${slice.label} · ${amount} · ${slice.share}%`;
}

/** One-row legend with colored dot — centered under the donut. */
function ChartSliceRow({ slice }: { slice: ReportChartSlice }) {
  return (
    <div className="flex items-start justify-center gap-1.5 py-0.5">
      <span
        className="mt-1 size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: slice.color }}
        aria-hidden
      />
      <p className="text-center text-[10px] font-medium leading-snug tabular-nums text-foreground">
        {formatSliceLegendLine(slice)}
      </p>
    </div>
  );
}

/** Compact SVG donut — sized for a 4-across row. */
function DonutSvg({ chart }: { chart: ReportChart }) {
  const size = 112;
  const cx = 56;
  const cy = 56;
  const radius = 42;
  const stroke = 14;
  const hole = 28;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const totalLines = (chart.totalLabel || '—').split('\n').filter(Boolean);

  if (chart.slices.length === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={chart.title}
        className="block"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={tokens.color.surfaceHover}
          strokeWidth={stroke}
        />
      </svg>
    );
  }

  const valueTotal =
    chart.slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0) || 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={chart.title}
      className="block"
    >
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {chart.slices.map((slice) => {
          const pct = (Math.max(0, slice.value) / valueTotal) * 100;
          const len = (pct / 100) * circumference;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={slice.id}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={hole} fill="#ffffff" />
      {totalLines.map((line, index) => {
        const isPrimary = index === 0;
        const y =
          cy + (index - (totalLines.length - 1) / 2) * (isPrimary ? 10 : 9);
        return (
          <text
            key={`${line}-${index}`}
            x={cx}
            y={y}
            textAnchor="middle"
            fill={isPrimary ? '#6b7280' : '#111827'}
            style={{
              fontSize: isPrimary ? 6.5 : index === 1 ? 9 : 7.5,
              fontWeight: isPrimary ? 600 : 700,
              letterSpacing: isPrimary ? '0.04em' : undefined,
            }}
          >
            {line}
          </text>
        );
      })}
    </svg>
  );
}

function PipelineStyleDonut({ chart }: { chart: ReportChart }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[11px] font-semibold leading-snug text-foreground">
          {chart.title}
        </h3>
        {chart.subtitle ? (
          <span className="shrink-0 rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-[#4b5563]">
            {chart.subtitle}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="shrink-0">
          <DonutSvg chart={chart} />
        </div>

        <div className="flex w-full min-w-0 flex-col items-center space-y-0.5">
          {chart.slices.map((slice) => (
            <ChartSliceRow key={slice.id} slice={slice} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sales overview: all charts on one row (legend under each donut). */
export function ReportChartsGrid({ charts }: { charts: ReportChart[] }) {
  if (charts.length === 0) return null;

  const unique: ReportChart[] = [];
  const seen = new Set<string>();
  for (const chart of charts) {
    const key = chart.id || chart.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(chart);
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {unique.map((chart) => (
        <PipelineStyleDonut key={chart.id} chart={chart} />
      ))}
    </div>
  );
}
