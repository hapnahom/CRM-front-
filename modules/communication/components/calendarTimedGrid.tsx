'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  CalendarEvent,
  EVENT_TYPE_CONFIG,
} from '@/modules/communication/data/mockData';

/** Vertical / cross-day snap for drag reschedule. */
export const SNAP_MINUTES = 30;
const MIN_DURATION_MS = SNAP_MINUTES * 60 * 1000;
const DAY_HOURS = [...Array(24).keys()];

export function snapMinutes(totalMinutes: number): number {
  return Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function minutesFromDayStart(date: Date, day: Date): number {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.min(
      24 * 60,
      Math.round((date.getTime() - dayStart.getTime()) / 60000),
    ),
  );
}

export function dateFromDayMinutes(day: Date, minutes: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const clamped = Math.max(0, Math.min(24 * 60 - SNAP_MINUTES, minutes));
  d.setMinutes(clamped);
  return d;
}

function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

function displayTitle(event: CalendarEvent): string {
  const isTask =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);
  if (!isTask) return event.title;
  return (
    event.title
      .replace(/^(✓\s*)+/g, '')
      .replace(/^Task:\s*/i, '')
      .trim() || event.title
  );
}

function isCompleted(event: CalendarEvent): boolean {
  const isTask =
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId);
  return isTask && /^(✓\s*)+/.test((event.title || '').trim());
}

