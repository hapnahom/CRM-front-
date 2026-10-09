import {
  currentFiscalSession,
  sortFiscalSessions,
  type PipelineFiscalYear,
  type PipelinePeriodSelection,
} from '../pipeline-filter';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';
import type { ResolvedReportPeriod } from './types';
import { isoDate } from './format';
import {
  DATE_RANGE_PRESET_OPTIONS,
  type DateRangePreset,
  type ReportPeriodValue,
} from './period-selection';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function parseSessionDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(value.slice(0, 10)) : date;
}

function rangeLabel(from: Date, to: Date, title: string): string {
  const fromText = from.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const toText = to.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${title} · ${fromText} – ${toText}`;
}

function sessionsOverlapping(
  sessions: OrgFiscalSession[],
  from: Date,
  to: Date,
): OrgFiscalSession[] {
  const fromKey = isoDate(from);
  const toKey = isoDate(to);
  return sessions.filter((session) => {
    const start = session.startDate.slice(0, 10);
    const end = session.endDate.slice(0, 10);
    return start <= toKey && end >= fromKey;
  });
}

function isWeekSession(session: OrgFiscalSession): boolean {
  return /\bweek\b/i.test((session.name ?? '').trim());
}

function findFiscalYearForSession(
  session: OrgFiscalSession,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): PipelineFiscalYear<OrgFiscalSession> | undefined {
  return (
    fiscalYears.find((year) => year.id === session.calendarId) ??
    fiscalYears.find((year) =>
      year.sessions.some((item) => item.id === session.id),
    )
  );
}

function pickActiveFiscalYear(
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): PipelineFiscalYear<OrgFiscalSession> | undefined {
  return fiscalYears.find((year) => year.isActive) ?? fiscalYears[0];
}

function sortedFiscalYears(
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): PipelineFiscalYear<OrgFiscalSession>[] {
  return [...fiscalYears].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

function sessionFiscalParts(
  session: OrgFiscalSession,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'> {
  const year = findFiscalYearForSession(session, fiscalYears);
  const name = (session.name ?? '').trim();
  const looksLikeWeek = isWeekSession(session);
  return {
    fiscalYear: year?.name?.trim() || undefined,
    quarter: looksLikeWeek ? undefined : name || undefined,
    week: looksLikeWeek ? name : undefined,
  };
}

function weekLabelForRange(from: Date): string {
  return `Week of ${from.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

/** Prefer session that contains `anchor` (usually range end / today). */
function primaryOverlappingSession(
  overlapping: OrgFiscalSession[],
  anchor: Date,
): OrgFiscalSession | undefined {
  if (!overlapping.length) return undefined;
  const key = isoDate(anchor);
  return (
    overlapping.find((session) => {
      const start = session.startDate.slice(0, 10);
      const end = session.endDate.slice(0, 10);
      return start <= key && key <= end;
    }) ?? overlapping[overlapping.length - 1]
  );
}

function resolveMetadataFromSessions(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  from: Date,
  to: Date,
  extras?: Partial<
    Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'>
  >,
): Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'> {
  const overlapping = sessionsOverlapping(sessions, from, to);
  const primary = primaryOverlappingSession(overlapping, to);
  const parts = primary
    ? sessionFiscalParts(primary, fiscalYears)
    : { fiscalYear: undefined, quarter: undefined, week: undefined };

  let fiscalYear = parts.fiscalYear;
  let quarter = parts.quarter;
  let week = parts.week;

  // Week sessions don't carry a quarter name — borrow from a non-week overlap.
  if (week && !quarter) {
    const quarterSession = overlapping.find(
      (session) => !isWeekSession(session),
    );
    if (quarterSession) {
      const quarterParts = sessionFiscalParts(quarterSession, fiscalYears);
      quarter = quarterParts.quarter;
      fiscalYear = fiscalYear || quarterParts.fiscalYear;
    }
  }

  // Extras fill gaps only (never override Settings-derived FY/Q).
  fiscalYear = fiscalYear || extras?.fiscalYear;
  quarter = quarter || extras?.quarter;
  week = week || extras?.week;

  if (!fiscalYear) {
    const activeYear = pickActiveFiscalYear(fiscalYears);
    if (activeYear) {
      const yearFrom = startOfDay(parseSessionDate(activeYear.startDate));
      const yearTo = endOfDay(parseSessionDate(activeYear.endDate));
      if (from <= yearTo && to >= yearFrom) {
        fiscalYear = activeYear.name.trim();
      }
    }
  }

  return { fiscalYear, quarter, week };
}

function enrichFromOverlappingSessions(
  period: ResolvedReportPeriod,
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  from: Date,
  to: Date,
  extras?: Partial<
    Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'>
  >,
): ResolvedReportPeriod {
  return {
    ...period,
    ...resolveMetadataFromSessions(sessions, fiscalYears, from, to, extras),
  };
}

/**
 * Clamp a calendar range into the active fiscal year. If the calendar range
 * lies entirely outside the FY, fall back to today (or FY start) within the FY.
 */
function clampToFiscalYear(
  from: Date,
  to: Date,
  year: PipelineFiscalYear<OrgFiscalSession>,
  now: Date,
): { from: Date; to: Date } {
  const yearFrom = startOfDay(parseSessionDate(year.startDate));
  const yearTo = endOfDay(parseSessionDate(year.endDate));
  let clampedFrom = from < yearFrom ? yearFrom : from;
  let clampedTo = to > yearTo ? yearTo : to;

  if (clampedFrom > clampedTo) {
    const today = endOfDay(now);
    const anchor =
      today < yearFrom ? yearFrom : today > yearTo ? yearTo : today;
    clampedFrom = startOfDay(anchor);
    clampedTo = endOfDay(anchor);
  }

  return { from: startOfDay(clampedFrom), to: endOfDay(clampedTo) };
}

function sessionRange(
  session: OrgFiscalSession,
  through?: Date,
): { from: Date; to: Date } {
  const from = startOfDay(parseSessionDate(session.startDate));
  let to = endOfDay(parseSessionDate(session.endDate));
  if (through && through < to) {
    to = endOfDay(through);
  }
  return { from, to: from > to ? endOfDay(from) : to };
}

export function resolveFiscalPeriod(
  selection: PipelinePeriodSelection,
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): ResolvedReportPeriod {
  if (selection.type === 'all') {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = endOfDay(new Date(now.getFullYear(), 11, 31));
    return {
      preset: 'annual',
      label: 'All periods',
      from: isoDate(from),
      to: isoDate(to),
      applyCreatedAtFilter: false,
    };
  }
  if (selection.type === 'session') {
    const year = fiscalYears.find((item) =>
      item.sessions.some((session) => session.id === selection.sessionId),
    );
    const session = (year?.sessions ?? sessions).find(
      (item) => item.id === selection.sessionId,
    );
    if (session) {
      const from = startOfDay(parseSessionDate(session.startDate));
      const to = endOfDay(parseSessionDate(session.endDate));
      const title = year
        ? fiscalYears.length > 1
          ? `${year.name} · ${session.name}`
          : session.name
        : session.name;
      const parts = sessionFiscalParts(session, fiscalYears);
      return {
        preset: 'session',
        label: title,
        from: isoDate(from),
        to: isoDate(to),
        sessionId: session.id,
        applyCreatedAtFilter: false,
        fiscalYear: parts.fiscalYear || year?.name?.trim(),
        quarter: parts.quarter,
        week: parts.week,
      };
    }
  }

  const year =
    selection.type === 'annual' && selection.calendarId
      ? fiscalYears.find((item) => item.id === selection.calendarId)
      : pickActiveFiscalYear(fiscalYears);
  if (!year) {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = endOfDay(new Date(now.getFullYear(), 11, 31));
    return {
      preset: 'annual',
      label: rangeLabel(from, to, 'Annual'),
      from: isoDate(from),
      to: isoDate(to),
      applyCreatedAtFilter: true,
      fiscalYear: undefined,
    };
  }
  const yearSessions = sortFiscalSessions(year.sessions);
  const from = startOfDay(parseSessionDate(year.startDate));
  const to = endOfDay(parseSessionDate(year.endDate));
  return {
    preset: 'annual',
    label: year.name,
    from: isoDate(from),
    to: isoDate(to),
    sessionIds: yearSessions.map((session) => session.id),
    applyCreatedAtFilter: false,
    fiscalYear: year.name.trim(),
  };
}

export function resolveCustomPeriod(
  customFrom: Date,
  customTo: Date,
  sessions: OrgFiscalSession[],
  title = 'Custom range',
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[] = [],
  extras?: Partial<
    Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'>
  >,
): ResolvedReportPeriod {
  let from = startOfDay(customFrom);
  let to = endOfDay(customTo);
  if (from > to) {
    const swap = from;
    from = startOfDay(to);
    to = endOfDay(swap);
  }
  const overlapping = sessionsOverlapping(sessions, from, to);
  const base: ResolvedReportPeriod = {
    preset: 'custom',
    label: rangeLabel(from, to, title),
    from: isoDate(from),
    to: isoDate(to),
    sessionId: overlapping.length === 1 ? overlapping[0]?.id : undefined,
    sessionIds:
      overlapping.length > 1
        ? overlapping.map((session) => session.id)
        : undefined,
    applyCreatedAtFilter: true,
  };
  return enrichFromOverlappingSessions(
    base,
    sessions,
    fiscalYears,
    from,
    to,
    extras,
  );
}

function resolveThisQuarter(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  now: Date,
  optionLabel: string,
): ResolvedReportPeriod {
  const activeYear = pickActiveFiscalYear(fiscalYears);
  const pool = sortFiscalSessions(
    activeYear?.sessions?.length ? activeYear.sessions : sessions,
  );
  const current = currentFiscalSession(pool);
  if (current) {
    const { from, to } = sessionRange(current, now);
    return resolveCustomPeriod(
      from,
      to,
      sessions,
      optionLabel,
      fiscalYears,
      sessionFiscalParts(current, fiscalYears),
    );
  }
  if (activeYear) {
    const { from, to } = clampToFiscalYear(
      startOfDay(parseSessionDate(activeYear.startDate)),
      endOfDay(now),
      activeYear,
      now,
    );
    return resolveCustomPeriod(from, to, sessions, optionLabel, fiscalYears);
  }
  return resolveCustomPeriod(
    startOfDay(now),
    endOfDay(now),
    sessions,
    optionLabel,
    fiscalYears,
  );
}

function resolveLastQuarter(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  now: Date,
  optionLabel: string,
): ResolvedReportPeriod {
  const years = sortedFiscalYears(fiscalYears);
  const activeYear = pickActiveFiscalYear(fiscalYears);
  const activeIndex = activeYear
    ? years.findIndex((year) => year.id === activeYear.id)
    : years.length - 1;
  const pool = sortFiscalSessions(
    activeYear?.sessions?.length ? activeYear.sessions : sessions,
  );
  const current = currentFiscalSession(pool);
  const currentIndex = current
    ? pool.findIndex((session) => session.id === current.id)
    : -1;

  let previous: OrgFiscalSession | undefined;
  if (currentIndex > 0) {
    previous = pool[currentIndex - 1];
  } else if (activeIndex > 0) {
    const priorYear = years[activeIndex - 1];
    const priorSessions = sortFiscalSessions(priorYear?.sessions ?? []);
    previous = priorSessions[priorSessions.length - 1];
  }

  if (previous) {
    const { from, to } = sessionRange(previous);
    return resolveCustomPeriod(
      from,
      to,
      sessions,
      optionLabel,
      fiscalYears,
      sessionFiscalParts(previous, fiscalYears),
    );
  }

  return resolveThisQuarter(sessions, fiscalYears, now, optionLabel);
}

function resolveThisYear(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  now: Date,
  optionLabel: string,
): ResolvedReportPeriod {
  const activeYear = pickActiveFiscalYear(fiscalYears);
  if (!activeYear) {
    return resolveCustomPeriod(
      startOfDay(now),
      endOfDay(now),
      sessions,
      optionLabel,
      fiscalYears,
    );
  }
  const from = startOfDay(parseSessionDate(activeYear.startDate));
  const yearEnd = endOfDay(parseSessionDate(activeYear.endDate));
  const to = endOfDay(now) < yearEnd ? endOfDay(now) : yearEnd;
  return resolveCustomPeriod(from, to, sessions, optionLabel, fiscalYears, {
    fiscalYear: activeYear.name.trim(),
  });
}

function resolveLastYear(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  now: Date,
  optionLabel: string,
): ResolvedReportPeriod {
  const years = sortedFiscalYears(fiscalYears);
  const activeYear = pickActiveFiscalYear(fiscalYears);
  const activeIndex = activeYear
    ? years.findIndex((year) => year.id === activeYear.id)
    : -1;
  const previousYear =
    activeIndex > 0
      ? years[activeIndex - 1]
      : years.length > 1
        ? years[years.length - 2]
        : undefined;

  if (!previousYear) {
    return resolveThisYear(sessions, fiscalYears, now, optionLabel);
  }

  const from = startOfDay(parseSessionDate(previousYear.startDate));
  const to = endOfDay(parseSessionDate(previousYear.endDate));
  return resolveCustomPeriod(from, to, sessions, optionLabel, fiscalYears, {
    fiscalYear: previousYear.name.trim(),
  });
}

function resolveClampedCalendarPreset(
  preset: 'this-week' | 'this-month',
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  now: Date,
  optionLabel: string,
): ResolvedReportPeriod {
  const activeYear = pickActiveFiscalYear(fiscalYears);
  let from: Date;
  let to = endOfDay(now);

  if (preset === 'this-week') {
    const day = now.getDay();
    from = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - day),
    );
  } else {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  if (activeYear) {
    ({ from, to } = clampToFiscalYear(from, to, activeYear, now));
  }

  const extras: Partial<
    Pick<ResolvedReportPeriod, 'fiscalYear' | 'quarter' | 'week'>
  > = {};
  if (preset === 'this-week') {
    extras.week = weekLabelForRange(from);
  }

  return resolveCustomPeriod(
    from,
    to,
    sessions,
    optionLabel,
    fiscalYears,
    extras,
  );
}

