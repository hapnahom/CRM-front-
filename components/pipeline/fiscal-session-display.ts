import {
  currentFiscalSession,
  sortFiscalSessions,
} from '@/modules/sales-pipeline/pipeline-filter';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';

export type FiscalYearWithSessions = {
  id: string;
  name: string;
  isActive?: boolean;
  sessions: OrgFiscalSession[];
};

export type FiscalSessionDisplay = {
  fiscalYearName: string;
  quarterLabel: string;
  sessionName: string;
  dateRange: string | null;
  isCurrent: boolean;
  primaryLabel: string;
};

export function formatFiscalSessionDateRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function sessionQuarterLabel(
  session: OrgFiscalSession,
  sessions: OrgFiscalSession[],
): string {
  const sorted = sortFiscalSessions(sessions);
  const index = sorted.findIndex((s) => s.id === session.id);
  return index >= 0 ? `Q${index + 1}` : session.name;
}

export function resolveFiscalSessionDisplay(
  sessionId: string | null | undefined,
  fiscalYears: FiscalYearWithSessions[],
  allSessions: OrgFiscalSession[] = [],
): FiscalSessionDisplay | null {
  if (!sessionId) return null;

  for (const year of fiscalYears) {
    const sessions = sortFiscalSessions(year.sessions ?? []);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      const quarterLabel = sessionQuarterLabel(session, sessions);
      const dateRange = formatFiscalSessionDateRange(
        session.startDate,
        session.endDate,
      );
      return {
        fiscalYearName: year.name,
        quarterLabel,
        sessionName: session.name,
        dateRange,
        isCurrent: Boolean(currentFiscalSession([session])),
        primaryLabel: `${year.name} · ${quarterLabel}`,
      };
    }
  }

  const fallback = allSessions.find((s) => s.id === sessionId);
  if (!fallback) return null;

  return {
    fiscalYearName: '',
    quarterLabel: fallback.name,
    sessionName: fallback.name,
    dateRange: formatFiscalSessionDateRange(
      fallback.startDate,
      fallback.endDate,
    ),
    isCurrent: Boolean(currentFiscalSession([fallback])),
    primaryLabel: fallback.name,
  };
}
