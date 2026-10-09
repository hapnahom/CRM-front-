'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Users,
  X,
  Video,
  CalendarDays,
  Briefcase,
  User,
  Building2,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useCommunicationStore } from '@/store/uistate/features/communication/communicationStore';
import {
  CalendarEvent,
  EVENT_TYPE_CONFIG,
  type TodoItem,
} from '@/modules/communication/data/mockData';
import { useEmailAccounts } from '@/modules/communication/components/EmailAccountSettings';
import { EventFormModal } from '@/modules/communication/components/EventFormModal';
import { TaskFormModal } from '@/modules/communication/components/TaskFormModal';
import {
  useGetCalendarEvents,
  useGetCommunicationTasks,
} from '@/store/server/features/communication/queries';
import { useDeleteCalendarEvent } from '@/store/server/features/communication/mutations';
import type { CrmCalendarEvent } from '@/store/server/features/communication/types';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import { toast } from 'sonner';
import {
  MultiDayTimedGrid,
  type ReschedulePayload,
} from '@/modules/communication/components/calendarTimedGrid';
import {
  crmRelatedHref,
  mergeCrmLinkSources,
  type CrmRelatedLink,
} from '@/modules/communication/utils/crmRelatedLinks';
import { CalendarMonthSkeleton } from '@/components/loading/skeleton-screens';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addWeeks(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n * 7);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfWeek(d: Date) {
  return endOfDay(addDays(startOfWeek(d), 6));
}

function isAllDayEvent(event: CalendarEvent) {
  if (event.isAllDay) return true;
  // Only treat long blocks as all-day — not short timed tasks that start at midnight.
  const ms = event.end.getTime() - event.start.getTime();
  return ms >= 20 * 60 * 60 * 1000;
}

/**
 * Day placement for calendar grids.
 * - All-day: match grid cell Y-M-D to the event's UTC date window [start, end)
 *   (CRM stores all-day as UTC midnight → next midnight for the chosen calendar date).
 * - Timed (incl. CRM tasks ~1h): only the start day — avoids a late-night
 *   task also painting the next column at 12:00 AM.
 */
function eventBelongsOnDay(event: CalendarEvent, day: Date) {
  if (isAllDayEvent(event)) {
    const cellDay = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
    const rangeStart = Date.UTC(
      event.start.getUTCFullYear(),
      event.start.getUTCMonth(),
      event.start.getUTCDate(),
    );
    const rangeEndExclusive = Date.UTC(
      event.end.getUTCFullYear(),
      event.end.getUTCMonth(),
      event.end.getUTCDate(),
    );
    return cellDay >= rangeStart && cellDay < rangeEndExclusive;
  }
  return isSameDay(event.start, day);
}

function formatEventWhen(event: CalendarEvent): string {
  if (isAllDayEvent(event)) {
    const y = event.start.getUTCFullYear();
    const m = event.start.getUTCMonth();
    const d = event.start.getUTCDate();
    const endExclusive = new Date(
      Date.UTC(
        event.end.getUTCFullYear(),
        event.end.getUTCMonth(),
        event.end.getUTCDate(),
      ),
    );
    const lastInclusive = new Date(
      endExclusive.getTime() - 24 * 60 * 60 * 1000,
    );
    const sameDay =
      y === lastInclusive.getUTCFullYear() &&
      m === lastInclusive.getUTCMonth() &&
      d === lastInclusive.getUTCDate();
    if (sameDay) {
      return `All day · ${MONTHS[m]} ${d}, ${y}`;
    }
    return `All day · ${MONTHS[m]} ${d} – ${MONTHS[lastInclusive.getUTCMonth()]} ${lastInclusive.getUTCDate()}, ${y}`;
  }
  const timeRange = `${formatTime(event.start)} – ${formatTime(event.end)}`;
  if (isSameDay(event.start, event.end)) {
    return `${timeRange}, ${MONTHS[event.start.getMonth()]} ${event.start.getDate()}`;
  }
  return timeRange;
}

