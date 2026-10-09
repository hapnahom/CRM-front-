'use client';

import { useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  FileText,
  Handshake,
  Plus,
  Trophy,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatUserName } from '@/lib/format-user-name';
import AccessGuard from '@/utils/permissionGuard';
import { PERMISSIONS } from '@/constants/permissions';
import {
  DualCurrencyPair,
  MoneyAmount,
} from '@/modules/customers/components/DualCurrency';
import { KpiCard, Panel } from '@/modules/customers/components/detail/shared';
import { formatDueLabel, withAlpha } from '@/modules/customers/lib/display';
import { activityKindLabel } from '@/store/server/features/activity/utils';
import type { CustomerJourneyStage } from '@/store/server/features/customers/types';
import { useGetCustomerNextAction } from '@/store/server/features/customers/queries';
import {
  useCompleteCustomerNextAction,
  useRescheduleCustomerNextAction,
} from '@/store/server/features/customers/mutations';
import { useCustomerActivities } from '@/store/server/features/activity/query';
import { useCreateManualActivity } from '@/store/server/features/activity/mutation';
import type {
  Activity,
  ActivityKind,
} from '@/store/server/features/activity/types';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import {
  dealUiLabel,
  isLeadsEnabled,
  leadDealSettingsSectionLabel,
  pipelineDisplayText,
} from '@/config/salesWorkflow';
import { ActivityTimelineSkeleton } from '@/components/loading/skeleton-screens';
import { Skeleton } from '@/components/ui/skeleton';

