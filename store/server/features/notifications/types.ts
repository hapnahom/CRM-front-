export interface NotificationItemDto {
  id: string;
  tenantId: string;
  recipientId: string;
  category: string;
  eventType: string;
  title: string;
  body: string;
  priority: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEventRegistryItem {
  eventType: string;
  category: string;
  label: string;
  defaultInApp: boolean;
  defaultEmail: boolean;
  emailAllowed: boolean;
  emailDisabledReason?: string;
  priority: string;
}

export interface NotificationPreferencesResponse {
  globalInAppEnabled: boolean;
  globalEmailEnabled: boolean;
  eventPreferences: Record<string, { inApp: boolean; email: boolean }>;
  registry: NotificationEventRegistryItem[];
}
