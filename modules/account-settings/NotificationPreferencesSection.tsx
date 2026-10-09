'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  CheckCircle2,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/store/server/features/notifications/queries';
import type { NotificationPreferencesResponse } from '@/store/server/features/notifications/types';
import {
  NotificationCategory,
  NotificationEventType,
  UserNotificationPreferences,
  NOTIFICATION_EVENT_REGISTRY,
  getDefaultPreferences,
} from '@/lib/notifications/types';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  isLeadsEnabled,
  notificationDisplayDescription,
  notificationDisplayLabel,
  notificationsCategoryLabel,
} from '@/config/salesWorkflow';

interface UnifiedPreferenceItem {
  id: string;
  label: string;
  description: string;
  priority?: 'high' | 'medium' | 'low' | 'urgent';
  mappedEvents: {
    category: NotificationCategory;
    eventType: NotificationEventType;
  }[];
}

interface PreferenceCategoryGroup {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  items: UnifiedPreferenceItem[];
}

const UNIFIED_SECTIONS: PreferenceCategoryGroup[] = [
  {
    id: 'leads_and_deals',
    label: 'Leads & Deals',
    description:
      'Unified alert preferences for lead capturing, pipeline transitions, deal closures, and expected close dates',
    icon: TrendingUp,
    items: [
      {
        id: 'assigned',
        label: 'Lead / Deal Assigned to You',
        description:
          'Notify when a new or existing lead or deal opportunity is assigned to you',
        priority: 'high',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.assigned' },
          { category: 'deals', eventType: 'deal.assigned' },
        ],
      },
      {
        id: 'participant_added',
        label: 'Added to Lead / Deal Team',
        description:
          'Notify when you are added via solution assignment or a USER custom field',
        priority: 'high',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.participant_added' },
          { category: 'deals', eventType: 'deal.participant_added' },
        ],
      },
      {
        id: 'stage_advanced',
        label: 'Stage Advanced / Changed',
        description:
          'Notify when a lead progresses to a new stage or a deal moves across pipeline stages',
        priority: 'medium',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.stage_changed' },
          { category: 'deals', eventType: 'deal.stage_moved' },
        ],
      },
      {
        id: 'converted_won',
        label: 'Lead Converted to Deal / Deal Closed as Won',
        description:
          'Celebrate when a qualified lead converts to a deal or an opportunity is marked as Won',
        priority: 'high',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.converted_to_deal' },
          { category: 'deals', eventType: 'deal.won' },
        ],
      },
      {
        id: 'deal_lost',
        label: 'Deal Closed as Lost',
        description:
          'Notify when a deal is closed as Lost with loss reason details',
        priority: 'high',
        mappedEvents: [{ category: 'deals', eventType: 'deal.lost' }],
      },
      {
        id: 'due_and_close_dates',
        label: 'Follow-ups & Expected Close Date Alerts',
        description:
          'Reminders for scheduled lead follow-ups, approaching close dates, and overdue deals',
        priority: 'high',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.followup_due' },
          { category: 'deals', eventType: 'deal.close_date_approaching' },
          { category: 'deals', eventType: 'deal.close_date_overdue' },
        ],
      },
      {
        id: 'status_and_value',
        label: 'Status, Qualification & Value Changes',
        description:
          'Notify when lead qualification status shifts or estimated deal value is modified',
        priority: 'low',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.status_changed' },
          { category: 'deals', eventType: 'deal.value_changed' },
        ],
      },
      {
        id: 'created',
        label: 'New Lead / Deal Created',
        description:
          'Notify when a new lead or deal is created or captured in your territory',
        priority: 'low',
        mappedEvents: [
          { category: 'leads', eventType: 'lead.created' },
          { category: 'deals', eventType: 'deal.created' },
        ],
      },
      {
        id: 'unassigned',
        label: 'Lead / Deal Unassigned or Reassigned',
        description:
          'Notify when you are removed or reassigned as the owner of a lead or deal',
        priority: 'medium',
        mappedEvents: [{ category: 'leads', eventType: 'lead.unassigned' }],
      },
    ],
  },
  {
    id: 'activities_calendar_communication',
    label: 'Activities, Calendar & Communication',
    description:
      'Tasks, deadlines, meeting reminders, and customer email alerts',
    icon: Calendar,
    items: [
      {
        id: 'activity_assigned',
        label: 'Task Assigned to You',
        description: 'Notify when an action item or task is assigned to you',
        priority: 'high',
        mappedEvents: [
          { category: 'activities', eventType: 'activity.assigned' },
        ],
      },
      {
        id: 'comment_mentioned',
        label: 'Mentioned in a Comment',
        description:
          'Notify when someone @mentions you on a lead or deal comment',
        priority: 'high',
        mappedEvents: [
          { category: 'communication', eventType: 'comment.user_mentioned' },
        ],
      },
      {
        id: 'activity_due_soon',
        label: 'Task Due Soon Reminder (24h & 1h)',
        description: 'Reminder 24 hours and 1 hour before a task deadline',
        priority: 'high',
        mappedEvents: [
          { category: 'activities', eventType: 'activity.due_soon' },
        ],
      },
      {
        id: 'activity_overdue',
        label: 'Task Overdue Alert',
        description:
          'Urgent notification when an assigned task exceeds its deadline',
        priority: 'urgent',
        mappedEvents: [
          { category: 'activities', eventType: 'activity.overdue' },
        ],
      },
      {
        id: 'activity_completed_status',
        label: 'Task Completion & Status Changes',
        description:
          'Notify when a task you delegated or follow is completed or updated',
        priority: 'low',
        mappedEvents: [
          { category: 'activities', eventType: 'activity.completed' },
          { category: 'activities', eventType: 'activity.status_changed' },
        ],
      },
      {
        id: 'calendar_invited',
        label: 'Meeting Invitation',
        description:
          'Notify when you are invited to a calendar event or client meeting',
        priority: 'high',
        mappedEvents: [
          { category: 'calendar', eventType: 'calendar.meeting_invited' },
        ],
      },
      {
        id: 'calendar_reminder',
        label: 'Meeting Starting Soon (15 min)',
        description: 'Alert 15 minutes before scheduled start time',
        priority: 'high',
        mappedEvents: [
          { category: 'calendar', eventType: 'calendar.meeting_reminder' },
        ],
      },
      {
        id: 'calendar_rescheduled_cancelled',
        label: 'Meeting Rescheduled or Cancelled',
        description:
          'Notify when meeting time, location, or status is modified',
        priority: 'medium',
        mappedEvents: [
          { category: 'calendar', eventType: 'calendar.meeting_rescheduled' },
          { category: 'calendar', eventType: 'calendar.meeting_cancelled' },
        ],
      },
      {
        id: 'communication_email_received',
        label: 'Inbound Email from Lead / Customer',
        description:
          'Notify when a linked customer or lead replies to an email thread',
        priority: 'high',
        mappedEvents: [
          {
            category: 'communication',
            eventType: 'communication.email_received',
          },
        ],
      },
      {
        id: 'communication_link_clicked',
        label: 'Tracked Link / Attachment Opened',
        description:
          'Instant alert when a prospect opens your proposal link or attachment',
        priority: 'medium',
        mappedEvents: [
          {
            category: 'communication',
            eventType: 'communication.link_clicked',
          },
        ],
      },
      {
        id: 'communication_bounced',
        label: 'Email Delivery Failed / Bounced',
        description: 'Alert when an email to a lead or customer fails delivery',
        priority: 'medium',
        mappedEvents: [
          {
            category: 'communication',
            eventType: 'communication.email_bounced',
          },
        ],
      },
    ],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    description:
      'Alerts for approval requests, decisions, cancellations, resubmits, and step reassignments',
    icon: ShieldCheck,
    items: [
      {
        id: 'approval_needed',
        label: 'New Approval Request',
        description:
          'Notify when a lead or deal needs your approval before a stage move is applied',
        priority: 'high',
        mappedEvents: [
          { category: 'approvals', eventType: 'approval.requested' },
        ],
      },
      {
        id: 'approval_decided',
        label: 'Approval Decided (Approved / Rejected)',
        description:
          'Notify when an approval request you submitted is fully approved or rejected',
        priority: 'high',
        mappedEvents: [
          { category: 'approvals', eventType: 'approval.approved' },
          { category: 'approvals', eventType: 'approval.rejected' },
        ],
      },
      {
        id: 'approval_cancelled',
        label: 'Approval Cancelled',
        description:
          'Notify when a pending approval request assigned to you is cancelled',
        priority: 'medium',
        mappedEvents: [
          { category: 'approvals', eventType: 'approval.cancelled' },
        ],
      },
      {
        id: 'approval_resubmitted',
        label: 'Approval Resubmitted',
        description:
          'Notify when a rejected or cancelled request is resubmitted and needs your approval again',
        priority: 'high',
        mappedEvents: [
          { category: 'approvals', eventType: 'approval.resubmitted' },
        ],
      },
      {
        id: 'approval_reassigned',
        label: 'Approval Reassigned',
        description: 'Notify when an active approval step is reassigned to you',
        priority: 'high',
        mappedEvents: [
          { category: 'approvals', eventType: 'approval.reassigned' },
        ],
      },
    ],
  },
];

