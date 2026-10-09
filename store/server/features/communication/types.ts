export type CrmEmailProvider =
  | 'microsoft365'
  | 'gmail'
  | 'imap'
  | 'exchange'
  | 'yahoo'
  | 'zoho';

export type CrmEmailFolderWellKnown =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'deleted'
  | 'junk'
  | 'archive'
  | 'outbox'
  | 'conversation_history'
  | 'other'
  | 'unknown';

export interface CrmCommunicationSettings {
  sync: {
    cronEnabled: boolean;
    mailPollingEnabled: boolean;
    gmailPubSubEnabled: boolean;
  };
  gmailPubSub: {
    configured: boolean;
  };
}

export interface CrmGmailPubSubWatch {
  /** users.watch registered against our topic and not expired */
  active: boolean;
  expirationAt: string | null;
  lastPushAt: string | null;
  topicName: string | null;
}

export interface CrmEmailAccount {
  id: string;
  provider: CrmEmailProvider;
  status: string;
  emailAddress: string;
  displayName: string | null;
  isDefault: boolean;
  lastSelectedAt?: string | null;
  syncEnabled: boolean;
  syncMode?: string;
  lastFullSyncAt?: string | null;
  lastIncrementalSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncErrorCode?: string | null;
  lastSyncErrorMessage?: string | null;
  syncProgressPercent?: number;
  syncMessagesSynced?: number;
  syncMessagesTotal?: number;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Gmail only — null/absent for other providers */
  gmailPubSubWatch?: CrmGmailPubSubWatch | null;
}

export interface CrmEmailFolder {
  id: string;
  providerFolderId: string;
  parentFolderId: string | null;
  displayName: string;
  wellKnownType: CrmEmailFolderWellKnown;
  path: string | null;
  depth: number;
  isHidden: boolean;
  isSystem: boolean;
  totalItems: number;
  unreadItems: number;
  childFolderCount: number;
}

export interface CrmEmailRecipient {
  type: 'from' | 'to' | 'cc' | 'bcc' | 'reply_to';
  name: string | null;
  email: string;
}

export interface CrmEmailAttachment {
  id: string;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  contentId: string | null;
  isInline: boolean;
}

export interface CrmEmailMessageSummary {
  id: string;
  folderId: string | null;
  providerConversationId: string | null;
  subject: string | null;
  bodyPreview: string | null;
  isRead: boolean;
  isDraft: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Present on list responses (from/to) and full detail. */
  recipients?: CrmEmailRecipient[];
  /** Pre-minted signed avatar URL for the list row display person (from or to in sent/drafts). */
  senderAvatarUrl?: string | null;
}

export interface CrmEmailMessageDetail extends CrmEmailMessageSummary {
  bodyHtml?: string | null;
  bodyText?: string | null;
  bodyContentType?: string | null;
  headers?: Record<string, unknown>;
  replyTo?: Array<{ name?: string; email: string }> | null;
  importance?: string | null;
  sensitivity?: string | null;
  categories?: string[];
  internetMessageId?: string | null;
  attachments?: CrmEmailAttachment[];
}

export interface CrmPaginatedMessages {
  items: CrmEmailMessageSummary[];
  nextCursor: string | null;
}

export interface CrmConversationMessages {
  providerConversationId: string;
  items: CrmEmailMessageDetail[];
}

export interface ConnectEmailAccountResponse {
  authorizationUrl: string;
  state: string;
}

export interface SendEmailPayload {
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  to: Array<{ name?: string; email: string }>;
  cc?: Array<{ name?: string; email: string }>;
  bcc?: Array<{ name?: string; email: string }>;
  replyToMessageId?: string;
  sendMode?: 'new' | 'reply' | 'replyAll' | 'forward';
  includeSignature?: boolean;
  signatureId?: string;
  attachments?: Array<{
    name: string;
    contentType?: string;
    contentBytes: string;
  }>;
}

export interface ProviderEmailSignature {
  html: string;
  text?: string;
  source: 'gmail' | 'microsoft' | 'none';
  supported?: boolean;
}

export interface CrmEmailSignature {
  id: string;
  name: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  accountId?: string | null;
  isDefault: boolean;
  isActive: boolean;
  providerMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmCalendarEvent {
  id: string;
  connectedAccountId: string | null;
  providerEventId: string | null;
  title: string;
  description?: string | null;
  descriptionHtml?: string | null;
  location?: string | null;
  start: string;
  end: string;
  timeZone?: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  category: string;
  origin: string;
  syncStatus: string;
  taskId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  attendees?: Array<{
    name?: string | null;
    email: string | null;
    responseStatus?: string | null;
    hasEmail?: boolean;
    userId?: string | null;
  }>;
  webLink?: string | null;
}

export interface CrmCommunicationTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'open' | 'completed';
  completed: boolean;
  taskType: 'task' | 'call' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  isAllDay?: boolean;
  tags: string[];
  createdAt: string;
  connectedAccountId?: string | null;
  calendarEventId?: string | null;
  calendarSyncStatus?: string | null;
  relatedTo?: {
    type: 'lead' | 'deal' | 'customer' | 'contact';
    id: string;
    name?: string;
  } | null;
  relatedLinks?: Array<{
    type: 'lead' | 'deal' | 'customer' | 'contact';
    id: string;
    name: string;
    customerId?: string | null;
  }>;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  assigneeUserIds: string[];
  ownerUserId: string;
}
