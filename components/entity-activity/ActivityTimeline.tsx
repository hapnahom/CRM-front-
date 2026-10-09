'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityTimelineSkeleton } from '@/components/loading/skeleton-screens';
import { Button } from '@/components/ui/button';
import AccessGuard from '@/utils/permissionGuard';
import { useEntityComments } from '@/store/server/features/entity-comments/queries';
import { useCreateEntityComment } from '@/store/server/features/entity-comments/mutations';
import type {
  CommentEntityType,
  EntityComment,
} from '@/store/server/features/entity-comments/types';
import { CommentItem } from './CommentItem';
import { MentionTextarea } from './MentionTextarea';
import { dayLabel } from './utils';

interface ActivityTimelineProps {
  entityType: CommentEntityType;
  entityId: string;
  entityName?: string;
  className?: string;
  canCompose?: boolean;
  hideHeader?: boolean;
}

function groupByDay(comments: EntityComment[]) {
  const groups: { label: string; items: EntityComment[] }[] = [];
  for (const comment of comments) {
    const label = dayLabel(comment.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(comment);
    } else {
      groups.push({ label, items: [comment] });
    }
  }
  return groups;
}

export function ActivityTimeline({
  entityType,
  entityId,
  className,
  canCompose: canComposeProp,
  hideHeader = false,
}: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<EntityComment[]>([]);

  const commentsQuery = useEntityComments(entityType, entityId, page, 20);
  const createComment = useCreateEntityComment();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#comments') return;
    const timer = window.setTimeout(() => {
      document
        .getElementById('comments')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [entityType, entityId, commentsQuery.isLoading]);

  const pageData = commentsQuery.data?.data ?? [];
  const pagination = commentsQuery.data?.pagination;

  const comments = useMemo(() => {
    if (page === 1) return pageData;
    const ids = new Set(accumulated.map((c) => c.id));
    const merged = [...accumulated];
    for (const item of pageData) {
      if (!ids.has(item.id)) merged.push(item);
    }
    return merged;
  }, [accumulated, page, pageData]);

  const groups = useMemo(() => groupByDay(comments), [comments]);

  const canCompose =
    canComposeProp ??
    AccessGuard.checkAccess({
      permissions: entityType === 'LEAD' ? ['edit-leads'] : ['edit-deals'],
    });

  const hasMore =
    pagination != null && pagination.currentPage < pagination.totalPages;

  return (
    <div id="comments" className={className}>
      {!hideHeader ? (
        <div className="mb-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Comments
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Collaborate with your team on this record
          </p>
        </div>
      ) : null}

      {canCompose && (
        <div className="mb-6">
          <MentionTextarea
            placeholder="Write a comment… Use @ to mention someone"
            isSubmitting={createComment.isLoading}
            onSubmit={async ({ content, mentions }) => {
              try {
                await createComment.mutateAsync({
                  entityType,
                  entityId,
                  data: { content, mentions },
                });
                setPage(1);
                setAccumulated([]);
                toast.success('Comment added');
              } catch {
                toast.error('Unable to add comment');
              }
            }}
          />
        </div>
      )}

      {commentsQuery.isLoading && page === 1 ? (
        <ActivityTimelineSkeleton />
      ) : commentsQuery.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-white px-4 py-6">
          <p className="text-sm text-foreground">Unable to load comments.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border"
            onClick={() => void commentsQuery.refetch()}
          >
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-muted text-brand">
            <MessageSquare className="size-4" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No comments yet
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Start the conversation by adding the first comment.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <h4 className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h4>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-5">
                {group.items.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    entityType={entityType}
                    entityId={entityId}
                  />
                ))}
              </div>
            </section>
          ))}

          {hasMore && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-border"
                disabled={commentsQuery.isFetching}
                onClick={() => {
                  setAccumulated(comments);
                  setPage((p) => p + 1);
                }}
              >
                {commentsQuery.isFetching ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