function resolveUnifiedSections(): PreferenceCategoryGroup[] {
  return UNIFIED_SECTIONS.map((group) => ({
    ...group,
    label:
      group.id === 'leads_and_deals'
        ? notificationsCategoryLabel()
        : notificationDisplayLabel(group.label),
    description: notificationDisplayDescription(group.description),
    items: group.items
      .map((item) => ({
        ...item,
        label: notificationDisplayLabel(item.label),
        description: notificationDisplayDescription(item.description),
        mappedEvents: isLeadsEnabled()
          ? item.mappedEvents
          : item.mappedEvents.filter(({ category }) => category !== 'leads'),
      }))
      .filter((item) => isLeadsEnabled() || item.mappedEvents.length > 0),
  }));
}

function apiToUiPreferences(
  userId: string,
  api: NotificationPreferencesResponse,
): UserNotificationPreferences {
  const preferences = getDefaultPreferences(userId);
  preferences.inAppEnabled = api.globalInAppEnabled;
  preferences.emailEnabled = api.globalEmailEnabled;
  preferences.updatedAt = new Date().toISOString();

  for (const event of api.registry) {
    const category = event.category as NotificationCategory;
    const eventType = event.eventType as NotificationEventType;
    const pref = api.eventPreferences[event.eventType] ?? {
      inApp: event.defaultInApp,
      email: event.defaultEmail,
    };
    preferences.categories[category][eventType] = pref;
  }

  return preferences;
}

