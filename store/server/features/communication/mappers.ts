import type {
  Email,
  EmailAccount,
  EmailAttachment,
  EmailFolder,
} from '@/modules/communication/data/mockData';
import type {
  CrmEmailAccount,
  CrmEmailAttachment,
  CrmEmailFolder,
  CrmEmailFolderWellKnown,
  CrmEmailMessageDetail,
  CrmEmailMessageSummary,
  CrmEmailRecipient,
} from './types';

const ACCOUNT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-indigo-500',
];

export function mapProviderToUi(
  provider: CrmEmailAccount['provider'],
): EmailAccount['provider'] {
  if (provider === 'microsoft365' || provider === 'exchange') return 'outlook';
  if (provider === 'gmail') return 'gmail';
  return 'custom';
}

export function mapCrmAccountToUi(
  account: CrmEmailAccount,
  index = 0,
): EmailAccount {
  return {
    id: account.id,
    name: account.displayName || account.emailAddress,
    email: account.emailAddress,
    provider: mapProviderToUi(account.provider),
    isDefault: account.isDefault,
    lastSelectedAt: account.lastSelectedAt ?? null,
    color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
    status: account.status,
    gmailPubSubWatchActive: account.gmailPubSubWatch?.active === true,
  } as EmailAccount;
}

export function mapWellKnownToUiFolder(
  wellKnown: CrmEmailFolderWellKnown | string | null | undefined,
): EmailFolder | null {
  switch (wellKnown) {
    case 'inbox':
      return 'inbox';
    case 'sent':
      return 'sent';
    case 'drafts':
      return 'drafts';
    case 'archive':
      return 'archive';
    default:
      return null;
  }
}

export function buildFolderIdByUiFolder(
  folders: CrmEmailFolder[],
): Partial<Record<EmailFolder, string>> {
  const map: Partial<Record<EmailFolder, string>> = {};
  for (const folder of folders) {
    const ui = mapWellKnownToUiFolder(folder.wellKnownType);
    if (ui && !map[ui]) {
      map[ui] = folder.id;
    }
  }
  return map;
}

