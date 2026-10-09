'use client';

import React, { useMemo } from 'react';
import { Paperclip, Search, Star, X, MailOpen, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getEmailsForFolder,
  MailNavKey,
  useCommunicationStore,
} from '@/store/uistate/features/communication/communicationStore';
import { Email } from '@/modules/communication/data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { useMailboxMessageActions } from '@/modules/communication/hooks/useMailboxMessageActions';
import { CommunicationAvatar } from '@/modules/communication/hooks/useCommunicationAvatar';
import { EmailListSkeleton } from '@/components/loading/skeleton-screens';

function displayPersonName(name: string, email?: string) {
  const cleaned = name
    .replace(/\s*<[^>]*>?\s*$/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned && cleaned.toLowerCase() !== (email || '').toLowerCase()) {
    return cleaned;
  }
  return email?.trim() || cleaned || 'Unknown';
}

const FOLDER_LABELS: Record<MailNavKey, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 1000 / 3600;
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffHours < 24 * 7) {
    return formatDistanceToNow(date, { addSuffix: false })
      .replace('about ', '')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' minutes', 'm')
      .replace(' days', 'd')
      .replace(' day', 'd');
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const AVATAR_SOFT = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
];

function AvatarInitials({
  name,
  email,
  accountId,
  avatarUrl,
}: {
  name: string;
  email?: string;
  accountId?: string | null;
  avatarUrl?: string | null;
}) {
  const label = displayPersonName(name, email);
  const idx =
    (label.charCodeAt(0) + (label.charCodeAt(1) || 0)) % AVATAR_SOFT.length;

  return (
    <CommunicationAvatar
      accountId={accountId}
      email={email}
      name={label}
      avatarUrl={avatarUrl}
      className="h-9 w-9 flex-shrink-0 rounded-full"
      fallbackClassName={cn(
        'h-9 w-9 flex-shrink-0 rounded-full text-[11px] font-semibold',
        AVATAR_SOFT[idx],
      )}
    />
  );
}

interface EmailRowProps {
  email: Email;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
  showFolder?: boolean;
  accountId?: string | null;
}

function EmailRow({
  email,
  isSelected,
  onSelect,
  onToggleStar,
  showFolder,
  accountId,
}: EmailRowProps) {
  const displayName =
    email.folder === 'sent' || email.folder === 'drafts'
      ? displayPersonName(
          email.to[0]?.name || email.to[0]?.email || 'Unknown',
          email.to[0]?.email,
        )
      : displayPersonName(email.from.name, email.from.email);
  const displayEmail =
    email.folder === 'sent' || email.folder === 'drafts'
      ? email.to[0]?.email
      : email.from.email;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group relative flex w-full cursor-pointer items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors',
        isSelected
          ? 'bg-brand-muted/80'
          : !email.isRead
            ? 'bg-brand-muted/45 hover:bg-brand-muted/65'
            : 'hover:bg-surface-elevated',
      )}
    >
      {!email.isRead && (
        <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand" />
      )}

      <AvatarInitials
        name={displayName}
        email={displayEmail}
        accountId={accountId}
        avatarUrl={email.from.avatarUrl ?? email.senderAvatarUrl}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm leading-snug',
              email.isRead
                ? 'font-medium text-foreground'
                : 'font-semibold text-foreground',
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              'flex-shrink-0 text-[11px] tabular-nums',
              email.isRead
                ? 'text-muted-foreground'
                : 'font-medium text-foreground',
            )}
          >
            {formatDate(email.date)}
          </span>
        </div>

        <p
          className={cn(
            'mt-0.5 truncate text-[13px] leading-snug',
            email.isRead
              ? 'text-muted-foreground'
              : 'font-medium text-foreground',
          )}
        >
          {email.subject || '(No subject)'}
        </p>

        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground/80">
            {email.bodyPreview}
          </p>
          <div className="flex flex-shrink-0 items-center gap-1">
            {showFolder && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                {email.folder}
              </span>
            )}
            {email.hasAttachments && (
              <Paperclip size={12} className="text-muted-foreground/50" />
            )}
            {email.threadCount && email.threadCount > 1 && (
              <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                {email.threadCount}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleStar}
              className={cn(
                'rounded p-0.5 transition-opacity',
                email.isStarred
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
              )}
              aria-label={email.isStarred ? 'Unstar' : 'Star'}
            >
              <Star
                size={13}
                className={cn(
                  email.isStarred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/40 hover:text-amber-400',
                )}
              />
            </button>
          </div>
        </div>

        {email.tags && email.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {email.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded border border-brand/15 bg-brand-muted px-1.5 py-px text-[10px] font-medium text-brand"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailList({
  isLoading = false,
}: {
  isLoading?: boolean;
}) {
  const {
    emails,
    activeFolder,
    selectedEmailId,
    setSelectedEmailId,
    searchQuery,
    setSearchQuery,
    activeAccountId,
  } = useCommunicationStore();
  const { setRead, toggleStarred } = useMailboxMessageActions();

  const filtered = useMemo(() => {
    const folderEmails = getEmailsForFolder(emails, activeFolder);
    const sorted = [...folderEmails].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.from.name.toLowerCase().includes(q) ||
        e.from.email.toLowerCase().includes(q) ||
        e.bodyPreview.toLowerCase().includes(q),
    );
  }, [emails, activeFolder, searchQuery]);

  const unreadCount = useMemo(
    () =>
      getEmailsForFolder(emails, activeFolder).filter((e) => !e.isRead).length,
    [emails, activeFolder],
  );

  const handleSelect = (email: Email) => {
    setSelectedEmailId(email.id);
    if (!email.isRead) {
      void setRead(email.id, true);
    }
  };

  if (isLoading && filtered.length === 0) {
    return <EmailListSkeleton />;
  }

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex-shrink-0 border-b border-border px-3 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {FOLDER_LABELS[activeFolder]}
            </h2>
            {unreadCount > 0 && (
              <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold leading-none text-brand-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
          />
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface-page py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-shadow focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-page">
              {searchQuery ? (
                <Search size={20} className="text-muted-foreground/35" />
              ) : unreadCount === 0 ? (
                <MailOpen size={20} className="text-muted-foreground/35" />
              ) : (
                <Mail size={20} className="text-muted-foreground/35" />
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">No messages</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : `${FOLDER_LABELS[activeFolder]} is empty`}
            </p>
          </div>
        ) : (
          filtered.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              accountId={activeAccountId}
              isSelected={selectedEmailId === email.id}
              showFolder={activeFolder === 'starred'}
              onSelect={() => handleSelect(email)}
              onToggleStar={(e) => {
                e.stopPropagation();
                void toggleStarred(email.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
