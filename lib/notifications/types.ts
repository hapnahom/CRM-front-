import {
  isLeadsEnabled,
  notificationDisplayDescription,
  notificationDisplayLabel,
  notificationsCategoryLabel,
} from '@/config/salesWorkflow';

export type NotificationCategory =
  | 'leads'
  | 'deals'
  | 'customers'
  | 'activities'
  | 'calendar'
  | 'communication'
  | 'sales_targeting'
  | 'pqq'
  | 'user_management'
  | 'system_custom_fields'
  | 'approvals';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationChannel = 'inApp' | 'email';

export type NotificationEventType =
  // Leads (7)
  | 'lead.assigned'
  | 'lead.stage_changed'
  | 'lead.status_changed'
  | 'lead.converted_to_deal'
  | 'lead.created'
  | 'lead.followup_due'
  | 'lead.unassigned'
  | 'lead.participant_added'
  | 'lead.field_assigned'
  | 'lead.field_overdue'
  | 'lead.stage_expiration_approaching'
  | 'lead.stage_expired'
  | 'lead.stage_expired_moved'
  // Deals
  | 'deal.assigned'
  | 'deal.participant_added'
  | 'deal.field_assigned'
  | 'deal.field_overdue'
  | 'deal.stage_moved'
  | 'deal.won'
  | 'deal.lost'
  | 'deal.value_changed'
  | 'deal.close_date_approaching'
  | 'deal.close_date_overdue'
  | 'deal.stage_expiration_approaching'
  | 'deal.stage_expired'
  | 'deal.stage_expired_moved'
  | 'deal.created'
  // Customers (5)
  | 'customer.created'
  | 'customer.assigned'
  | 'customer.tier_changed'
  | 'customer.status_changed'
  | 'customer.contract_expiring'
  // Activities / Tasks (5)
  | 'activity.assigned'
  | 'activity.due_soon'
  | 'activity.overdue'
  | 'activity.completed'
  | 'activity.status_changed'
  // Calendar / Meetings (4)
  | 'calendar.meeting_invited'
  | 'calendar.meeting_reminder'
  | 'calendar.meeting_rescheduled'
  | 'calendar.meeting_cancelled'
  // Communication (3)
  | 'communication.email_received'
  | 'communication.link_clicked'
  | 'communication.email_bounced'
  // Sales Targeting (4)
  | 'sales_targeting.quota_assigned'
  | 'sales_targeting.milestone_reached'
  | 'sales_targeting.period_ending'
  | 'sales_targeting.target_adjusted'
  // PQQ / Tenders (5)
  | 'pqq.assigned'
  | 'pqq.deadline_approaching'
  | 'pqq.status_changed'
  | 'pqq.approved'
  | 'pqq.rejected'
  // User Management (4)
  | 'user_management.user_invited'
  | 'user_management.role_changed'
  | 'user_management.account_status_changed'
  | 'user_management.password_reset'
  // System / Custom Fields (3)
  | 'system.schema_updated'
  | 'system.field_validation_alert'
  | 'system.integration_alert'
  | 'comment.user_mentioned'
  // Approvals (6)
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.cancelled'
  | 'approval.resubmitted'
  | 'approval.reassigned';

export interface NotificationAction {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  eventType: NotificationEventType;
  title: string;
  body: string;
  recipientId: string;
  actorId?: string;
  actorName?: string;
  priority: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  dedupKey?: string;
}

export interface NotificationPayload {
  category: NotificationCategory;
  eventType: NotificationEventType;
  title: string;
  body: string;
  recipientId: string;
  actorId?: string;
  actorName?: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  dedupKey?: string;
  dedupWindowMs?: number; // Optional window in ms to prevent duplicates (default: 5 minutes)
}

export interface EventPreference {
  eventType: NotificationEventType;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
  defaultInApp: boolean;
  defaultEmail: boolean;
}

export interface CategoryPreference {
  category: NotificationCategory;
  label: string;
  description: string;
  events: EventPreference[];
}

