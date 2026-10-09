import type { NotificationCategory } from '@/lib/notifications/types';
import type { NotificationPreferencesResponse } from '@/lib/notifications/types';

export interface NotificationType {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  category?: NotificationCategory;
  route?: string;
  entityType?: string;
  entityId?: string;
}

export type { NotificationPreferencesResponse };
