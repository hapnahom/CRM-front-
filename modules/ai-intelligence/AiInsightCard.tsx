'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type {
  AiInsight,
  AiInsightAction,
  AiInsightKind,
  AiTaskType,
} from '@/store/server/features/ai-intelligence/types';
import {
  TaskFormModal,
  type TaskFormValues,
} from '@/modules/communication/components/TaskFormModal';

/** Thin scrollbar for insight panels when content overflows available space. */
export const AI_INSIGHTS_SCROLLBAR_CLASS = cn(
  'overflow-y-auto pr-1.5',
  '[scrollbar-width:thin]',
  '[scrollbar-color:hsl(var(--border))_transparent]',
  '[&::-webkit-scrollbar]:w-1.5',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
  '[&::-webkit-scrollbar-thumb]:bg-border',
  'hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/35',
);

type StatusTag = {
  key: string;
  label: string;
  className: string;
};

const PRIORITY_TAGS: Record<AiInsight['priority'], StatusTag> = {
  high: {
    key: 'priority-high',
    label: 'High',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  medium: {
    key: 'priority-medium',
    label: 'Medium',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  low: {
    key: 'priority-low',
    label: 'Low',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
};

const KIND_TAGS: Partial<Record<AiInsightKind, StatusTag>> = {
  meeting: {
    key: 'kind-meeting',
    label: 'Meeting',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  outreach_gap: {
    key: 'kind-outreach',
    label: 'Outreach Gap',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  coordination: {
    key: 'kind-coordination',
    label: 'Coordination',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  at_risk: {
    key: 'kind-at-risk',
    label: 'At Risk',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  closing_soon: {
    key: 'kind-closing',
    label: 'Closing Soon',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  stale: {
    key: 'kind-stale',
    label: 'Stalled',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
};

const EXTRA_TAG_STYLES: Record<string, string> = {
  'Outreach Gap': 'border-amber-200 bg-amber-50 text-amber-800',
  'Multi-owner': 'border-violet-200 bg-violet-50 text-violet-700',
  Meeting: 'border-sky-200 bg-sky-50 text-sky-700',
  Coordination: 'border-violet-200 bg-violet-50 text-violet-700',
};

function inferKind(insight: AiInsight): AiInsightKind | undefined {
  if (insight.kind) return insight.kind;
  const haystack = `${insight.signal} ${insight.insight}`.toLowerCase();
  if (
    haystack.includes('upcoming meeting') ||
    haystack.includes('scheduled for')
  ) {
    return 'meeting';
  }
  if (haystack.includes('outreach') || haystack.includes('days since last')) {
    return 'outreach_gap';
  }
  if (haystack.includes('closes soon') || haystack.includes('closing soon')) {
    return 'closing_soon';
  }
  if (haystack.includes('stalled') || haystack.includes('unchanged')) {
    return 'stale';
  }
  if (
    haystack.includes('high engagement') ||
    haystack.includes('coordination')
  ) {
    return 'coordination';
  }
  if (haystack.includes('no active pipeline')) {
    return 'at_risk';
  }
  return undefined;
}

function formatOutreachChannel(kind?: string | null): string {
  switch (kind) {
    case 'email':
      return 'email';
    case 'call':
      return 'call';
    case 'meeting':
      return 'meeting';
    case 'follow_up':
      return 'follow-up';
    default:
      return 'email/call';
  }
}

/** Prefer structured meta for outreach gap wording; otherwise keep API signal. */
export function formatInsightSignal(insight: AiInsight): string {
  const meta = insight.meta;
  const days = meta?.daysSinceLastOutreach;
  const kind = inferKind(insight);

  if (kind === 'outreach_gap' || insight.tags?.includes('Outreach Gap')) {
    if (typeof days === 'number') {
      const channel = formatOutreachChannel(meta?.lastOutreachKind);
      const relative = `${days} days since last ${channel}`;
      if (insight.signal.toLowerCase().includes('days since last')) {
        return insight.signal;
      }
      // Keep entity fact, append relative time when missing.
      if (insight.signal.includes('—')) {
        const name = insight.signal.split('—')[0]?.trim();
        return name ? `${name} — ${relative}` : relative;
      }
      return `${insight.signal} — ${relative}`;
    }
    if (days === null) {
      if (insight.signal.toLowerCase().includes('no recorded outreach')) {
        return insight.signal;
      }
      if (insight.signal.includes('—')) {
        const name = insight.signal.split('—')[0]?.trim();
        return name ? `${name} — no recorded outreach` : insight.signal;
      }
    }
  }

  return insight.signal;
}

function collectStatusTags(insight: AiInsight): StatusTag[] {
  const tags: StatusTag[] = [PRIORITY_TAGS[insight.priority]];
  const kind = inferKind(insight);
  const kindTag = kind ? KIND_TAGS[kind] : undefined;
  if (kindTag) tags.push(kindTag);

  const seen = new Set(tags.map((t) => t.label.toLowerCase()));
  for (const raw of insight.tags ?? []) {
    const label = raw.trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    tags.push({
      key: `extra-${label}`,
      label,
      className:
        EXTRA_TAG_STYLES[label] ??
        'border-border bg-muted/60 text-muted-foreground',
    });
  }

  // Customer multi-owner from meta even if tags omitted (e.g. Gemini-only payload).
  if (metaActorCount(insight) > 1 && !seen.has('multi-owner')) {
    tags.push({
      key: 'extra-multi-owner',
      label: 'Multi-owner',
      className: EXTRA_TAG_STYLES['Multi-owner'],
    });
  }

  return tags;
}

function metaActorCount(insight: AiInsight): number {
  return typeof insight.meta?.actorCount === 'number'
    ? insight.meta.actorCount
    : 0;
}

export function resolveAiInsightHref(action: AiInsightAction): string | null {
  if (action.type === 'create_task') return null;
  if (!action.entityId || !action.entityType) return null;
  switch (action.entityType) {
    case 'lead':
      return `/leads/${action.entityId}`;
    case 'deal':
      return `/deals/${action.entityId}`;
    case 'customer':
      return `/customers?id=${action.entityId}`;
    default:
      return null;
  }
}

function normalizeTaskType(value?: string): AiTaskType {
  if (value === 'call' || value === 'meeting' || value === 'task') return value;
  return 'task';
}

export function buildTaskFormInitialValues(
  action: AiInsightAction,
  insight: AiInsight,
): Partial<TaskFormValues> {
  const taskType = normalizeTaskType(action.taskType);
  const title =
    action.title?.trim() ||
    action.label?.replace(/^create\s+/i, '').trim() ||
    insight.signal;

  const values: Partial<TaskFormValues> = {
    title,
    taskType,
    priority: insight.priority,
    description: [insight.insight, insight.recommendation]
      .filter(Boolean)
      .join('\n\n'),
  };

  if (action.entityId && action.entityType === 'lead') {
    values.leadId = action.entityId;
  } else if (action.entityId && action.entityType === 'deal') {
    values.dealId = action.entityId;
  } else if (action.entityId && action.entityType === 'customer') {
    values.customerId = action.entityId;
  }

  return values;
}

function actionButtonClassName() {
  return cn(
    'inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-background',
    'px-2 text-[10px] font-medium text-foreground transition-colors',
    'hover:border-brand/40 hover:bg-brand/5 hover:text-brand',
  );
}

export function AiInsightCard({
  insight,
  onCreateTask,
}: {
  insight: AiInsight;
  onCreateTask?: (action: AiInsightAction, insight: AiInsight) => void;
}) {
  const statusTags = collectStatusTags(insight);
  const signal = formatInsightSignal(insight);
  const actionLine = insight.recommendation.trim();
  const viewActions = insight.actions.filter((a) => a.type === 'view_record');
  const taskActions = insight.actions.filter((a) => a.type === 'create_task');
  const footerActions = [...viewActions, ...taskActions];

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border/70 bg-surface-elevated">
      <div className="space-y-2 p-3 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusTags.map((tag) => (
            <Badge
              key={`${insight.id}-${tag.key}`}
              variant="outline"
              className={cn(
                'h-5 rounded-md px-1.5 text-[9px] font-semibold uppercase tracking-wide',
                tag.className,
              )}
            >
              {tag.label}
            </Badge>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold leading-snug text-foreground">
            <span className="text-muted-foreground">Signal: </span>
            {signal}
          </p>
          <p className="text-[10.5px] leading-relaxed text-foreground/90">
            <span className="font-semibold text-muted-foreground">
              Action:{' '}
            </span>
            {actionLine}
          </p>
        </div>
      </div>

      {footerActions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-muted/20 px-3 py-2">
          {footerActions.map((action, index) => {
            if (action.type === 'create_task') {
              return (
                <button
                  key={`${insight.id}-action-${index}`}
                  type="button"
                  className={actionButtonClassName()}
                  onClick={() => onCreateTask?.(action, insight)}
                >
                  {action.label}
                  <ArrowRight size={10} aria-hidden />
                </button>
              );
            }

            const href = resolveAiInsightHref(action);
            if (href) {
              return (
                <Link
                  key={`${insight.id}-action-${index}`}
                  href={href}
                  className={actionButtonClassName()}
                >
                  {action.label}
                  <ArrowRight size={10} aria-hidden />
                </Link>
              );
            }

            return (
              <span
                key={`${insight.id}-action-${index}`}
                className="inline-flex h-7 items-center rounded-md px-2 text-[10px] font-medium text-muted-foreground"
              >
                {action.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

export function AiInsightsScrollList({ insights }: { insights: AiInsight[] }) {
  const [taskDraft, setTaskDraft] = useState<Partial<TaskFormValues> | null>(
    null,
  );

  const handleCreateTask = useCallback(
    (action: AiInsightAction, insight: AiInsight) => {
      setTaskDraft(buildTaskFormInitialValues(action, insight));
    },
    [],
  );

  return (
    <>
      <div className="space-y-2">
        {insights.map((insight) => (
          <AiInsightCard
            key={insight.id}
            insight={insight}
            onCreateTask={handleCreateTask}
          />
        ))}
      </div>

      {taskDraft ? (
        <TaskFormModal
          initialValues={taskDraft}
          onClose={() => setTaskDraft(null)}
          onSaved={() => {
            setTaskDraft(null);
            toast.success('Task created — find it in Productivity → Tasks');
          }}
        />
      ) : null}
    </>
  );
}

export function AiInsightsEmptyState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center text-muted-foreground',
        compact ? 'py-6' : 'py-10',
      )}
    >
      <Sparkles
        size={compact ? 18 : 22}
        className="mb-2 opacity-60"
        aria-hidden
      />
      <p className="max-w-xs text-[11px] leading-relaxed">{message}</p>
    </div>
  );
}

export function AiInsightsUnavailableState({
  onRetry,
  isLoading,
  compact = false,
  retryLabel = 'Retry',
}: {
  onRetry: () => void;
  isLoading?: boolean;
  compact?: boolean;
  retryLabel?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'py-10',
      )}
    >
      <p className="max-w-xs text-[11px] font-medium leading-relaxed text-foreground">
        Unable to generate AI insights right now.
      </p>
      <p className="max-w-xs text-[10px] leading-relaxed text-muted-foreground">
        The AI service timed out or is temporarily unavailable. Your CRM data
        was not changed.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isLoading}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-brand/40',
          'bg-brand/5 px-3 text-[11px] font-semibold text-brand',
          'hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" aria-hidden />
        ) : (
          <RefreshCw size={12} aria-hidden />
        )}
        {retryLabel}
      </button>
    </div>
  );
}
