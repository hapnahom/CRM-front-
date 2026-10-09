import dayjs from 'dayjs';
import type {
  FiscalYear,
  Session,
} from '@/store/server/features/organizationStructure/fiscalYear/interface';

export type LeadQuarter = 1 | 2 | 3 | 4;

export const QUARTER_SHORT_LABELS: Record<LeadQuarter, string> = {
  1: 'Jan – Mar',
  2: 'Apr – Jun',
  3: 'Jul – Sep',
  4: 'Oct – Dec',
};

export type FiscalQuarterDefinition = {
  q: LeadQuarter;
  periodLabel: string;
  sessionId?: string;
};

export type FiscalYearRow = {
  id: string;
  year: number;
  name: string;
  quarterDefinitions: FiscalQuarterDefinition[];
};

export function formatFiscalYearQuartersSummary(
  quarterDefinitions: FiscalQuarterDefinition[],
): string {
  return ([1, 2, 3, 4] as const)
    .map((q) => {
      const label =
        quarterDefinitions.find((row) => row.q === q)?.periodLabel ??
        QUARTER_SHORT_LABELS[q];
      return `Q${q} ${label}`;
    })
    .join(' · ');
}

export type CurrentSessionInfo = {
  quarter: LeadQuarter;
  label: string;
};

export function getCurrentSessionFromCalendar(
  calendar: FiscalYear | null | undefined,
  quarterDefinitions?: FiscalQuarterDefinition[],
): CurrentSessionInfo | null {
  const definitions =
    quarterDefinitions ??
    (calendar ? calendarToFiscalYearRow(calendar).quarterDefinitions : []);

  const sessions = sortedSessions(calendar?.sessions);
  if (sessions.length > 0) {
    const now = Date.now();
    const activeIndex = sessions.findIndex((session) => {
      const start = new Date(session.startDate).getTime();
      const end = new Date(session.endDate).getTime();
      return now >= start && now <= end;
    });

    if (activeIndex >= 0 && activeIndex < 4) {
      const quarter = (activeIndex + 1) as LeadQuarter;
      const label =
        definitions.find((row) => row.q === quarter)?.periodLabel ??
        sessions[activeIndex]?.name ??
        QUARTER_SHORT_LABELS[quarter];
      return { quarter, label };
    }
  }

  if (!calendar) return null;

  const fiscalYear = extractFiscalYearNumber(calendar);
  if (fiscalYear !== dayjs().year()) return null;

  const quarter = (Math.floor(dayjs().month() / 3) + 1) as LeadQuarter;
  const label =
    definitions.find((row) => row.q === quarter)?.periodLabel ??
    QUARTER_SHORT_LABELS[quarter];

  return { quarter, label };
}

export function extractFiscalYearNumber(calendar: FiscalYear): number {
  const fromName = calendar.name?.match(/(\d{4})/)?.[1];
  if (fromName) return Number(fromName);

  const start = calendar.startDate;
  if (start && dayjs(start).isValid()) {
    return dayjs(start).year();
  }

  return dayjs().year();
}

function sortedSessions(sessions: Session[] = []): Session[] {
  return [...sessions].sort(
    (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
  );
}

export function calendarToFiscalYearRow(calendar: FiscalYear): FiscalYearRow {
  const sessions = sortedSessions(calendar.sessions);
  const quarterDefinitions = ([1, 2, 3, 4] as const).map((q, index) => {
    const session = sessions[index];
    return {
      q,
      periodLabel: session?.name || QUARTER_SHORT_LABELS[q],
      sessionId: session?.id,
    };
  });

  return {
    id: calendar.id || calendar.name,
    year: extractFiscalYearNumber(calendar),
    name: calendar.name,
    quarterDefinitions,
  };
}

export function generateQuarterSessions(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
): Record<string, unknown>[] {
  const breakdown = 4;
  const periodMonths = 3;
  const sessions: Record<string, unknown>[] = [];
  let current = start.clone();

  for (let i = 0; i < breakdown; i++) {
    const q = (i + 1) as LeadQuarter;
    const sessionStart = current.clone();
    let sessionEnd = current.add(periodMonths, 'month').subtract(1, 'day');
    if (i === breakdown - 1) {
      sessionEnd = end.clone();
    }

    const sessionMonths = [];
    let monthStart = sessionStart.clone();

    for (let j = 0; j < periodMonths; j++) {
      const monthEnd = monthStart.clone().add(1, 'month').subtract(1, 'day');
      sessionMonths.push({
        name: `Month-${i * periodMonths + j + 1}`,
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      });
      monthStart = monthEnd.add(1, 'day');
    }

    sessions.push({
      name: QUARTER_SHORT_LABELS[q],
      description: `Quarter ${q} for the fiscal year.`,
      startDate: sessionStart.toISOString(),
      endDate: sessionEnd.toISOString(),
      months: sessionMonths,
    });

    current = sessionEnd.add(1, 'day');
  }

  return sessions;
}

const ADDABLE_YEAR_SPAN = 9;

export function getAddableFiscalYears(
  existingYears: Iterable<number>,
): number[] {
  const existing = new Set(existingYears);
  const baseYear = dayjs().year();

  return Array.from(
    { length: ADDABLE_YEAR_SPAN },
    (unused, index) => baseYear + index,
  ).filter((year) => !existing.has(year));
}

export function resolveFiscalYearStartDate(
  year: number,
  activeFiscalYear?: FiscalYear | null,
): dayjs.Dayjs {
  const today = dayjs().startOf('day');
  let start =
    year === today.year() ? today : dayjs(`${year}-01-01`).startOf('day');

  if (activeFiscalYear?.endDate) {
    const activeEnd = dayjs(activeFiscalYear.endDate).startOf('day');
    if (start.isBefore(activeEnd, 'day')) {
      start = activeEnd;
    }
  }

  if (start.isBefore(today, 'day')) {
    start = today;
  }

  return start;
}

export function buildCreateFiscalYearPayload(
  year: number,
  options?: {
    activeFiscalYear?: FiscalYear | null;
    makeActive?: boolean;
  },
) {
  const start = resolveFiscalYearStartDate(year, options?.activeFiscalYear);
  const end = start.add(1, 'year').subtract(1, 'day');

  return {
    name: `FY-${year}`,
    description: `Fiscal year ${year}`,
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    sessions: generateQuarterSessions(start, end),
    ...(options?.makeActive ? { isActive: true } : {}),
  };
}

export function normalizeCalendarsResponse(response: unknown): FiscalYear[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response as FiscalYear[];
  }

  if (typeof response === 'object') {
    const payload = response as { items?: FiscalYear[]; data?: FiscalYear[] };
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    return [response as FiscalYear];
  }

  return [];
}

export function applyQuarterLabelsToSessions(
  calendar: FiscalYear,
  quarterDefinitions: FiscalQuarterDefinition[],
): Session[] {
  const sessions = sortedSessions(calendar.sessions);

  if (sessions.length === 0) {
    return sessions;
  }

  return sessions.map((session, index) => {
    const definition = quarterDefinitions[index];
    if (!definition) return session;
    return {
      ...session,
      name: definition.periodLabel,
    };
  });
}