function isTaskEvent(event: CalendarEvent): boolean {
  return (
    event.origin === 'crm_task' ||
    event.type === 'task' ||
    Boolean(event.taskId)
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDestination(start: Date, end: Date) {
  const dayLabel = start.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${dayLabel} · ${formatTime(start)} – ${formatTime(end)}`;
}

export type ReschedulePayload = {
  event: CalendarEvent;
  start: Date;
  end: Date;
};

type DragMode = 'move' | 'resize';

type ActiveDrag = {
  event: CalendarEvent;
  mode: DragMode;
  pointerId: number;
  originClientX: number;
  originClientY: number;
  originStart: Date;
  originEnd: Date;
  durationMs: number;
  moved: boolean;
  start: Date;
  end: Date;
  targetDayKey: string;
  pointerX: number;
  pointerY: number;
};

function EventBlockVisual({
  event,
  className,
  style,
  dimmed,
  dragging,
}: {
  event: CalendarEvent;
  className?: string;
  style?: React.CSSProperties;
  dimmed?: boolean;
  dragging?: boolean;
}) {
  const cfg = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
  const task = isTaskEvent(event);
  const completed = isCompleted(event);
  const label = displayTitle(event);
  return (
    <div
      className={cn(
        'h-full w-full overflow-hidden rounded-md border border-black/5 px-1.5 py-0.5 text-left text-[11px] font-semibold shadow-sm select-none',
        task && 'ring-1 ring-teal-500/40',
        dragging && 'shadow-lg ring-2 ring-brand/40',
        dimmed && 'opacity-35',
        className,
      )}
      style={{
        backgroundColor: cfg.color + (dragging ? '33' : '22'),
        color: cfg.color,
        borderLeft: `3px solid ${cfg.color}`,
        ...style,
      }}
    >
      <div className="truncate leading-tight">
        {completed && <span className="mr-0.5 opacity-70">✓</span>}
        <span className="opacity-70">{formatTime(event.start)}</span> {label}
      </div>
    </div>
  );
}

/**
 * Multi-day (or single-day) timed grid with cross-column drag,
 * 30-minute snap, live destination teller, and confirm-on-drop via callback.
 */
export function MultiDayTimedGrid({
  days,
  eventsForDay,
  hourPx,
  onEventClick,
  onProposeReschedule,
  disabled,
}: {
  days: Date[];
  eventsForDay: (day: Date) => CalendarEvent[];
  hourPx: number;
  onEventClick: (e: CalendarEvent) => void;
  onProposeReschedule: (payload: ReschedulePayload) => void;
  disabled?: boolean;
}) {
  const height = 24 * hourPx;
  const columnRefs = useRef(new Map<string, HTMLDivElement>());
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const suppressClickIdRef = useRef<string | null>(null);

  const resolveDrop = useCallback(
    (
      clientX: number,
      clientY: number,
      mode: DragMode,
      originStart: Date,
      originEnd: Date,
      durationMs: number,
    ): { day: Date; start: Date; end: Date; dayKey: string } | null => {
      if (!days.length) return null;

      let bestDay = days[0];
      let bestEl = columnRefs.current.get(dayKey(days[0]));
      let bestDist = Number.POSITIVE_INFINITY;

      for (const day of days) {
        const el = columnRefs.current.get(dayKey(day));
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          bestDay = day;
          bestEl = el;
          bestDist = 0;
          break;
        }
        const mid = (rect.left + rect.right) / 2;
        const dist = Math.abs(clientX - mid);
        if (dist < bestDist) {
          bestDist = dist;
          bestDay = day;
          bestEl = el;
        }
      }

      if (!bestEl) return null;
      const rect = bestEl.getBoundingClientRect();
      const relY = clientY - rect.top;
      let minutes = snapMinutes((relY / hourPx) * 60);
      minutes = Math.max(0, Math.min(24 * 60 - SNAP_MINUTES, minutes));

      if (mode === 'resize') {
        const start = new Date(originStart);
        let end = dateFromDayMinutes(bestDay, minutes);
        // Resize stays on the event's start day.
        end = dateFromDayMinutes(
          originStart,
          snapMinutes(minutesFromDayStart(end, originStart)),
        );
        if (end.getTime() - start.getTime() < MIN_DURATION_MS) {
          end = new Date(start.getTime() + MIN_DURATION_MS);
        }
        return {
          day: originStart,
          start,
          end,
          dayKey: dayKey(originStart),
        };
      }

      const start = dateFromDayMinutes(bestDay, minutes);
      const end = new Date(start.getTime() + durationMs);
      return {
        day: bestDay,
        start,
        end,
        dayKey: dayKey(bestDay),
      };
    },
    [days, hourPx],
  );

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      const dx = e.clientX - state.originClientX;
      const dy = e.clientY - state.originClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.moved = true;

      const next = resolveDrop(
        e.clientX,
        e.clientY,
        state.mode,
        state.originStart,
        state.originEnd,
        state.durationMs,
      );
      if (!next) return;

      const updated: ActiveDrag = {
        ...state,
        start: next.start,
        end: next.end,
        targetDayKey: next.dayKey,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      dragRef.current = updated;
      setDrag(updated);
    };

    const onUp = (e: PointerEvent) => {
      const state = dragRef.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const next = resolveDrop(
        e.clientX,
        e.clientY,
        state.mode,
        state.originStart,
        state.originEnd,
        state.durationMs,
      );
      dragRef.current = null;
      setDrag(null);

      if (!next || !state.moved) return;
      const unchanged =
        next.start.getTime() === state.originStart.getTime() &&
        next.end.getTime() === state.originEnd.getTime();
      if (unchanged) return;

      suppressClickIdRef.current = state.event.id;
      onProposeReschedule({
        event: state.event,
        start: next.start,
        end: next.end,
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, onProposeReschedule, resolveDrop]);

  const beginDrag = (
    event: CalendarEvent,
    mode: DragMode,
    e: React.PointerEvent,
  ) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const durationMs = Math.max(
      MIN_DURATION_MS,
      event.end.getTime() - event.start.getTime(),
    );
    const initial: ActiveDrag = {
      event,
      mode,
      pointerId: e.pointerId,
      originClientX: e.clientX,
      originClientY: e.clientY,
      originStart: new Date(event.start),
      originEnd: new Date(event.end),
      durationMs,
      moved: false,
      start: new Date(event.start),
      end: new Date(event.end),
      targetDayKey: dayKey(event.start),
      pointerX: e.clientX,
      pointerY: e.clientY,
    };
    dragRef.current = initial;
    setDrag(initial);
  };

  return (
    <>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <HourGutter hourPx={hourPx} />
        {days.map((day) => {
          const key = dayKey(day);
          const events = eventsForDay(day);
          const showGhost = Boolean(drag?.moved) && drag?.targetDayKey === key;

          return (
            <div
              key={key}
              ref={(el) => {
                if (el) columnRefs.current.set(key, el);
                else columnRefs.current.delete(key);
              }}
              className="relative border-l border-border/50"
              style={{ height }}
            >
              {DAY_HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  <div
                    className="absolute inset-x-0 border-b border-border/50"
                    style={{ top: hour * hourPx, height: hourPx }}
                  />
                  {/* 30-minute mid-line */}
                  <div
                    className="pointer-events-none absolute inset-x-0 border-b border-dashed border-border/30"
                    style={{ top: hour * hourPx + hourPx / 2 }}
                  />
                </React.Fragment>
              ))}

              {events.map((ev) => {
                const startMin = minutesFromDayStart(ev.start, day);
                const endMin = Math.max(
                  startMin + SNAP_MINUTES,
                  minutesFromDayStart(ev.end, day),
                );
                const top = (startMin / 60) * hourPx;
                const blockHeight = Math.max(
                  ((endMin - startMin) / 60) * hourPx,
                  20,
                );
                const isSource = drag?.event.id === ev.id;
                const task = isTaskEvent(ev);
                const canResize = !task && !disabled;

                return (
                  <div
                    key={ev.id}
                    className={cn(
                      'absolute left-0.5 right-0.5 z-10',
                      disabled
                        ? 'cursor-default'
                        : 'cursor-grab active:cursor-grabbing',
                    )}
                    style={{
                      top,
                      height: blockHeight,
                      visibility:
                        isSource && drag?.moved ? 'hidden' : 'visible',
                    }}
                    title={
                      task
                        ? 'Drag across days / time (30 min). Drop to confirm in the edit form.'
                        : 'Drag to move (30 min). Resize from bottom. Drop to confirm.'
                    }
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      beginDrag(ev, 'move', e);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (suppressClickIdRef.current === ev.id) {
                        suppressClickIdRef.current = null;
                        return;
                      }
                      onEventClick(ev);
                    }}
                  >
                    <EventBlockVisual event={ev} />
                    {canResize && (
                      <div
                        className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          beginDrag(ev, 'resize', e);
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {showGhost && drag && (
                <div
                  className="pointer-events-none absolute left-0.5 right-0.5 z-30"
                  style={{
                    top: (minutesFromDayStart(drag.start, day) / 60) * hourPx,
                    height: Math.max(
                      ((drag.end.getTime() - drag.start.getTime()) / 3600000) *
                        hourPx,
                      20,
                    ),
                  }}
                >
                  <EventBlockVisual
                    event={{
                      ...drag.event,
                      start: drag.start,
                      end: drag.end,
                    }}
                    dragging
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {drag?.moved &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-[120%] rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background shadow-lg ring-1 ring-black/10"
            style={{ left: drag.pointerX, top: drag.pointerY }}
          >
            <span className="opacity-70">Moving to </span>
            {formatDestination(drag.start, drag.end)}
          </div>,
          document.body,
        )}
    </>
  );
}

/** @deprecated Prefer MultiDayTimedGrid — kept for single-column callers. */
export function DayTimedColumn({
  day,
  events,
  hourPx,
  onEventClick,
  onReschedule,
  disabled,
}: {
  day: Date;
  events: CalendarEvent[];
  hourPx: number;
  onEventClick: (e: CalendarEvent) => void;
  onReschedule: (payload: ReschedulePayload) => void;
  disabled?: boolean;
}) {
  return (
    <MultiDayTimedGrid
      days={[day]}
      eventsForDay={() => events}
      hourPx={hourPx}
      onEventClick={onEventClick}
      onProposeReschedule={onReschedule}
      disabled={disabled}
    />
  );
}

export function HourGutter({ hourPx }: { hourPx: number }) {
  return (
    <div className="relative" style={{ height: 24 * hourPx }}>
      {DAY_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-b border-border/50 pr-3 pt-1 text-right text-[10px] font-medium leading-none text-muted-foreground/40"
          style={{ top: hour * hourPx, height: hourPx }}
        >
          {formatHourLabel(hour)}
        </div>
      ))}
    </div>
  );
}

function formatHourLabel(hour: number) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}
