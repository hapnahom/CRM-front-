import { tokens } from '@/lib/design-tokens';
import React from 'react';
import dayjs from 'dayjs';

interface StatusIndicatorProps {
  isCompleted: boolean;
  failed: boolean;
  activityDate: Date | string;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isCompleted,
  failed,
  activityDate,
  className = '',
}) => {
  // Parse the date string to a Date object using dayjs
  const parsedDate =
    typeof activityDate === 'string'
      ? dayjs(activityDate).toDate()
      : activityDate;

  const now = new Date();

  // Determine status and color
  let status = '';
  let color = '';

  if (isCompleted) {
    status = 'Done';
    color = tokens.color.success; // Green
  } else if (failed) {
    status = 'Failed';
    color = tokens.color.error; // Red
  } else if (parsedDate && dayjs(parsedDate).isAfter(now)) {
    status = 'Upcoming';
    color = tokens.color.blue; // Blue
  } else if (parsedDate && dayjs(parsedDate).isBefore(now)) {
    status = 'Overdue';
    color = tokens.color.orange; // Orange
  } else {
    status = 'Pending';
    color = tokens.color.textMuted; // Gray
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}40`,
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
};

export default StatusIndicator;