function formatBytes(sizeBytes: string | null | undefined): string {
  const n = Number(sizeBytes || 0);
  if (!n || Number.isNaN(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentType(
  mimeType: string | null | undefined,
  filename: string | null | undefined,
): EmailAttachment['type'] {
  const mime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return 'doc';
  if (
    mime.includes('sheet') ||
    mime.includes('excel') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsx')
  )
    return 'xls';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name))
    return 'img';
  return 'other';
}

function mapAttachments(
  attachments?: CrmEmailAttachment[],
): EmailAttachment[] | undefined {
  if (!attachments?.length) return undefined;
  // Inline CID images belong in the HTML body; show file attachments in the strip.
  const visible = attachments.filter((a) => !a.isInline);
  if (!visible.length) return undefined;
  return visible.map((a) => ({
    id: a.id,
    name: a.filename || 'attachment',
    size: formatBytes(a.sizeBytes),
    type: attachmentType(a.mimeType, a.filename),
  }));
}

function recipientsByType(
  recipients: CrmEmailRecipient[] | undefined,
  type: CrmEmailRecipient['type'],
) {
  return (recipients || [])
    .filter((r) => r.type === type && r.email)
    .map((r) => ({
      name: r.name || r.email,
      email: r.email,
    }));
}

function displayAddress(addr: { name: string; email: string } | undefined) {
  if (!addr) return { name: 'Unknown', email: '' };
  const email = addr.email || '';
  const rawName = (addr.name && addr.name.trim()) || '';
  const cleaned = rawName
    .replace(/\s*<[^>]*>?\s*$/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name =
    (cleaned && cleaned.toLowerCase() !== email.toLowerCase() ? cleaned : '') ||
    (email.includes('@') ? email.split('@')[0] : email) ||
    'Unknown';
  return { name, email };
}

function hasAddress(addr: { name: string; email: string } | undefined) {
  return Boolean(addr?.email?.trim());
}

/** Keep list identity when a detail refetch races sync recipient replace. */
export function mergeEmailDetailPreservingIdentity(
  existing: Email | undefined,
  incoming: Email,
): Email {
  if (!existing) return incoming;

  const subject =
    incoming.subject &&
    incoming.subject !== '(No Subject)' &&
    incoming.subject.trim()
      ? incoming.subject
      : existing.subject;

  const from = hasAddress(incoming.from)
    ? {
        ...incoming.from,
        avatarUrl:
          incoming.from.avatarUrl ??
          existing.from.avatarUrl ??
          incoming.senderAvatarUrl ??
          existing.senderAvatarUrl ??
          null,
      }
    : existing.from;
  const to = incoming.to.some((t) => hasAddress(t)) ? incoming.to : existing.to;
  const cc = incoming.cc?.some((c) => hasAddress(c))
    ? incoming.cc
    : existing.cc;

  return {
    ...existing,
    ...incoming,
    subject,
    from,
    to,
    cc,
    senderAvatarUrl: incoming.senderAvatarUrl ?? existing.senderAvatarUrl,
    body: incoming.body?.trim() ? incoming.body : existing.body,
    bodyPreview: incoming.bodyPreview?.trim()
      ? incoming.bodyPreview
      : existing.bodyPreview,
    attachments: incoming.attachments?.length
      ? incoming.attachments
      : existing.attachments,
  };
}

export function mapCrmMessageToUi(
  message: CrmEmailMessageSummary | CrmEmailMessageDetail,
  options: {
    folder: EmailFolder;
    detail?: CrmEmailMessageDetail;
  },
): Email {
  const detail = options.detail;
  const recipients = detail?.recipients || message.recipients;
  const fromList = recipientsByType(recipients, 'from');
  const toList = recipientsByType(recipients, 'to');
  const ccList = recipientsByType(detail?.recipients || recipients, 'cc');

  const body =
    (detail?.bodyHtml && detail.bodyHtml.trim()) ||
    (detail?.bodyText && detail.bodyText.trim()) ||
    message.bodyPreview ||
    '';

  const fromAddr = displayAddress(fromList[0]);
  const senderAvatarUrl =
    'senderAvatarUrl' in message ? (message.senderAvatarUrl ?? null) : null;

  return {
    id: message.id,
    folder: options.folder,
    subject: message.subject || '(No Subject)',
    from: {
      ...fromAddr,
      avatarUrl: senderAvatarUrl,
    },
    to: toList.length
      ? toList.map((t) => displayAddress(t))
      : [{ name: '', email: '' }],
    cc: ccList.length ? ccList.map((c) => displayAddress(c)) : undefined,
    body,
    bodyPreview: message.bodyPreview || '',
    date: message.receivedAt || message.sentAt || new Date().toISOString(),
    isRead: message.isRead,
    isStarred: message.isStarred,
    hasAttachments: message.hasAttachments,
    attachments: mapAttachments(detail?.attachments),
    tags: detail?.categories,
    providerConversationId:
      detail?.providerConversationId ?? message.providerConversationId ?? null,
    senderAvatarUrl,
  };
}

/** Prefer system folders first, then alpha by display name. */
export function sortCrmFoldersForUi(
  folders: CrmEmailFolder[],
): CrmEmailFolder[] {
  const order: Record<string, number> = {
    inbox: 0,
    sent: 1,
    drafts: 2,
    archive: 3,
    deleted: 4,
    junk: 5,
    outbox: 6,
  };
  return [...folders]
    .filter((f) => !f.isHidden)
    .sort((a, b) => {
      const ao = order[a.wellKnownType] ?? 50;
      const bo = order[b.wellKnownType] ?? 50;
      if (ao !== bo) return ao - bo;
      return a.displayName.localeCompare(b.displayName);
    });
}
