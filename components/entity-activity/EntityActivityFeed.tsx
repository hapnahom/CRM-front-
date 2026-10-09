'use client';

import { useMemo, useState } from 'react';
import { NotebookPen, RefreshCw } from 'lucide-react';
import { ActivityTimelineSkeleton } from '@/components/loading/skeleton-screens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogActivitySheet,
  type LogActivityPayload,
} from '@/components/activities/LogActivitySheet';
import { useEntityActivities } from '@/store/server/features/activity/query';
import { useCreateManualActivity } from '@/store/server/features/activity/mutation';
import { useDealStageHistory } from '@/store/server/features/deals/stage-history/queries';
import type { DealStageHistoryItem } from '@/store/server/features/deals/stage-history/queries';
import { StageHistoryFeedItem } from './StageHistoryFeedItem';
import { FieldChangeFeedItem } from './FieldChangeFeedItem';
import {
  activityKindLabel,
  formatActivityDateTime,
} from '@/store/server/features/activity/utils';
import type {
  Activity,
  ActivityEntityType,
  ActivityKind,
} from '@/store/server/features/activity/types';
import { useApprovalRequestDeepLink } from '@/hooks/useApprovalRequestDeepLink';
import { cn } from '@/lib/utils';
import { pipelineDisplayText } from '@/config/salesWorkflow';
import { dayLabel } from './utils';

interface EntityActivityFeedProps {
  entityType: ActivityEntityType;
  entityId: string;
  relatedLabel?: string;
  className?: string;
  canLogActivity?: boolean;
}

const APPROVAL_KINDS = new Set<ActivityKind>([
  'approval_requested',
  'approval_step_approved',
  'approval_approved',
  'approval_rejected',
  'approval_cancelled',
  'approval_resubmitted',
  'approval_reassigned',
]);

const STAGE_ACTIVITY_KINDS = new Set<ActivityKind>([
  'stage_change',
  'deal_won',
  'deal_lost',
]);

type FeedItem =
  | { type: 'activity'; id: string; occurredAt: string; activity: Activity }
  | {
      type: 'stage_history';
      id: string;
      occurredAt: string;
      item: DealStageHistoryItem;
    };

function approvalRequestIdFromActivity(activity: Activity): string | null {
  const meta = activity.metadata ?? {};
  const fromMeta =
    (typeof meta.approvalRequestId === 'string' && meta.approvalRequestId) ||
    (typeof meta.requestId === 'string' && meta.requestId) ||
    null;
  if (fromMeta) return fromMeta;
  if (
    activity.sourceType === 'approval_request' &&
    typeof activity.sourceId === 'string'
  ) {
    const id = activity.sourceId.split(':')[0];
    return id || null;
  }
  return null;
}

function mapManualKind(kind: LogActivityPayload['kind']): ActivityKind {
  switch (kind) {
    case 'call':
      return 'call';
    case 'meeting':
      return 'meeting';
    case 'follow_up':
      return 'follow_up';
    case 'note':
      return 'note';
    case 'task':
    default:
      return 'other';
  }
}

