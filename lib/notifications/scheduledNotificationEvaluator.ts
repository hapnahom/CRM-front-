import { centralNotificationService } from './centralNotificationService';
import { dealUiLabel } from '@/config/salesWorkflow';

export interface EvaluatableTask {
  id: string;
  title: string;
  assignedUserId: string;
  dueDate: string; // ISO date string
  completed: boolean;
  priority?: string;
}

export interface EvaluatableMeeting {
  id: string;
  title: string;
  attendeeUserIds: string[];
  startTime: string; // ISO date string
  endTime: string;
  location?: string;
}

export interface EvaluatableDeal {
  id: string;
  name: string;
  assignedUserId: string;
  expectedCloseDate: string; // ISO date string
  amount: number;
  currency: string;
  stageName: string;
  isClosed: boolean;
}

export interface EvaluatablePQQ {
  id: string;
  title: string;
  assignedUserId: string;
  submissionDeadline: string; // ISO date string
  status: string;
}

export class ScheduledNotificationEvaluator {
  /**
   * Evaluates all tasks for a user and dispatches due soon / overdue alerts
   */
  public evaluateTasks(tasks: EvaluatableTask[]): void {
    const now = Date.now();

    tasks.forEach((task) => {
      if (task.completed || !task.dueDate) return;

      const dueTimestamp = new Date(task.dueDate).getTime();
      const diffMs = dueTimestamp - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Overdue
      if (diffMs < 0) {
        centralNotificationService.dispatchNotification({
          category: 'activities',
          eventType: 'activity.overdue',
          title: `Task Overdue: ${task.title}`,
          body: `This task was due on ${new Date(task.dueDate).toLocaleDateString()} and is now overdue.`,
          recipientId: task.assignedUserId,
          actorId: 'system',
          actorName: 'Task Reminder Service',
          priority: 'urgent',
          actionUrl: `/communication?tab=tasks`,
          actionLabel: 'Open Tasks',
          dedupKey: `activity.overdue:${task.id}:${new Date(task.dueDate).toDateString()}`,
          dedupWindowMs: 1000 * 60 * 60 * 12, // 12 hours dedup window
        });
      }
      // Due in 1 hour or less
      else if (diffHours > 0 && diffHours <= 1) {
        centralNotificationService.dispatchNotification({
          category: 'activities',
          eventType: 'activity.due_soon',
          title: `Task Due Soon: ${task.title}`,
          body: `Due in less than an hour (${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
          recipientId: task.assignedUserId,
          actorId: 'system',
          actorName: 'Task Reminder Service',
          priority: 'high',
          actionUrl: `/communication?tab=tasks`,
          actionLabel: 'Open Tasks',
          dedupKey: `activity.due_soon_1h:${task.id}`,
          dedupWindowMs: 1000 * 60 * 60 * 4,
        });
      }
      // Due in 24 hours
      else if (diffHours > 1 && diffHours <= 24) {
        centralNotificationService.dispatchNotification({
          category: 'activities',
          eventType: 'activity.due_soon',
          title: `Task Due Tomorrow: ${task.title}`,
          body: `Scheduled for tomorrow at ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          recipientId: task.assignedUserId,
          actorId: 'system',
          actorName: 'Task Reminder Service',
          priority: 'medium',
          actionUrl: `/communication?tab=tasks`,
          actionLabel: 'Open Tasks',
          dedupKey: `activity.due_soon_24h:${task.id}`,
          dedupWindowMs: 1000 * 60 * 60 * 12,
        });
      }
    });
  }

  /**
   * Evaluates calendar meetings for 15-minute start reminders
   */
  public evaluateMeetings(meetings: EvaluatableMeeting[]): void {
    const now = Date.now();

    meetings.forEach((meeting) => {
      if (!meeting.startTime) return;
      const startMs = new Date(meeting.startTime).getTime();
      const diffMinutes = (startMs - now) / (1000 * 60);

      // Starting in 15 minutes (between 0 and 15 mins)
      if (diffMinutes > 0 && diffMinutes <= 15) {
        meeting.attendeeUserIds.forEach((attendeeId) => {
          centralNotificationService.dispatchNotification({
            category: 'calendar',
            eventType: 'calendar.meeting_reminder',
            title: `Meeting in ${Math.ceil(diffMinutes)} mins: ${meeting.title}`,
            body: `Starts at ${new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${meeting.location ? `(${meeting.location})` : ''}`,
            recipientId: attendeeId,
            actorId: 'system',
            actorName: 'Calendar Reminder',
            priority: 'high',
            actionUrl: `/communication?tab=calendar`,
            actionLabel: 'Open Calendar',
            dedupKey: `calendar.meeting_reminder:${meeting.id}`,
            dedupWindowMs: 1000 * 60 * 30, // 30 mins
          });
        });
      }
    });
  }

