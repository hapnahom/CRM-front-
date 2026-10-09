'use client';

import React, { useState, useMemo } from 'react';
import {
  isLeadsEnabled,
  notificationsCategoryLabel,
  pipelineDisplayText,
} from '@/config/salesWorkflow';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Search,
  CheckCheck,
  Sparkles,
  ExternalLink,
  UserCheck,
  DollarSign,
  TrendingUp,
  Building2,
  CheckSquare,
  Calendar,
  Mail,
  Shield,
  ShieldCheck,
  Clock,
  AlertCircle,
  Inbox,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/store/server/features/notifications/queries';
import type { NotificationItemDto } from '@/store/server/features/notifications/types';
import {
  NotificationCategory,
  NotificationItem,
  NotificationPriority,
  getCategoryDisplayLabel,
} from '@/lib/notifications/types';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { NotificationsInboxSkeleton } from '@/components/loading/skeleton-screens';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  leads: UserCheck,
  deals: DollarSign,
  leads_deals: TrendingUp,
  customers: Building2,
  activities: CheckSquare,
  calendar: Calendar,
  communication: Mail,
  user_management: Shield,
  approvals: ShieldCheck,
};

const INBOX_CATEGORY_TABS: {
  id: string;
  label: string;
  icon: React.ElementType;
  match: (category: NotificationCategory) => boolean;
}[] = [
  {
    id: 'leads_deals',
    label: notificationsCategoryLabel(),
    icon: TrendingUp,
    match: (c) => c === 'deals' || (isLeadsEnabled() && c === 'leads'),
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: ShieldCheck,
    match: (c) => c === 'approvals',
  },
  {
    id: 'activities_calendar_communication',
    label: 'Activities & Communication',
    icon: Calendar,
    match: (c) =>
      c === 'activities' || c === 'calendar' || c === 'communication',
  },
];

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function NotificationsInboxPage() {
  const router = useRouter();
  const {
    data: apiNotificationsData,
    refetch,
    isLoading: notificationsLoading,
  } = useGetNotifications({
    limit: 200,
  });
  const apiNotifications = apiNotificationsData ?? [];
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = useMemo<NotificationItem[]>(
    () =>
      apiNotifications.map((n: NotificationItemDto) => ({
        id: n.id,
        category: n.category as NotificationCategory,
        eventType: n.eventType as NotificationItem['eventType'],
        title: pipelineDisplayText(n.title),
        body: pipelineDisplayText(n.body),
        recipientId: n.recipientId,
        actorId: n.actorId ?? undefined,
        actorName: n.actorName ?? undefined,
        priority: n.priority as NotificationPriority,
        actionUrl: n.actionUrl ?? undefined,
        actionLabel: n.actionLabel
          ? pipelineDisplayText(n.actionLabel)
          : undefined,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        metadata: n.metadata ?? undefined,
        dedupKey: n.dedupKey ?? undefined,
      })),
    [apiNotifications],
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'unread' | 'high_priority'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    INBOX_CATEGORY_TABS.forEach((tab) => {
      counts[tab.id] = notifications.filter((n) =>
        tab.match(n.category),
      ).length;
    });
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const activeTab = INBOX_CATEGORY_TABS.find(
          (t) => t.id === selectedCategory,
        );
        if (activeTab && !activeTab.match(item.category)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'unread' && item.isRead) {
        return false;
      }
      if (
        statusFilter === 'high_priority' &&
        item.priority !== 'high' &&
        item.priority !== 'urgent'
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBody = item.body.toLowerCase().includes(q);
        const matchesActor = item.actorName?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesBody && !matchesActor) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, selectedCategory, statusFilter, searchQuery]);

  const handleMarkAllAsRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        void refetch();
        NotificationMessage.success({
          message: 'All Caught Up',
          description: 'All notifications marked as read.',
        });
      },
    });
  };

  const handleToggleRead = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    void notificationId;
    e.stopPropagation();
    NotificationMessage.info({
      message: 'Not available',
      description: 'Deleting notifications is not supported yet.',
    });
  };

  const handleClearAll = () => {
    NotificationMessage.info({
      message: 'Not available',
      description: 'Clear all is not supported yet.',
    });
  };

  const handleTriggerDemo = () => {
    NotificationMessage.info({
      message: 'Demo alerts',
      description:
        'Demo notifications are disabled in production. They are created by real CRM events.',
    });
  };

  const handleActionClick = (url?: string) => {
    if (url) {
      router.push(url);
    }
  };

  if (notificationsLoading && !apiNotificationsData) {
    return <NotificationsInboxSkeleton />;
  }

  return (
    <div className="min-h-full bg-muted/30 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Notifications Inbox
                  </h1>
                  {unreadCount > 0 && (
                    <Badge className="bg-brand text-white hover:bg-brand">
                      {unreadCount} unread
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Real-time CRM activity alerts, assignments, deadlines, and
                  notifications
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerDemo}
              className="text-xs h-8 gap-1.5 border-dashed"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Simulate Alerts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs h-8 gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/setting?section=notifications')}
              className="text-xs h-8 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Preferences
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-4">
            {/* Search and Status Pills */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                  onClick={() => setStatusFilter('all')}
                  className="text-xs h-8"
                >
                  All ({notifications.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'unread' ? 'secondary' : 'ghost'}
                  onClick={() => setStatusFilter('unread')}
                  className="text-xs h-8 gap-1.5"
                >
                  Unread ({unreadCount})
                </Button>
                <Button
                  size="sm"
                  variant={
                    statusFilter === 'high_priority' ? 'secondary' : 'ghost'
                  }
                  onClick={() => setStatusFilter('high_priority')}
                  className="text-xs h-8 gap-1.5 text-amber-700 dark:text-amber-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Urgent & High
                </Button>
              </div>
            </div>

            {/* Category Horizontal Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                All Categories ({notifications.length})
              </button>

              {INBOX_CATEGORY_TABS.map((tab) => {
                const count = categoryCounts[tab.id] || 0;
                const IconComponent = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          selectedCategory === tab.id
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-background text-foreground'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="border-dashed border-border py-12">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-full bg-muted/60 text-muted-foreground">
                  <Inbox className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    No notifications found
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    {searchQuery ||
                    statusFilter !== 'all' ||
                    selectedCategory !== 'all'
                      ? 'No notifications match your current filter or search criteria.'
                      : "You're completely caught up! New alerts and notifications will appear here in real-time."}
                  </p>
                </div>
                {(searchQuery ||
                  statusFilter !== 'all' ||
                  selectedCategory !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setSelectedCategory('all');
                    }}
                    className="text-xs mt-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((item) => {
              const CategoryIcon = CATEGORY_ICON_MAP[item.category] || Bell;
              const isUrgent = item.priority === 'urgent';
              const isHigh = item.priority === 'high';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) {
                      markRead.mutate(item.id);
                    }
                    handleActionClick(item.actionUrl);
                  }}
                  className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                    item.isRead
                      ? 'bg-card border-border/80 text-muted-foreground hover:border-primary/40 hover:bg-muted/20'
                      : 'bg-card border-primary/30 shadow-xs ring-1 ring-primary/10 hover:border-primary'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Unread Status Dot */}
                    <div className="mt-1 flex items-center justify-center">
                      {!item.isRead ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-transparent shrink-0" />
                      )}
                    </div>

                    {/* Category Icon */}
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isUrgent
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : isHigh
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <CategoryIcon className="w-4 h-4" />
                    </div>

                    {/* Notification Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            item.isRead
                              ? 'text-foreground/80'
                              : 'text-foreground font-bold'
                          }`}
                        >
                          {item.title}
                        </span>

                        {isUrgent && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1.5 py-0 uppercase"
                          >
                            Urgent
                          </Badge>
                        )}
                        {isHigh && (
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-600 text-[9px] px-1.5 py-0"
                          >
                            High Priority
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0"
                        >
                          {getCategoryDisplayLabel(item.category) ||
                            item.category}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.body}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        {item.actorName && (
                          <span>
                            By:{' '}
                            <strong className="font-medium text-foreground">
                              {item.actorName}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.actionUrl && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) {
                            markRead.mutate(item.id);
                          }
                          handleActionClick(item.actionUrl);
                        }}
                        className="text-xs h-8 gap-1 bg-muted hover:bg-primary hover:text-white transition-colors"
                      >
                        <span>{item.actionLabel || 'View'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}

                    {!item.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleToggleRead(item, e)}
                        title="Mark as read"
                        className="text-xs h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete notification"
                      className="text-xs h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
