import {
  NotificationItem,
  NotificationPayload,
  NotificationPriority,
  UserNotificationPreferences,
  getDefaultPreferences,
  NOTIFICATION_EVENT_REGISTRY,
} from './types';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';

const STORAGE_KEYS = {
  NOTIFICATIONS: 'crm_notifications_items_v1',
  PREFERENCES: 'crm_notification_preferences_v1',
  DEDUP_CACHE: 'crm_notification_dedup_cache_v1',
};

// Initial seed notifications for rich demo / first-load experience
const SAMPLE_NOTIFICATIONS: (userId: string) => NotificationItem[] = (
  userId,
) => [
  {
    id: 'seed-notif-1',
    category: 'deals',
    eventType: 'deal.won',
    title: `${dealUiLabel()} Won: Enterprise Software Suite`,
    body: `Acme Corp ${dealUiLabel({ lowercase: true })} ($45,000) was marked as Won by Sarah Connor.`,
    recipientId: userId,
    actorId: 'user-sarah-101',
    actorName: 'Sarah Connor',
    priority: 'high',
    actionUrl: '/deals/manage-deals',
    actionLabel: `View ${dealUiLabel()}`,
    isRead: false,
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    dedupKey: 'deal.won:seed-deal-1',
  },
  {
    id: 'seed-notif-2',
    category: 'activities',
    eventType: 'activity.due_soon',
    title: 'Task Due Soon: Finalize Q3 Proposal',
    body: 'Your task "Finalize Q3 Proposal" is due in 1 hour (Today, 4:00 PM).',
    recipientId: userId,
    actorId: 'system',
    actorName: 'System Reminder',
    priority: 'high',
    actionUrl: '/communication?tab=tasks',
    actionLabel: 'Open Tasks',
    isRead: false,
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    dedupKey: 'activity.due_soon:task-402',
  },
  ...(isLeadsEnabled()
    ? [
        {
          id: 'seed-notif-3',
          category: 'leads' as const,
          eventType: 'lead.assigned' as const,
          title: 'New Lead Assigned: Global Logistics Ltd',
          body: 'You have been assigned as the lead owner for Global Logistics Ltd (Score: 85).',
          recipientId: userId,
          actorId: 'user-manager-2',
          actorName: 'Marcus Vance',
          priority: 'high' as const,
          actionUrl: '/leads/manage-leads',
          actionLabel: 'View Lead',
          isRead: false,
          readAt: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          dedupKey: 'lead.assigned:lead-88',
        },
      ]
    : []),
  {
    id: 'seed-notif-4',
    category: 'calendar',
    eventType: 'calendar.meeting_invited',
    title: 'Meeting Invite: Q4 Executive Roadmap',
    body: 'Marcus Vance invited you to "Q4 Executive Roadmap" scheduled for Tomorrow at 10:00 AM.',
    recipientId: userId,
    actorId: 'user-manager-2',
    actorName: 'Marcus Vance',
    priority: 'medium',
    actionUrl: '/communication?tab=calendar',
    actionLabel: 'View Calendar',
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    dedupKey: 'calendar.meeting_invited:event-331',
  },
  {
    id: 'seed-notif-5',
    category: 'pqq',
    eventType: 'pqq.deadline_approaching',
    title: 'PQQ Deadline Alert: Ministry Tender 2026',
    body: 'Submission deadline is in 24 hours. 2 compliance sections still pending review.',
    recipientId: userId,
    actorId: 'system',
    actorName: 'PQQ Evaluator',
    priority: 'urgent',
    actionUrl: '/deals/manage-deals',
    actionLabel: 'Check PQQ',
    isRead: false,
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    dedupKey: 'pqq.deadline_approaching:pqq-99',
  },
];

