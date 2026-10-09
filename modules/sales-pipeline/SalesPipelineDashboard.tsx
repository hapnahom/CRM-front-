'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileStack,
  Handshake,
  Layers3,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Target,
  UserPlus,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateDealDialog } from '@/modules/deals/components/CreateDealDialog';
import { PipelineDashboardSkeleton } from '@/components/loading/skeleton-screens';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import {
  formatTargetPercent,
  targetAchievementPercent as computeTargetAchievementPercent,
} from '@/lib/target-format';
import { stageBadgeStyles } from '@/lib/stage-presets';
import { PipelineStageFilter } from '@/components/pipeline/PipelineStageFilter';
import {
  mergePipelineDashboardViewParams,
  usePipelineDashboard,
} from '@/store/server/features/deals/pipeline/dashboard-queries';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import {
  chartCurrencyForPipeline,
  filterDashboardData,
  type PipelineCurrency,
  type PipelineFilterSelection,
  type PipelinePeriodSelection,
  type PipelineRecordInsight,
  type PipelineStageInsight,
} from './pipeline-filter';
import {
  buildPipelineDashboardParams,
  useOptionalPipelineWorkspaceFilters,
  usePipelineFiscalSessions,
  usePipelineOrgListParams,
  usePipelineTargetParams,
} from './pipeline-filters';
import { usePipelineCurrencies } from '@/store/server/features/deals/pipeline/currency-queries';
import { useReportExportScope } from '@/hooks/useReportExportScope';
import { usePersistedSalesHubTabFilters } from '@/hooks/usePersistedSalesHubTabFilters';
import { formatCustomFieldListItems } from '@/lib/pipeline/format-custom-field-value';
import { TruncatedValueList } from '@/components/pipeline/TruncatedValueList';
import { DEFAULT_OPPORTUNITY_TABLE_COLUMNS } from '@/lib/pipeline/list-columns';
import {
  parseRoleColumnId,
  roleAppliesToEntity,
} from '@/lib/pipeline/role-columns';
import { RoleAssignmentInlineCell } from '@/components/pipeline/RoleAssignmentTableCell';
import { usePipelineOpportunitiesColumns } from '@/hooks/usePipelineOpportunitiesColumns';
import { useCustomFieldDirectory } from '@/hooks/useCustomFieldDirectory';
import { usePipelineTableColumnWidths } from '@/hooks/usePipelineTableColumnWidths';
import { sumColumnWidths } from '@/lib/pipeline/table-column-widths';
import {
  ResizableNativeTableHead,
  isWrappableCustomFieldType,
  pipelineTableCellStyle,
} from '@/components/pipeline/ResizablePipelineTableHead';
import {
  PipelineListColumnSelector,
  PipelineListColumnsButton,
} from '@/components/pipeline/PipelineListColumnSelector';
import { PipelineListPagination } from '@/components/pipeline/PipelineListPagination';
import {
  PIPELINE_LIST_PAGE_SIZE,
  type PipelinePagination,
} from '@/lib/pipeline/list-query';
import {
  dealUiLabel,
  filterLeadPipelineRecords,
  filterLeadPipelineStages,
  isLeadsEnabled,
  opportunityTypeCategories,
  opportunityTypeCategoryDescription,
  opportunityTypeCategoryLabel,
  pipelineRecordKindLabel,
  type OpportunityTypeCategory,
} from '@/config/salesWorkflow';
import type { OpportunityCategoryKpi } from '@/lib/pipeline/opportunity-type-kpis';

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

