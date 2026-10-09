import type {
  PipelineStageInsight as ApiStageInsight,
  PipelineRecordInsight as ApiRecordInsight,
  TeamInsight as ApiTeamInsight,
  FilterTeam as ApiFilterTeam,
  FilterMember as ApiFilterMember,
  PipelineDashboardData as ApiDashboardData,
} from '@/store/server/features/deals/pipeline/dashboard-queries';
export type PipelineCurrency = string;

export const ALL_CURRENCIES = 'all';

export function isAllCurrencies(
  currency: PipelineCurrency | undefined | null,
): boolean {
  return !currency || currency === ALL_CURRENCIES;
}

/** Prefer the tenant's active/default currency, else the first available code. */
export function preferredPipelineCurrency(
  currencies: Array<{ code: string; isActive?: boolean }> | undefined | null,
): PipelineCurrency | undefined {
  if (!currencies?.length) return undefined;
  return currencies.find((item) => item.isActive)?.code ?? currencies[0]?.code;
}

export const ANNUAL_PERIOD = 'annual';

export type PipelinePeriodSelection =
  | { type: 'all' }
  | { type: 'annual'; calendarId?: string }
  | { type: 'session'; sessionId: string };

export type PipelineFiscalYear<
  TSession extends { id: string; startDate: string } = {
    id: string;
    startDate: string;
  },
> = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  sessions: TSession[];
};

export function sortFiscalSessions<T extends { startDate: string }>(
  sessions: T[],
): T[] {
  return [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

export function currentFiscalSession<
  T extends { startDate: string; endDate: string },
>(sessions: T[]): T | undefined {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return sessions.find((session) => {
    const start = session.startDate.slice(0, 10);
    const end = session.endDate.slice(0, 10);
    return start <= todayKey && todayKey <= end;
  });
}

export function sessionsForPeriod<T extends { id: string; startDate: string }>(
  period: PipelinePeriodSelection | undefined,
  fiscalYears: Array<{ id: string; sessions: T[] }>,
  fallback: T[],
): T[] {
  if (!period || period.type === 'all') return fallback;
  if (period.type === 'session') {
    const year = fiscalYears.find((item) =>
      item.sessions.some((session) => session.id === period.sessionId),
    );
    return year?.sessions ?? fallback;
  }
  if (period.calendarId) {
    return (
      fiscalYears.find((item) => item.id === period.calendarId)?.sessions ??
      fallback
    );
  }
  return fallback;
}

export function periodQueryParams(
  period: PipelinePeriodSelection | undefined,
  fiscalSessionIds: string[],
): { sessionId?: string; sessionIds?: string } {
  if (!period || period.type === 'all') return {};
  if (period.type === 'session' && period.sessionId) {
    return { sessionId: period.sessionId };
  }
  if (period.type === 'annual' && fiscalSessionIds.length > 0) {
    return { sessionIds: fiscalSessionIds.join(',') };
  }
  return {};
}

/** Target achievement always uses a fiscal window — default to the active year when period is "all". */
export function targetPeriodForAchievement(
  period: PipelinePeriodSelection,
  activeYearId?: string,
): PipelinePeriodSelection {
  if (period.type === 'all' && activeYearId) {
    return { type: 'annual', calendarId: activeYearId };
  }
  return period;
}

/** Single-currency view for charts when the page filter is "all currencies". */
export function chartCurrencyForPipeline(
  currency: PipelineCurrency,
  currencies: Array<{ code: string; isActive?: boolean }> | undefined | null,
): PipelineCurrency | undefined {
  if (!isAllCurrencies(currency)) return currency;
  return preferredPipelineCurrency(currencies);
}

export function dashboardQueryFromFilter(
  filter: PipelineFilterSelection,
  currency: PipelineCurrency,
): {
  currency?: PipelineCurrency;
  departmentId?: string;
  teamId?: string;
  affectedUserId?: string;
} {
  const params: {
    currency?: PipelineCurrency;
    departmentId?: string;
    teamId?: string;
    affectedUserId?: string;
  } = {};

  if (!isAllCurrencies(currency)) {
    params.currency = currency;
  }

  if (filter.type === 'department') {
    params.departmentId = filter.departmentId;
  } else if (filter.type === 'team') {
    params.teamId = filter.teamId;
  } else if (filter.type === 'member') {
    params.affectedUserId = filter.memberId;
  }

  return params;
}

export type FilterMember = ApiFilterMember;
export type FilterTeam = ApiFilterTeam;

export type PipelineFilterSelection =
  | { type: 'all' }
  | { type: 'department'; departmentId: string; departmentName: string }
  | {
      type: 'team';
      teamId: string;
      teamName: string;
      departmentId?: string;
      departmentName?: string;
    }
  | {
      type: 'member';
      memberId: string;
      memberName: string;
      teamId?: string;
      teamName?: string;
      departmentId?: string;
      departmentName?: string;
    };

export type PipelineStageInsight = ApiStageInsight;
export type TeamInsight = ApiTeamInsight;
export type PipelineRecordInsight = ApiRecordInsight;
export type PipelineDashboardData = ApiDashboardData;

export function sortPipelineRecords(
  records: PipelineRecordInsight[],
): PipelineRecordInsight[] {
  // Order: won deals → open deals → leads → lost deals
  const rank = (record: PipelineRecordInsight) => {
    if (record.kind === 'deal' && record.status === 'won') return 0;
    if (record.kind === 'deal' && record.status !== 'lost') return 1;
    if (record.kind === 'lead') return 2;
    return 3;
  };

  return [...records].sort((a, b) => rank(a) - rank(b));
}

export function filterDashboardData(
  data: PipelineDashboardData,
  selection: PipelineFilterSelection,
): PipelineDashboardData {
  if (selection.type === 'all') return data;

  if (selection.type === 'team') {
    const team = data.teams.find((item) => item.id === selection.teamId);
    // Production: API already filtered by participant team and computed KPIs.
    return {
      ...data,
      teams: team ? [team] : [],
      kpis: {
        ...data.kpis,
        teamMeta: `1 team · ${selection.teamName}`,
      },
      tableTitle: `${selection.teamName} ${data.label}`,
      teamSectionTitle: `${data.shortLabel} team performance`,
      teamSectionDescription: `Showing ${selection.teamName}`,
    };
  }

  if (selection.type === 'department') {
    // Server already applied observer department snapshots; pass through as-is.
    // Keep Achieved from API (progress service), not from table rows.
    return {
      ...data,
      kpis: {
        ...data.kpis,
        achieved: data.kpis.achieved,
        target: data.kpis.target,
        remaining: data.kpis.remaining,
      },
    };
  }

  const memberTeam = data.teams.find((item) => item.id === selection.teamId);

  return {
    ...data,
    teams: memberTeam ? [memberTeam] : [],
    kpis: {
      ...data.kpis,
      teamMeta: `Filtered · ${selection.memberName}`,
    },
    tableTitle: `${selection.memberName} ${data.label}`,
    teamSectionTitle: `${data.shortLabel} team performance`,
    teamSectionDescription: `Showing ${selection.memberName}`,
  };
}