export interface UserNotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  outlookSyncEnabled: boolean;
  outlookTaskReminders: boolean;
  outlookCalendarReminders: boolean;
  categories: Record<
    NotificationCategory,
    Record<NotificationEventType, { inApp: boolean; email: boolean }>
  >;
  updatedAt: string;
}

export const CATEGORY_DEFINITIONS: Record<
  NotificationCategory,
  { label: string; description: string; iconName: string }
> = {
  leads: {
    label: 'Leads',
    description:
      'Lead assignments, stage transitions, conversion, and follow-ups',
    iconName: 'UserCheck',
  },
  deals: {
    label: 'Deals & Opportunities',
    description:
      'Deal assignments, stage movements, won/lost alerts, and close dates',
    iconName: 'DollarSign',
  },
  customers: {
    label: 'Customers & Accounts',
    description:
      'Customer creation, owner reassignment, tier updates, and contract milestones',
    iconName: 'Building2',
  },
  activities: {
    label: 'Activities & Tasks',
    description:
      'Task assignments, upcoming deadlines, overdue warnings, and completion',
    iconName: 'CheckSquare',
  },
  calendar: {
    label: 'Calendar & Meetings',
    description:
      'Meeting invitations, start reminders, rescheduling, and cancellations',
    iconName: 'Calendar',
  },
  communication: {
    label: 'Communication & Emails',
    description:
      'Inbound emails, tracked customer interactions, and delivery alerts',
    iconName: 'Mail',
  },
  sales_targeting: {
    label: 'Sales Targeting & Quotas',
    description:
      'Quota assignments, target progress milestones (50%/80%/100%), and period reviews',
    iconName: 'Target',
  },
  pqq: {
    label: 'PQQ & Tenders',
    description:
      'PQQ assignments, submission countdowns, status transitions, and evaluations',
    iconName: 'FileText',
  },
  user_management: {
    label: 'User Management & Security',
    description:
      'Staff invitations, role/permission updates, status changes, and account alerts',
    iconName: 'Shield',
  },
  system_custom_fields: {
    label: 'System & Custom Fields',
    description:
      'Schema updates, custom field validation warnings, and integration notifications',
    iconName: 'Sliders',
  },
  approvals: {
    label: 'Approvals',
    description:
      'Approval requests assigned to you, and outcomes on requests you submitted',
    iconName: 'ShieldCheck',
  },
};

export const NOTIFICATION_EVENT_REGISTRY: Record<
  NotificationEventType,
  {
    category: NotificationCategory;
    label: string;
    description: string;
    defaultPriority: NotificationPriority;
    defaultInApp: boolean;
    defaultEmail: boolean;
  }