function KpiCard({
  label,
  value,
  detail,
  icon,
  children,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const multiLineValue = value.includes(' · ');
  return (
    <DashboardCard className={cn('min-h-[122px] p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {multiLineValue ? (
            <ul className="mt-2 space-y-0.5">
              {value.split(' · ').map((part) => (
                <li
                  key={part}
                  className="text-[15px] font-bold leading-tight tabular-nums text-foreground sm:text-[18px]"
                >
                  {part}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 truncate text-[20px] font-bold leading-none tabular-nums text-foreground sm:text-[22px]">
              {value}
            </p>
          )}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
          {icon}
        </span>
      </div>
      {children ? (
        <div className="mt-3">{children}</div>
      ) : detail ? (
        <div className="mt-3">
          <span className="text-[11px] text-muted-foreground">{detail}</span>
        </div>
      ) : null}
    </DashboardCard>
  );
}

function OpportunityStatusBreakdown({
  open,
  won,
  lost,
}: {
  open: number;
  won: number;
  lost: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-md bg-surface-elevated px-2 py-1.5">
        <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          <BriefcaseBusiness size={10} />
          Open
        </p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
          {open}
        </p>
      </div>
      <div className="rounded-md bg-emerald-50 px-2 py-1.5">
        <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-success">
          <CheckCircle2 size={10} />
          Won
        </p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
          {won}
        </p>
      </div>
      <div className="rounded-md bg-rose-50 px-2 py-1.5">
        <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-error">
          <XCircle size={10} />
          Lost
        </p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
          {lost}
        </p>
      </div>
    </div>
  );
}

function LeadStyleStageBreakdown({
  openCount,
  middleCount,
  expiredCount,
  middleLabel,
  expiredLabel,
}: {
  openCount: number;
  middleCount: number;
  expiredCount: number;
  middleLabel: string;
  expiredLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-surface-elevated px-2 py-1.5">
          <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            <UserPlus size={10} />
            Open
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
            {openCount}
          </p>
        </div>
        <div className="rounded-md bg-sky-50 px-2 py-1.5">
          <p
            className="flex items-center gap-1 truncate text-[9px] font-medium uppercase tracking-wide text-sky-700"
            title={middleLabel}
          >
            <Sparkles size={10} className="shrink-0" />
            <span className="truncate">{middleLabel}</span>
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
            {middleCount}
          </p>
        </div>
        <div className="rounded-md bg-rose-50 px-2 py-1.5">
          <p
            className="flex items-center gap-1 truncate text-[9px] font-medium uppercase tracking-wide text-error"
            title={expiredLabel}
          >
            <XCircle size={10} className="shrink-0" />
            <span className="truncate">{expiredLabel}</span>
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
            {expiredCount}
          </p>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_KPI_ICONS: Record<OpportunityTypeCategory, ReactNode> = {
  SD: <PenTool size={17} />,
  BID: <FileStack size={17} />,
};

function OpportunityCategoryKpiCard({ kpi }: { kpi: OpportunityCategoryKpi }) {
  return (
    <KpiCard
      label={kpi.label}
      value={String(kpi.total)}
      detail={kpi.description}
      icon={CATEGORY_KPI_ICONS[kpi.category]}
    >
      <OpportunityStatusBreakdown
        open={kpi.open}
        won={kpi.won}
        lost={kpi.lost}
      />
    </KpiCard>
  );
}

function PipelineDonut({
  stages,
  totalLabel,
}: {
  stages: PipelineStageInsight[];
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

  const hasAnyStages = stages.length > 0;
  const totalParts = totalLabel.split(' · ').filter(Boolean);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] items-center gap-5 lg:gap-7 xl:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] xl:grid-rows-none">
      <div className="mx-auto self-center">
        <div
          role="img"
          aria-label={
            isLeadsEnabled()
              ? 'Pipeline value distribution by lead and deal stage'
              : 'Pipeline value distribution by opportunity stage'
          }
          className="relative flex size-[180px] items-center justify-center rounded-full sm:size-[220px]"
          style={{
            background: hasAnyStages
              ? `conic-gradient(${stops})`
              : tokens.color.surfaceHover,
          }}
        >
          <div className="absolute inset-[20px] rounded-full bg-white shadow-inner sm:inset-[24px]" />
          <div className="relative z-10 max-w-[70%] px-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Total pipeline
            </p>
            {totalParts.length > 1 ? (
              <ul className="mt-1 space-y-0.5">
                {totalParts.map((part) => (
                  <li
                    key={part}
                    className="text-sm font-bold leading-tight text-foreground sm:text-base"
                  >
                    {part}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                {totalLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-y-auto no-scrollbar pr-1 xl:h-full">
        {hasAnyStages ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
            {stages.map((stage) => (
              <StageCard key={stage.id} stage={stage} />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Layers3
                size={22}
                className="mx-auto text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-foreground">
                No pipeline stages to display.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Data will appear here when it becomes available.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StageCard({ stage }: { stage: PipelineStageInsight }) {
  const amountParts = stage.amount.split(' · ').filter(Boolean);
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
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
      <div className="mt-2 flex items-end justify-between gap-3">
        {amountParts.length > 1 ? (
          <ul className="min-w-0 space-y-0.5">
            {amountParts.map((part) => (
              <li
                key={part}
                className="truncate text-[12px] font-semibold tabular-nums text-foreground"
              >
                {part}
              </li>
            ))}
          </ul>
        ) : (
          <span className="truncate text-sm font-semibold tabular-nums text-foreground">
            {stage.amount}
          </span>
        )}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {stage.count} records
        </span>
      </div>
    </div>
  );
}

function targetAchievementPercent(
  achieved: number | undefined,
  target: number | undefined,
  fallback: number,
): number {
  if (
    typeof achieved === 'number' &&
    typeof target === 'number' &&
    target > 0
  ) {
    return computeTargetAchievementPercent(achieved, target);
  }
  return fallback;
}

function TargetRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-24 shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="size-24 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={tokens.color.surfaceHover}
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute text-xl font-bold tabular-nums text-foreground">
          {formatTargetPercent(value)}
        </span>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {value >= 80 ? 'On track' : 'Needs attention'}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Updated from the current fiscal quarter
        </p>
      </div>
    </div>
  );
}

function resolveStageColor(
  stageLabel: string,
  stages: PipelineStageInsight[],
): string {
  const normalized = stageLabel.trim().toLowerCase();
  const exact = stages.find(
    (stage) => stage.label.toLowerCase() === normalized,
  );
  if (exact) return exact.color;

  const partial = stages.find(
    (stage) =>
      normalized.includes(stage.label.toLowerCase()) ||
      stage.label.toLowerCase().includes(normalized),
  );
  if (partial) return partial.color;

  if (/new/.test(normalized)) return tokens.color.purple;
  if (/qualified/.test(normalized)) return tokens.color.accentBlue;
  if (
    /propos|bid|solution|clarif|technical|nda|agreement|certified/.test(
      normalized,
    )
  ) {
    return tokens.color.brand;
  }
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
  stages: PipelineStageInsight[];
}) {
  // resolveStageColor prefers the exact composition stage color (same source as
  // the leads/deals cards), so recoloring a stage in deals/leads updates this
  // badge automatically.
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

function formatRecordDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MoneyStack({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const parts = value.split(' · ').filter(Boolean);
  if (parts.length <= 1) {
    return <span className={className}>{value || '—'}</span>;
  }
  return (
    <ul className={cn('space-y-0.5', className)}>
      {parts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}

function MultilineCell({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value?.trim()) {
    return <span className="text-muted-foreground">—</span>;
  }
  const items = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  return <TruncatedValueList values={items} className={className} />;
}

function PipelineRecordsTable({
  records,
  stages,
  emptyMessage,
  isLoading = false,
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  stageFilterOptions,
  pagination,
  onPageChange,
}: {
  records: PipelineRecordInsight[];
  stages: PipelineStageInsight[];
  emptyMessage: string;
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  stageFilterOptions: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
  pagination?: PipelinePagination;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleRecords = useMemo(
    () => filterLeadPipelineRecords(records),
    [records],
  );
  const hasTableSearch = search.trim() !== '';
  const leadIds = useMemo(
    () =>
      visibleRecords
        .filter((record) => record.kind === 'lead')
        .map((record) => record.id),
    [visibleRecords],
  );
  const dealIds = useMemo(
    () =>
      visibleRecords
        .filter((record) => record.kind === 'deal')
        .map((record) => record.id),
    [visibleRecords],
  );
  const columns = usePipelineOpportunitiesColumns({
    leadIds,
    dealIds,
    enabled: leadIds.length > 0 || dealIds.length > 0,
  });
  const customFieldDirectory = useCustomFieldDirectory(columns.visibleColumns);
  const columnIds = useMemo(
    () => columns.visibleColumns.map((column) => column.id),
    [columns.visibleColumns],
  );
  const { columnWidths, setColumnWidth } = usePipelineTableColumnWidths(
    'opportunities',
    columnIds,
  );
  const tableMinWidth = useMemo(
    () => sumColumnWidths(columnIds, columnWidths),
    [columnIds, columnWidths],
  );
  const showCustomerInName = !columns.visibleColumns.some(
    (column) => column.id === 'customer',
  );

  const cellStyle = (columnId: string) =>
    pipelineTableCellStyle(columnWidths[columnId] ?? 140);

  const openRecord = (record: PipelineRecordInsight) => {
    router.push(
      record.kind === 'lead' ? `/leads/${record.id}` : `/deals/${record.id}`,
    );
  };

  const renderCell = (
    record: PipelineRecordInsight,
    column: (typeof columns.visibleColumns)[number],
  ) => {
    switch (column.id) {
      case 'name': {
        const kindLabel = isLeadsEnabled()
          ? pipelineRecordKindLabel(record.kind, { lowercase: true })
          : null;
        const subtitleParts = [
          kindLabel,
          showCustomerInName ? record.account : null,
        ].filter(Boolean);
        return (
          <td
            key={column.id}
            style={cellStyle(column.id)}
            className="max-w-0 py-3 pl-0 pr-3"
          >
            <p className="text-[12px] font-semibold text-foreground">
              {record.name}
            </p>
            {subtitleParts.length > 0 ? (
              <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">
                {subtitleParts.join(' · ')}
              </p>
            ) : null}
          </td>
        );
      }
      case 'type':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {record.type || '—'}
          </td>
        );
      case 'customer':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {record.account || '—'}
          </td>
        );
      case 'contact':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {record.contact || '—'}
          </td>
        );
      case 'products':
        return (
          <td
            key={column.id}
            style={cellStyle(column.id)}
            className="max-w-0 px-3 py-3 align-top"
          >
            <TruncatedValueList
              values={record.products ?? []}
              className="text-[11px]"
            />
          </td>
        );
      case 'stage':
        return (
          <td key={column.id} className="px-3 py-3">
            <RecordStage stage={record.stage} stages={stages} />
          </td>
        );
      case 'age':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] tabular-nums text-muted-foreground"
          >
            {record.age}
          </td>
        );
      case 'days_in_current_stage':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] tabular-nums text-muted-foreground"
          >
            {record.daysInCurrentStage == null
              ? '—'
              : String(record.daysInCurrentStage)}
          </td>
        );
      case 'last_activity_date':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] text-muted-foreground"
          >
            {formatRecordDate(record.lastActivityDate)}
          </td>
        );
      case 'value':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] font-semibold tabular-nums text-foreground"
          >
            <MoneyStack value={record.amount} />
          </td>
        );
      case 'currency':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {record.currency || '—'}
          </td>
        );
      case 'solution':
      case 'vendor':
      case 'dr_status':
        return (
          <td
            key={column.id}
            style={cellStyle(column.id)}
            className="max-w-0 px-3 py-3 align-top"
          >
            <MultilineCell
              value={
                column.id === 'solution'
                  ? record.solution
                  : column.id === 'vendor'
                    ? record.vendor
                    : record.drStatus
              }
              className="text-[11px]"
            />
          </td>
        );
      case 'fiscal_year':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {record.fiscalYear || '—'}
          </td>
        );
      case 'quarter':
      case 'quarter_closed':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {column.id === 'quarter'
              ? record.quarter || '—'
              : record.quarterClosed || '—'}
          </td>
        );
      case 'contact_position':
      case 'contact_email':
      case 'contact_phone':
        return (
          <td key={column.id} className="px-3 py-3 text-[11px] text-foreground">
            {column.id === 'contact_position'
              ? record.contactPosition || '—'
              : column.id === 'contact_email'
                ? record.contactEmail || '—'
                : record.contactPhone || '—'}
          </td>
        );
      case 'expectedClose':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] text-muted-foreground"
          >
            {formatRecordDate(record.expectedClose)}
          </td>
        );
      case 'createdAt':
        return (
          <td
            key={column.id}
            className="px-3 py-3 text-[11px] text-muted-foreground"
          >
            {formatRecordDate(record.createdAt)}
          </td>
        );
      default: {
        const roleId = parseRoleColumnId(column.id);
        if (roleId) {
          const entityType = record.kind === 'lead' ? 'LEAD' : 'DEAL';
          const applies = roleAppliesToEntity(column.appliesTo, entityType);
          const displayValue = record.roleDisplayValues?.[roleId];
          return (
            <td
              key={column.id}
              style={cellStyle(column.id)}
              className="max-w-0 px-3 py-3 align-top text-[11px] text-foreground"
            >
              {!applies ? (
                '—'
              ) : displayValue?.trim() ? (
                <MultilineCell value={displayValue} className="text-[11px]" />
              ) : (
                <RoleAssignmentInlineCell
                  roleId={roleId}
                  isPrimary={column.isPrimary}
                  record={{
                    roleAssignments: record.roleAssignments,
                    responsibleUser:
                      record.owner && record.owner !== '—'
                        ? { name: record.owner }
                        : null,
                  }}
                />
              )}
            </td>
          );
        }

        const values =
          record.kind === 'lead'
            ? columns.leadCustomValuesByEntityId
            : columns.dealCustomValuesByEntityId;
        const recordEntityType = record.kind === 'lead' ? 'LEAD' : 'DEAL';

        let items: string[] = [];
        let displayFieldType = column.fieldType;

        if (column.groupedFields?.length) {
          for (const ref of column.groupedFields) {
            if (ref.entityType !== recordEntityType) continue;
            const nextItems = formatCustomFieldListItems(
              values.get(record.id)?.[ref.fieldId],
              ref.fieldType,
              ref.options,
              customFieldDirectory,
              ref.subFields,
            );
            if (nextItems.length && nextItems.some((item) => item.trim())) {
              items = nextItems;
              displayFieldType = ref.fieldType;
              break;
            }
          }
        } else {
          const fieldId = column.fieldId;
          const matchesEntity =
            !column.entityType || column.entityType === recordEntityType;
          items =
            matchesEntity && fieldId
              ? formatCustomFieldListItems(
                  values.get(record.id)?.[fieldId],
                  column.fieldType,
                  column.options,
                  customFieldDirectory,
                  column.subFields,
                )
              : [];
        }

        const wrapText = isWrappableCustomFieldType(displayFieldType);
        return (
          <td
            key={column.id}
            style={cellStyle(column.id)}
            className={cn(
              'px-3 py-3 align-top text-[11px] text-foreground',
              wrapText ? 'whitespace-normal' : 'max-w-0',
            )}
          >
            {wrapText ? (
              <div className="break-words leading-snug whitespace-pre-line">
                {items.length ? items.join('\n') : '—'}
              </div>
            ) : (
              <TruncatedValueList values={items} className="text-[11px]" />
            )}
          </td>
        );
      }
    }
  };

  return (
    <>
      <div className="relative mt-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 pr-0 md:pr-12">
          <div className="flex w-full flex-wrap items-end gap-2 sm:max-w-[640px]">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name, customer, or contact"
                className="h-[31.5px] border-border bg-white pl-9 text-[12.25px]"
              />
            </div>
            <PipelineStageFilter
              stages={stageFilterOptions}
              value={stageFilter}
              onChange={onStageFilterChange}
              className="h-[31.5px] w-[180px] shrink-0 border-border bg-white text-[12.25px] dark:bg-surface-card"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute top-0 right-0 z-20 flex justify-end pt-1.5 pr-1 md:flex">
          <div className="pointer-events-auto rounded-md bg-white/95 shadow-sm ring-1 ring-border/60 backdrop-blur-sm">
            <PipelineListColumnsButton onClick={() => setColumnsOpen(true)} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (unused, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {visibleRecords.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-muted-foreground">
                  {hasTableSearch
                    ? 'No records match your search.'
                    : emptyMessage}
                </p>
              ) : (
                visibleRecords.map((record) => (
                  <button
                    key={`${record.kind}-${record.id}-mobile`}
                    type="button"
                    onClick={() => openRecord(record)}
                    className="w-full rounded-lg border border-border bg-white p-3 text-left transition-colors hover:bg-surface-elevated/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-foreground">
                          {record.name}
                        </p>
                        {(() => {
                          const kindLabel = isLeadsEnabled()
                            ? pipelineRecordKindLabel(record.kind, {
                                lowercase: true,
                              })
                            : null;
                          const subtitleParts = [
                            kindLabel,
                            record.account || null,
                          ].filter(Boolean);
                          if (subtitleParts.length === 0) return null;
                          return (
                            <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
                              {subtitleParts.join(' · ')}
                            </p>
                          );
                        })()}
                      </div>
                      <RecordStage stage={record.stage} stages={stages} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Value
                        </p>
                        <div className="mt-0.5 font-semibold text-foreground">
                          <MoneyStack value={record.amount} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Owner
                        </p>
                        <p className="mt-0.5 truncate text-foreground">
                          {record.owner || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Type
                        </p>
                        <p className="mt-0.5 truncate text-foreground">
                          {record.type || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Age
                        </p>
                        <p className="mt-0.5 text-foreground">{record.age}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table
                className="border-collapse"
                style={{
                  tableLayout: 'fixed',
                  width: tableMinWidth,
                  minWidth: '100%',
                }}
              >
                <thead>
                  <tr className="border-b border-border text-left">
                    {columns.visibleColumns.map((column, index) => (
                      <ResizableNativeTableHead
                        key={column.id}
                        columnId={column.id}
                        width={columnWidths[column.id] ?? 140}
                        onResize={(columnId, width) =>
                          setColumnWidth(columnId as typeof column.id, width)
                        }
                        align={column.align}
                        className={
                          index === columns.visibleColumns.length - 1
                            ? 'pr-10'
                            : undefined
                        }
                      >
                        {column.label}
                      </ResizableNativeTableHead>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(columns.visibleColumns.length, 1)}
                        className="px-3 py-10 text-center text-[12px] text-muted-foreground"
                      >
                        {hasTableSearch
                          ? 'No records match your search.'
                          : emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((record) => (
                      <tr
                        key={`${record.kind}-${record.id}`}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-elevated/60"
                        onClick={() => openRecord(record)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openRecord(record);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${pipelineRecordKindLabel(record.kind, { lowercase: true })} ${record.name}`}
                      >
                        {columns.visibleColumns.map((column) =>
                          renderCell(record, column),
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <PipelineListPagination
                pagination={pagination}
                onPageChange={onPageChange}
              />
            ) : null}
          </>
        )}
      </div>
      <PipelineListColumnSelector
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        columns={columns.availableColumns}
        selected={columns.selectedColumnIds}
        onSave={columns.setColumns}
        defaultColumnIds={[...DEFAULT_OPPORTUNITY_TABLE_COLUMNS]}
      />
    </>
  );
}

export { PipelineDashboardSkeleton };

function targetAchievementTitle(
  filter: PipelineFilterSelection,
  scopeLevel: ReturnType<typeof useReportExportScope>['level'],
): string {
  if (filter.type === 'member') {
    return filter.memberName
      ? `${filter.memberName} target achievement`
      : 'My target achievement';
  }
  if (filter.type === 'team') {
    return `${filter.teamName} target achievement`;
  }
  if (filter.type === 'department') {
    return `${filter.departmentName} target achievement`;
  }
  if (scopeLevel === 'company') return 'Overall target achievement';
  if (scopeLevel === 'department') return 'Department target achievement';
  if (scopeLevel === 'team') return 'Team target achievement';
  return 'My target achievement';
}

function targetAchievementRingLabel(
  period: PipelinePeriodSelection,
  chartCurrency: PipelineCurrency,
  fiscalYears: Array<{
    id: string;
    name: string;
    sessions: Array<{ id: string; name: string }>;
  }>,
  activeFiscalYear?: {
    id: string;
    name: string;
    sessions: Array<{ id: string; name: string }>;
  },
): string {
  if (period.type === 'session') {
    const session = fiscalYears
      .flatMap((year) => year.sessions)
      .find((item) => item.id === period.sessionId);
    return session
      ? `${session.name} · ${chartCurrency} target`
      : `${chartCurrency} quarterly target`;
  }

  const year =
    period.type === 'annual'
      ? (fiscalYears.find((item) => item.id === period.calendarId) ??
        activeFiscalYear)
      : activeFiscalYear;

  return year
    ? `${year.name} · ${chartCurrency} target`
    : `${chartCurrency} target`;
}

export function SalesPipelineDashboard({
  filter,
  currency,
}: {
  filter: PipelineFilterSelection;
  currency: PipelineCurrency;
}) {
  const orgScope = useReportExportScope();
  const workspaceFilters = useOptionalPipelineWorkspaceFilters();
  const period = workspaceFilters?.period ?? { type: 'all' as const };
  const pageApiParams = usePipelineOrgListParams();
  const [{ tableSearch, tableStageFilter }, setTableFilters] =
    usePersistedSalesHubTabFilters('sales-pipeline', {
      tableSearch: '',
      tableStageFilter: 'all',
    });
  const setTableSearch = useCallback(
    (value: string) => setTableFilters({ tableSearch: value }),
    [setTableFilters],
  );
  const setTableStageFilter = useCallback(
    (value: string) => setTableFilters({ tableStageFilter: value }),
    [setTableFilters],
  );
  const [tablePage, setTablePage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedTableSearch, setDebouncedTableSearch] = useState('');
  const { data: currencies } = usePipelineCurrencies();
  const { fiscalYear, fiscalYears, sessions, allSessions } =
    usePipelineFiscalSessions();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTableSearch(tableSearch), 300);
    return () => clearTimeout(timer);
  }, [tableSearch]);

  useEffect(() => {
    setTablePage(1);
  }, [debouncedTableSearch, tableStageFilter, pageApiParams]);

  const dashboardParams = useMemo(
    () => ({
      ...pageApiParams,
      page: tablePage,
      pageSize: PIPELINE_LIST_PAGE_SIZE,
      ...(debouncedTableSearch.trim()
        ? { search: debouncedTableSearch.trim() }
        : {}),
      ...(tableStageFilter !== 'all' ? { stageId: tableStageFilter } : {}),
    }),
    [debouncedTableSearch, pageApiParams, tablePage, tableStageFilter],
  );

  const chartCurrency = useMemo(
    () => chartCurrencyForPipeline(currency, currencies),
    [currency, currencies],
  );
  const resolvedChartCurrency: PipelineCurrency = chartCurrency ?? currency;

  const chartApiParams = useMemo(() => {
    if (!chartCurrency) return {};
    return buildPipelineDashboardParams({
      filter,
      currency: chartCurrency,
      period,
      fiscalYears,
      sessions,
      allSessions,
    });
  }, [allSessions, chartCurrency, filter, fiscalYears, period, sessions]);

  const targetApiParams = usePipelineTargetParams(chartCurrency ?? currency);

  const consolidatedDashboardParams = useMemo(
    () =>
      mergePipelineDashboardViewParams(
        dashboardParams,
        chartCurrency ? chartApiParams : undefined,
        chartCurrency ? targetApiParams : undefined,
      ),
    [chartApiParams, chartCurrency, dashboardParams, targetApiParams],
  );

  const {
    data: pageApiData,
    isLoading,
    isError,
    error,
  } = usePipelineDashboard(consolidatedDashboardParams);

  const data = useMemo(() => {
    if (!pageApiData) return null;
    return filterDashboardData(pageApiData, filter);
  }, [pageApiData, filter]);

  const chartData = useMemo(() => {
    if (!pageApiData) return null;
    const view = pageApiData.chartView;
    if (!view) return filterDashboardData(pageApiData, filter);
    return filterDashboardData(
      {
        ...pageApiData,
        kpis: view.kpis,
        stages: view.stages ?? pageApiData.stages,
      },
      filter,
    );
  }, [pageApiData, filter]);

  const targetData = useMemo(() => {
    if (!pageApiData) return null;
    const view = pageApiData.targetView;
    if (!view) return filterDashboardData(pageApiData, filter);
    return filterDashboardData(
      {
        ...pageApiData,
        kpis: view.kpis,
      },
      filter,
    );
  }, [pageApiData, filter]);

  const tableRecords = useMemo(
    () => filterLeadPipelineRecords(data?.records ?? []),
    [data?.records],
  );

  const deferTableMetadata = isLoading || !pageApiData;
  const dealStagesQuery = useDealStages({ enabled: !deferTableMetadata });
  const leadStagesQuery = useLeadStages({
    enabled: !deferTableMetadata && isLeadsEnabled(),
  });

  const sortedStages = useMemo(
    () => [...(dealStagesQuery.data ?? [])].sort((a, b) => a.order - b.order),
    [dealStagesQuery.data],
  );

  const tableStageFilterOptions = useMemo(() => {
    const dealStages = (dealStagesQuery.data ?? []).map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
    }));
    if (dealStages.length > 0) {
      if (!isLeadsEnabled()) return dealStages;
      const leadStages = (leadStagesQuery.data ?? []).map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
      }));
      if (leadStages.length > 0) return [...dealStages, ...leadStages];
    }
    return (data?.stages ?? []).map((stage) => ({
      id: stage.id,
      name: stage.label,
      color: stage.color,
    }));
  }, [data?.stages, dealStagesQuery.data, leadStagesQuery.data]);

  const categoryKpis = useMemo((): OpportunityCategoryKpi[] => {
    if (isLeadsEnabled() || !data?.opportunityCategoryKpis?.length) return [];
    const categories = new Set(opportunityTypeCategories());
    return data.opportunityCategoryKpis
      .filter((kpi) => categories.has(kpi.category as OpportunityTypeCategory))
      .map((kpi) => {
        const category = kpi.category as OpportunityTypeCategory;
        return {
          category,
          label: opportunityTypeCategoryLabel(category),
          description: opportunityTypeCategoryDescription(category),
          total: kpi.total,
          open: kpi.open,
          won: kpi.won,
          lost: kpi.lost,
        };
      });
  }, [data?.opportunityCategoryKpis]);

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white p-6">
        <Layers3 size={32} className="text-error" aria-hidden="true" />
        <p className="text-sm font-medium text-error">
          Failed to load pipeline dashboard.
        </p>
        <p className="text-xs text-muted-foreground">
          {(error as Error)?.message ??
            'Please check your connection and try again.'}
        </p>
      </div>
    );
  }

  if (!data || isLoading) {
    return <PipelineDashboardSkeleton />;
  }

  const { kpis } = data;
  const compositionStages = filterLeadPipelineStages(
    chartData?.stages ?? data.stages,
  );
  const compositionTotal = chartData?.kpis.pipelineValue ?? kpis.pipelineValue;
  const targetKpis = targetData?.kpis ?? kpis;
  const targetPercent = targetAchievementPercent(
    targetKpis.targetAchievedValue,
    targetKpis.targetTargetValue,
    targetKpis.targetPercent,
  );
  const targetRingLabel = targetAchievementRingLabel(
    period,
    resolvedChartCurrency,
    fiscalYears,
    fiscalYear,
  );
  const showLeadsKpi = isLeadsEnabled();

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <main className="w-full space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
        <section
          aria-label={`${data.label} key performance indicators`}
          className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3"
        >
          <KpiCard
            label="Win Rate"
            value={kpis.winRate}
            detail={kpis.winRateDetail}
            icon={<Target size={17} />}
          />
          {showLeadsKpi ? (
            <>
              <KpiCard
                label="Total Leads"
                value={String(kpis.totalLeads)}
                icon={<UsersRound size={17} />}
              >
                <LeadStyleStageBreakdown
                  openCount={kpis.newLeads}
                  middleCount={kpis.qualifiedLeads}
                  expiredCount={kpis.expiredLeads}
                  middleLabel={kpis.qualifiedLabel}
                  expiredLabel={kpis.expiredLabel}
                />
              </KpiCard>
              <KpiCard
                label={`Total ${dealUiLabel({ plural: true })}`}
                value={String(kpis.totalDeals)}
                icon={<Handshake size={17} />}
              >
                <OpportunityStatusBreakdown
                  open={kpis.openDeals}
                  won={kpis.wonDeals}
                  lost={kpis.lostDeals}
                />
              </KpiCard>
            </>
          ) : categoryKpis.length >= 2 ? (
            categoryKpis.map((kpi) => (
              <OpportunityCategoryKpiCard key={kpi.category} kpi={kpi} />
            ))
          ) : (
            <>
              <KpiCard
                label={`Total ${dealUiLabel({ plural: true })}`}
                value={String(kpis.totalDeals)}
                icon={<Handshake size={17} />}
              >
                <OpportunityStatusBreakdown
                  open={kpis.openDeals}
                  won={kpis.wonDeals}
                  lost={kpis.lostDeals}
                />
              </KpiCard>
              <KpiCard
                label="SD"
                value="—"
                detail="Configure opportunity types to see category KPIs"
                icon={<PenTool size={17} />}
              />
            </>
          )}
        </section>

        <section className="grid gap-4 lg:gap-5 xl:grid-cols-3 xl:items-stretch">
          <DashboardCard className="flex min-h-[22rem] flex-col overflow-hidden p-4 sm:min-h-[25rem] sm:p-5 xl:col-span-2">
            <SectionHeader
              title="Pipeline composition"
              action={
                <span className="rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  {`${resolvedChartCurrency} view`}
                </span>
              }
            />
            <div className="min-h-0 flex-1 pt-3">
              <PipelineDonut
                stages={compositionStages}
                totalLabel={compositionTotal}
              />
            </div>
          </DashboardCard>

          <DashboardCard className="flex min-h-[22rem] flex-col overflow-hidden p-4 sm:min-h-[25rem] sm:p-5">
            <SectionHeader
              title={targetAchievementTitle(filter, orgScope.level)}
            />
            <div className="min-h-0 flex-1 space-y-6 overflow-auto pt-6 sm:pt-10">
              <TargetRing
                value={targetPercent}
                label={targetRingLabel}
                color={tokens.color.success}
              />
              <div className="grid grid-cols-1 gap-3 border-y border-border py-4 text-center sm:grid-cols-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Achieved
                  </p>
                  <div className="mt-1 text-[12px] font-semibold text-foreground">
                    <MoneyStack value={targetKpis.achieved} />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Target
                  </p>
                  <div className="mt-1 text-[12px] font-semibold text-foreground">
                    <MoneyStack value={targetKpis.target} />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    Remaining
                  </p>
                  <div className="mt-1 text-[12px] font-semibold text-foreground">
                    <MoneyStack value={targetKpis.remaining} />
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </section>

        <section>
          <DashboardCard className="p-4 sm:p-5">
            <SectionHeader
              title={data.tableTitle}
              description="Uses the teams, period, and currency filters from the page header. Search below to narrow results within the current view."
              action={
                <Button
                  type="button"
                  size="sm"
                  className="h-[31.5px] bg-brand text-[12.25px] text-brand-foreground hover:bg-brand-hover"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  New {dealUiLabel()}
                </Button>
              }
            />
            <PipelineRecordsTable
              records={tableRecords}
              stages={data.stages}
              isLoading={isLoading}
              search={tableSearch}
              onSearchChange={setTableSearch}
              stageFilter={tableStageFilter}
              onStageFilterChange={setTableStageFilter}
              stageFilterOptions={tableStageFilterOptions}
              pagination={data.recordsPagination}
              onPageChange={setTablePage}
              emptyMessage={`No ${data.shortLabel.toLowerCase()} records match the current filters.`}
            />
          </DashboardCard>
        </section>
      </main>

      {createOpen ? (
        <CreateDealDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          sortedStages={sortedStages}
        />
      ) : null}
    </div>
  );
}