/** Date-range presets aligned to Settings → Fiscal Calendar when available. */
export function resolveDateRangePreset(
  preset: DateRangePreset,
  sessions: OrgFiscalSession[],
  customFrom?: string,
  customTo?: string,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[] = [],
): ResolvedReportPeriod {
  const now = new Date();
  const optionLabel =
    DATE_RANGE_PRESET_OPTIONS.find((option) => option.id === preset)?.label ??
    preset;

  if (preset === 'custom') {
    if (customFrom && customTo) {
      return resolveCustomPeriod(
        new Date(customFrom),
        new Date(customTo),
        sessions,
        'Custom range',
        fiscalYears,
      );
    }
    const activeYear = pickActiveFiscalYear(fiscalYears);
    let from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    let to = endOfDay(now);
    if (activeYear) {
      ({ from, to } = clampToFiscalYear(from, to, activeYear, now));
    }
    return resolveCustomPeriod(from, to, sessions, 'Custom range', fiscalYears);
  }

  switch (preset) {
    case 'this-week':
    case 'this-month':
      return resolveClampedCalendarPreset(
        preset,
        sessions,
        fiscalYears,
        now,
        optionLabel,
      );
    case 'this-quarter':
      return resolveThisQuarter(sessions, fiscalYears, now, optionLabel);
    case 'this-year':
      return resolveThisYear(sessions, fiscalYears, now, optionLabel);
    case 'last-quarter':
      return resolveLastQuarter(sessions, fiscalYears, now, optionLabel);
    case 'last-year':
      return resolveLastYear(sessions, fiscalYears, now, optionLabel);
    default:
      return resolveClampedCalendarPreset(
        'this-month',
        sessions,
        fiscalYears,
        now,
        optionLabel,
      );
  }
}

