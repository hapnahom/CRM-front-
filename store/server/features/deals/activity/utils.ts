import { getPriorityColor } from '@/utils/showValidationErrors';
import { Activity, ActivityFilters } from './types';

/**
 * Get priority color for activity priority
 */
export const getActivityPriorityColor = (priority: string) => {
  return getPriorityColor(priority);
};

/**
 * Format activity date for display
 */
export const formatActivityDate = (date: Date | string): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Check if activity is overdue
 */
export const isActivityOverdue = (activityDate: Date | string): boolean => {
  if (!activityDate) return false;

  const dateObj =
    typeof activityDate === 'string' ? new Date(activityDate) : activityDate;
  const now = new Date();

  return dateObj < now && !dateObj.toDateString().includes(now.toDateString());
};

/**
 * Get activity status color for visual representation
 * Returns color based on: completed (green), failed (red), early (blue), overdue (orange)
 * Priority: completed > failed > date-based status (early/overdue)
 */
export const getActivityStatusColor = (
  isCompleted: boolean,
  failed: boolean,
  activityDate: Date,
): string => {
  // Priority 1: Completed activities (green)
  if (isCompleted) return 'green';

  // Priority 2: Failed activities (red) - takes precedence over overdue
  if (failed) return 'red';

  if (!activityDate) return 'blue'; // Default to blue if no date

  const now = new Date();

  // Priority 3: Early activities (future date - blue)
  if (activityDate > now) return 'blue';

  // Priority 4: Overdue activities (past date and not completed/failed - orange)
  if (activityDate < now) return 'orange';

  return 'blue'; // Default to blue for same day
};

/**
 * Get activity status text
 * Priority: completed > failed > date-based status (early/overdue)
 */
export const getActivityStatus = (
  isCompleted: boolean,
  failed: boolean,
  activityDate: Date | string,
): string => {
  // Priority 1: Completed activities
  if (isCompleted) return 'Completed';

  // Priority 2: Failed activities - takes precedence over overdue
  if (failed) return 'Failed';

  // Priority 3: Date-based status
  if (isActivityOverdue(activityDate)) return 'Overdue';

  return 'Pending';
};

/**
 * Build query string from filters
 */
export const buildActivityQueryString = (filters: ActivityFilters): string => {
  const params = new URLSearchParams();
  const normalized = normalizeActivityFilters(filters);

  Object.entries(normalized).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, String(value));
      }
    }
  });

  return params.toString();
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalize filters; keeps dealId as primary filter field. */
export function normalizeActivityFilters(
  filters: ActivityFilters,
): ActivityFilters {
  if (!filters.dealId) return filters;
  return { ...filters, dealId: filters.dealId };
}

/** Resolve display name for an activity's deal without bulk-fetching all deals. */
export function resolveActivityDealName(
  activity: Record<string, unknown>,
): string {
  const deal = activity.deal as
    | { name?: string; dealName?: string }
    | undefined;
  if (deal?.name) return deal.name;
  if (deal?.dealName) return deal.dealName;

  const dealName = activity.dealName;
  if (
    typeof dealName === 'string' &&
    dealName.trim() &&
    !UUID_REGEX.test(dealName)
  ) {
    return dealName;
  }

  return 'Unknown Deal';
}

/**
 * Validate activity data before submission (for create operations)
 */
export const validateActivityData = (data: Partial<Activity>): string[] => {
  const errors: string[] = [];

  if (!data.activityName?.trim()) {
    errors.push('Activity name is required');
  }

  if (!data.activityDate) {
    errors.push('Activity date is required');
  }

  if (!data.assignee?.trim()) {
    errors.push('Assignee is required');
  }

  if (!data.priority) {
    errors.push('Priority is required');
  }

  if (!data.activityTypeId?.trim()) {
    errors.push('Activity type is required');
  }

  // Validate responsiblePersons array
  if (
    !data.responsiblePersons ||
    !Array.isArray(data.responsiblePersons) ||
    data.responsiblePersons.length === 0
  ) {
    errors.push('At least one responsible person is required');
  }

  // Validate that failed and isCompleted are not both true
  if (data.failed === true && data.isCompleted === true) {
    errors.push('An activity cannot be both failed and completed');
  }

  return errors;
};

/**
 * Validate activity data for updates (only validates provided fields)
 */
export const validateActivityUpdateData = (
  data: Partial<Activity>,
): string[] => {
  const errors: string[] = [];

  // Only validate fields that are actually being updated
  if (data.activityName !== undefined && !data.activityName?.trim()) {
    errors.push('Activity name is required');
  }

  if (data.activityDate !== undefined && !data.activityDate) {
    errors.push('Activity date is required');
  }

  if (data.assignee !== undefined && !data.assignee?.trim()) {
    errors.push('Assignee is required');
  }

  if (data.priority !== undefined && !data.priority) {
    errors.push('Priority is required');
  }

  if (data.activityTypeId !== undefined && !data.activityTypeId?.trim()) {
    errors.push('Activity type is required');
  }

  // Validate responsiblePersons array if provided
  if (data.responsiblePersons !== undefined) {
    if (
      !Array.isArray(data.responsiblePersons) ||
      data.responsiblePersons.length === 0
    ) {
      errors.push('At least one responsible person is required');
    }
  }

  // Validate that failed and isCompleted are not both true
  if (data.failed === true && data.isCompleted === true) {
    errors.push('An activity cannot be both failed and completed');
  }

  return errors;
};
