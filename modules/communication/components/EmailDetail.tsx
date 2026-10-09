'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Forward,
  Image,
  Info,
  ListTodo,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommunicationStore } from '@/store/uistate/features/communication/communicationStore';
import { Email, EmailAttachment } from '@/modules/communication/data/mockData';
import { CRM_URL } from '@/utils/constants';
import {
  communicationAuthHeaders,
  useGetEmailAccounts,
  useGetEmailConversation,
} from '@/store/server/features/communication/queries';
import {
  mapCrmMessageToUi,
  mergeEmailDetailPreservingIdentity,
} from '@/store/server/features/communication/mappers';
import { splitQuotedEmailBody } from '@/modules/communication/utils/splitQuotedEmailBody';
import { prepareEmailBodyHtml } from '@/modules/communication/utils/signature-import-html.util';
import { useMailboxMessageActions } from '@/modules/communication/hooks/useMailboxMessageActions';
import { CommunicationAvatar } from '@/modules/communication/hooks/useCommunicationAvatar';
import { TaskFormModal } from '@/modules/communication/components/TaskFormModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function AttachmentIcon({ type }: { type: EmailAttachment['type'] }) {
  const config = {
    pdf: { icon: FileText, bg: 'bg-rose-50', text: 'text-rose-600' },
    doc: { icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
    xls: {
      icon: FileSpreadsheet,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    img: { icon: Image, bg: 'bg-violet-50', text: 'text-violet-600' },
    other: { icon: Paperclip, bg: 'bg-gray-50', text: 'text-gray-500' },
  };
  const { icon: Icon, bg, text } = config[type] || config.other;
  return (
    <div
      className={cn(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
        bg,
      )}
    >
      <Icon size={18} className={text} />
    </div>
  );
}

function AttachmentCard({
  attachment,
  accountId,
  messageId,
}: {
  attachment: EmailAttachment;
  accountId: string | null;
  messageId: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!accountId || downloading) return;
    setDownloading(true);
    try {
      const headers = await communicationAuthHeaders();
      const res = await fetch(
        `${CRM_URL}/communication/accounts/${accountId}/messages/${messageId}/attachments/${attachment.id}/content`,
        { headers },
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore — user can retry
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-md border border-[#E1DFDD] bg-[#FAF9F8] px-3 py-2.5 hover:border-[#C8C6C4] transition-colors">
      <AttachmentIcon type={attachment.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#242424]">
          {attachment.name}
        </p>
        <p className="text-[11px] text-[#605E5C]">{attachment.size}</p>
      </div>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={!accountId || downloading}
        className="flex-shrink-0 rounded p-1.5 text-[#605E5C] opacity-0 transition-all group-hover:opacity-100 hover:bg-white hover:text-primary disabled:opacity-40"
        aria-label="Download"
      >
        <Download size={13} />
      </button>
    </div>
  );
}

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

function SenderAvatar({
  name,
  email,
  accountId,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  email?: string;
  accountId?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <CommunicationAvatar
      accountId={accountId}
      email={email}
      name={name}
      avatarUrl={avatarUrl}
      className={cn('flex-shrink-0 rounded-full', sizeClass)}
      fallbackClassName={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-[#E1DFDD] text-[13px] font-semibold text-[#605E5C]',
        sizeClass,
      )}
    />
  );
}

function RecipientChip({ name, email }: { name: string; email?: string }) {
  const addr = (email || '').trim();
  const rawName = (name || '').trim();
  // Prefer a clean display name; never strip a short email fragment from a longer address.
  let nameWithoutAddr = rawName
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
  if (
    addr &&
    nameWithoutAddr.toLowerCase() !== addr.toLowerCase() &&
    // Only remove email when it appears as its own token, not as a suffix of a longer local-part
    new RegExp(
      `(^|[\\s,;])${addr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s,;])`,
      'i',
    ).test(rawName)
  ) {
    nameWithoutAddr = nameWithoutAddr
      .replace(
        new RegExp(addr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'),
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }
  const displayName =
    nameWithoutAddr && nameWithoutAddr.toLowerCase() !== addr.toLowerCase()
      ? nameWithoutAddr
      : '';

  if (!addr && !displayName) {
    return <span className="text-[#605E5C]">—</span>;
  }

  if (!addr) {
    return (
      <span className="text-[13px] text-[#242424]" title={displayName}>
        {displayName}
      </span>
    );
  }

  return (
    <span className="inline text-[13px] text-[#242424]" title={addr}>
      {displayName ? (
        <>
          {displayName} <span className="text-[#605E5C]">&lt;{addr}&gt;</span>
        </>
      ) : (
        addr
      )}
    </span>
  );
}

function normalizeEmailBody(raw: string): string {
  if (!raw) return '';
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      .replace(/\r\n|\r|\n/g, '<br/>');
  }
  // Dead signature CDNs + hotlink-friendly img attrs for external banners.
  return prepareEmailBodyHtml(raw);
}

function formatMessageDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function emailsMatch(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

function snippetFromMessage(message: Email, maxLen = 160): string {
  const raw = message.bodyPreview || message.body || '';
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function plainTextFromEmail(message: Email): string {
  const raw = message.body || message.bodyPreview || '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4000);
}

function replySubject(subject: string) {
  return subject.startsWith('Re:') ? subject : `Re: ${subject}`;
}

function forwardSubject(subject: string) {
  return subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;
}

/** Renders message body with Outlook-style inline … for hidden quoted history. */
function EmailBodyWithQuoteToggle({
  html,
  enableQuoteCollapse,
}: {
  html: string;
  enableQuoteCollapse: boolean;
}) {
  const [showQuoted, setShowQuoted] = useState(false);

  const { latest, quoted } = useMemo(() => {
    if (!enableQuoteCollapse) {
      return { latest: html, quoted: null as string | null };
    }
    return splitQuotedEmailBody(html);
  }, [html, enableQuoteCollapse]);

  useEffect(() => {
    setShowQuoted(false);
  }, [html]);

  return (
    <div>
      <div
        className="email-body-html text-[14px] leading-[1.5] text-[#242424]"
        dangerouslySetInnerHTML={{ __html: latest }}
      />

      {quoted ? (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E1DFDD]" />
            <button
              type="button"
              onClick={() => setShowQuoted((v) => !v)}
              className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border border-brand-border bg-brand-muted px-3 text-[13px] font-bold tracking-widest text-primary hover:brightness-95"
              aria-expanded={showQuoted}
              aria-label={
                showQuoted ? 'Hide quoted history' : 'Show quoted history'
              }
              title={showQuoted ? 'Hide quoted history' : 'Show quoted history'}
            >
              ···
            </button>
            <div className="h-px flex-1 bg-[#E1DFDD]" />
          </div>

          {showQuoted ? (
            <div
              className="email-body-html email-body-quoted mt-3 border-l-2 border-[#C8C6C4] pl-4 text-[13px] leading-[1.45] text-[#605E5C]"
              dangerouslySetInnerHTML={{ __html: quoted }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConversationMessageCard({
  message,
  accountId,
  isSelfReply,
  initiallyExpanded,
  enableQuoteCollapse,
  onReply,
  onReplyAll,
  onForward,
}: {
  message: Email;
  accountId: string | null;
  isSelfReply: boolean;
  initiallyExpanded: boolean;
  enableQuoteCollapse: boolean;
  onReply: (message: Email) => void;
  onReplyAll: (message: Email) => void;
  onForward: (message: Email) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  useEffect(() => {
    setIsExpanded(initiallyExpanded);
  }, [initiallyExpanded, message.id]);

  const bodyHtml = normalizeEmailBody(
    message.body || message.bodyPreview || '',
  );
  const senderLabel = displayPersonName(
    message.from.name || message.from.email || 'Unknown',
    message.from.email,
  );
  const snippet = snippetFromMessage(message);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex w-full items-center gap-3 border-b border-[#EDEBE9] px-1 py-2.5 text-left transition-colors hover:bg-[#F3F2F1]',
          isSelfReply && 'bg-brand-muted/25',
        )}
        aria-expanded={false}
      >
        <SenderAvatar
          name={senderLabel}
          email={message.from.email}
          accountId={accountId}
          avatarUrl={message.from.avatarUrl ?? message.senderAvatarUrl}
          size="sm"
        />
        <span className="w-[140px] flex-shrink-0 truncate text-[13px] font-semibold text-[#242424] sm:w-[180px]">
          {isSelfReply ? 'You' : senderLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-[#605E5C]">
          {snippet || '—'}
        </span>
        <time className="flex-shrink-0 whitespace-nowrap text-[12px] text-[#605E5C]">
          {formatMessageDate(message.date)}
        </time>
      </button>
    );
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-lg border',
        isSelfReply
          ? 'border-brand-border/70 bg-brand-muted/20'
          : 'border-[#E1DFDD] bg-white',
      )}
    >
      {isSelfReply && (
        <div
          className="flex items-center gap-2 border-b border-brand-border/50 bg-brand-muted/70 px-4 py-2.5 text-[13px] text-[#323130]"
          role="status"
        >
          <Info size={15} className="flex-shrink-0 text-primary" aria-hidden />
          <span>
            You replied on{' '}
            <span className="font-medium">
              {formatMessageDate(message.date)}
            </span>
          </span>
        </div>
      )}

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="mb-3 flex w-full items-start gap-3 text-left"
          aria-expanded={true}
          aria-label="Collapse message"
        >
          <SenderAvatar
            name={senderLabel}
            email={message.from.email}
            accountId={accountId}
            avatarUrl={message.from.avatarUrl ?? message.senderAvatarUrl}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className="truncate text-[15px] font-semibold leading-tight text-primary"
              title={message.from.email}
            >
              {isSelfReply ? 'You' : senderLabel}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[13px] text-[#242424]">
              <span className="flex-shrink-0 text-[#605E5C]">To:</span>
              {message.to.length > 0 ? (
                message.to.map((r, i) => (
                  <React.Fragment key={`${message.id}-${r.email}-${r.name}`}>
                    {i > 0 ? <span className="text-[#605E5C]">,</span> : null}
                    <RecipientChip name={r.name || r.email} email={r.email} />
                  </React.Fragment>
                ))
              ) : (
                <span className="text-[#605E5C]">—</span>
              )}
            </div>
            {message.cc && message.cc.length > 0 && (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[13px] text-[#242424]">
                <span className="flex-shrink-0 text-[#605E5C]">Cc:</span>
                {message.cc.map((r, i) => (
                  <React.Fragment key={`cc-${message.id}-${r.email}`}>
                    {i > 0 ? <span className="text-[#605E5C]">,</span> : null}
                    <RecipientChip name={r.name || r.email} email={r.email} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <time className="flex-shrink-0 pt-1 text-[12px] text-[#605E5C]">
            {formatMessageDate(message.date)}
          </time>
        </button>

        <EmailBodyWithQuoteToggle
          html={bodyHtml}
          enableQuoteCollapse={enableQuoteCollapse}
        />

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#605E5C]">
              <Paperclip size={12} />
              <span>
                {message.attachments.length} Attachment
                {message.attachments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {message.attachments.map((att) => (
                <AttachmentCard
                  key={att.id}
                  attachment={att}
                  accountId={accountId}
                  messageId={message.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-[#EDEBE9] bg-[#FAF9F8]/80 px-4 py-3">
        <button
          type="button"
          onClick={() => onReply(message)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E1DFDD] bg-white px-3 py-1.5 text-[13px] font-medium text-[#242424] hover:border-primary/40 hover:bg-brand-muted/40 hover:text-primary transition-colors"
        >
          <Reply size={14} />
          Reply
        </button>
        <button
          type="button"
          onClick={() => onReplyAll(message)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E1DFDD] bg-white px-3 py-1.5 text-[13px] font-medium text-[#242424] hover:border-primary/40 hover:bg-brand-muted/40 hover:text-primary transition-colors"
        >
          <ReplyAll size={14} />
          Reply All
        </button>
        <button
          type="button"
          onClick={() => onForward(message)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E1DFDD] bg-white px-3 py-1.5 text-[13px] font-medium text-[#242424] hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <Forward size={14} />
          Forward
        </button>
      </footer>
    </article>
  );
}

interface Props {
  email: Email;
  onBack: () => void;
}

export default function EmailDetail({ email, onBack }: Props) {
  const { openCompose, activeAccountId } = useCommunicationStore();
  const { setRead, toggleStarred, moveToArchive, removeMessage } =
    useMailboxMessageActions();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const { data: accounts = [] } = useGetEmailAccounts(Boolean(activeAccountId));
  const accountEmail =
    accounts.find((a) => a.id === activeAccountId)?.emailAddress ?? '';

  const conversationId = email.providerConversationId || null;
  const { data: conversation, isLoading: conversationLoading } =
    useGetEmailConversation(activeAccountId, conversationId);

  const threadMessages = useMemo(() => {
    if (conversation?.items?.length) {
      return conversation.items.map((item) => {
        const mapped = mapCrmMessageToUi(item, {
          folder: email.folder,
          detail: item,
        });
        if (item.id === email.id) {
          return mergeEmailDetailPreservingIdentity(email, mapped);
        }
        return mapped;
      });
    }
    return [email];
  }, [conversation?.items, email]);

  const threadSubject =
    threadMessages.find((m) => m.id === email.id)?.subject ||
    threadMessages[0]?.subject ||
    email.subject ||
    '(No Subject)';

  const handleReply = (msg: Email) => {
    const to =
      emailsMatch(msg.from.email, accountEmail) && msg.to[0]?.email
        ? msg.to[0].email
        : msg.from.email;
    openCompose({
      to,
      cc: '',
      subject: replySubject(msg.subject),
      body: `<br/><br/>`,
      replyTo: msg,
      composeMode: 'reply',
    });
  };

  const handleReplyAll = (msg: Email) => {
    const toCandidates = [
      ...(emailsMatch(msg.from.email, accountEmail) ? [] : [msg.from]),
      ...msg.to.filter((r) => r.email && !emailsMatch(r.email, accountEmail)),
    ];
    const toUnique = new Map(
      toCandidates.map((r) => [r.email.toLowerCase(), r]),
    );
    const toList = [...toUnique.values()];
    const toEmails = new Set(toList.map((r) => r.email.toLowerCase()));

    const ccList = [...(msg.cc || [])]
      .filter(
        (r) =>
          r.email &&
          !emailsMatch(r.email, accountEmail) &&
          !toEmails.has(r.email.toLowerCase()),
      )
      .filter(
        (r, i, arr) =>
          arr.findIndex(
            (x) => x.email.toLowerCase() === r.email.toLowerCase(),
          ) === i,
      );

    openCompose({
      to: toList.map((r) => r.email).join(', '),
      cc: ccList.map((r) => r.email).join(', '),
      subject: replySubject(msg.subject),
      body: `<br/><br/>`,
      replyTo: msg,
      composeMode: 'replyAll',
    });
  };

  const handleForward = (msg: Email) => {
    openCompose({
      to: '',
      cc: '',
      subject: forwardSubject(msg.subject),
      // Graph createForward embeds the original message + attachments.
      body: `<br/><br/>`,
      replyTo: msg,
      composeMode: 'forward',
    });
  };

  const openTaskFromEmail = () => {
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex flex-shrink-0 items-center gap-0.5 border-b border-border px-2 py-1.5 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className="mr-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground md:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft size={16} />
        </button>

        <ToolbarBtn
          icon={<Reply size={15} />}
          label="Reply"
          onClick={() => handleReply(email)}
        />
        <ToolbarBtn
          icon={<ReplyAll size={15} />}
          label="Reply all"
          onClick={() => handleReplyAll(email)}
        />
        <ToolbarBtn
          icon={<Forward size={15} />}
          label="Forward"
          onClick={() => handleForward(email)}
        />
        <ToolbarBtn
          icon={<ListTodo size={15} />}
          label="Create task"
          onClick={openTaskFromEmail}
        />

        <div className="mx-1.5 h-4 w-px bg-border" />

        <ToolbarBtn
          icon={<Archive size={15} />}
          label="Archive"
          onClick={() => void moveToArchive(email.id, onBack)}
          disabled={email.folder === 'archive'}
        />
        <ToolbarBtn
          icon={
            <Star
              size={15}
              className={cn(email.isStarred && 'fill-amber-400 text-amber-400')}
            />
          }
          label={email.isStarred ? 'Unstar' : 'Star'}
          onClick={() => void toggleStarred(email.id)}
        />
        <ToolbarBtn
          icon={<Trash2 size={15} />}
          label="Delete"
          onClick={() => void removeMessage(email.id, onBack)}
          danger
        />

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
                aria-label="More actions"
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void setRead(email.id, false)}>
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void toggleStarred(email.id)}>
                {email.isStarred ? 'Remove star' : 'Add star'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void moveToArchive(email.id, onBack)}
                disabled={email.folder === 'archive'}
              >
                Move to archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void removeMessage(email.id, onBack)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-5">
          <h1 className="mb-4 text-[20px] font-semibold leading-snug tracking-tight text-[#242424]">
            {threadSubject}
          </h1>

          {conversationLoading && conversationId ? (
            <p className="mb-4 text-[13px] text-[#605E5C]">
              Loading conversation…
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {threadMessages.map((msg) => (
              <ConversationMessageCard
                key={msg.id}
                message={msg}
                accountId={activeAccountId}
                isSelfReply={emailsMatch(msg.from.email, accountEmail)}
                initiallyExpanded={msg.id === email.id}
                enableQuoteCollapse={threadMessages.length > 1}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .email-body-html {
          font-family:
            'Segoe UI',
            'Segoe UI Web (West European)',
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Helvetica Neue',
            Arial,
            sans-serif;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .email-body-html a {
          color: var(--color-brand);
          text-decoration: underline;
        }
        .email-body-html img {
          max-width: 100%;
        }
        .email-body-html p {
          margin: 0 0 0.75em;
        }
        .email-body-html p:last-child {
          margin-bottom: 0;
        }
        .email-body-html blockquote {
          margin: 0.75em 0;
          padding-left: 12px;
          border-left: 2px solid #c8c6c4;
          color: #323130;
        }
        .email-body-html hr {
          border: none;
          border-top: 1px solid #e1dfdd;
          margin: 12px 0;
        }
        .email-body-html table {
          max-width: 100%;
          border-collapse: collapse;
        }
        .email-body-html pre {
          white-space: pre-wrap;
          font-family: inherit;
        }
      `}</style>
      {isTaskModalOpen && (
        <TaskFormModal
          key={`email-task-${email.id}`}
          initialValues={{
            title: email.subject || 'Follow up on email',
            description: plainTextFromEmail(email),
          }}
          onClose={() => setIsTaskModalOpen(false)}
        />
      )}
    </div>
  );
}

interface ToolbarBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
        disabled && 'pointer-events-none opacity-30',
        danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