function uiToApiPayload(preferences: UserNotificationPreferences) {
  const eventPreferences: Record<string, { inApp: boolean; email: boolean }> =
    {};
  for (const catPrefs of Object.values(preferences.categories)) {
    for (const [eventType, pref] of Object.entries(catPrefs ?? {})) {
      eventPreferences[eventType] = pref;
    }
  }
  return {
    globalInAppEnabled: preferences.inAppEnabled,
    globalEmailEnabled: preferences.emailEnabled,
    eventPreferences,
  };
}

export function NotificationPreferencesSection() {
  const userId =
    useAuthenticationStore((state) => state.userId) || 'current-user';
  const { data: apiPrefs } = useGetNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(
    () => getDefaultPreferences(userId),
  );
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    leads_and_deals: true,
    activities_calendar_communication: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (apiPrefs) {
      setPreferences(apiToUiPreferences(userId, apiPrefs));
    }
  }, [apiPrefs, userId]);

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleMasterInAppToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      inAppEnabled: checked,
    }));
  };

  const handleMasterEmailToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      emailEnabled: checked,
    }));
  };

  const isItemChecked = (
    item: UnifiedPreferenceItem,
    channel: 'inApp' | 'email',
  ): boolean => {
    return item.mappedEvents.some(({ category, eventType }) => {
      const catPrefs = preferences.categories[category] || {};
      const evtPref = catPrefs[eventType];
      if (evtPref) return evtPref[channel];
      return (
        NOTIFICATION_EVENT_REGISTRY[eventType]?.[
          channel === 'inApp' ? 'defaultInApp' : 'defaultEmail'
        ] ?? true
      );
    });
  };

  const handleItemToggle = (
    item: UnifiedPreferenceItem,
    channel: 'inApp' | 'email',
    checked: boolean,
  ) => {
    setPreferences((prev) => {
      const updatedCategories = { ...prev.categories };

      item.mappedEvents.forEach(({ category, eventType }) => {
        const currentCat = { ...(updatedCategories[category] || {}) };
        const currentEvt = currentCat[eventType] || {
          inApp: true,
          email: true,
        };

        currentCat[eventType] = {
          ...currentEvt,
          [channel]: checked,
        };
        updatedCategories[category] = currentCat;
      });

      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  };

  const handleSectionBulkToggle = (
    group: PreferenceCategoryGroup,
    channel: 'inApp' | 'email',
    checked: boolean,
  ) => {
    setPreferences((prev) => {
      const updatedCategories = { ...prev.categories };

      group.items.forEach((item) => {
        item.mappedEvents.forEach(({ category, eventType }) => {
          const currentCat = { ...(updatedCategories[category] || {}) };
          const currentEvt = currentCat[eventType] || {
            inApp: true,
            email: true,
          };

          currentCat[eventType] = {
            ...currentEvt,
            [channel]: checked,
          };
          updatedCategories[category] = currentCat;
        });
      });

      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePrefs.mutateAsync(uiToApiPayload(preferences));
      setSavedSuccess(true);
      NotificationMessage.success({
        message: 'Preferences Saved',
        description: 'Your unified notification settings have been updated.',
      });
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      NotificationMessage.error({
        message: 'Save Failed',
        description: 'Unable to update preferences. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultPreferences(userId);
    setPreferences(defaults);
    void updatePrefs.mutateAsync(uiToApiPayload(defaults));
    NotificationMessage.success({
      message: 'Reset to Defaults',
      description: 'Notification preferences restored to factory presets.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Channel Master Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand-muted text-brand">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    In-App Notifications
                  </CardTitle>
                  <CardDescription className="text-[12px] text-muted-foreground">
                    Popovers, badges, and the dedicated Notification Inbox
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences.inAppEnabled}
                onCheckedChange={handleMasterInAppToggle}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[12px] text-muted-foreground">
            {preferences.inAppEnabled ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> In-App alerts are
                active
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                In-App alerts are globally paused
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand-muted text-brand">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Email Notifications
                  </CardTitle>
                  <CardDescription className="text-[12px] text-muted-foreground">
                    Instant email dispatches and scheduled reminders
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={handleMasterEmailToggle}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[12px] text-muted-foreground">
            {preferences.emailEnabled ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Email delivery is
                active
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                Email delivery is globally paused
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Categorized Unified Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Notification Triggers by Category
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="h-8 gap-1.5 text-[12px] font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="h-8 gap-1.5 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {savedSuccess
                ? 'Saved!'
                : isSaving
                  ? 'Saving...'
                  : 'Save Preferences'}
            </Button>
          </div>
        </div>

        {resolveUnifiedSections().map((group) => {
          const GroupIcon = group.icon;
          const isExpanded = expandedSections[group.id];

          return (
            <Card
              key={group.id}
              className="overflow-hidden border-border transition-all"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => toggleSectionExpand(group.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-secondary text-foreground">
                    <GroupIcon className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{group.label}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {group.items.length} preferences
                    </Badge>
                  </div>
                </div>

                <div
                  className="flex items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Quick:</span>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-brand hover:underline"
                      onClick={() =>
                        handleSectionBulkToggle(group, 'inApp', true)
                      }
                    >
                      All In-App
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-brand hover:underline"
                      onClick={() =>
                        handleSectionBulkToggle(group, 'email', true)
                      }
                    >
                      All Email
                    </button>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 border-t border-border/60 bg-muted/10 p-0">
                  <div className="divide-y divide-border/60">
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="col-span-8 sm:col-span-8">Event</div>
                      <div className="col-span-2 sm:col-span-2 text-center">
                        In-App
                      </div>
                      <div className="col-span-2 sm:col-span-2 text-center">
                        Email
                      </div>
                    </div>

                    {group.items.map((item) => {
                      const inAppActive = isItemChecked(item, 'inApp');
                      const emailActive = isItemChecked(item, 'email');

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 px-4 py-3 items-center hover:bg-background/80 transition-colors"
                        >
                          <div className="col-span-8 sm:col-span-8 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {item.label}
                              </span>
                              {item.priority === 'urgent' && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1 py-0 uppercase"
                                >
                                  Urgent
                                </Badge>
                              )}
                              {item.priority === 'high' && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-400 text-amber-600 text-[9px] px-1 py-0"
                                >
                                  High
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="col-span-2 sm:col-span-2 flex justify-center">
                            <Switch
                              size="sm"
                              disabled={!preferences.inAppEnabled}
                              checked={preferences.inAppEnabled && inAppActive}
                              onCheckedChange={(checked) =>
                                handleItemToggle(item, 'inApp', checked)
                              }
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-2 flex justify-center">
                            <Switch
                              size="sm"
                              disabled={!preferences.emailEnabled}
                              checked={preferences.emailEnabled && emailActive}
                              onCheckedChange={(checked) =>
                                handleItemToggle(item, 'email', checked)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-brand" />
          <span>
            Actors triggering an update will automatically be excluded from
            notifications.
          </span>
        </div>
        <Button
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="h-8 gap-1.5 bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          <CheckCircle2 className="w-4 h-4" />
          {savedSuccess ? 'Preferences Saved' : 'Save Notification Preferences'}
        </Button>
      </div>
    </div>
  );
}
