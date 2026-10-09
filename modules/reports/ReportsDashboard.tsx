'use client';

import { useMemo, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  Layers3,
  Target,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dealUiLabel,
  isLeadsEnabled,
  pipelineRecordKindLabel,
} from '@/config/salesWorkflow';
import { tokens } from '@/lib/design-tokens';
import { stageBadgeStyles } from '@/lib/stage-presets';
import {
  sortHighValueRecords,
  type RecordKindFilter,
  type ReportCurrency,
  type ReportHealthSlice,
  type ReportPeriodId,
  type ReportPipelineScope,
  type ReportRecord,
  type ReportSnapshot,
  type ReportStageInsight,
  buildReportSnapshot,
} from './mock-data';

type CardProps = {
  children: ReactNode;
  className?: string;
};

function DashboardCard({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function TrendChip({
  value,
  positive,
  suffix = 'vs prior period',
}: {
  value: string;
  positive: boolean;
  suffix?: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5 text-[11px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-semibold',
          positive ? 'text-success' : 'text-error',
        )}
      >
        {positive ? (
          <ArrowUpRight size={12} aria-hidden="true" />
        ) : (
          <ArrowDownRight size={12} aria-hidden="true" />
        )}
        {value}
      </span>
      <span className="truncate text-muted-foreground">{suffix}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <DashboardCard className="min-h-[118px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-[22px] font-bold leading-none tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
          {icon}
        </span>
      </div>
      {children}
    </DashboardCard>
  );
}

function TargetRing({ value, color }: { value: number; color: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const status =
    value >= 80 ? 'On track' : value >= 60 ? 'Needs focus' : 'Behind pace';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex size-36 items-center justify-center">
        <svg
          viewBox="0 0 140 140"
          className="size-36 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={tokens.color.surfaceHover}
            strokeWidth="10"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-[28px] font-bold leading-none tabular-nums text-foreground">
            {value}%
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Achieved
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{status}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Fiscal target progress for the selected period
      </p>
    </div>
  );
}

function PipelineDonut({
  stages,
  totalLabel,
}: {
  stages: ReportStageInsight[];
  totalLabel: string;
}) {
  let cursor = 0;
  const stops = stages
    .map((stage) => {
      const start = cursor;
      cursor += stage.share;
      return `${stage.color} ${start}% ${cursor}%`;
    })
    .join(', ');

  return (
    <div className="grid min-h-[280px] grid-cols-1 items-center gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
      <div className="mx-auto">
        <div
          role="img"
          aria-label="Pipeline composition by stage"
          className="relative flex size-[190px] items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="absolute inset-[22px] rounded-full bg-white shadow-inner" />
          <div className="relative z-10 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pipeline
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {totalLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="truncate text-[12px] font-medium text-foreground">
                  {stage.label}
                </span>
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {stage.share}%
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {stage.amount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stage.count} records
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthBar({ slices }: { slices: ReportHealthSlice[] }) {
  return (
    <div className="space-y-4">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-surface-elevated"
        role="img"
        aria-label="Pipeline health distribution"
      >
        {slices.map((slice) => (
          <div
            key={slice.id}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${slice.share}%`,
              backgroundColor: slice.color,
            }}
            title={`${slice.label}: ${slice.share}%`}
          />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {slices.map((slice) => (
          <div
            key={slice.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span className="flex items-center gap-2 text-[12px] text-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              {slice.count} · {slice.share}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrendChart({
  points,
}: {
  points: ReportSnapshot['monthlyTrend'];
}) {
  const max = Math.max(...points.map((point) => point.achievedPercent), 1);

  return (
    <div className="flex h-[180px] items-end gap-3">
      {points.map((point) => {
        const height = Math.max(12, (point.achievedPercent / max) * 100);
        return (
          <div
            key={point.id}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-[10px] font-semibold tabular-nums text-foreground">
              {point.achievedPercent}%
            </span>
            <div className="flex h-[120px] w-full items-end justify-center">
              <div
                className="w-full max-w-[36px] rounded-t-md bg-brand/85 transition-all"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.pipelineValue}`}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConversionFunnel({ steps }: { steps: ReportSnapshot['funnel'] }) {
  const max = steps[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const width = Math.max(28, (step.count / max) * 100);
        return (
          <div key={step.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-foreground">{step.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {step.count.toLocaleString()}
                {step.conversionFromPrev != null
                  ? ` · ${step.conversionFromPrev}%`
                  : ''}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: step.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordStatus({ status }: { status: ReportRecord['status'] }) {
  const config: Record<
    ReportRecord['status'],
    { label: string; className: string }
  > = {
    healthy: { label: 'Healthy', className: 'bg-emerald-50 text-success' },
    attention: { label: 'Attention', className: 'bg-amber-50 text-amber-700' },
    'at-risk': { label: 'At risk', className: 'bg-rose-50 text-error' },
    won: { label: 'Won', className: 'bg-emerald-50 text-success' },
    lost: { label: 'Lost', className: 'bg-rose-50 text-error' },
    expired: { label: 'Expired', className: 'bg-rose-50 text-error' },
  };
  const item = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold',
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

function resolveStageColor(
  stageLabel: string,
  stages: ReportStageInsight[],
): string {
  const normalized = stageLabel.trim().toLowerCase();
  const exact = stages.find(
    (stage) => stage.label.toLowerCase() === normalized,
  );
  if (exact) return exact.color;

  if (/new/.test(normalized)) return tokens.color.purple;
  if (/qualified/.test(normalized)) return tokens.color.accentBlue;
  if (/propos|bid|solution/.test(normalized)) return tokens.color.brand;
  if (/negotiat/.test(normalized)) return tokens.color.warning;
  if (/won/.test(normalized)) return tokens.color.success;
  if (/lost|expired/.test(normalized)) return tokens.color.error;
  return tokens.color.brand;
}

function RecordStage({
  stage,
  stages,
}: {
  stage: string;
  stages: ReportStageInsight[];
}) {
  const color = resolveStageColor(stage, stages);
  const badge = stageBadgeStyles(color);

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium"
      style={badge}
    >
      {stage}
    </span>
  );
}

function HighValueTable({
  records,
  stages,
  kindFilter,
  onKindFilterChange,
}: {
  records: ReportRecord[];
  stages: ReportStageInsight[];
  kindFilter: RecordKindFilter;
  onKindFilterChange: (value: RecordKindFilter) => void;
}) {
  const ordered = useMemo(() => sortHighValueRecords(records), [records]);

  const filters: { id: RecordKindFilter; label: string }[] = [
    { id: 'all', label: 'All records' },
    { id: 'deal', label: dealUiLabel({ plural: true }) },
    ...(isLeadsEnabled() ? [{ id: 'lead' as const, label: 'Leads' }] : []),
  ];

  return (
    <DashboardCard className="p-5">
      <SectionHeader
        title={
          isLeadsEnabled()
            ? 'High-value leads & deals'
            : `High-value ${dealUiLabel({ plural: true, lowercase: true })}`
        }
        description="Union of highest-value open and recently closed pipeline records, similar to Total Sales Pipeline."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock3 size={12} />
              Sorted by value
            </span>
            <div
              role="group"
              aria-label="Record type filter"
              className="inline-flex h-8 items-center rounded-md border border-border bg-white p-0.5"
            >
              {filters.map((filter) => {
                const selected = kindFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onKindFilterChange(filter.id)}
                    className={cn(
                      'inline-flex h-full items-center rounded px-2.5 text-[11px] font-semibold transition-colors',
                      selected
                        ? 'bg-brand text-white'
                        : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      {!ordered.length ? (
        <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated p-6 text-center">
          <Layers3
            size={22}
            className="text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No high-value records for this filter
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Adjust period, currency, or pipeline scope to see results.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                {[
                  'Record',
                  'Type',
                  'Pipeline',
                  'Owner',
                  'Stage',
                  'Age',
                  'Value',
                  'Win prob.',
                  'Status',
                ].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:pl-0 last:pr-0"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-3 pl-0 pr-3">
                    <p className="text-[12px] font-semibold text-foreground">
                      {record.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {record.account}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-surface-elevated px-2 py-1 text-[10px] font-medium capitalize text-foreground">
                      {pipelineRecordKindLabel(record.kind, {
                        lowercase: true,
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-foreground">
                    {record.pipeline}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[11px] text-foreground">
                      {record.owner}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {record.team}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <RecordStage stage={record.stage} stages={stages} />
                  </td>
                  <td className="px-3 py-3 text-[11px] tabular-nums text-muted-foreground">
                    {record.age}
                  </td>
                  <td className="px-3 py-3 text-[11px] font-semibold tabular-nums text-foreground">
                    {record.amount}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-elevated">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${record.probability}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {record.probability}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pl-3 pr-0">
                    <RecordStatus status={record.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}

export function ReportsDashboard({
  periodId,
  currency,
  scope,
  kindFilter,
  onKindFilterChange,
}: {
  periodId: ReportPeriodId;
  currency: ReportCurrency;
  scope: ReportPipelineScope;
  kindFilter: RecordKindFilter;
  onKindFilterChange: (value: RecordKindFilter) => void;
}) {
  const data = useMemo(
    () =>
      buildReportSnapshot({
        periodId,
        currency,
        scope,
        kindFilter,
      }),
    [periodId, currency, scope, kindFilter],
  );

  const { kpis } = data;

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <main className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6">
        <section
          aria-label="Report key performance indicators"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <KpiCard
            label="Total pipeline"
            value={kpis.pipelineValue}
            icon={<Layers3 size={17} />}
          >
            <TrendChip
              value={kpis.pipelineTrend}
              positive={kpis.pipelineTrendPositive}
            />
          </KpiCard>
          <KpiCard
            label="Won revenue"
            value={kpis.wonRevenue}
            icon={<Wallet size={17} />}
          >
            <TrendChip value={kpis.wonTrend} positive={kpis.wonTrendPositive} />
          </KpiCard>
          <KpiCard
            label="Target achievement"
            value={`${kpis.targetPercent}%`}
            icon={<Target size={17} />}
          >
            <p className="mt-3 text-[11px] text-muted-foreground">
              {kpis.achieved} of {kpis.target}
            </p>
          </KpiCard>
          <KpiCard
            label="Win rate"
            value={kpis.winRate}
            icon={<TrendingUp size={17} />}
          >
            <p className="mt-3 truncate text-[11px] text-muted-foreground">
              {kpis.winRateDetail}
            </p>
          </KpiCard>
          <KpiCard
            label="High-value coverage"
            value={String(kpis.highValueCount)}
            icon={<BriefcaseBusiness size={17} />}
          >
            <p className="mt-3 truncate text-[11px] text-muted-foreground">
              {kpis.highValueShare}
            </p>
          </KpiCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-3 xl:items-stretch">
          <DashboardCard className="flex flex-col overflow-hidden p-5 xl:col-span-2">
            <SectionHeader
              title="Overall target achievement"
              description="Progress against fiscal targets with team contribution."
            />
            <div className="mt-5 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <TargetRing
                value={kpis.targetPercent}
                color={tokens.color.brand}
              />
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-3 text-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Achieved
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-foreground">
                      {kpis.achieved}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Target
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-foreground">
                      {kpis.target}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Remaining
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-foreground">
                      {kpis.remaining}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.teamTargets.map((team) => (
                    <div key={team.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-muted text-[10px] font-bold text-brand">
                            {team.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-foreground">
                              {team.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {team.achieved} / {team.target}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-semibold tabular-nums text-foreground">
                            {team.percent}%
                          </p>
                          <p
                            className={cn(
                              'text-[10px] font-medium',
                              team.positive ? 'text-success' : 'text-error',
                            )}
                          >
                            {team.trend}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${team.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="flex flex-col overflow-hidden p-5">
            <SectionHeader
              title="Achievement trend"
              description="Monthly progress toward target."
            />
            <div className="mt-6 flex-1">
              <MonthlyTrendChart points={data.monthlyTrend} />
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <TriangleAlert
                size={14}
                className="mt-0.5 shrink-0 text-amber-700"
              />
              <p className="text-[11px] leading-relaxed text-amber-800">
                {kpis.atRiskCount} records need attention. Focus coaching on
                teams below 65% of target.
              </p>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-3 xl:items-stretch">
          <DashboardCard className="overflow-hidden p-5 xl:col-span-2">
            <SectionHeader
              title="Pipeline composition"
              description={
                isLeadsEnabled()
                  ? 'Value distribution across lead and deal stages.'
                  : `Value distribution across ${dealUiLabel({ lowercase: true })} stages.`
              }
              action={
                <span className="rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  {currency} view
                </span>
              }
            />
            <div className="mt-4">
              <PipelineDonut
                stages={data.stages}
                totalLabel={kpis.pipelineValue}
              />
            </div>
          </DashboardCard>

          <div className="grid gap-5">
            <DashboardCard className="p-5">
              <SectionHeader
                title="Pipeline health"
                description="Status mix across open and recent records."
              />
              <div className="mt-4">
                <HealthBar slices={data.health} />
              </div>
            </DashboardCard>

            <DashboardCard className="p-5">
              <SectionHeader
                title="Conversion funnel"
                description={
                  isLeadsEnabled()
                    ? 'Lead-to-won progression for the period.'
                    : `${dealUiLabel()}-to-won progression for the period.`
                }
              />
              <div className="mt-4">
                <ConversionFunnel steps={data.funnel} />
              </div>
            </DashboardCard>
          </div>
        </section>

        <section>
          <HighValueTable
            records={data.records}
            stages={data.stages}
            kindFilter={kindFilter}
            onKindFilterChange={onKindFilterChange}
          />
        </section>
      </main>
    </div>
  );
}

export function useReportSnapshot({
  periodId,
  currency,
  scope,
  kindFilter,
}: {
  periodId: ReportPeriodId;
  currency: ReportCurrency;
  scope: ReportPipelineScope;
  kindFilter: RecordKindFilter;
}) {
  return useMemo(
    () =>
      buildReportSnapshot({
        periodId,
        currency,
        scope,
        kindFilter,
      }),
    [periodId, currency, scope, kindFilter],
  );
}