function formatHeader(date: Date, mode: string) {
  if (mode === 'month')
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  if (mode === 'week') {
    const s = startOfWeek(date);
    const e = addDays(s, 6);
    if (s.getMonth() === e.getMonth())
      return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function mapCategoryToType(category: string): CalendarEvent['type'] {
  switch (category) {
    case 'meeting':
      return 'meeting';
    case 'call':
      return 'call';
    case 'demo':
      return 'demo';
    case 'follow_up':
      return 'follow-up';
    case 'deadline':
      return 'deadline';
    case 'task':
      return 'task';
    default:
      return 'other';
  }
}

function mapCrmEvent(row: CrmCalendarEvent): CalendarEvent {
  const mappedType = mapCategoryToType(row.category);
  const type =
    row.origin === 'crm_task' && mappedType === 'other' ? 'task' : mappedType;
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    start: new Date(row.start),
    end: new Date(row.end),
    type,
    location: row.location || undefined,
    isAllDay: row.isAllDay,
    timeZone: row.timeZone ?? null,
    attendees: (row.attendees || []).map((a) => ({
      name: a.name || a.email || 'CRM assignee',
      email: a.email || '',
      responseStatus: a.responseStatus || null,
      hasEmail: a.hasEmail ?? Boolean(a.email?.includes('@')),
      userId: a.userId || null,
    })),
    origin: (row.origin as CalendarEvent['origin']) || 'provider',
    taskId: row.taskId,
    connectedAccountId: row.connectedAccountId,
    leadId: row.leadId,
    dealId: row.dealId,
    customerId: row.customerId,
    contactId: row.contactId,
  };
}

function visibleRange(date: Date, mode: string): { from: Date; to: Date } {
  if (mode === 'month') {
    const gridStart = startOfWeek(startOfMonth(date));
    const monthEnd = endOfMonth(date);
    const gridEnd = endOfWeek(monthEnd);
    // Include the full last week cell.
    return { from: gridStart, to: addDays(startOfDay(gridEnd), 1) };
  }
  if (mode === 'week') {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfDay(date);
  return { from, to: addDays(from, 1) };
}

function displayEventTitle(event: CalendarEvent): string {
  const isTaskEvent =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);
  if (!isTaskEvent) return event.title;
  // Strip completion marks + legacy "Task:" prefix — UI adds a single ✓ when done.
  return (
    event.title
      .replace(/^(✓\s*)+/g, '')
      .replace(/^Task:\s*/i, '')
      .trim() || event.title
  );
}

function isCompletedTaskEvent(event: CalendarEvent): boolean {
  const isTaskEvent =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);
  if (!isTaskEvent) return false;
  return /^(✓\s*)+/.test((event.title || '').trim());
}

function EventPill({
  event,
  onClick,
  compact = false,
}: {
  event: CalendarEvent;
  onClick: () => void;
  compact?: boolean;
}) {
  const cfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
  const isTaskEvent =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);
  const isCompleted = isCompletedTaskEvent(event);
  const label = displayEventTitle(event);
  const whenLabel = isAllDayEvent(event) ? 'All day' : formatTime(event.start);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'group flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] font-semibold transition-all hover:brightness-95 hover:shadow-sm',
        isTaskEvent && 'ring-1 ring-teal-500/40',
      )}
      style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
      title={
        isTaskEvent
          ? isCompleted
            ? `Completed task · ${whenLabel} · ${label}`
            : `Task · ${whenLabel} · ${label}`
          : `${whenLabel} · ${label}`
      }
    >
      <span
        className={cn(
          'h-1.5 w-1.5 flex-shrink-0 rounded-full',
          isTaskEvent && 'ring-1 ring-current',
        )}
        style={{ backgroundColor: cfg.color }}
      />
      <span className={cn('truncate', compact && 'max-w-[90px]')}>
        {isCompleted && <span className="mr-1 opacity-70">✓</span>}
        {!compact && !isAllDayEvent(event) && (
          <span className="mr-1 opacity-60">{formatTime(event.start)}</span>
        )}
        {label}
      </span>
    </button>
  );
}

function attendeeResponseLabel(
  status?: string | null,
  hasEmail = true,
): {
  text: string;
  className: string;
} {
  if (!hasEmail || (status || '').toLowerCase() === 'crm_only') {
    return {
      text: 'No email',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-800',
    };
  }
  const s = (status || '').toLowerCase();
  if (s === 'accepted') {
    return {
      text: 'Accepted',
      className: 'border-success/30 bg-success/10 text-success',
    };
  }
  if (s === 'declined') {
    return {
      text: 'Declined',
      className: 'border-error/30 bg-error/10 text-error',
    };
  }
  if (s === 'tentativelyaccepted' || s === 'tentative') {
    return {
      text: 'Tentative',
      className: 'border-warning/30 bg-warning/10 text-warning',
    };
  }
  if (s === 'organizer') {
    return {
      text: 'Organizer',
      className: 'border-brand/30 bg-brand-muted text-brand',
    };
  }
  return {
    text: 'Pending',
    className: 'border-border bg-muted/40 text-muted-foreground',
  };
}

