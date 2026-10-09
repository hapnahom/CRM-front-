'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/modules/communication/data/mockData';
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
} from '@/store/server/features/communication/mutations';
import { communicationApiErrorMessage } from '@/modules/communication/utils/apiErrorMessage';

const CATEGORIES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' },
] as const;

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Floating calendar date for all-day (UTC Y-M-D, never local TZ shift). */
function toFloatingDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function floatingDateIso(dayYmd: string) {
  return `${dayYmd.slice(0, 10)}T00:00:00.000Z`;
}

/** Graph timed: wall-clock without Z (datetime-local → HH:mm:ss). */
function timedWallClockFromLocalInput(local: string) {
  const raw = local.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 19);
  return raw;
}

/** Inclusive last day for Outlook-style date pickers (Graph end is exclusive). */
function inclusiveEndYmdFromExclusive(exclusiveEnd: Date, start: Date): string {
  const endDay = Date.UTC(
    exclusiveEnd.getUTCFullYear(),
    exclusiveEnd.getUTCMonth(),
    exclusiveEnd.getUTCDate(),
  );
  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  // Stored exclusive end must be after start; show last included calendar day.
  const inclusive =
    endDay > startDay ? new Date(endDay - 24 * 60 * 60 * 1000) : start;
  return toFloatingDateInput(inclusive);
}

function parseAttendees(raw: string) {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((email) => ({ email, name: email }));
}

type EventFormModalProps = {
  accountId: string;
  event?: CalendarEvent | null;
  defaultStart?: Date;
  onClose: () => void;
  onSaved?: () => void;
};

export function EventFormModal({
  accountId,
  event,
  defaultStart,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const isEdit = Boolean(event?.id);
  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();
  const saving = createMutation.isLoading || updateMutation.isLoading;

  const initialStart = useMemo(() => {
    if (event?.start) return new Date(event.start);
    if (defaultStart) return new Date(defaultStart);
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, [event, defaultStart]);

  const initialEnd = useMemo(() => {
    if (event?.end) return new Date(event.end);
    const d = new Date(initialStart);
    d.setHours(d.getHours() + 1);
    return d;
  }, [event, initialStart]);

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [startAt, setStartAt] = useState(
    event?.isAllDay
      ? `${toFloatingDateInput(initialStart)}T00:00`
      : toLocalInputValue(initialStart),
  );
  const [endAt, setEndAt] = useState(
    event?.isAllDay
      ? `${inclusiveEndYmdFromExclusive(initialEnd, initialStart)}T00:00`
      : toLocalInputValue(initialEnd),
  );
  const [isAllDay, setIsAllDay] = useState(Boolean(event?.isAllDay));
  const [category, setCategory] = useState(
    event?.type === 'follow-up'
      ? 'follow_up'
      : event?.type && event.type !== 'task'
        ? event.type
        : 'meeting',
  );
  const [attendeesRaw, setAttendeesRaw] = useState(
    (event?.attendees || []).map((a) => a.email).join(', '),
  );

  const submit = () => {
    if (!title.trim() || saving) return;

    let startIso: string;
    let endIso: string;
    if (isAllDay) {
      const startDay = startAt.slice(0, 10);
      const inclusiveEndDay = endAt.slice(0, 10) || startDay;
      if (!startDay) {
        toast.error('Invalid start date');
        return;
      }
      // Date pickers are inclusive; Graph/CRM store exclusive end (next day 00:00Z).
      const lastInclusive =
        inclusiveEndDay < startDay ? startDay : inclusiveEndDay;
      const exclusive = new Date(`${lastInclusive}T00:00:00.000Z`);
      exclusive.setUTCDate(exclusive.getUTCDate() + 1);
      startIso = floatingDateIso(startDay);
      endIso = floatingDateIso(exclusive.toISOString().slice(0, 10));
    } else {
      const start = new Date(startAt);
      const end = new Date(endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        toast.error('Invalid start or end time');
        return;
      }
      if (end <= start) {
        toast.error('End must be after start');
        return;
      }
      // Graph timed: wall-clock + timeZone (no Z / UTC conversion).
      startIso = timedWallClockFromLocalInput(startAt);
      endIso = timedWallClockFromLocalInput(endAt);
    }

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      startAt: startIso,
      endAt: endIso,
      timeZone: isAllDay
        ? 'UTC'
        : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      isAllDay,
      category,
      attendees: parseAttendees(attendeesRaw),
    };

    if (isEdit && event) {
      updateMutation.mutate(
        { accountId, eventId: event.id, body },
        {
          onSuccess: () => {
            toast.success('Event updated');
            onSaved?.();
            onClose();
          },
          onError: (error) => {
            const msg = communicationApiErrorMessage(
              error,
              'Failed to update event',
            );
            if (msg) toast.error(msg);
          },
        },
      );
      return;
    }

    createMutation.mutate(
      { accountId, body },
      {
        onSuccess: () => {
          toast.success('Event created');
          onSaved?.();
          onClose();
        },
        onError: (error) => {
          const msg = communicationApiErrorMessage(
            error,
            'Failed to create event',
          );
          if (msg) toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">
            {isEdit ? 'Edit event' : 'New event'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="h-10 w-full rounded-lg border border-border bg-surface-page px-3 text-sm font-medium outline-none focus:border-brand"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Start
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartAt(isAllDay ? (v ? `${v}T00:00` : '') : v);
                }}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-page px-2 text-sm outline-none"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              End
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? endAt.slice(0, 10) : endAt}
                onChange={(e) => {
                  const v = e.target.value;
                  setEndAt(isAllDay ? (v ? `${v}T00:00` : '') : v);
                }}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface-page px-2 text-sm outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIsAllDay(next);
                  if (next) {
                    if (startAt) setStartAt(`${startAt.slice(0, 10)}T00:00`);
                    if (endAt) setEndAt(`${endAt.slice(0, 10)}T00:00`);
                  }
                }}
              />
              All day
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface-page px-2 text-xs font-medium outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location or meeting link"
            className="h-9 w-full rounded-lg border border-border bg-surface-page px-3 text-sm outline-none"
          />
          <input
            value={attendeesRaw}
            onChange={(e) => setAttendeesRaw(e.target.value)}
            placeholder="Attendees (comma-separated emails)"
            className="h-9 w-full rounded-lg border border-border bg-surface-page px-3 text-sm outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-page px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || saving}
            className={cn(
              'h-9 rounded-lg px-3 text-xs font-semibold',
              title.trim()
                ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}
