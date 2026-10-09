'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
  DoughnutController,
} from 'chart.js';
import { tokens } from '@/lib/design-tokens';
import type {
  ForecastActualDatum,
  MarketingChannel,
  MonthlyRevenueDatum,
  PipelineStageDatum,
} from './types';
import { DashboardCard, SectionTitle } from './DashboardCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarController,
  LineController,
  DoughnutController,
);

function ChartCanvas({
  build,
  deps,
}: {
  build: (canvas: HTMLCanvasElement) => AnyChart;
  deps: unknown[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<AnyChart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = build(canvasRef.current);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return <canvas ref={canvasRef} />;
}

// Chart.js generics vary by chart type; callers return concrete instances.
type AnyChart = ChartJS<any, any, any>;

export function PipelineByStageChart({ data }: { data: PipelineStageDatum[] }) {
  return (
    <DashboardCard className="h-full min-h-[320px]">
      <SectionTitle>Pipeline by Stage</SectionTitle>
      <div className="h-[250px]">
        <ChartCanvas
          deps={[data]}
          build={(canvas) =>
            new ChartJS(canvas, {
              type: 'bar',
              data: {
                labels: data.map((d) => d.stage),
                datasets: [
                  {
                    type: 'bar',
                    label: 'Opportunity Count',
                    data: data.map((d) => d.count),
                    backgroundColor: tokens.color.brand,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2,
                  },
                  {
                    type: 'line',
                    label: 'Pipeline Value (M)',
                    data: data.map((d) => Number(d.value.toFixed(2))),
                    borderColor: tokens.color.textMuted,
                    backgroundColor: tokens.color.textMuted,
                    tension: 0.35,
                    yAxisID: 'y1',
                    order: 1,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 11 } },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxRotation: 45 },
                  },
                  y: {
                    position: 'left',
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 10 } },
                    title: { display: true, text: 'Count', font: { size: 11 } },
                  },
                  y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { font: { size: 10 } },
                    title: {
                      display: true,
                      text: 'Value (M)',
                      font: { size: 11 },
                    },
                  },
                },
              },
            })
          }
        />
      </div>
    </DashboardCard>
  );
}

export function RevenueVsTargetChart({
  data,
}: {
  data: MonthlyRevenueDatum[];
}) {
  return (
    <DashboardCard className="h-full min-h-[320px]">
      <SectionTitle>Revenue vs Target</SectionTitle>
      <div className="h-[250px]">
        <ChartCanvas
          deps={[data]}
          build={(canvas) =>
            new ChartJS(canvas, {
              type: 'bar',
              data: {
                labels: data.map((d) => d.month),
                datasets: [
                  {
                    type: 'bar',
                    label: 'Revenue',
                    data: data.map((d) => Number(d.revenue.toFixed(2))),
                    backgroundColor: tokens.color.brand,
                    borderRadius: 4,
                    order: 2,
                  },
                  {
                    type: 'line',
                    label: 'Target',
                    data: data.map((d) => Number(d.target.toFixed(2))),
                    borderColor: tokens.color.textMuted,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0.2,
                    order: 1,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 11 } },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } },
                  },
                  y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 10 } },
                    title: {
                      display: true,
                      text: 'Amount (M)',
                      font: { size: 11 },
                    },
                  },
                },
              },
            })
          }
        />
      </div>
    </DashboardCard>
  );
}

export function ForecastVsActualChart({
  data,
}: {
  data: ForecastActualDatum[];
}) {
  return (
    <DashboardCard className="h-full min-h-[320px]">
      <SectionTitle>Forecast vs Actual Revenue</SectionTitle>
      <div className="h-[250px]">
        <ChartCanvas
          deps={[data]}
          build={(canvas) =>
            new ChartJS(canvas, {
              type: 'line',
              data: {
                labels: data.map((d) => d.month),
                datasets: [
                  {
                    label: 'Forecast',
                    data: data.map((d) => Number(d.forecast.toFixed(2))),
                    borderColor: tokens.color.textMuted,
                    backgroundColor: 'rgba(107, 114, 128, 0.12)',
                    fill: false,
                    tension: 0.35,
                  },
                  {
                    label: 'Actual',
                    data: data.map((d) => Number(d.actual.toFixed(2))),
                    borderColor: tokens.color.brand,
                    backgroundColor: 'rgba(237, 105, 37, 0.12)',
                    fill: false,
                    tension: 0.35,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 11 } },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } },
                  },
                  y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { font: { size: 10 } },
                    title: {
                      display: true,
                      text: 'Amount (M)',
                      font: { size: 11 },
                    },
                  },
                },
              },
            })
          }
        />
      </div>
    </DashboardCard>
  );
}

export function MarketingChannelDonut({
  channels,
}: {
  channels: MarketingChannel[];
}) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div className="h-[140px] w-[140px] shrink-0">
        <ChartCanvas
          deps={[channels]}
          build={(canvas) =>
            new ChartJS(canvas, {
              type: 'doughnut',
              data: {
                labels: channels.map((c) => c.name),
                datasets: [
                  {
                    data: channels.map((c) => c.value),
                    backgroundColor: channels.map((c) => c.color),
                    borderWidth: 0,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: { legend: { display: false } },
              },
            } as any)
          }
        />
      </div>
      <ul className="m-0 w-full list-none space-y-1.5 p-0">
        {channels.map((channel) => (
          <li
            key={channel.name}
            className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: channel.color }}
              />
              <span className="truncate">{channel.name}</span>
            </span>
            <span className="font-medium text-foreground">
              {channel.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DepartmentDonut({
  units,
  totalLabel,
}: {
  units: { name: string; percent: number; color: string }[];
  totalLabel: string;
}) {
  const slices = units.length
    ? units
    : [{ name: 'None', percent: 100, color: '#e5e7eb' }];

  return (
    <div className="relative h-[140px] w-[140px] shrink-0">
      <ChartCanvas
        deps={[slices]}
        build={(canvas) =>
          new ChartJS(canvas, {
            type: 'doughnut',
            data: {
              labels: slices.map((s) => s.name),
              datasets: [
                {
                  data: slices.map((s) => Math.max(s.percent, 0.1)),
                  backgroundColor: slices.map((s) => s.color),
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '72%',
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
              },
            },
          } as any)
        }
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Total
        </span>
        <span className="text-sm font-bold leading-4 text-foreground">
          {totalLabel}
        </span>
      </div>
    </div>
  );
}
