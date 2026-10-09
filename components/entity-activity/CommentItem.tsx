'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import AccessGuard from '@/utils/permissionGuard';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  useCreateCommentReply,
  useDeleteEntityComment,
  useUpdateEntityComment,
} from '@/store/server/features/entity-comments/mutations';
import { useCommentReplies } from '@/store/server/features/entity-comments/queries';
import type {
  CommentEntityType,
  EntityComment,
} from '@/store/server/features/entity-comments/types';
import { MentionTextarea } from './MentionTextarea';
import {
  formatCommentExactTime,
  formatCommentRelativeTime,
  initials,
  renderMentionedContent,
} from './utils';

interface CommentItemProps {
  comment: EntityComment;
  entityType: CommentEntityType;
  entityId: string;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  entityType,
  entityId,
  isReply = false,
}: CommentItemProps) {
  const currentUserId = useAuthenticationStore((s) => s.userId);
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const updateComment = useUpdateEntityComment();
  const deleteComment = useDeleteEntityComment();
  const createReply = useCreateCommentReply();

  const repliesQuery = useCommentReplies(comment.id, 1, 50);
  const loadedReplies = showAllReplies
    ? (repliesQuery.data?.data ?? comment.replies)
    : comment.replies;

  const isAuthor = comment.author?.id === currentUserId;
  const canModerate = AccessGuard.checkAnyAccess({
    permissions: entityType === 'LEAD' ? ['delete-leads'] : ['delete-deals'],
  });
  const canEdit = !comment.isDeleted && (isAuthor || canModerate);
  const canDelete = !comment.isDeleted && (isAuthor || canModerate);
  const canReply =
    !isReply &&
    !comment.isDeleted &&
    AccessGuard.checkAccess({
      permissions: entityType === 'LEAD' ? ['edit-leads'] : ['edit-deals'],
    });

  const authorName =
    comment.author?.name?.trim() ||
    comment.author?.email?.trim() ||
    'Unknown user';

  const mentionNames = useMemo(
    () =>
      (comment.mentions ?? [])
        .map((m) => m.user?.name?.trim() || m.user?.email?.trim() || '')
        .filter(Boolean),
    [comment.mentions],
  );

  const contentParts = useMemo(
    () =>
      comment.isDeleted
        ? []
        : renderMentionedContent(comment.content ?? '', mentionNames),
    [comment.content, comment.isDeleted, mentionNames],
  );

  return (
    <div className={cn('flex gap-3', isReply && 'ml-0')}>
      <Avatar className="mt-0.5 size-9 shrink-0">
        {comment.author?.avatarUrl ? (
          <AvatarImage src={comment.author.avatarUrl} alt={authorName} />
        ) : null}
        <AvatarFallback className="bg-brand-muted text-[11px] font-semibold text-brand">
          {initials(authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                {authorName}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <time
                      dateTime={comment.createdAt}
                      className="shrink-0 text-[12px] text-muted-foreground"
                    >
                      {formatCommentRelativeTime(comment.createdAt)}
                      {comment.isEdited && !comment.isDeleted ? (
                        <span aria-label="Edited"> · Edited</span>
                      ) : null}
                    </time>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatCommentExactTime(comment.createdAt)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {comment.author?.jobTitle ? (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {comment.author.jobTitle}
              </p>
            ) : null}
          </div>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Comment actions"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="z-[200] w-40"
              >
                {canEdit && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => setEditing(true)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {editing ? (
          <div className="mt-2.5">
            <MentionTextarea
              initialValue={comment.content ?? ''}
              initialMentions={(comment.mentions ?? []).map((m) => m.userId)}
              submitLabel="Save"
              compact
              autoFocus
              isSubmitting={updateComment.isLoading}
              onCancel={() => setEditing(false)}
              onSubmit={async ({ content, mentions }) => {
                try {
                  await updateComment.mutateAsync({
                    id: comment.id,
                    entityType,
                    entityId,
                    data: { content, mentions },
                  });
                  setEditing(false);
                  toast.success('Comment updated');
                } catch {
                  toast.error('Unable to update comment');
                }
              }}
            />
          </div>
        ) : (
          <div className="mt-1.5">
            {comment.isDeleted ? (
              <p className="text-[13px] italic text-muted-foreground">
                This comment was deleted.
              </p>
            ) : (
              <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-foreground/90">
                {contentParts.map((part, i) =>
                  part.mention ? (
                    <span key={i} className="font-semibold text-brand">
                      {part.text}
                    </span>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {canReply && (
            <button
              type="button"
              className="font-medium text-foreground/80 hover:text-foreground"
              onClick={() => setReplying((v) => !v)}
            >
              Reply
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-3">
            <MentionTextarea
              placeholder="Write a reply..."
              submitLabel="Reply"
              compact
              autoFocus
              isSubmitting={createReply.isLoading}
              onCancel={() => setReplying(false)}
              onSubmit={async ({ content, mentions }) => {
                try {
                  await createReply.mutateAsync({
                    commentId: comment.id,
                    entityType,
                    entityId,
                    data: { content, mentions },
                  });
                  setReplying(false);
                  toast.success('Reply added');
                } catch {
                  toast.error('Unable to add reply');
                }
              }}
            />
          </div>
        )}

        {!isReply && (loadedReplies.length > 0 || comment.replyCount > 0) && (
          <div className="mt-3 space-y-3 border-l border-border pl-3 sm:pl-4">
            {loadedReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                entityType={entityType}
                entityId={entityId}
                isReply
              />
            ))}
            {!showAllReplies && comment.replyCount > loadedReplies.length && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowAllReplies(true)}
                disabled={repliesQuery.isFetching}
              >
                {repliesQuery.isFetching
                  ? 'Loading…'
                  : `View ${comment.replyCount - loadedReplies.length} more ${
                      comment.replyCount - loadedReplies.length === 1
                        ? 'reply'
                        : 'replies'
                    }`}
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be removed from the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await deleteComment.mutateAsync({
                    id: comment.id,
                    entityType,
                    entityId,
                    parentCommentId: comment.parentCommentId,
                  });
                  toast.success('Comment deleted');
                } catch {
                  toast.error('Unable to delete comment');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