export function resolveReportPeriodValue(
  value: ReportPeriodValue,
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
): ResolvedReportPeriod {
  if (value.periodMode === 'fiscal') {
    return resolveFiscalPeriod(value.fiscalPeriod, sessions, fiscalYears);
  }
  return resolveDateRangePreset(
    value.dateRange,
    sessions,
    value.from,
    value.to,
    fiscalYears,
  );
}

/** Current fiscal quarter (or calendar quarter) through today — for pipeline achievement KPIs. */
export function resolveCurrentQuarterPeriod(
  sessions: OrgFiscalSession[],
  now = new Date(),
): Pick<ResolvedReportPeriod, 'from' | 'to' | 'quarter' | 'fiscalYear'> {
  const pool = sortFiscalSessions(sessions);
  const current = currentFiscalSession(pool);
  if (current) {
    const { from, to } = sessionRange(current, now);
    return {
      from: isoDate(from),
      to: isoDate(to),
      quarter: (current.name ?? '').trim() || undefined,
    };
  }
  const month = now.getMonth();
  const quarterIndex = Math.floor(month / 3);
  const from = startOfDay(new Date(now.getFullYear(), quarterIndex * 3, 1));
  const to = endOfDay(now);
  return {
    from: isoDate(from),
    to: isoDate(to),
    quarter: `Q${quarterIndex + 1}`,
    fiscalYear: String(now.getFullYear()),
  };
}

/**
 * Total Pipeline "Current Reporting" value — same for every row:
 * current quarter/session name only (FY is a separate column).
 */
export function formatCurrentReportingLabel(
  sessions: OrgFiscalSession[],
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[] = [],
  now = new Date(),
): string {
  const period = resolveThisQuarter(sessions, fiscalYears, now, 'This quarter');
  return period.quarter?.trim() || '';
}

export function dateInRange(
  value: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!value) return false;
  const key = value.slice(0, 10);
  return key >= from && key <= to;
}
