import dayjs from 'dayjs';
import {
  calendarToFiscalYearRow,
  getCurrentSessionFromCalendar,
} from '@/modules/account-settings/fiscalYearUtils';
import type {
  FiscalYear,
  Session,
} from '@/store/server/features/organizationStructure/fiscalYear/interface';
import type {
  OrgFiscalCalendar,
  OrgFiscalSession,
} from '@/store/server/features/salesTargeting/types';

function coerceIsoDate(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (dayjs.isDayjs(value)) return value.toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = dayjs(value as string | number | Date);
  return parsed.isValid() ? parsed.toISOString() : '';
}

export function mapOrgSession(session: Session): OrgFiscalSession {
  return {
    id: session.id,
    name: session.name,
    description: session.description,
    calendarId: session.calendarId,
    startDate: coerceIsoDate(session.startDate),
    endDate: coerceIsoDate(session.endDate),
    active: session.active,
  };
}

/** Same shape as Account Settings → Fiscal year (org-structure active calendar). */
export function fiscalYearToOrgCalendar(fy: FiscalYear): OrgFiscalCalendar {
  const id = fy.id?.trim() || fy.name?.trim() || '';
  return {
    id,
    name: fy.name,
    description: fy.description,
    startDate: coerceIsoDate(fy.startDate),
    endDate: coerceIsoDate(fy.endDate),
    isActive: fy.isActive,
    sessions: (fy.sessions ?? []).map(mapOrgSession),
  };
}

export function fiscalYearAsSettingsModel(
  calendar: OrgFiscalCalendar,
): FiscalYear {
  return {
    id: calendar.id,
    name: calendar.name,
    description: calendar.description ?? '',
    startDate: calendar.startDate ? dayjs(calendar.startDate) : null,
    endDate: calendar.endDate,
    isActive: calendar.isActive,
    sessions: (calendar.sessions ?? []).map((session) => ({
      id: session.id,
      name: session.name,
      description: session.description ?? null,
      calendarId: session.calendarId,
      startDate: session.startDate,
      endDate: session.endDate,
      active: session.active,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      tenantId: '',
    })),
  };
}

/** Display label: prefer configured calendar name (Settings), else derive from dates. */
export function formatOrgFiscalYearLabel(
  calendar:
    | {
        name?: string | null;
        startDate?: string | null;
        endDate?: string | null;
      }
    | null
    | undefined,
): string {
  if (!calendar) return 'FY';
  const name = calendar.name?.trim();
  if (name) return name;

  const start = calendar.startDate ? dayjs(calendar.startDate) : null;
  const end = calendar.endDate ? dayjs(calendar.endDate) : null;
  if (start?.isValid() && end?.isValid()) {
    const startYear = start.year();
    const endYear = end.year();
    if (endYear > startYear) {
      return `FY ${startYear}/${String(endYear).slice(-2)}`;
    }
    return `FY ${startYear}`;
  }
  return 'FY';
}

function sortSessions(sessions: OrgFiscalSession[]): OrgFiscalSession[] {
  return [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

/**
 * Active period/session for the org fiscal calendar — matches Account Settings
 * (`getCurrentSessionFromCalendar`) and date-overlap fallback.
 */
export function resolveActiveOrgSessionId(
  calendar: OrgFiscalCalendar | null | undefined,
): string | null {
  const sessions = sortSessions(calendar?.sessions ?? []);
  if (!sessions.length) return null;

  const now = Date.now();
  const overlapping = sessions.find((session) => {
    const start = new Date(session.startDate).getTime();
    const end = new Date(session.endDate).getTime();
    return now >= start && now <= end;
  });
  if (overlapping?.id) return overlapping.id;

  if (calendar) {
    const fiscalYear = fiscalYearAsSettingsModel({ ...calendar, sessions });
    const row = calendarToFiscalYearRow(fiscalYear);
    const current = getCurrentSessionFromCalendar(
      fiscalYear,
      row.quarterDefinitions,
    );
    if (current) {
      const byQuarter = sessions[current.quarter - 1];
      if (byQuarter?.id) return byQuarter.id;
    }
  }

  return sessions[0]?.id ?? null;
}

export function resolveActiveOrgSession(
  calendar: OrgFiscalCalendar | null | undefined,
): OrgFiscalSession | null {
  const sessionId = resolveActiveOrgSessionId(calendar);
  if (!sessionId) return null;
  return (
    sortSessions(calendar?.sessions ?? []).find(
      (session) => session.id === sessionId,
    ) ?? null
  );
}
