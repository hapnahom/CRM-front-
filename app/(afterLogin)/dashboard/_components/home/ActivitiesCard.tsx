'use client';

import React from 'react';
import type { HomeActivity } from './types';

interface ActivitiesCardProps {
  activities: HomeActivity[];
  title?: string;
  hint?: string;
  /** Personal views show "customer · time" and a priority badge instead of the tag. */
  variant?: 'tag' | 'priority';
}

export const ActivitiesCard: React.FC<ActivitiesCardProps> = ({
  activities,
  title = 'Scheduled Activities',
  hint = 'Upcoming reviews',
  variant = 'tag',
}) => {
  return (
    <div className="flex-1 rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div className="mt-2.5 space-y-2">
        {activities.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">
            Nothing scheduled right now.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-lg bg-surface-elevated p-2 text-xs"
            >
              <div className="mr-2 min-w-0">
                <strong className="block truncate font-medium text-foreground">
                  {activity.title}
                </strong>
                <span className="text-[10.5px] text-muted-foreground">
                  {variant === 'priority' && activity.customer
                    ? `${activity.customer} · ${activity.time}`
                    : activity.time}
                </span>
              </div>
              {variant === 'priority' && activity.priority ? (
                <span className="whitespace-nowrap rounded bg-brand-muted px-1.5 py-0.5 text-[9.5px] font-medium text-brand">
                  {activity.priority}
                </span>
              ) : (
                <span
                  className="whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-medium"
                  style={{
                    backgroundColor: activity.tagColor,
                    color: activity.textColor,
                  }}
                >
                  {activity.tag}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