> = {
  // Leads
  'lead.assigned': {
    category: 'leads',
    label: 'Lead Assigned to You',
    description: 'Notify when a new or existing lead is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.stage_changed': {
    category: 'leads',
    label: 'Lead Stage Changed',
    description: 'Notify when a lead you follow advances or changes stage',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'lead.status_changed': {
    category: 'leads',
    label: 'Lead Status Changed',
    description:
      'Notify when lead qualification status changes (e.g., Qualified, Junk)',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'lead.converted_to_deal': {
    category: 'leads',
    label: 'Lead Converted to Deal',
    description:
      'Notify when a qualified lead is successfully converted into a deal',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.created': {
    category: 'leads',
    label: 'New Lead Created',
    description: 'Notify when a new lead is captured in your territory',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'lead.followup_due': {
    category: 'leads',
    label: 'Lead Follow-up Due',
    description: 'Notify when scheduled follow-up date for a lead is due',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.unassigned': {
    category: 'leads',
    label: 'Lead Unassigned / Reassigned',
    description: 'Notify when you are removed as the owner of a lead',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'lead.participant_added': {
    category: 'leads',
    label: 'Added to Lead Team',
    description:
      'Notify when you are added to a lead via solution assignment or a USER custom field',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.field_assigned': {
    category: 'leads',
    label: 'Custom Field Assigned',
    description: 'Notify when a lead custom field is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.field_overdue': {
    category: 'leads',
    label: 'Custom Field Overdue',
    description: 'Notify when a lead custom field you own becomes overdue',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.stage_expiration_approaching': {
    category: 'leads',
    label: 'Lead Stage Expiration Approaching',
    description: 'Notify when a lead is nearing its stage expiration',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.stage_expired': {
    category: 'leads',
    label: 'Lead Stage Expired',
    description: 'Notify when a lead expires in its current stage',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'lead.stage_expired_moved': {
    category: 'leads',
    label: 'Lead Auto-Moved After Expiration',
    description:
      'Notify when a lead is automatically moved to a Lost stage after expiration',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },

  // Deals
  'deal.assigned': {
    category: 'deals',
    label: 'Deal Assigned to You',
    description: 'Notify when an opportunity or deal is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.participant_added': {
    category: 'deals',
    label: 'Added to Deal Team',
    description:
      'Notify when you are added to a deal via solution assignment or a USER custom field',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.stage_moved': {
    category: 'deals',
    label: 'Deal Stage Advanced',
    description: 'Notify when deal pipeline stage is moved forward or backward',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'deal.won': {
    category: 'deals',
    label: 'Deal Closed as Won',
    description: 'Celebrate when a deal is closed and marked as Won',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.lost': {
    category: 'deals',
    label: 'Deal Closed as Lost',
    description: 'Notify when a deal is marked as Lost with loss reason',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.value_changed': {
    category: 'deals',
    label: 'Deal Value / Amount Changed',
    description: 'Notify when estimated deal value or currency is modified',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'deal.close_date_approaching': {
    category: 'deals',
    label: 'Expected Close Date Approaching',
    description: 'Reminder 3 days before anticipated deal close date',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.close_date_overdue': {
    category: 'deals',
    label: 'Deal Expected Close Date Overdue',
    description:
      'Alert when a deal passes its target close date without closing',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.field_assigned': {
    category: 'deals',
    label: 'Custom Field Assigned',
    description: 'Notify when a deal custom field is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.field_overdue': {
    category: 'deals',
    label: 'Custom Field Overdue',
    description: 'Notify when a deal custom field you own becomes overdue',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.stage_expiration_approaching': {
    category: 'deals',
    label: 'Deal Stage Expiration Approaching',
    description: 'Notify when a deal is nearing its stage expiration',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.stage_expired': {
    category: 'deals',
    label: 'Deal Stage Expired',
    description: 'Notify when a deal expires in its current stage',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.stage_expired_moved': {
    category: 'deals',
    label: 'Deal Auto-Moved After Expiration',
    description:
      'Notify when a deal is automatically moved to a Lost stage after expiration',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'deal.created': {
    category: 'deals',
    label: 'New Deal Created',
    description: 'Notify when a new deal is created in your department',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },

  // Customers
  'customer.created': {
    category: 'customers',
    label: 'New Customer Registered',
    description: 'Notify when a customer account is created',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'customer.assigned': {
    category: 'customers',
    label: 'Customer Account Assigned',
    description: 'Notify when an existing customer account is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'customer.tier_changed': {
    category: 'customers',
    label: 'Customer Tier / Segment Changed',
    description:
      'Notify when account tier (Enterprise, Mid-Market, SMB) is updated',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'customer.status_changed': {
    category: 'customers',
    label: 'Customer Status Changed',
    description:
      'Notify when account status shifts (Active, Inactive, Churned)',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'customer.contract_expiring': {
    category: 'customers',
    label: 'Customer Contract Expiring Soon',
    description:
      'Alert 30 days and 7 days prior to contract/service expiration',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },

  // Activities & Tasks
  'activity.assigned': {
    category: 'activities',
    label: 'Task Assigned to You',
    description: 'Notify when a task or action item is assigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'activity.due_soon': {
    category: 'activities',
    label: 'Task Due Soon Reminder',
    description: 'Reminder 24h and 1h before a task due datetime',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'activity.overdue': {
    category: 'activities',
    label: 'Task Overdue Alert',
    description:
      'Urgent notification when an assigned task exceeds its deadline',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'activity.completed': {
    category: 'activities',
    label: 'Task Marked as Completed',
    description:
      'Notify when a task you delegated or follow is marked complete',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'activity.status_changed': {
    category: 'activities',
    label: 'Task Status / Priority Changed',
    description: 'Notify when task progress or priority is modified',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },

  // Calendar
  'calendar.meeting_invited': {
    category: 'calendar',
    label: 'Meeting Invitation',
    description:
      'Notify when you are invited to a calendar event or customer meeting',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'calendar.meeting_reminder': {
    category: 'calendar',
    label: 'Meeting Starting Soon (15 min)',
    description: 'Alert 15 minutes before scheduled start time',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'calendar.meeting_rescheduled': {
    category: 'calendar',
    label: 'Meeting Rescheduled',
    description: 'Notify when meeting time, date, or location is updated',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: true,
  },
  'calendar.meeting_cancelled': {
    category: 'calendar',
    label: 'Meeting Cancelled',
    description: 'Notify when an upcoming meeting has been cancelled',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: true,
  },

  // Communication
  'communication.email_received': {
    category: 'communication',
    label: 'Inbound Email from Lead / Customer',
    description:
      'Notify when a linked customer or lead replies to an email thread',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: false,
  },
  'communication.link_clicked': {
    category: 'communication',
    label: 'Tracked Link / Attachment Clicked',
    description:
      'Instant alert when a prospect opens your proposal link or attachment',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'communication.email_bounced': {
    category: 'communication',
    label: 'Email Delivery Bounced / Failed',
    description: 'Alert when an email to a lead or customer fails delivery',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },

  // Sales Targeting
  'sales_targeting.quota_assigned': {
    category: 'sales_targeting',
    label: 'Sales Quota Assigned / Updated',
    description:
      'Notify when your individual or team target is set for the quarter/year',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'sales_targeting.milestone_reached': {
    category: 'sales_targeting',
    label: 'Quota Milestone Reached (50%, 80%, 100%)',
    description: 'Notify when target progress crosses key target milestones',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'sales_targeting.period_ending': {
    category: 'sales_targeting',
    label: 'Sales Target Period Ending (7 Days)',
    description:
      'Countdown reminder before month or quarter quota cycle closes',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: true,
  },
  'sales_targeting.target_adjusted': {
    category: 'sales_targeting',
    label: 'Target Recalibrated',
    description: 'Notify if organizational revenue target is recalibrated',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },

  // PQQ & Tenders
  'pqq.assigned': {
    category: 'pqq',
    label: 'PQQ Tender Assigned to You',
    description:
      'Notify when you are assigned as lead compiler for a tender bid',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'pqq.deadline_approaching': {
    category: 'pqq',
    label: 'PQQ Submission Deadline Approaching',
    description: 'Urgent reminder 48h and 24h before tender submission lock',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'pqq.status_changed': {
    category: 'pqq',
    label: 'PQQ Status Changed',
    description: 'Notify when PQQ moves from In Progress to Review / Submitted',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'pqq.approved': {
    category: 'pqq',
    label: 'PQQ Approved for Submission',
    description: 'Notify when management authorizes tender submission',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'pqq.rejected': {
    category: 'pqq',
    label: 'PQQ Rejected / Revisions Requested',
    description: 'Notify when tender draft requires compliance revisions',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },

  // User Management
  'user_management.user_invited': {
    category: 'user_management',
    label: 'New Team Member Joined',
    description: 'Notify when an invited coworker activates their account',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'user_management.role_changed': {
    category: 'user_management',
    label: 'Role / Permissions Changed',
    description:
      'Security notice when your CRM role or team permissions change',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'user_management.account_status_changed': {
    category: 'user_management',
    label: 'Account Status Changed',
    description: 'Notice regarding user activation, lock, or deactivation',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },
  'user_management.password_reset': {
    category: 'user_management',
    label: 'Security & Password Notice',
    description:
      'Alert when a password change or security credential update occurs',
    defaultPriority: 'urgent',
    defaultInApp: true,
    defaultEmail: true,
  },

  // System & Custom Fields
  'system.schema_updated': {
    category: 'system_custom_fields',
    label: 'Custom Fields Schema Updated',
    description:
      'Notify when new custom attributes are deployed to your module forms',
    defaultPriority: 'low',
    defaultInApp: true,
    defaultEmail: false,
  },
  'system.field_validation_alert': {
    category: 'system_custom_fields',
    label: 'Data Validation / Sync Warning',
    description:
      'Alert if required custom field data is missing or failed validation',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'system.integration_alert': {
    category: 'system_custom_fields',
    label: 'Integration & Sync Status Alert',
    description:
      'Alert when third-party data synchronization requires re-authentication',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },

  // Mentions
  'comment.user_mentioned': {
    category: 'communication',
    label: 'Mentioned in Comment',
    description: 'Notify when someone @mentions you on a lead or deal comment',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },

  // Approvals
  'approval.requested': {
    category: 'approvals',
    label: 'Approval Needed',
    description: 'Notify when a record needs your approval',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'approval.approved': {
    category: 'approvals',
    label: 'Approval Granted',
    description: 'Notify when your approval request was fully approved',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'approval.rejected': {
    category: 'approvals',
    label: 'Approval Rejected',
    description: 'Notify when your approval request was rejected',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'approval.cancelled': {
    category: 'approvals',
    label: 'Approval Cancelled',
    description:
      'Notify when a pending approval request assigned to you was cancelled',
    defaultPriority: 'medium',
    defaultInApp: true,
    defaultEmail: false,
  },
  'approval.resubmitted': {
    category: 'approvals',
    label: 'Approval Resubmitted',
    description:
      'Notify when a rejected or cancelled request is resubmitted for your approval',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
  'approval.reassigned': {
    category: 'approvals',
    label: 'Approval Step Reassigned',
    description: 'Notify when an approval step is reassigned to you',
    defaultPriority: 'high',
    defaultInApp: true,
    defaultEmail: true,
  },
};

export function getDefaultPreferences(
  userId: string,
): UserNotificationPreferences {
  const categories: Record<
    NotificationCategory,
    Record<NotificationEventType, { inApp: boolean; email: boolean }>
  > = {
    leads: {} as any,
    deals: {} as any,
    customers: {} as any,
    activities: {} as any,
    calendar: {} as any,
    communication: {} as any,
    sales_targeting: {} as any,
    pqq: {} as any,
    user_management: {} as any,
    system_custom_fields: {} as any,
    approvals: {} as any,
  };

  (Object.keys(NOTIFICATION_EVENT_REGISTRY) as NotificationEventType[]).forEach(
    (eventType) => {
      const meta = NOTIFICATION_EVENT_REGISTRY[eventType];
      if (!categories[meta.category]) {
        categories[meta.category] = {} as any;
      }
      categories[meta.category][eventType] = {
        inApp: meta.defaultInApp,
        email: meta.defaultEmail,
      };
    },
  );

  return {
    userId,
    inAppEnabled: true,
    emailEnabled: true,
    outlookSyncEnabled: true,
    outlookTaskReminders: true,
    outlookCalendarReminders: true,
    categories,
    updatedAt: new Date().toISOString(),
  };
}

export function getCategoryDisplayLabel(
  category: NotificationCategory,
): string {
  if (category === 'deals' && !isLeadsEnabled()) {
    return notificationsCategoryLabel();
  }
  const def = CATEGORY_DEFINITIONS[category];
  return def ? notificationDisplayLabel(def.label) : category;
}

export function getCategoryDisplayDescription(
  category: NotificationCategory,
): string {
  const def = CATEGORY_DEFINITIONS[category];
  return def ? notificationDisplayDescription(def.description) : '';
}

export function getEventDisplayLabel(eventType: NotificationEventType): string {
  const meta = NOTIFICATION_EVENT_REGISTRY[eventType];
  return meta ? notificationDisplayLabel(meta.label) : eventType;
}

export function getEventDisplayDescription(
  eventType: NotificationEventType,
): string {
  const meta = NOTIFICATION_EVENT_REGISTRY[eventType];
  return meta ? notificationDisplayDescription(meta.description) : '';
}