function JourneyStageRail({
  stageId,
  stages,
  onRequestStageChange,
}: {
  stageId: string | null;
  stages: CustomerJourneyStage[];
  onRequestStageChange?: (stage: { id: string; name: string }) => void;
}) {
  const canEdit = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.EDIT_CUSTOMERS],
  });
  const activeStages = useMemo(
    () =>
      [...stages]
        .filter((stage) => stage.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );
  const currentIndex = activeStages.findIndex((stage) => stage.id === stageId);
  const current = currentIndex >= 0 ? activeStages[currentIndex] : null;

  if (activeStages.length === 0) return null;

  return (
    <Panel className="p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Customer Journey
        </h2>
        {current ? (
          <span
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{
              color: current.color ?? '#64748B',
              background: `${current.color ?? '#64748B'}18`,
            }}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: current.color ?? '#64748B' }}
            />
            Current: {current.name}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-[640px] gap-y-3"
          style={{
            gridTemplateColumns: `repeat(${activeStages.length}, minmax(0, 1fr))`,
          }}
        >
          {activeStages.map((stage, index) => {
            const isCurrent = stage.id === stageId;
            const color = stage.color ?? '#64748B';
            return (
              <div key={stage.id} className="min-w-0">
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={!canEdit || isCurrent}
                    onClick={() =>
                      onRequestStageChange?.({ id: stage.id, name: stage.name })
                    }
                    className={cn(
                      'z-[1] grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-transform',
                      canEdit && !isCurrent && 'cursor-pointer hover:scale-105',
                      !isCurrent &&
                        'border-border bg-white text-muted-foreground',
                    )}
                    style={
                      isCurrent
                        ? {
                            borderColor: color,
                            background: color,
                            color: '#fff',
                            boxShadow: `0 0 0 4px ${color}22`,
                          }
                        : undefined
                    }
                    title={
                      canEdit && !isCurrent
                        ? `Move to ${stage.name}`
                        : stage.name
                    }
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCurrent ? (
                      <span className="size-2 rounded-full bg-white" />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {index < activeStages.length - 1 ? (
                    <div
                      className={cn(
                        'mx-1 h-0.5 flex-1 rounded-full',
                        index < currentIndex
                          ? 'bg-border'
                          : 'bg-[repeating-linear-gradient(to_right,#d1d5db_0,#d1d5db_5px,transparent_5px,transparent_9px)]',
                      )}
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!canEdit || isCurrent}
                  onClick={() =>
                    onRequestStageChange?.({ id: stage.id, name: stage.name })
                  }
                  className={cn(
                    'mt-2.5 block w-full pr-2 text-left text-xs font-semibold transition-colors',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground',
                    canEdit && !isCurrent && 'hover:text-foreground',
                  )}
                >
                  {stage.name}
                  {isCurrent ? (
                    <span
                      className="mt-1 block text-[10px] font-bold uppercase tracking-wide"
                      style={{ color }}
                    >
                      Current stage
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function timelineTone(kind: ActivityKind | string) {
  if (kind === 'deal_won') {
    return {
      bg: 'bg-orange-50/70 border-orange-200',
      dot: 'bg-brand border-brand text-white',
      badge: 'bg-brand-muted text-brand',
      label: 'Won',
      icon: <Trophy size={11} />,
    };
  }
  if (kind === 'meeting') {
    return {
      bg: 'bg-blue-50/70 border-blue-200',
      dot: 'bg-blue-600 border-blue-700 text-white',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Meeting',
      icon: <Calendar size={11} />,
    };
  }
  if (kind === 'proposal_sent') {
    return {
      bg: 'bg-purple-50/70 border-purple-200',
      dot: 'bg-purple-600 border-purple-700 text-white',
      badge: 'bg-light_purple text-purple',
      label: 'Proposal',
      icon: <FileText size={11} />,
    };
  }
  return {
    bg: 'bg-surface-elevated border-border',
    dot: 'bg-slate-500 border-slate-600 text-white',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Activity',
    icon: <User size={11} />,
  };
}

function isStageChangeKind(kind: ActivityKind | string) {
  return kind === 'customer_stage_change' || kind === 'stage_change';
}

function metaString(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function matchStageFromText(
  text: string,
  stages: CustomerJourneyStage[],
): CustomerJourneyStage | undefined {
  const haystack = text.toLowerCase();
  return [...stages]
    .filter((stage) => stage.name)
    .sort((a, b) => b.name.length - a.name.length)
    .find((stage) => haystack.includes(stage.name.toLowerCase()));
}

function resolveTimelineStage(
  event: Activity,
  stages: CustomerJourneyStage[],
): { color: string; label: string } {
  const meta = event.metadata ?? {};
  const toName = metaString(meta, 'toStageName');
  const toId = metaString(meta, 'toStageId');
  const storedColor = metaString(meta, 'toStageColor');
  const byId = toId ? stages.find((stage) => stage.id === toId) : undefined;
  const byName = toName
    ? stages.find((stage) => stage.name === toName)
    : matchStageFromText(
        `${event.subject ?? ''} ${event.summary ?? ''}`,
        stages,
      );

  return {
    color: storedColor || byId?.color || byName?.color || '#64748B',
    label: toName || byName?.name || byId?.name || 'Stage',
  };
}

const MANUAL_KINDS: ActivityKind[] = [
  'meeting',
  'proposal_sent',
  'deal_won',
  'call',
  'email',
  'note',
  'follow_up',
  'other',
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

type OpportunityItem = {
  key: string;
  itemType: 'Deal' | 'Lead';
  entityId: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  owner: string;
  expectedClose?: string;
  created?: string;
  source?: string;
  solution?: string;
};

function formatOpportunityDate(value: unknown) {
  if (value == null || value === '') return '—';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    const fallback = String(value).slice(0, 10);
    return fallback || '—';
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function optionalText(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed !== '—' ? trimmed : undefined;
}

function occurredAtFromParts(date: string, time: string) {
  if (!date) return new Date().toISOString();
  const iso = time ? `${date}T${time}` : `${date}T09:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

export function ActivitiesTab({
  customerId,
  pipelineValueByCurrency,
  winRate,
  dealsCount,
  leadsCount,
  wonRevenueByCurrency,
  stageId,
  stages,
  deals = [],
  leads = [],
  onRequestStageChange,
}: {
  customerId: string;
  customerName: string;
  pipelineValueLabel?: string;
  pipelineValueByCurrency?: Record<string, number>;
  winRate: number | null;
  dealsCount: number;
  leadsCount: number;
  wonRevenueLabel?: string;
  wonRevenueByCurrency?: Record<string, number>;
  stageId: string | null;
  stages: CustomerJourneyStage[];
  deals?: Record<string, unknown>[];
  leads?: Record<string, unknown>[];
  onRequestStageChange?: (stage: { id: string; name: string }) => void;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityDraft, setActivityDraft] = useState({
    subject: '',
    summary: '',
    kind: 'meeting' as ActivityKind,
    date: '',
    time: '',
    opportunityKey: 'none',
  });
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDue, setRescheduleDue] = useState('');

  const canViewDeals = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.VIEW_DEALS],
  });
  const canViewLeads = AccessGuard.checkAccess({
    permissions: [PERMISSIONS.VIEW_LEADS],
  });
  const usersQuery = useGetPlatformUsers({ page: 1, pageSize: 1000 });
  const activitiesQuery = useCustomerActivities(customerId, {
    page: 1,
    pageSize: 50,
    sortOrder: 'desc',
  });
  const nextActionQuery = useGetCustomerNextAction(customerId);
  const createActivity = useCreateManualActivity();
  const completeNext = useCompleteCustomerNextAction();
  const rescheduleNext = useRescheduleCustomerNextAction();

  const timeline = activitiesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const ownerName = (userId?: unknown) => {
    if (typeof userId !== 'string' || !userId) return '—';
    return formatUserName(users.find((user) => user.id === userId));
  };
  const nativeAmount = (row: Record<string, unknown>) => ({
    value: Number(row.value ?? row.baseValue ?? 0),
    currency: String(row.currency ?? 'ETB'),
  });
  const opportunities = useMemo<OpportunityItem[]>(() => {
    const visibleDeals = canViewDeals ? deals : [];
    const visibleLeads = canViewLeads ? leads : [];
    const dealRows: OpportunityItem[] = visibleDeals.map((deal) => {
      const stage = asRecord(deal.stage);
      const money = nativeAmount(deal);
      return {
        key: `deal-${String(deal.id)}`,
        itemType: 'Deal',
        entityId: String(deal.id),
        title: String(deal.name ?? dealUiLabel()),
        value: money.value,
        currency: money.currency,
        stage: String(stage.name ?? deal.status ?? '—'),
        owner: ownerName(deal.responsibleUserId),
        expectedClose: formatOpportunityDate(deal.expectedClose),
        solution: optionalText(deal.solutionCategory),
      };
    });
    const leadRows: OpportunityItem[] = visibleLeads.map((lead) => {
      const stage = asRecord(lead.stage);
      const source = asRecord(lead.source);
      const money = nativeAmount(lead);
      return {
        key: `lead-${String(lead.id)}`,
        itemType: 'Lead',
        entityId: String(lead.id),
        title: String(lead.name ?? 'Lead'),
        value: money.value,
        currency: money.currency,
        stage: String(stage.name ?? lead.status ?? '—'),
        owner: ownerName(lead.responsibleUserId),
        created: formatOpportunityDate(lead.createdAt),
        source: optionalText(source.name),
      };
    });
    return [...dealRows, ...leadRows];
  }, [canViewDeals, canViewLeads, deals, leads, users]);
  const nextAction = nextActionQuery.data;
  const showJourney = stages.some((stage) => stage.isActive);
  const showLeadsInKpi = isLeadsEnabled();
  const opportunityLabel = dealUiLabel({ plural: true });
  const opportunityLabelLower = dealUiLabel({
    plural: true,
    lowercase: true,
  });

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pipeline Value"
          value={
            <DualCurrencyPair
              money={pipelineValueByCurrency}
              size="lg"
              align="start"
              compact
            />
          }
          icon={<Briefcase size={15} />}
          tone="bg-brand-muted text-brand"
        />
        <KpiCard
          label="Win Rate"
          value={
            winRate == null || !Number.isFinite(winRate)
              ? '—'
              : `${winRate.toFixed(1)}%`
          }
          icon={<TrendingUp size={15} />}
          tone="bg-success/15 text-success"
        />
        <KpiCard
          label={
            showLeadsInKpi ? leadDealSettingsSectionLabel() : opportunityLabel
          }
          value={
            showLeadsInKpi ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-surface-elevated px-2 py-1">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {dealUiLabel({ plural: true })}
                  </p>
                  <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
                    {canViewDeals ? dealsCount : '—'}
                  </p>
                </div>
                <div className="rounded-md bg-surface-elevated px-2 py-1">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    Leads
                  </p>
                  <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
                    {canViewLeads ? leadsCount : '—'}
                  </p>
                </div>
              </div>
            ) : canViewDeals ? (
              dealsCount
            ) : (
              '—'
            )
          }
          icon={<Users size={15} />}
          tone="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Won Revenue"
          value={
            <DualCurrencyPair
              money={wonRevenueByCurrency}
              size="lg"
              align="start"
              compact
            />
          }
          icon={<Trophy size={15} />}
          tone="bg-light_purple text-purple"
        />
      </section>

      {showJourney ? (
        <JourneyStageRail
          stageId={stageId}
          stages={stages}
          onRequestStageChange={onRequestStageChange}
        />
      ) : null}

      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <Panel className="flex h-[34rem] max-h-[34rem] flex-col overflow-hidden">
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Journey Timeline
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {timeline.length}{' '}
                {timeline.length === 1 ? 'activity' : 'activities'}
              </p>
            </div>
            <AccessGuard permissions={[PERMISSIONS.CREATE_ACTIVITIES]}>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover"
                onClick={() => {
                  const now = new Date();
                  setActivityDraft({
                    subject: '',
                    summary: '',
                    kind: 'meeting',
                    date: now.toISOString().slice(0, 10),
                    time: now.toTimeString().slice(0, 5),
                    opportunityKey: 'none',
                  });
                  setActivityOpen(true);
                }}
              >
                <Plus size={14} />
                Add activity
              </Button>
            </AccessGuard>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 scrollbar-hide">
            <div className="pointer-events-none absolute bottom-4 left-[27px] top-4 w-px bg-border sm:left-[31px]" />
            {activitiesQuery.isLoading ? (
              <div className="overflow-hidden py-2">
                <ActivityTimelineSkeleton />
              </div>
            ) : timeline.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No activities yet. Log the first touchpoint.
              </p>
            ) : (
              <ol className="relative m-0 list-none space-y-3 p-0">
                {timeline.map((event: Activity) => {
                  const stageChange = isStageChangeKind(event.kind)
                    ? resolveTimelineStage(event, stages)
                    : null;
                  const stageColor = stageChange?.color ?? null;
                  const tone = isStageChangeKind(event.kind)
                    ? {
                        bg: '',
                        dot: 'text-white',
                        badge: '',
                        label: stageChange?.label ?? 'Stage',
                        icon: <Users size={11} />,
                      }
                    : timelineTone(event.kind);
                  const occurred = new Date(event.occurredAt);
                  return (
                    <li
                      key={event.id}
                      className="relative grid grid-cols-[28px_1fr] gap-3 sm:grid-cols-[32px_1fr]"
                    >
                      <div
                        className={cn(
                          'z-[1] grid size-7 place-items-center rounded-full border shadow-sm sm:size-8',
                          tone.dot,
                        )}
                        style={
                          stageColor
                            ? {
                                background: stageColor,
                                borderColor: stageColor,
                                color: '#fff',
                              }
                            : undefined
                        }
                      >
                        {tone.icon}
                      </div>
                      <div
                        className={cn(
                          'min-h-0 rounded-lg border px-3.5 py-3',
                          tone.bg,
                        )}
                        style={
                          stageColor
                            ? {
                                background: withAlpha(stageColor, 0.1),
                                borderColor: withAlpha(stageColor, 0.35),
                              }
                            : undefined
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-medium text-foreground">
                            {pipelineDisplayText(event.subject ?? '')}
                          </strong>
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                              tone.badge,
                            )}
                            style={
                              stageColor
                                ? {
                                    background: withAlpha(stageColor, 0.16),
                                    color: stageColor,
                                  }
                                : undefined
                            }
                          >
                            {tone.label}
                          </span>
                        </div>
                        {event.summary ? (
                          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted-foreground">
                            {pipelineDisplayText(event.summary)}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {Number.isNaN(occurred.getTime())
                            ? '—'
                            : occurred.toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-4 xl:h-[34rem]">
          <Panel className="flex-shrink-0 overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Next Action
              </h2>
              {nextAction ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Calendar size={11} />
                  {formatDueLabel(nextAction.dueAt)}
                </span>
              ) : null}
            </div>
            <div className="px-4 py-3.5 sm:px-5">
              {nextActionQuery.isLoading ? (
                <div className="space-y-2 overflow-hidden">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              ) : !nextAction ? (
                <p className="text-sm text-muted-foreground">
                  No open tasks for this account.
                </p>
              ) : (
                <>
                  <strong className="text-sm font-medium text-foreground">
                    {nextAction.title}
                  </strong>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Owner:{' '}
                    {formatUserName(
                      users.find((user) => user.id === nextAction.ownerUserId),
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover"
                      disabled={completeNext.isLoading}
                      onClick={() =>
                        completeNext.mutate(customerId, {
                          onSuccess: () => toast.success('Action completed.'),
                          onError: () =>
                            toast.error('Could not complete this action.'),
                        })
                      }
                    >
                      Complete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-border"
                      onClick={() => {
                        setRescheduleDue(
                          nextAction.dueAt ? nextAction.dueAt.slice(0, 16) : '',
                        );
                        setRescheduleOpen(true);
                      }}
                    >
                      Reschedule
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex-shrink-0 border-b border-border px-4 py-3.5 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                {opportunityLabel}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {opportunities.length}{' '}
                {opportunities.length === 1
                  ? dealUiLabel({ lowercase: true })
                  : opportunityLabelLower}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 scrollbar-hide">
              {!canViewDeals && !canViewLeads ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {opportunityLabelLower} yet.
                </p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {opportunities.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 text-[13px] last:border-b-0"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={cn(
                            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md',
                            item.itemType === 'Deal'
                              ? 'bg-brand-muted text-brand'
                              : 'bg-blue-50 text-blue-600',
                          )}
                        >
                          <Handshake size={12} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <strong className="truncate font-medium text-foreground">
                              {item.title}
                            </strong>
                            {showLeadsInKpi && item.itemType === 'Lead' ? (
                              <Badge
                                variant="outline"
                                className="rounded-md border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700"
                              >
                                Lead
                              </Badge>
                            ) : null}
                          </div>
                          <dl className="mt-1 m-0 space-y-0.5 text-xs text-muted-foreground">
                            <div>
                              <dt className="inline font-medium text-foreground/70">
                                Stage:{' '}
                              </dt>
                              <dd className="inline m-0">{item.stage}</dd>
                            </div>
                            {item.itemType === 'Deal' ? (
                              <div>
                                <dt className="inline font-medium text-foreground/70">
                                  Expected close:{' '}
                                </dt>
                                <dd className="inline m-0">
                                  {item.expectedClose ?? '—'}
                                </dd>
                              </div>
                            ) : (
                              <div>
                                <dt className="inline font-medium text-foreground/70">
                                  Created:{' '}
                                </dt>
                                <dd className="inline m-0">
                                  {item.created ?? '—'}
                                </dd>
                              </div>
                            )}
                            {item.solution ? (
                              <div>
                                <dt className="inline font-medium text-foreground/70">
                                  Solution:{' '}
                                </dt>
                                <dd className="inline m-0">{item.solution}</dd>
                              </div>
                            ) : null}
                            {item.source ? (
                              <div>
                                <dt className="inline font-medium text-foreground/70">
                                  Source:{' '}
                                </dt>
                                <dd className="inline m-0">{item.source}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt className="inline font-medium text-foreground/70">
                                Owner:{' '}
                              </dt>
                              <dd className="inline m-0">{item.owner}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      <MoneyAmount
                        value={item.value}
                        currency={item.currency}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </section>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add activity</DialogTitle>
            <DialogDescription>
              Log a touchpoint on this customer’s journey timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={activityDraft.subject}
                onChange={(e) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="h-9 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={activityDraft.kind}
                onValueChange={(value) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    kind: value as ActivityKind,
                  }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {activityKindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Opportunity</Label>
              <Select
                value={activityDraft.opportunityKey}
                onValueChange={(value) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    opportunityKey: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 border-border">
                  <SelectValue placeholder="None (customer only)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (customer only)</SelectItem>
                  {opportunities.map((opportunity) => (
                    <SelectItem key={opportunity.key} value={opportunity.key}>
                      {showLeadsInKpi && opportunity.itemType === 'Lead'
                        ? `Lead: ${opportunity.title}`
                        : opportunity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={activityDraft.date}
                  onChange={(e) =>
                    setActivityDraft((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="h-9 border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={activityDraft.time}
                  onChange={(e) =>
                    setActivityDraft((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="h-9 border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Detail</Label>
              <Textarea
                value={activityDraft.summary}
                onChange={(e) =>
                  setActivityDraft((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                className="min-h-[80px] border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-border"
              onClick={() => setActivityOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={createActivity.isLoading}
              onClick={() => {
                if (!activityDraft.subject.trim()) {
                  toast.error('Activity title is required.');
                  return;
                }
                const linked = opportunities.find(
                  (item) => item.key === activityDraft.opportunityKey,
                );
                createActivity.mutate(
                  {
                    subject: activityDraft.subject.trim(),
                    summary: activityDraft.summary.trim() || undefined,
                    kind: activityDraft.kind,
                    entityType: linked
                      ? linked.itemType === 'Deal'
                        ? 'DEAL'
                        : 'LEAD'
                      : 'CUSTOMER',
                    entityId: linked ? linked.entityId : customerId,
                    occurredAt: occurredAtFromParts(
                      activityDraft.date,
                      activityDraft.time,
                    ),
                  },
                  {
                    onSuccess: () => {
                      setActivityOpen(false);
                    },
                  },
                );
              }}
            >
              Create activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule next action</DialogTitle>
          </DialogHeader>
          <Input
            type="datetime-local"
            className="h-9"
            value={rescheduleDue}
            onChange={(e) => setRescheduleDue(e.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              className="h-9 bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={!rescheduleDue || rescheduleNext.isLoading}
              onClick={() =>
                rescheduleNext.mutate(
                  {
                    customerId,
                    dueAt: new Date(rescheduleDue).toISOString(),
                  },
                  {
                    onSuccess: () => {
                      toast.success('Action rescheduled.');
                      setRescheduleOpen(false);
                    },
                    onError: () => toast.error('Could not reschedule.'),
                  },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
