'use client';

import {
  ActivityTimeline,
  EntityActivityFeed,
} from '@/components/entity-activity';
import type { ActivityEntityType } from '@/store/server/features/activity/types';
import type { CommentEntityType } from '@/store/server/features/entity-comments/types';
import { cn } from '@/lib/utils';

export function EntityDetailActivitySidebar({
  entityType,
  commentEntityType,
  entityId,
  entityName,
  canViewActivities = true,
  canViewComments = true,
  canCreateActivity = true,
  canCreateComment = true,
  className,
}: {
  entityType: ActivityEntityType;
  commentEntityType: CommentEntityType;
  entityId: string;
  entityName: string;
  canViewActivities?: boolean;
  canViewComments?: boolean;
  canCreateActivity?: boolean;
  canCreateComment?: boolean;
  className?: string;
}) {
  if (!canViewActivities && !canViewComments) {
    return null;
  }

  return (
    <aside
      className={cn(
        'space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto',
        className,
      )}
    >
      {canViewActivities ? (
        <div className="rounded-xl border border-border bg-surface-card shadow-xs">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Activity history
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Stage changes, field updates, logged activities, and system events
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <EntityActivityFeed
              entityType={entityType}
              entityId={entityId}
              relatedLabel={entityName}
              canLogActivity={canCreateActivity}
            />
          </div>
        </div>
      ) : null}

      {canViewComments ? (
        <div className="rounded-xl border border-border bg-surface-card shadow-xs">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Comments</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Team discussion and @mentions
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <ActivityTimeline
              entityType={commentEntityType}
              entityId={entityId}
              entityName={entityName}
              canCompose={canCreateComment}
              hideHeader
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
