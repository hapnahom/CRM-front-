'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  currentFiscalSession,
  type PipelineFiscalYear,
  type PipelinePeriodSelection,
} from '@/modules/sales-pipeline/pipeline-filter';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import { resolveFiscalPeriod } from '@/modules/sales-pipeline/report/period';
import { useGetFiscalCalendars } from '@/store/server/features/salesTargeting/queries';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';

const HEADER_CONTROL_CLASS =
  'box-border flex h-9 min-h-9 max-h-9 shrink-0 items-center py-0 text-[12px] leading-none font-medium shadow-none';

export type ResolvedDashboardPeriod = {
  from: string;
  to: string;
  label: string;
  ready: boolean;
  sessionId?: string;
  calendarId?: string;
};

function yearIdForPeriod(
  period: PipelinePeriodSelection,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  activeYearId?: string,
): string | undefined {
  if (period.type === 'annual') {
    return period.calendarId ?? activeYearId;
  }
  return (
    fiscalYears.find((year) =>
      year.sessions.some((session) => session.id === period.sessionId),
    )?.id ?? activeYearId
  );
}

function fiscalTriggerLabel(
  period: PipelinePeriodSelection,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  fiscalYear?: PipelineFiscalYear<OrgFiscalSession>,
): string {
  if (period.type === 'session') {
    const year = fiscalYears.find((item) =>
      item.sessions.some((session) => session.id === period.sessionId),
    );
    const session = year?.sessions.find((item) => item.id === period.sessionId);
    if (session && year) {
      return fiscalYears.length > 1
        ? `${year.name} · ${session.name}`
        : session.name;
    }
    return session?.name ?? 'Fiscal period';
  }
  const year = period.calendarId
    ? fiscalYears.find((item) => item.id === period.calendarId)
    : fiscalYear;
  return year?.name ?? 'Annual';
}

type HomeDashboardPeriodSelectorProps = {
  onResolvedChange: (resolved: ResolvedDashboardPeriod | null) => void;
  className?: string;
};

export function HomeDashboardPeriodSelector({
  onResolvedChange,
  className,
}: HomeDashboardPeriodSelectorProps) {
  const { isFetched: calendarsFetched, isError: calendarsError } =
    useGetFiscalCalendars();
  const calendarsSettled = calendarsFetched || calendarsError;
  const { fiscalYear, fiscalYears, sessions, allSessions, loadingYearIds } =
    usePipelineFiscalSessions();

  const [open, setOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<PipelinePeriodSelection>({
    type: 'annual',
  });

  const didInitPeriod = useRef(false);
  const onResolvedChangeRef = useRef(onResolvedChange);
  onResolvedChangeRef.current = onResolvedChange;

  const sessionPool = allSessions.length ? allSessions : sessions;

  useEffect(() => {
    if (didInitPeriod.current || !sessionPool.length) return;
    didInitPeriod.current = true;
    const current = currentFiscalSession(sessionPool);
    if (current) {
      setPeriod({ type: 'session', sessionId: current.id });
      return;
    }
    const activeYear =
      fiscalYears.find((year) => year.isActive) ?? fiscalYears[0];
    if (activeYear) {
      setPeriod({ type: 'annual', calendarId: activeYear.id });
    }
  }, [fiscalYears, sessionPool]);

  const selectedYearId = yearIdForPeriod(period, fiscalYears, fiscalYear?.id);

  const resolved = useMemo(() => {
    if (!calendarsSettled) return null;
    const base = resolveFiscalPeriod(period, sessionPool, fiscalYears);
    const calendarId =
      period.type === 'annual'
        ? (period.calendarId ?? fiscalYear?.id)
        : fiscalYears.find((year) =>
            year.sessions.some((session) => session.id === base.sessionId),
          )?.id;
    return { ...base, calendarId };
  }, [calendarsSettled, fiscalYear?.id, fiscalYears, period, sessionPool]);

  const lastResolvedKey = useRef('');

  useEffect(() => {
    const payload: ResolvedDashboardPeriod | null = resolved
      ? {
          from: resolved.from,
          to: resolved.to,
          label: resolved.label,
          ready: Boolean(resolved.from && resolved.to),
          sessionId: resolved.sessionId,
          calendarId: resolved.calendarId,
        }
      : null;

    const key = payload
      ? `${payload.from}|${payload.to}|${payload.label}|${payload.ready}|${payload.sessionId ?? ''}|${payload.calendarId ?? ''}`
      : '';

    if (key === lastResolvedKey.current) return;

    lastResolvedKey.current = key;
    onResolvedChangeRef.current(payload);
  }, [resolved]);

  const triggerLabel = fiscalTriggerLabel(period, fiscalYears, fiscalYear);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && selectedYearId) {
      setExpandedYears(new Set([selectedYearId]));
    }
  };

  const toggleYear = (id: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectYear = (year: PipelineFiscalYear<OrgFiscalSession>) => {
    setPeriod({ type: 'annual', calendarId: year.id });
    setOpen(false);
  };

  const selectSession = (sessionId: string) => {
    setPeriod({ type: 'session', sessionId });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Filter by fiscal period"
          className={cn(
            'inline-flex min-w-[168px] max-w-[240px] items-center gap-2 rounded-md border border-border bg-white px-3 text-foreground hover:bg-surface-elevated',
            HEADER_CONTROL_CLASS,
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {triggerLabel}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-0">
        <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-2">
          {fiscalYears.length === 0 ? (
            <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
              No fiscal years found
            </p>
          ) : (
            fiscalYears.map((year) => {
              const isExpanded = expandedYears.has(year.id);
              const yearSelected =
                period.type === 'annual' &&
                (period.calendarId ?? fiscalYear?.id) === year.id;

              return (
                <div key={year.id}>
                  <div className="flex items-center gap-0.5 rounded-sm transition-colors hover:bg-accent">
                    <button
                      type="button"
                      onClick={() => toggleYear(year.id)}
                      className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                      aria-label={
                        isExpanded
                          ? `Collapse ${year.name}`
                          : `Expand ${year.name}`
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectYear(year)}
                      className={cn(
                        'flex flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors',
                        yearSelected && 'bg-accent',
                      )}
                    >
                      <span className="flex-1 font-semibold text-foreground">
                        {year.name}
                      </span>
                      {year.id === fiscalYear?.id ? (
                        <span className="text-[10px] text-muted-foreground">
                          Current
                        </span>
                      ) : null}
                      {yearSelected ? (
                        <Check size={12} className="shrink-0 text-brand" />
                      ) : null}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="ml-4 border-l border-border pl-2">
                      <div className="space-y-0.5 py-1">
                        {year.sessions.length === 0 ? (
                          <p className="px-2 py-2 text-[11px] text-muted-foreground">
                            {loadingYearIds.includes(year.id)
                              ? 'Loading quarters...'
                              : 'No quarters'}
                          </p>
                        ) : (
                          year.sessions.map((session) => {
                            const selected =
                              period.type === 'session' &&
                              period.sessionId === session.id;
                            return (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => selectSession(session.id)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
                                  selected && 'bg-accent',
                                )}
                              >
                                <span className="flex-1 truncate text-foreground">
                                  {session.name}
                                </span>
                                {selected ? (
                                  <Check
                                    size={12}
                                    className="shrink-0 text-brand"
                                  />
                                ) : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