function RelatedLinkIcon({ type }: { type: CrmRelatedLink['type'] }) {
  if (type === 'deal') return <Briefcase size={11} />;
  if (type === 'lead') return <User size={11} />;
  if (type === 'contact') return <Building2 size={11} />;
  return <Target size={11} />;
}

function EventDetailPanel({
  event,
  linkedTask,
  accountId,
  userNameById,
  onClose,
  onEdit,
}: {
  event: CalendarEvent;
  linkedTask?: TodoItem | null;
  accountId?: string | null;
  userNameById?: Map<string, string>;
  onClose: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const deleteMutation = useDeleteCalendarEvent();
  const cfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
  const crmLinks = mergeCrmLinkSources(linkedTask, event);

  const handleDelete = () => {
    if (!accountId || deleteMutation.isLoading) return;
    const isTaskLinked =
      event.origin === 'crm_task' ||
      event.type === 'task' ||
      Boolean(event.taskId);
    const ok = window.confirm(
      isTaskLinked
        ? 'Delete this CRM task and remove it from your connected calendar?\n\nThe task will be deleted (counts update) and this time slot will be free for another task.'
        : 'Delete/cancel this event from CRM and your connected calendar?\n\nThis time slot will be free for another task or event.',
    );
    if (!ok) return;
    deleteMutation.mutate(
      { accountId, eventId: event.id },
      {
        onSuccess: () => {
          toast.success(
            isTaskLinked
              ? 'Task deleted — slot is free'
              : 'Event deleted — slot is free',
          );
          onClose();
        },
        onError: () => {
          toast.error('Failed to delete event');
        },
      },
    );
  };

  const isTaskLinked =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="h-1.5 w-full" style={{ backgroundColor: cfg.color }} />

        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span
                className={cn(
                  'mb-2 inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold',
                  cfg.bg,
                )}
              >
                {cfg.label}
              </span>
              <h3 className="text-[16px] font-bold text-foreground leading-snug">
                {displayEventTitle(event)}
              </h3>
              {event.origin === 'crm_task' && (
                <p className="mt-1 text-[11px] font-medium text-teal-700">
                  {isCompletedTaskEvent(event)
                    ? 'Linked CRM task · Done'
                    : 'Linked CRM task event'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3 text-[13px] text-foreground/80">
            <div className="flex items-center gap-3 rounded-xl bg-surface-page/70 px-3 py-2.5">
              <Clock
                size={15}
                className="flex-shrink-0 text-muted-foreground/50"
              />
              <span className="font-medium">{formatEventWhen(event)}</span>
            </div>

            {crmLinks.length > 0 && (
              <div className="rounded-xl bg-surface-page/70 px-3 py-2.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  CRM links
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {crmLinks.map((link) => {
                    const href = crmRelatedHref(link);
                    return (
                      <button
                        key={`${link.type}-${link.id}`}
                        type="button"
                        onClick={() => {
                          if (!href) return;
                          onClose();
                          router.push(href);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-brand/30 hover:bg-brand-muted/40 hover:text-brand"
                        title={
                          href
                            ? link.type === 'contact'
                              ? 'Open customer and set this contact as primary'
                              : `Open ${link.type}`
                            : `${link.type}: ${link.name}`
                        }
                      >
                        <RelatedLinkIcon type={link.type} />
                        <span className="capitalize text-muted-foreground/70">
                          {link.type}
                        </span>
                        <span className="max-w-[140px] truncate text-foreground/80">
                          {link.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-3 rounded-xl bg-surface-page/70 px-3 py-2.5">
                {event.location.toLowerCase().includes('zoom') ||
                event.location.toLowerCase().includes('meet') ||
                event.location.toLowerCase().includes('teams') ? (
                  <Video
                    size={15}
                    className="flex-shrink-0 text-muted-foreground/50"
                  />
                ) : (
                  <MapPin
                    size={15}
                    className="flex-shrink-0 text-muted-foreground/50"
                  />
                )}
                <span className="font-medium">{event.location}</span>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-surface-page/70 px-3 py-2.5">
                <Users
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-muted-foreground/50"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Attendees
                  </p>
                  {event.attendees.map((a) => {
                    const hasEmail =
                      a.hasEmail ?? Boolean(a.email?.includes('@'));
                    const rsvp = attendeeResponseLabel(
                      a.responseStatus,
                      hasEmail,
                    );
                    const resolvedName =
                      (a.userId && userNameById?.get(a.userId)) ||
                      (a.name && a.name !== 'CRM assignee' ? a.name : null) ||
                      a.email ||
                      'CRM assignee';
                    return (
                      <div
                        key={a.userId || a.email || a.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-foreground">
                            {resolvedName}
                          </p>
                          {hasEmail && a.email ? (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {a.email}
                            </p>
                          ) : (
                            <p className="truncate text-[10px] text-amber-700/80">
                              No connected mailbox email
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                            rsvp.className,
                          )}
                        >
                          {rsvp.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {event.description && (
              <p className="rounded-xl bg-surface-page/70 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>

          {accountId && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="h-9 flex-1 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isLoading}
                className="h-9 flex-1 rounded-lg border border-error/30 text-xs font-semibold text-error hover:bg-error/10"
              >
                {deleteMutation.isLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
          {isTaskLinked && (
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Edit updates the CRM task (and connected calendar). Delete removes
              the task and frees this time slot.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onDayClick?: (day: Date) => void;
}) {
  const today = new Date();
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const gridStart = startOfWeek(firstDay);
  const gridEnd = endOfWeek(lastDay);
  const totalCells =
    Math.round(
      (startOfDay(gridEnd).getTime() - gridStart.getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1;

  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push(addDays(gridStart, i));
  }

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => eventBelongsOnDay(e, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/50 overflow-auto">
        {cells.map((day, idx) => {
          const isThisMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayEvents = eventsForDay(day);

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick?.(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick?.(day);
                }
              }}
              className={cn(
                'relative flex min-h-[90px] cursor-pointer flex-col p-1.5 transition-colors',
                !isThisMonth && 'bg-surface-page/40',
                isThisMonth && 'hover:bg-brand/[0.02]',
                isToday && 'bg-brand/[0.03]',
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-xl text-[12px] font-semibold transition-colors',
                    isToday
                      ? 'bg-brand font-bold text-white shadow-sm shadow-brand/20'
                      : isThisMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/30',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventPill
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    compact
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="pl-2 text-[10px] font-medium text-muted-foreground/50">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WEEK_HOUR_PX = 56;
const DAY_HOUR_PX = 68;

function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  onReschedule,
  rescheduleDisabled,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onDayClick?: (day: Date) => void;
  onReschedule: (payload: ReschedulePayload) => void;
  rescheduleDisabled?: boolean;
}) {
  const today = new Date();
  const weekStart = startOfWeek(currentDate);
  const days = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
    addDays(weekStart, offset),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 8 * WEEK_HOUR_PX;
  }, [currentDate]);

  const timedForDay = (day: Date) =>
    events
      .filter((e) => eventBelongsOnDay(e, day) && !isAllDayEvent(e))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  const allDayForDay = (day: Date) =>
    events
      .filter((e) => eventBelongsOnDay(e, day) && isAllDayEvent(e))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  const hasAllDay = days.some((d) => allDayForDay(d).length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid flex-shrink-0 grid-cols-[52px_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick?.(day)}
              className="py-2.5 text-center transition-colors hover:bg-brand/[0.03]"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {DAYS[day.getDay()]}
              </p>
              <div className="mt-1 flex justify-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-xl text-[13px] font-bold',
                    isToday
                      ? 'bg-brand text-white shadow-sm shadow-brand/20'
                      : 'text-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {hasAllDay && (
        <div className="grid flex-shrink-0 grid-cols-[52px_repeat(7,1fr)] border-b border-border bg-surface-page/40">
          <div className="flex items-start justify-end pr-2 pt-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            All day
          </div>
          {days.map((day) => (
            <div
              key={`allday-${day.toISOString()}`}
              className="min-h-[44px] space-y-0.5 border-l border-border/50 p-0.5"
            >
              {allDayForDay(day).map((ev) => {
                const cfg =
                  EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.other;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    title={`All day · ${displayEventTitle(ev)}`}
                    className="flex w-full items-center rounded-md px-1.5 py-1.5 text-left text-[11px] font-semibold transition-all hover:brightness-95"
                    style={{
                      backgroundColor: cfg.color + '22',
                      color: cfg.color,
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <span className="truncate">
                      {isCompletedTaskEvent(ev) ? '✓ ' : ''}
                      {displayEventTitle(ev)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <MultiDayTimedGrid
          days={days}
          eventsForDay={timedForDay}
          hourPx={WEEK_HOUR_PX}
          onEventClick={onEventClick}
          onProposeReschedule={onReschedule}
          disabled={rescheduleDisabled}
        />
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  events,
  onEventClick,
  onReschedule,
  rescheduleDisabled,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onReschedule: (payload: ReschedulePayload) => void;
  rescheduleDisabled?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => eventBelongsOnDay(e, currentDate))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events, currentDate],
  );
  const allDayEvents = dayEvents.filter(isAllDayEvent);
  const timedEvents = dayEvents.filter((e) => !isAllDayEvent(e));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 8 * DAY_HOUR_PX;
  }, [currentDate]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border px-5 py-4">
        <p className="text-[15px] font-bold text-foreground">
          {DAYS[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]}{' '}
          {currentDate.getDate()}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
          {timedEvents.length > 0
            ? ' · drag across time (30 min), then confirm in the form'
            : ''}
        </p>
      </div>

      {allDayEvents.length > 0 && (
        <div className="flex-shrink-0 space-y-1.5 border-b border-border bg-surface-page/40 px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            All day
          </p>
          {allDayEvents.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.other;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                className="w-full rounded-xl p-3 text-left transition-all hover:brightness-95 hover:shadow-sm"
                style={{
                  backgroundColor: cfg.color + '12',
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <p
                  className="text-[13px] font-bold"
                  style={{ color: cfg.color }}
                >
                  {isCompletedTaskEvent(ev) ? '✓ ' : ''}
                  {displayEventTitle(ev)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-page ring-1 ring-border/50">
              <CalendarDays size={24} className="text-muted-foreground/30" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">
              No events this day
            </p>
          </div>
        ) : (
          <MultiDayTimedGrid
            days={[currentDate]}
            eventsForDay={() => timedEvents}
            hourPx={DAY_HOUR_PX}
            onEventClick={onEventClick}
            onProposeReschedule={onReschedule}
            disabled={rescheduleDisabled}
          />
        )}
      </div>
    </div>
  );
}

function UpcomingSidebar({
  events,
  activeAccountId,
  remoteTasks,
  onEventClick,
}: {
  events: CalendarEvent[];
  activeAccountId: string | null;
  remoteTasks: Array<{
    connectedAccountId?: string | null;
    calendarEventId?: string | null;
    completed?: boolean;
    dueDate?: string | null;
  }>;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.start >= now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 8),
    [events, now],
  );

  const offActiveMailboxCount = useMemo(() => {
    if (!activeAccountId) return 0;
    return remoteTasks.filter(
      (t) =>
        !t.completed && t.dueDate && t.connectedAccountId !== activeAccountId,
    ).length;
  }, [activeAccountId, remoteTasks]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-surface-page/40">
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Upcoming
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {upcoming.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-[12px] text-muted-foreground/50">
              No upcoming events
            </p>
            {offActiveMailboxCount > 0 ? (
              <p className="px-1 text-[11px] leading-relaxed text-amber-800/90">
                {offActiveMailboxCount} CRM task
                {offActiveMailboxCount === 1 ? '' : 's'} still appear on the
                Tasks tab. This calendar only shows the active mailbox — switch
                it in the header, or edit a task to sync it here.
              </p>
            ) : null}
          </div>
        ) : (
          upcoming.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.other;
            const isToday = isSameDay(ev.start, now);
            const isDone = isCompletedTaskEvent(ev);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                className={cn(
                  'group w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm',
                  isDone
                    ? 'border-success/25 bg-success/[0.04] hover:border-success/40'
                    : 'border-border bg-white hover:border-brand/20 hover:bg-brand/[0.02]',
                )}
              >
                <div className="flex items-start gap-2.5">
                  {isDone ? (
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md bg-success text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  ) : (
                    <span
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'truncate text-[12px] font-semibold',
                          isDone
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground',
                        )}
                      >
                        {displayEventTitle(ev)}
                      </p>
                      {isDone && (
                        <span className="flex-shrink-0 rounded border border-success/25 bg-success/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isToday
                        ? 'Today'
                        : isAllDayEvent(ev)
                          ? `${MONTHS[ev.start.getUTCMonth()].slice(0, 3)} ${ev.start.getUTCDate()}`
                          : `${MONTHS[ev.start.getMonth()].slice(0, 3)} ${ev.start.getDate()}`}
                      {' · '}
                      {isAllDayEvent(ev) ? 'All day' : formatTime(ev.start)}
                    </p>
                    {ev.location && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <MapPin size={9} />
                        {ev.location}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const {
    calendarViewMode,
    setCalendarViewMode,
    calendarCurrentDate,
    setCalendarCurrentDate,
  } = useCommunicationStore();

  const { activeAccountId } = useEmailAccounts();
  const { data: usersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 100,
  });
  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of usersData?.data || []) {
      if (!u.id) continue;
      const name =
        u.name ||
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        u.email ||
        '';
      if (name) map.set(u.id, name);
    }
    return map;
  }, [usersData]);
  const range = useMemo(
    () => visibleRange(calendarCurrentDate, calendarViewMode),
    [calendarCurrentDate, calendarViewMode],
  );

  const {
    data: remoteEvents = [],
    isLoading,
    isError,
  } = useGetCalendarEvents(
    activeAccountId || null,
    range.from.toISOString(),
    range.to.toISOString(),
  );

  const events = useMemo(() => remoteEvents.map(mapCrmEvent), [remoteEvents]);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const { data: remoteTasks = [] } = useGetCommunicationTasks();
  const taskById = useMemo(() => {
    const map = new Map<string, TodoItem>();
    for (const row of remoteTasks) {
      map.set(row.id, {
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        completed: Boolean(row.completed),
        priority: (row.priority as TodoItem['priority']) || 'medium',
        dueDate: row.dueDate || undefined,
        tags: row.tags || [],
        createdAt: row.createdAt,
        connectedAccountId: row.connectedAccountId,
        calendarEventId: row.calendarEventId,
        calendarSyncStatus: row.calendarSyncStatus,
        isAllDay: Boolean(row.isAllDay),
        assigneeUserIds: row.assigneeUserIds || [],
        ownerUserId: row.ownerUserId,
        leadId: row.leadId,
        dealId: row.dealId,
        customerId: row.customerId,
        contactId: row.contactId,
        relatedLinks: (row.relatedLinks || []).map((l) => ({
          type: l.type,
          name: l.name,
          id: l.id,
          customerId:
            l.customerId ?? (l.type === 'contact' ? row.customerId : null),
        })),
        relatedTo: row.relatedTo
          ? {
              type: row.relatedTo.type,
              name: row.relatedTo.name || row.relatedTo.type,
              id: row.relatedTo.id,
            }
          : undefined,
      });
    }
    return map;
  }, [remoteTasks]);

  const taskByCalendarEventId = useMemo(() => {
    const map = new Map<string, TodoItem>();
    for (const task of taskById.values()) {
      if (task.calendarEventId) map.set(task.calendarEventId, task);
    }
    return map;
  }, [taskById]);

  const resolveLinkedTask = (event: CalendarEvent): TodoItem | null => {
    if (event.taskId) {
      const byId = taskById.get(event.taskId);
      if (byId) return byId;
    }
    const byEvent = taskByCalendarEventId.get(event.id);
    if (byEvent) return byEvent;
    // Do not invent a task from a stale taskId — that causes 404 on Update
    // when the CRM task was already deleted (orphan calendar event).
    return null;
  };

  const navigate = (dir: 1 | -1) => {
    if (calendarViewMode === 'month') {
      setCalendarCurrentDate(addMonths(calendarCurrentDate, dir));
    } else if (calendarViewMode === 'week') {
      setCalendarCurrentDate(addWeeks(calendarCurrentDate, dir));
    } else {
      setCalendarCurrentDate(addDays(calendarCurrentDate, dir));
    }
  };

  const goToToday = () => setCalendarCurrentDate(new Date());

  const openDay = (day: Date) => {
    setCalendarCurrentDate(startOfDay(day));
    setCalendarViewMode('day');
  };

  const handleReschedule = (payload: ReschedulePayload) => {
    const { event, start, end } = payload;
    const isTaskLinked =
      event.origin === 'crm_task' ||
      event.type === 'task' ||
      Boolean(event.taskId);

    setSelectedEvent(null);

    if (isTaskLinked) {
      const existing = resolveLinkedTask(event);
      if (existing) {
        setEditingTask({
          ...existing,
          dueDate: start.toISOString(),
        });
        return;
      }
      // Orphan CRM-task event (task deleted, calendar row left behind).
      toast.error(
        'This calendar item has no matching CRM task (it may have been deleted). Delete it from the event details to clear the slot.',
      );
      setSelectedEvent({ ...event, start, end });
      return;
    }

    if (!activeAccountId && !event.connectedAccountId) {
      toast.error('Connect a mailbox to edit calendar events');
      return;
    }

    setEditingEvent({
      ...event,
      start,
      end,
    });
    setEventFormOpen(true);
  };

  const VIEW_MODES = ['month', 'week', 'day'] as const;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card">
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-card px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-surface-elevated"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {formatHeader(calendarCurrentDate, calendarViewMode)}
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex rounded-lg border border-border bg-surface-page p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCalendarViewMode(mode)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors sm:px-3',
                  calendarViewMode === mode
                    ? 'bg-surface-card text-brand shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTaskFormOpen(true)}
            title="Add a CRM task (syncs to your connected calendar when a mailbox is connected)"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add task</span>
          </button>
        </div>
      </div>

      {!activeAccountId ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <CalendarDays
              className="mx-auto mb-3 text-muted-foreground"
              size={28}
            />
            <p className="text-sm font-medium text-foreground">
              Connect a mailbox to view calendar
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Tasks stay on the Tasks tab for this CRM user. Connect Microsoft
              or Google in Communication to view calendar events and optionally
              sync task due times here.
            </p>
          </div>
        </div>
      ) : isLoading && events.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <CalendarMonthSkeleton />
        </div>
      ) : isError && events.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Could not load calendar events. Reconnect the mailbox if Calendar
          permission is missing.
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="min-w-0 flex-[7] overflow-hidden bg-surface-card">
            {calendarViewMode === 'month' && (
              <MonthView
                currentDate={calendarCurrentDate}
                events={events}
                onEventClick={setSelectedEvent}
                onDayClick={openDay}
              />
            )}
            {calendarViewMode === 'week' && (
              <WeekView
                currentDate={calendarCurrentDate}
                events={events}
                onEventClick={setSelectedEvent}
                onDayClick={openDay}
                onReschedule={handleReschedule}
              />
            )}
            {calendarViewMode === 'day' && (
              <DayView
                currentDate={calendarCurrentDate}
                events={events}
                onEventClick={setSelectedEvent}
                onReschedule={handleReschedule}
              />
            )}
          </div>

          <div className="hidden w-[280px] flex-shrink-0 flex-col lg:flex xl:w-[300px]">
            <UpcomingSidebar
              events={events}
              activeAccountId={activeAccountId}
              remoteTasks={remoteTasks}
              onEventClick={setSelectedEvent}
            />
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          linkedTask={resolveLinkedTask(selectedEvent)}
          accountId={activeAccountId}
          userNameById={userNameById}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            const isTaskLinked =
              selectedEvent.origin === 'crm_task' ||
              selectedEvent.type === 'task' ||
              Boolean(selectedEvent.taskId);
            if (isTaskLinked) {
              const task = resolveLinkedTask(selectedEvent);
              if (!task) {
                toast.error(
                  'Could not load linked task — open it from the Todos tab',
                );
                return;
              }
              setEditingTask(task);
              setSelectedEvent(null);
              return;
            }
            if (!activeAccountId) {
              toast.error('Connect a mailbox to edit calendar events');
              return;
            }
            setEditingEvent(selectedEvent);
            setSelectedEvent(null);
            setEventFormOpen(true);
          }}
        />
      )}

      {taskFormOpen && (
        <TaskFormModal
          defaultDate={calendarCurrentDate}
          onClose={() => setTaskFormOpen(false)}
        />
      )}

      {editingTask && (
        <TaskFormModal
          key={`edit-task-${editingTask.id}-${editingTask.dueDate || ''}`}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}

      {eventFormOpen &&
        (activeAccountId || editingEvent?.connectedAccountId) &&
        editingEvent && (
          <EventFormModal
            key={`edit-event-${editingEvent.id}-${editingEvent.start.getTime()}`}
            accountId={editingEvent.connectedAccountId || activeAccountId || ''}
            event={editingEvent}
            defaultStart={calendarCurrentDate}
            onClose={() => {
              setEventFormOpen(false);
              setEditingEvent(null);
            }}
          />
        )}
    </div>
  );
}
