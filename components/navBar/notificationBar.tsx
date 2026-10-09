'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, Badge } from 'antd';
import {
  Bell,
  CheckCheck,
  Clock,
  UserCheck,
  DollarSign,
  Building2,
  CheckSquare,
  Calendar,
  Mail,
  Shield,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useGetNotifications,
  useGetUnreadNotificationCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/store/server/features/notifications/queries';
import type { NotificationItemDto } from '@/store/server/features/notifications/types';
import {
  getCategoryDisplayLabel,
  type NotificationCategory,
} from '@/lib/notifications/types';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  leads: UserCheck,
  deals: DollarSign,
  customers: Building2,
  activities: CheckSquare,
  calendar: Calendar,
  communication: Mail,
  user_management: Shield,
  approvals: ShieldCheck,
};

function formatShortTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function NotificationBar() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const { data: notifications = [] } = useGetNotifications({ limit: 20 });
  const { data: unreadCount = 0 } = useGetUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const recentNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications],
  );

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markRead.mutate(id);
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllRead.mutate();
  };

  const handleItemClick = (item: NotificationItemDto) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
    setDropdownOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const notificationMenu = (
    <div className="w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl overflow-hidden text-card-foreground font-sans">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
        {recentNotifications.length > 0 ? (
          recentNotifications.map((notification) => {
            const CategoryIcon =
              CATEGORY_ICON_MAP[notification.category] || Bell;
            const isUrgent = notification.priority === 'urgent';
            const isHigh = notification.priority === 'high';

            return (
              <div
                key={notification.id}
                onClick={() => handleItemClick(notification)}
                className={`p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isUrgent
                      ? 'bg-red-500/10 text-red-600'
                      : isHigh
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  <CategoryIcon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div
                      className={`text-xs truncate ${
                        !notification.isRead
                          ? 'font-semibold text-foreground'
                          : 'text-foreground/80'
                      }`}
                    >
                      {notification.title}
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                    {notification.body}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatShortTime(notification.createdAt)}
                    </span>
                    <span className="capitalize text-[10px] font-medium text-foreground/60">
                      {getCategoryDisplayLabel(
                        notification.category as NotificationCategory,
                      ) || notification.category}
                    </span>
                  </div>
                </div>

                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                    title="Mark as read"
                    className="shrink-0 p-1 text-muted-foreground hover:text-primary rounded transition-colors mt-0.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 px-4 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs font-medium text-muted-foreground">
              No notifications
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              You are all caught up!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      dropdownRender={() => notificationMenu}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge
        count={unreadCount}
        size="small"
        offset={[-3, 4]}
        className="[&_.ant-badge-count]:bg-brand [&_.ant-badge-count]:text-white font-sans"
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>
      </Badge>
    </Dropdown>
  );
}

export default NotificationBar;
