'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { AtSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type { PlatformUser } from '@/store/server/features/userManagement/types';
import { COMMENT_CONTENT_MAX_LENGTH } from '@/store/server/features/entity-comments/types';
import { initials } from './utils';

export interface MentionDraft {
  content: string;
  mentions: string[];
}

interface MentionTextareaProps {
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  initialMentions?: string[];
  disabled?: boolean;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
  onSubmit: (draft: MentionDraft) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
}

function displayName(user: PlatformUser): string {
  return (
    user.name?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    'User'
  );
}

export function MentionTextarea({
  placeholder = 'Write a comment...',
  submitLabel = 'Comment',
  initialValue = '',
  initialMentions = [],
  disabled,
  isSubmitting,
  autoFocus,
  compact,
  onSubmit,
  onCancel,
  className,
}: MentionTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const [mentionIds, setMentionIds] = useState<string[]>(initialMentions);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: usersData } = useGetPlatformUsers({
    pageSize: 1000,
  });

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const users = usersData?.data ?? [];
    const q = mentionQuery.toLowerCase();
    return users
      .filter((u) => {
        const name = displayName(u).toLowerCase();
        const email = (u.email ?? '').toLowerCase();
        return !q || name.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [mentionQuery, usersData?.data]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const detectMention = useCallback((text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = before.match(/(^|\s)@([^\s@]*)$/);
    if (!match) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(match[2] ?? '');
    setMentionIndex(0);
  }, []);

  const insertMention = useCallback(
    (user: PlatformUser) => {
      const el = textareaRef.current;
      if (!el) return;
      const caret = el.selectionStart;
      const before = value.slice(0, caret);
      const after = value.slice(caret);
      const match = before.match(/(^|\s)@([^\s@]*)$/);
      if (!match) return;
      const start = before.length - (match[2]?.length ?? 0) - 1;
      const name = displayName(user);
      const next = `${before.slice(0, start)}@${name} ${after}`;
      setValue(next);
      setMentionIds((prev) =>
        prev.includes(user.id) ? prev : [...prev, user.id],
      );
      setMentionQuery(null);
      requestAnimationFrame(() => {
        const pos = start + name.length + 2;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [value],
  );

  const canSubmit =
    value.trim().length > 0 &&
    value.trim().length <= COMMENT_CONTENT_MAX_LENGTH &&
    !disabled &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ content: value.trim(), mentions: mentionIds });
    setValue('');
    setMentionIds([]);
    setMentionQuery(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const user = suggestions[mentionIndex];
        if (user) insertMention(user);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className={cn('relative space-y-2', className)}>
      <div className="rounded-md border border-border bg-white focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/30">
        <Textarea
          ref={textareaRef}
          value={value}
          disabled={disabled || isSubmitting}
          onChange={(e) => {
            const next = e.target.value.slice(0, COMMENT_CONTENT_MAX_LENGTH);
            setValue(next);
            detectMention(next, e.target.selectionStart);
          }}
          onKeyDown={onKeyDown}
          onClick={(e) =>
            detectMention(
              value,
              (e.target as HTMLTextAreaElement).selectionStart,
            )
          }
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            'min-h-[88px] resize-y border-0 bg-transparent text-[13.5px] leading-relaxed shadow-none focus-visible:ring-0',
            compact && 'min-h-[64px]',
          )}
        />
        {mentionQuery !== null && suggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Mention suggestions"
            className="absolute left-0 right-0 z-20 mx-2 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-white py-1 shadow-md"
          >
            {suggestions.map((user, index) => {
              const name = displayName(user);
              return (
                <li
                  key={user.id}
                  role="option"
                  aria-selected={index === mentionIndex}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover',
                      index === mentionIndex && 'bg-surface-hover',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(user);
                    }}
                  >
                    <Avatar className="size-8 shrink-0">
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={name} />
                      ) : null}
                      <AvatarFallback className="bg-brand-muted text-[10px] font-semibold text-brand">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email || 'No email'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            disabled={disabled || isSubmitting}
            onClick={() => {
              const el = textareaRef.current;
              if (!el) return;
              const caret = el.selectionStart;
              const next = `${value.slice(0, caret)}@${value.slice(caret)}`;
              setValue(next);
              setMentionQuery('');
              requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(caret + 1, caret + 1);
              });
            }}
            aria-label="Insert mention"
          >
            <AtSign className="size-3.5" />
            Mention
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {value.length}/{COMMENT_CONTENT_MAX_LENGTH}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-border"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 bg-brand text-brand-foreground hover:bg-brand-hover"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            aria-label={submitLabel}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1 size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