function groupFeedByDay(items: FeedItem[]) {
  const groups: { label: string; items: FeedItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function EntityActivityFeed({
  entityType,
  entityId,
  relatedLabel,
  className,
  canLogActivity = true,
}: EntityActivityFeedProps) {
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Activity[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const createManual = useCreateManualActivity();
  const { setApprovalRequestId } = useApprovalRequestDeepLink();

  const feedQuery = useEntityActivities(entityType, entityId, page, 20);
  const stageHistoryQuery = useDealStageHistory(entityId, {
    enabled: entityType === 'DEAL',
  });

  const pageItems = useMemo(
    () => feedQuery.data?.data ?? [],
    [feedQuery.data?.data],
  );
  const pagination = feedQuery.data?.pagination;
  const hasMore =
    pagination != null && pagination.currentPage < pagination.totalPages;

  const stageHistoryItems = useMemo(
    () => (entityType === 'DEAL' ? (stageHistoryQuery.data?.data ?? []) : []),
    [entityType, stageHistoryQuery.data?.data],
  );

  const activities = useMemo(() => {
    if (page === 1) return pageItems;
    const ids = new Set(accumulated.map((item) => item.id));
    const merged = [...accumulated];
    for (const item of pageItems) {
      if (!ids.has(item.id)) merged.push(item);
    }
    return merged;
  }, [accumulated, page, pageItems]);

  const filteredActivities = useMemo(() => {
    if (entityType !== 'DEAL' || stageHistoryItems.length === 0) {
      return activities;
    }
    return activities.filter(
      (activity) => !STAGE_ACTIVITY_KINDS.has(activity.kind),
    );
  }, [activities, entityType, stageHistoryItems.length]);

  const feedItems = useMemo(() => {
    const merged: FeedItem[] = [
      ...filteredActivities.map((activity) => ({
        type: 'activity' as const,
        id: activity.id,
        occurredAt: activity.occurredAt,
        activity,
      })),
      ...stageHistoryItems.map((item) => ({
        type: 'stage_history' as const,
        id: `stage-history:${item.id}`,
        occurredAt: item.changedAt,
        item,
      })),
    ];
    merged.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    return merged;
  }, [filteredActivities, stageHistoryItems]);

  const groups = useMemo(() => groupFeedByDay(feedItems), [feedItems]);

  function handleLogSubmit(payload: LogActivityPayload) {
    const occurredAt = payload.whenLocal
      ? new Date(payload.whenLocal).toISOString()
      : undefined;
    createManual.mutate(
      {
        subject: payload.subject,
        summary: payload.notes || undefined,
        kind: mapManualKind(payload.kind),
        entityType,
        entityId,
        occurredAt,
        metadata: {
          status: payload.status,
          relatedLabel: payload.relatedLabel,
        },
      },
      {
        onSuccess: () => {
          setLogOpen(false);
          setPage(1);
          setAccumulated([]);
          feedQuery.refetch();
          if (entityType === 'DEAL') {
            stageHistoryQuery.refetch();
          }
        },
      },
    );
  }

  const isInitialLoading =
    (feedQuery.isLoading && page === 1) ||
    (entityType === 'DEAL' && stageHistoryQuery.isLoading);

  if (isInitialLoading) {
    return <ActivityTimelineSkeleton />;
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">History</p>
        <div className="flex items-center gap-1">
          {canLogActivity ? (
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              onClick={() => setLogOpen(true)}
              disabled={createManual.isLoading}
            >
              <NotebookPen className="size-3.5" />
              Log activity
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            onClick={() => {
              setPage(1);
              setAccumulated([]);
              feedQuery.refetch();
              if (entityType === 'DEAL') {
                stageHistoryQuery.refetch();
              }
            }}
            disabled={feedQuery.isFetching || stageHistoryQuery.isFetching}
          >
            <RefreshCw
              className={`size-3.5 ${feedQuery.isFetching || stageHistoryQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {!feedItems.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No CRM history yet. Stage changes, field updates, meetings, and logged
          interactions will appear here.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((entry) => {
                  if (entry.type === 'stage_history') {
                    return (
                      <StageHistoryFeedItem key={entry.id} item={entry.item} />
                    );
                  }

                  const activity = entry.activity;
                  if (activity.kind === 'field_change') {
                    return (
                      <FieldChangeFeedItem key={entry.id} activity={activity} />
                    );
                  }

                  const approvalId = APPROVAL_KINDS.has(activity.kind)
                    ? approvalRequestIdFromActivity(activity)
                    : null;
                  const interactive = !!approvalId;
                  const content = (
                    <>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {activityKindLabel(activity.kind)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {activity.origin}
                        </Badge>
                        {interactive ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                          >
                            Open request
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {pipelineDisplayText(activity.subject)}
                      </p>
                      {activity.summary ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pipelineDisplayText(activity.summary)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatActivityDateTime(activity.occurredAt)}
                      </p>
                    </>
                  );

                  if (interactive && approvalId) {
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setApprovalRequestId(approvalId)}
                        className={cn(
                          'w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-left transition-colors',
                          'hover:border-amber-300 hover:bg-amber-50/40',
                        )}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border bg-surface-card px-3 py-2.5"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={feedQuery.isFetching}
            onClick={() => {
              setAccumulated(activities);
              setPage((p) => p + 1);
            }}
          >
            {feedQuery.isFetching ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}

      <LogActivitySheet
        open={logOpen}
        onOpenChange={setLogOpen}
        relatedLabel={relatedLabel ?? ''}
        onSubmit={handleLogSubmit}
      />
    </div>
  );
}