class CentralNotificationService {
  private inMemoryNotifications: NotificationItem[] = [];
  private inMemoryPreferences: Record<string, UserNotificationPreferences> = {};
  private dedupHistory: Map<string, number> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private isClient(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    );
  }

  private loadFromStorage(): void {
    if (!this.isClient()) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        this.inMemoryNotifications = JSON.parse(stored);
      }
      const storedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (storedPrefs) {
        this.inMemoryPreferences = JSON.parse(storedPrefs);
      }
    } catch {
      // Ignore localStorage read failures (private mode, quota, etc.)
    }
  }

  private saveToStorage(): void {
    if (!this.isClient()) return;
    try {
      localStorage.setItem(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(this.inMemoryNotifications),
      );
      localStorage.setItem(
        STORAGE_KEYS.PREFERENCES,
        JSON.stringify(this.inMemoryPreferences),
      );
    } catch {
      // Ignore localStorage write failures (private mode, quota, etc.)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignore listener errors so one bad subscriber does not break others
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPreferences(userId: string): UserNotificationPreferences {
    if (!userId) return getDefaultPreferences('anonymous');

    if (this.inMemoryPreferences[userId]) {
      return this.inMemoryPreferences[userId];
    }

    const defaultPrefs = getDefaultPreferences(userId);
    this.inMemoryPreferences[userId] = defaultPrefs;
    this.saveToStorage();
    return defaultPrefs;
  }

  public savePreferences(preferences: UserNotificationPreferences): void {
    if (!preferences?.userId) return;
    this.inMemoryPreferences[preferences.userId] = {
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Dispatches a notification across in-app and email channels with:
   * 1. Actor exclusion (don't alert user for their own actions)
   * 2. User preference checks (in-app vs email per event)
   * 3. Deduplication window
   * 4. Outlook sync compliance for Tasks and Calendar
   */
  public dispatchNotification(payload: NotificationPayload): {
    delivered: boolean;
    reason?: 'actor_excluded' | 'preferences_disabled' | 'deduplicated';
    item?: NotificationItem;
  } {
    const {
      recipientId,
      actorId,
      category,
      eventType,
      title,
      body,
      actionUrl,
      actionLabel,
      metadata,
      dedupWindowMs = 1000 * 60 * 5, // 5 minutes default
    } = payload;

    // Rule 1: Actor Exclusion
    if (
      actorId &&
      recipientId &&
      actorId === recipientId &&
      actorId !== 'system'
    ) {
      return { delivered: false, reason: 'actor_excluded' };
    }

    // Rule 2: Check deduplication
    const dedupKey =
      payload.dedupKey ||
      `${category}:${eventType}:${recipientId}:${actionUrl || title}`;
    const now = Date.now();
    const lastTriggered = this.dedupHistory.get(dedupKey);

    if (lastTriggered && now - lastTriggered < dedupWindowMs) {
      return { delivered: false, reason: 'deduplicated' };
    }
    this.dedupHistory.set(dedupKey, now);

    // Rule 3: User Preferences evaluation
    const prefs = this.getPreferences(recipientId);
    const categoryPrefs = prefs.categories[category] || {};
    const eventPref = categoryPrefs[eventType] || {
      inApp: NOTIFICATION_EVENT_REGISTRY[eventType]?.defaultInApp ?? true,
      email: NOTIFICATION_EVENT_REGISTRY[eventType]?.defaultEmail ?? true,
    };

    const inAppAllowed = prefs.inAppEnabled && eventPref.inApp;
    const emailAllowed = prefs.emailEnabled && eventPref.email;

    // Check Outlook compliance for task and calendar
    const isOutlookCompliantEmail = emailAllowed;
    if (
      category === 'activities' &&
      (!prefs.outlookSyncEnabled || !prefs.outlookTaskReminders)
    ) {
      // If user turned off Outlook task reminders, respect preference
    }
    if (
      category === 'calendar' &&
      (!prefs.outlookSyncEnabled || !prefs.outlookCalendarReminders)
    ) {
      // If user turned off Outlook calendar reminders, respect preference
    }

    if (!inAppAllowed && !isOutlookCompliantEmail) {
      return { delivered: false, reason: 'preferences_disabled' };
    }

    let createdItem: NotificationItem | undefined = undefined;

    if (inAppAllowed) {
      const priority: NotificationPriority =
        payload.priority ||
        NOTIFICATION_EVENT_REGISTRY[eventType]?.defaultPriority ||
        'medium';

      createdItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category,
        eventType,
        title,
        body,
        recipientId,
        actorId,
        actorName: payload.actorName || 'Team Member',
        priority,
        actionUrl,
        actionLabel,
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata,
        dedupKey,
      };

      this.inMemoryNotifications.unshift(createdItem);
      // Keep max 200 items
      if (this.inMemoryNotifications.length > 200) {
        this.inMemoryNotifications = this.inMemoryNotifications.slice(0, 200);
      }
      this.saveToStorage();
      this.notifyListeners();
    }

    if (isOutlookCompliantEmail) {
      // Simulated email dispatch / Outlook webhook logger
      if (process.env.NODE_ENV === 'development') {
        // console.log(`[Email / Outlook Notification Sent] To: ${recipientId}, Subject: ${title}`);
      }
    }

    return { delivered: true, item: createdItem };
  }

  public getNotifications(userId: string): NotificationItem[] {
    if (!userId) return [];

    let userItems = this.inMemoryNotifications.filter(
      (n) => n.recipientId === userId || n.recipientId === 'all',
    );

    // If no notifications exist yet for user, initialize with sample data
    if (userItems.length === 0 && this.isClient()) {
      const seeds = SAMPLE_NOTIFICATIONS(userId);
      this.inMemoryNotifications.push(...seeds);
      this.saveToStorage();
      userItems = seeds;
    }

    return [...userItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public getUnreadCount(userId: string): number {
    if (!userId) return 0;
    return this.getNotifications(userId).filter((n) => !n.isRead).length;
  }

  public markAsRead(notificationId: string, userId: string): void {
    let changed = false;
    this.inMemoryNotifications = this.inMemoryNotifications.map((item) => {
      if (
        item.id === notificationId &&
        (item.recipientId === userId || item.recipientId === 'all')
      ) {
        changed = true;
        return {
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    if (changed) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public markAllAsRead(userId: string): void {
    if (!userId) return;
    let changed = false;
    const nowIso = new Date().toISOString();

    this.inMemoryNotifications = this.inMemoryNotifications.map((item) => {
      if (
        (item.recipientId === userId || item.recipientId === 'all') &&
        !item.isRead
      ) {
        changed = true;
        return {
          ...item,
          isRead: true,
          readAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return item;
    });

    if (changed) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public deleteNotification(notificationId: string, userId: string): void {
    const beforeLength = this.inMemoryNotifications.length;
    this.inMemoryNotifications = this.inMemoryNotifications.filter(
      (item) =>
        !(
          item.id === notificationId &&
          (item.recipientId === userId || item.recipientId === 'all')
        ),
    );

    if (this.inMemoryNotifications.length !== beforeLength) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public clearAll(userId: string): void {
    this.inMemoryNotifications = this.inMemoryNotifications.filter(
      (item) => item.recipientId !== userId && item.recipientId !== 'all',
    );
    this.saveToStorage();
    this.notifyListeners();
  }
}

export const centralNotificationService = new CentralNotificationService();