  /**
   * Evaluates deal close dates
   */
  public evaluateDeals(deals: EvaluatableDeal[]): void {
    const now = Date.now();

    deals.forEach((deal) => {
      if (deal.isClosed || !deal.expectedCloseDate) return;
      const closeTimestamp = new Date(deal.expectedCloseDate).getTime();
      const diffDays = (closeTimestamp - now) / (1000 * 60 * 60 * 24);

      if (closeTimestamp < now) {
        // Overdue close date
        centralNotificationService.dispatchNotification({
          category: 'deals',
          eventType: 'deal.close_date_overdue',
          title: `${dealUiLabel()} Expected Close Date Overdue: ${deal.name}`,
          body: `Target close date was ${new Date(deal.expectedCloseDate).toLocaleDateString()}. Please update stage or target date.`,
          recipientId: deal.assignedUserId,
          actorId: 'system',
          actorName: `${dealUiLabel()} Pipeline Evaluator`,
          priority: 'high',
          actionUrl: `/deals/manage-deals`,
          actionLabel: `View ${dealUiLabel()}`,
          dedupKey: `deal.close_date_overdue:${deal.id}:${new Date().toDateString()}`,
          dedupWindowMs: 1000 * 60 * 60 * 24, // Once per day
        });
      } else if (diffDays <= 3) {
        // Approaching in 3 days
        centralNotificationService.dispatchNotification({
          category: 'deals',
          eventType: 'deal.close_date_approaching',
          title: `${dealUiLabel()} Close Approaching in ${Math.ceil(diffDays)} days: ${deal.name}`,
          body: `Estimated value: ${deal.currency} ${deal.amount.toLocaleString()}. Stage: ${deal.stageName}.`,
          recipientId: deal.assignedUserId,
          actorId: 'system',
          actorName: `${dealUiLabel()} Pipeline Evaluator`,
          priority: 'medium',
          actionUrl: `/deals/manage-deals`,
          actionLabel: `View ${dealUiLabel()}`,
          dedupKey: `deal.close_date_approaching:${deal.id}`,
          dedupWindowMs: 1000 * 60 * 60 * 24,
        });
      }
    });
  }

  /**
   * Helper to trigger demonstration notifications covering the scheduled categories
   */
  public triggerDemoNotifications(userId: string): void {
    const now = Date.now();

    // 1. Task due soon
    this.evaluateTasks([
      {
        id: `demo-task-${now}`,
        title: 'Submit Customer RFP Response',
        assignedUserId: userId,
        dueDate: new Date(now + 1000 * 60 * 40).toISOString(), // in 40 mins
        completed: false,
      },
    ]);

    // 2. Calendar meeting in 10 mins
    this.evaluateMeetings([
      {
        id: `demo-meeting-${now}`,
        title: 'Weekly Pipeline Review with VP',
        attendeeUserIds: [userId],
        startTime: new Date(now + 1000 * 60 * 10).toISOString(),
        endTime: new Date(now + 1000 * 60 * 40).toISOString(),
        location: 'Teams Conference Room A',
      },
    ]);

    // 3. Deal close date approaching
    this.evaluateDeals([
      {
        id: `demo-deal-${now}`,
        name: 'Apex Holdings CRM Expansion',
        assignedUserId: userId,
        expectedCloseDate: new Date(now + 1000 * 60 * 60 * 48).toISOString(), // in 2 days
        amount: 72000,
        currency: 'USD',
        stageName: 'Negotiation',
        isClosed: false,
      },
    ]);

    // 4. Sales Target milestone
    centralNotificationService.dispatchNotification({
      category: 'sales_targeting',
      eventType: 'sales_targeting.milestone_reached',
      title: 'Target Milestone Reached: 80% Q3 Quota',
      body: 'Congratulations! You have reached 80% ($160,000 / $200,000) of your quarterly target.',
      recipientId: userId,
      actorId: 'system',
      actorName: 'Target Tracker',
      priority: 'high',
      actionUrl: '/sales-targeting',
      actionLabel: 'View Targets',
      dedupWindowMs: 1000 * 60,
    });
  }
}

export const scheduledNotificationEvaluator =
  new ScheduledNotificationEvaluator();
