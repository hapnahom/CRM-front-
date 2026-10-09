'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_CURRENCIES,
  dashboardQueryFromFilter,
  isAllCurrencies,
  periodQueryParams,
  sessionsForPeriod,
  sortFiscalSessions,
  targetPeriodForAchievement,
  type PipelineCurrency,
  type PipelineFilterSelection,
  type PipelineFiscalYear,
  type PipelinePeriodSelection,
} from './pipeline-filter';
import { isLeadsEnabled } from '@/config/salesWorkflow';
import { resolveFiscalPeriod } from './report/period';
import {
  usePipelineFilterTree,
  type FilterTreeDepartment,
  type FilterTreeTeam,
  type FilterTreeMember,
} from '@/store/server/features/deals/pipeline/filter-tree-queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useReportExportScope } from '@/hooks/useReportExportScope';
import {
  clampFilterToScope,
  findUserOrgContext,
  maxScopeFilterSelection,
  scopeAllLabel,
  scopeFilterTreeDepartments,
} from './report/scope-filters';
import { useQueries } from 'react-query';
import { usePipelineCurrencies } from '@/store/server/features/deals/pipeline/currency-queries';
import {
  fetchFiscalSessions,
  useGetFiscalCalendars,
} from '@/store/server/features/salesTargeting/queries';
import type {
  OrgFiscalCalendar,
  OrgFiscalSession,
} from '@/store/server/features/salesTargeting/types';
import {
  loadWorkspaceFilterPreferences,
  saveWorkspaceFilterPreferences,
} from './workspace-filter-preferences';
import { useOrgFiscalSettings } from '@/providers/OrgFiscalSettingsProvider';

type PipelineWorkspaceFiltersValue = {
  filter: PipelineFilterSelection;
  setFilter: (filter: PipelineFilterSelection) => void;
  currency: PipelineCurrency;
  setCurrency: (currency: PipelineCurrency) => void;
  period: PipelinePeriodSelection;
  setPeriod: (period: PipelinePeriodSelection) => void;
  loadHistoricalFiscalSessions: boolean;
  requestHistoricalFiscalSessions: () => void;
};

function needsHistoricalFiscalSessions(
  period: PipelinePeriodSelection | undefined,
  activeYearId: string | undefined,
  activeSessions: OrgFiscalSession[],
): boolean {
  if (!period) return false;
  if (period.type === 'all') return false;
  if (period.type === 'session') {
    return !activeSessions.some((session) => session.id === period.sessionId);
  }
  if (period.calendarId && period.calendarId !== activeYearId) return true;
  return false;
}

const PipelineWorkspaceFiltersContext =
  createContext<PipelineWorkspaceFiltersValue | null>(null);

export function PipelineWorkspaceFiltersProvider({
  children,
}: {
  children: ReactNode;
}) {
  const orgScope = useReportExportScope();
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const hydratedRef = useRef(false);
  const [filter, setFilter] = useState<PipelineFilterSelection>({
    type: 'all',
  });
  const [currency, setCurrency] = useState<PipelineCurrency>(ALL_CURRENCIES);
  const [period, setPeriod] = useState<PipelinePeriodSelection>({
    type: 'all',
  });
  const [loadHistoricalFiscalSessions, setLoadHistoricalFiscalSessions] =
    useState(false);

  useEffect(() => {
    if (hydratedRef.current || !tenantId || !userId) return;
    const stored = loadWorkspaceFilterPreferences(tenantId, userId);
    if (stored) {
      setFilter(stored.filter);
      setCurrency(stored.currency);
      setPeriod(stored.period);
    }
    hydratedRef.current = true;
  }, [tenantId, userId]);

  useEffect(() => {
    if (!hydratedRef.current || !tenantId || !userId) return;
    saveWorkspaceFilterPreferences(tenantId, userId, {
      filter,
      currency,
      period,
    });
  }, [filter, currency, period, tenantId, userId]);
  const { data: currencies } = usePipelineCurrencies();
  const { data: departments = [] } = usePipelineFilterTree();
  const userOrg = useMemo(
    () => findUserOrgContext(departments, userId),
    [departments, userId],
  );

  // Drop stale currency codes when tenant currencies change.
  useEffect(() => {
    if (!currencies?.length) return;
    setCurrency((current) => {
      if (isAllCurrencies(current)) return ALL_CURRENCIES;
      if (currencies.some((item) => item.code === current)) return current;
      return ALL_CURRENCIES;
    });
  }, [currencies]);

  // Keep the org filter inside the caller's max permission scope (all four levels).
  useEffect(() => {
    if (orgScope.level === 'company') return;

    if (orgScope.level === 'personal' && userId) {
      setFilter((current) => {
        const next = maxScopeFilterSelection('personal', {
          ...userOrg,
          memberId: userId,
          memberName: userOrg.memberName ?? 'Me',
        });
        if (JSON.stringify(next) === JSON.stringify(current)) return current;
        return next;
      });
      return;
    }

    if (!departments.length) return;

    const scoped = scopeFilterTreeDepartments(departments, orgScope.level, {
      userTeamId: userOrg.teamId,
      userDepartmentId: userOrg.departmentId,
      userId,
    });
    setFilter((current) => {
      const next = clampFilterToScope(current, orgScope.level, scoped, {
        ...userOrg,
        memberId: userId ?? null,
      });
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      return next;
    });
  }, [
    departments,
    orgScope.level,
    userId,
    userOrg.departmentId,
    userOrg.teamId,
    userOrg.departmentName,
    userOrg.teamName,
    userOrg.memberName,
  ]);

  const requestHistoricalFiscalSessions = useCallback(() => {
    setLoadHistoricalFiscalSessions(true);
  }, []);

  const value = useMemo(
    () => ({
      filter,
      setFilter,
      currency,
      setCurrency,
      period,
      setPeriod,
      loadHistoricalFiscalSessions,
      requestHistoricalFiscalSessions,
    }),
    [
      filter,
      currency,
      period,
      loadHistoricalFiscalSessions,
      requestHistoricalFiscalSessions,
    ],
  );

  return (
    <PipelineWorkspaceFiltersContext.Provider value={value}>
      {children}
    </PipelineWorkspaceFiltersContext.Provider>
  );
}

export function useOptionalPipelineWorkspaceFilters() {
  return useContext(PipelineWorkspaceFiltersContext);
}

function toPipelineFiscalYear(
  calendar: OrgFiscalCalendar,
  sessions?: OrgFiscalSession[],
): PipelineFiscalYear<OrgFiscalSession> {
  return {
    id: calendar.id,
    name: calendar.name,
    startDate: calendar.startDate,
    endDate: calendar.endDate,
    isActive: calendar.isActive,
    sessions: sortFiscalSessions(sessions ?? calendar.sessions ?? []),
  };
}

function sortPipelineFiscalYears(
  years: PipelineFiscalYear<OrgFiscalSession>[],
  activeId?: string,
): PipelineFiscalYear<OrgFiscalSession>[] {
  return [...years].sort((a, b) => {
    if (activeId) {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
    }
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });
}

export function usePipelineFiscalSessions() {
  const workspaceFilters = useOptionalPipelineWorkspaceFilters();
  const { fiscalCalendar: activeFiscalYear, sessions: activeSessions } =
    useOrgFiscalSettings();
  const { data: calendars = [] } = useGetFiscalCalendars();
  const includeHistoricalSessions =
    workspaceFilters?.loadHistoricalFiscalSessions ||
    needsHistoricalFiscalSessions(
      workspaceFilters?.period,
      activeFiscalYear?.id,
      activeSessions,
    );

  const yearsBase = useMemo(() => {
    const byId = new Map<string, OrgFiscalCalendar>();
    for (const calendar of calendars) {
      if (calendar.id) byId.set(calendar.id, calendar);
    }
    if (activeFiscalYear?.id && !byId.has(activeFiscalYear.id)) {
      byId.set(activeFiscalYear.id, activeFiscalYear);
    }
    return [...byId.values()];
  }, [activeFiscalYear, calendars]);

  const sessionQueries = useQueries(
    yearsBase.map((calendar) => ({
      queryKey: ['sales-targeting-sessions', calendar.id],
      queryFn: () => fetchFiscalSessions(calendar.id),
      enabled:
        includeHistoricalSessions &&
        Boolean(calendar.id) &&
        calendar.id !== activeFiscalYear?.id &&
        !calendar.sessions?.length,
      staleTime: 60_000,
    })),
  );
  const sessionQueryStamp = sessionQueries
    .map((query) => `${query.status}:${query.dataUpdatedAt}`)
    .join('|');

  const fiscalYears = useMemo(() => {
    const years = yearsBase.map((calendar, index) => {
      if (calendar.id === activeFiscalYear?.id && activeSessions.length) {
        return toPipelineFiscalYear(calendar, activeSessions);
      }
      if (calendar.sessions?.length) {
        return toPipelineFiscalYear(calendar);
      }
      return toPipelineFiscalYear(calendar, sessionQueries[index]?.data);
    });
    return sortPipelineFiscalYears(years, activeFiscalYear?.id);
    // sessionQueryStamp tracks query results without depending on a new array each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFiscalYear?.id, activeSessions, sessionQueryStamp, yearsBase]);

  const fiscalYear =
    fiscalYears.find((year) => year.id === activeFiscalYear?.id) ??
    fiscalYears.find((year) => year.isActive) ??
    fiscalYears[0];
  const sessions = fiscalYear?.sessions ?? [];
  const allSessions = useMemo(
    () => fiscalYears.flatMap((year) => year.sessions),
    [fiscalYears],
  );
  const loadingYearIds = yearsBase
    .filter(
      (calendar, index) =>
        sessionQueries[index]?.isLoading && !calendar.sessions?.length,
    )
    .map((calendar) => calendar.id);

  return { fiscalYear, fiscalYears, sessions, allSessions, loadingYearIds };
}

export type PipelineOrgListParams = {
  currency?: PipelineCurrency;
  departmentId?: string;
  teamId?: string;
  responsibleUserId?: string;
  sessionId?: string;
  sessionIds?: string;
  startDate?: string;
  endDate?: string;
  includeLeads?: boolean;
};

const EMPTY_PIPELINE_ORG_LIST_PARAMS: PipelineOrgListParams = {};

export function buildPipelineDashboardParams(input: {
  filter: PipelineFilterSelection;
  currency: PipelineCurrency;
  period: PipelinePeriodSelection;
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[];
  sessions: OrgFiscalSession[];
  allSessions: OrgFiscalSession[];
}): PipelineOrgListParams {
  const sessionIds = sessionsForPeriod(
    input.period,
    input.fiscalYears,
    input.sessions,
  ).map((session) => session.id);

  const resolvedPeriod =
    input.period.type === 'all'
      ? null
      : resolveFiscalPeriod(
          input.period,
          input.allSessions.length ? input.allSessions : input.sessions,
          input.fiscalYears,
        );

  return {
    ...dashboardQueryFromFilter(input.filter, input.currency),
    ...periodQueryParams(input.period, sessionIds),
    ...(input.period.type !== 'all' && resolvedPeriod?.from
      ? { startDate: resolvedPeriod.from }
      : {}),
    ...(input.period.type !== 'all' && resolvedPeriod?.to
      ? { endDate: resolvedPeriod.to }
      : {}),
    includeLeads: isLeadsEnabled(),
  };
}

export function usePipelineOrgListParams(): PipelineOrgListParams {
  const ctx = useOptionalPipelineWorkspaceFilters();
  const filter = ctx?.filter;
  const currency = ctx?.currency;
  const period = ctx?.period;
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();

  return useMemo(
    () =>
      filter && period
        ? buildPipelineDashboardParams({
            filter,
            currency: currency ?? ALL_CURRENCIES,
            period,
            fiscalYears,
            sessions,
            allSessions,
          })
        : EMPTY_PIPELINE_ORG_LIST_PARAMS,
    [allSessions, currency, filter, fiscalYears, period, sessions],
  );
}

/** Target achievement uses annual (active year) when page period is "all". */
export function usePipelineTargetParams(currency: PipelineCurrency) {
  const ctx = useOptionalPipelineWorkspaceFilters();
  const filter = ctx?.filter;
  const period = ctx?.period;
  const { fiscalYear, fiscalYears, sessions, allSessions } =
    usePipelineFiscalSessions();

  const targetPeriod = useMemo(
    () =>
      period
        ? targetPeriodForAchievement(period, fiscalYear?.id)
        : { type: 'all' as const },
    [fiscalYear?.id, period],
  );

  return useMemo(
    () =>
      filter && period
        ? buildPipelineDashboardParams({
            filter,
            currency,
            period: targetPeriod,
            fiscalYears,
            sessions,
            allSessions,
          })
        : {},
    [
      allSessions,
      currency,
      filter,
      fiscalYears,
      period,
      sessions,
      targetPeriod,
    ],
  );
}

export function usePipelineWorkspaceFilters(): PipelineWorkspaceFiltersValue {
  const ctx = useContext(PipelineWorkspaceFiltersContext);
  if (!ctx) {
    throw new Error(
      'usePipelineWorkspaceFilters must be used within PipelineWorkspaceFiltersProvider',
    );
  }
  return ctx;
}

const HEADER_CONTROL_CLASS =
  'box-border h-9 min-h-9 py-0 text-[12px] leading-none font-medium shadow-none';

export function PipelineFiltersToolbar({
  className,
  triggerClassName,
}: {
  className?: string;
  triggerClassName?: string;
} = {}) {
  const { filter, setFilter, currency, setCurrency, period, setPeriod } =
    usePipelineWorkspaceFilters();

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-stretch justify-start gap-2 sm:w-auto sm:items-center sm:justify-end',
        className,
      )}
    >
      <DepartmentFilter
        filter={filter}
        onFilterChange={setFilter}
        triggerClassName={triggerClassName}
      />
      <PeriodSelector value={period} onChange={setPeriod} />
      <CurrencySelector value={currency} onChange={setCurrency} />
    </div>
  );
}

function yearIdForPeriod(
  period: PipelinePeriodSelection,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  activeYearId?: string,
): string | undefined {
  if (period.type === 'all') return undefined;
  if (period.type === 'annual') {
    return period.calendarId ?? activeYearId;
  }
  if (period.type === 'session') {
    return (
      fiscalYears.find((year) =>
        year.sessions.some((session) => session.id === period.sessionId),
      )?.id ?? activeYearId
    );
  }
  return activeYearId;
}

function periodTriggerLabel(
  period: PipelinePeriodSelection,
  fiscalYears: PipelineFiscalYear<OrgFiscalSession>[],
  fiscalYear?: PipelineFiscalYear<OrgFiscalSession>,
): string {
  if (period.type === 'all') {
    return 'All periods';
  }
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

export function PeriodSelector({
  value,
  onChange,
  className,
  fullWidth,
  align = 'end',
  variant = 'popover',
}: {
  value: PipelinePeriodSelection;
  onChange: (value: PipelinePeriodSelection) => void;
  className?: string;
  fullWidth?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Use `panel` inside dialogs — avoids portaled popover click/focus conflicts. */
  variant?: 'popover' | 'panel';
}) {
  const workspaceFilters = useOptionalPipelineWorkspaceFilters();
  const { fiscalYear, fiscalYears, loadingYearIds } =
    usePipelineFiscalSessions();
  const [open, setOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const selectedYearId = yearIdForPeriod(value, fiscalYears, fiscalYear?.id);
  const triggerLabel = periodTriggerLabel(value, fiscalYears, fiscalYear);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      workspaceFilters?.requestHistoricalFiscalSessions();
      if (selectedYearId) {
        setExpandedYears(new Set([selectedYearId]));
      }
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
    onChange({ type: 'annual', calendarId: year.id });
    setOpen(false);
  };

  const selectSession = (sessionId: string) => {
    onChange({ type: 'session', sessionId });
    setOpen(false);
  };

  const selectAllPeriods = () => {
    onChange({ type: 'all' });
    setOpen(false);
  };

  const periodTree = (
    <div className="max-h-[280px] space-y-0.5 overflow-y-auto">
      <button
        type="button"
        onClick={selectAllPeriods}
        className={cn(
          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
          value.type === 'all' && 'bg-accent',
        )}
      >
        <span className="flex-1 font-semibold text-foreground">
          All periods
        </span>
        {value.type === 'all' ? (
          <Check size={12} className="shrink-0 text-brand" />
        ) : null}
      </button>

      {fiscalYears.length === 0 ? (
        <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
          No fiscal years found
        </p>
      ) : (
        fiscalYears.map((year) => {
          const isExpanded = expandedYears.has(year.id);
          const yearSelected =
            value.type === 'annual' &&
            (value.calendarId ?? fiscalYear?.id) === year.id;

          return (
            <div key={year.id}>
              <div className="flex items-center gap-0.5 rounded-sm transition-colors hover:bg-accent">
                <button
                  type="button"
                  onClick={() => toggleYear(year.id)}
                  className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                  aria-label={
                    isExpanded ? `Collapse ${year.name}` : `Expand ${year.name}`
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
                          value.type === 'session' &&
                          value.sessionId === session.id;
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
  );

  const triggerButton = (
    <button
      type="button"
      aria-expanded={open}
      aria-label="Filter by fiscal year or session"
      onClick={variant === 'panel' ? () => setOpen((prev) => !prev) : undefined}
      className={cn(
        'inline-flex min-w-[168px] max-w-[260px] items-center gap-2 rounded-md border border-border bg-white px-3 text-foreground hover:bg-surface-elevated',
        HEADER_CONTROL_CLASS,
        fullWidth && 'w-full min-w-0 max-w-none justify-between',
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
      <ChevronDown
        size={16}
        className={cn(
          'shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180',
        )}
      />
    </button>
  );

  if (variant === 'panel') {
    return (
      <div className={cn('w-full space-y-2', fullWidth && 'w-full')}>
        {triggerButton}
        {open ? (
          <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
            {periodTree}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', fullWidth && 'w-full')}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent
          align={align}
          className={cn(
            'w-[280px] p-2',
            fullWidth && 'w-[var(--radix-popover-trigger-width)] min-w-[280px]',
          )}
        >
          {periodTree}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CurrencySelector({
  value,
  onChange,
  className,
}: {
  value: PipelineCurrency;
  onChange: (value: PipelineCurrency) => void;
  className?: string;
}) {
  const { data: currencies, isLoading } = usePipelineCurrencies();
  const activeCurrencies = currencies ?? [];
  const selected = isAllCurrencies(value) ? ALL_CURRENCIES : value;

  return (
    <Select
      value={selected}
      onValueChange={(next) => onChange(next as PipelineCurrency)}
      disabled={isLoading || activeCurrencies.length === 0}
    >
      <SelectTrigger
        size="sm"
        aria-label="Filter by currency"
        className={cn(
          HEADER_CONTROL_CLASS,
          'w-full min-w-0 border-border bg-white sm:w-auto sm:min-w-[148px] data-[size=default]:h-9 data-[size=sm]:h-9',
          className,
        )}
      >
        <SelectValue placeholder="All currencies" />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? null : (
          <>
            <SelectItem value={ALL_CURRENCIES}>All currencies</SelectItem>
            {activeCurrencies.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.code}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export function DepartmentFilter({
  filter,
  onFilterChange,
  className,
  triggerClassName,
  align = 'end',
  variant = 'popover',
}: {
  filter: PipelineFilterSelection;
  onFilterChange: (filter: PipelineFilterSelection) => void;
  className?: string;
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
  /** Use `panel` inside dialogs — avoids portaled popover click/focus conflicts. */
  variant?: 'popover' | 'panel';
}) {
  const [open, setOpen] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const { data: departments, isLoading } = usePipelineFilterTree();
  const userId = useAuthenticationStore((state) => state.userId);
  const orgScope = useReportExportScope();
  const userOrg = useMemo(
    () => findUserOrgContext(departments ?? [], userId),
    [departments, userId],
  );
  const sortedDepts = useMemo(
    () =>
      scopeFilterTreeDepartments(departments ?? [], orgScope.level, {
        userTeamId: userOrg.teamId,
        userDepartmentId: userOrg.departmentId,
        userId,
      }),
    [departments, orgScope.level, userOrg.teamId, userOrg.departmentId, userId],
  );
  const allLabel = scopeAllLabel(orgScope.level);
  const canSelectDepartment =
    orgScope.level !== 'team' && orgScope.level !== 'personal';
  const maxScopeSelection = useMemo(
    () =>
      maxScopeFilterSelection(orgScope.level, {
        ...userOrg,
        memberId: userId ?? null,
      }),
    [
      orgScope.level,
      userId,
      userOrg.departmentId,
      userOrg.teamId,
      userOrg.departmentName,
      userOrg.teamName,
      userOrg.memberName,
    ],
  );
  const isMaxScopeSelected =
    JSON.stringify(filter) === JSON.stringify(maxScopeSelection) ||
    (orgScope.level === 'company' && filter.type === 'all');

  useEffect(() => {
    if (orgScope.level === 'company' || !sortedDepts.length) return;
    setExpandedDepts(new Set(sortedDepts.map((dept) => dept.id)));
    if (orgScope.level === 'team') {
      setExpandedTeams(
        new Set(
          sortedDepts.flatMap((dept) => dept.teams.map((team) => team.id)),
        ),
      );
    }
  }, [orgScope.level, sortedDepts]);

  const toggleDept = (id: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    onFilterChange(maxScopeSelection);
    setOpen(false);
  };

  const selectDepartment = (dept: FilterTreeDepartment) => {
    if (!canSelectDepartment) return;
    onFilterChange({
      type: 'department',
      departmentId: dept.id,
      departmentName: dept.name,
    });
    setOpen(false);
  };

  const selectTeam = (dept: FilterTreeDepartment, team: FilterTreeTeam) => {
    onFilterChange({
      type: 'team',
      teamId: team.id,
      teamName: team.name,
      departmentId: dept.id,
      departmentName: dept.name,
    });
    setOpen(false);
  };

  const selectMember = (
    member: FilterTreeMember,
    team: FilterTreeTeam,
    dept: FilterTreeDepartment,
  ) => {
    onFilterChange({
      type: 'member',
      memberId: member.id,
      memberName: member.name ?? member.selamnewId ?? 'Unknown',
      teamId: team.id,
      teamName: team.name,
      departmentId: dept.id,
      departmentName: dept.name,
    });
    setOpen(false);
  };

  const triggerLabel =
    filter.type === 'all'
      ? allLabel
      : filter.type === 'department'
        ? filter.departmentName
        : filter.type === 'team'
          ? filter.teamName
          : filter.memberName;

  const tree = (
    <>
      <div className="max-h-[280px] space-y-0.5 overflow-y-auto">
        <button
          type="button"
          onClick={selectAll}
          className={cn(
            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
            isMaxScopeSelected && 'bg-accent',
          )}
        >
          <span className="flex-1 font-semibold text-foreground">
            {allLabel}
          </span>
          {isMaxScopeSelected ? (
            <Check size={12} className="shrink-0 text-brand" />
          ) : null}
        </button>

        {isLoading ? (
          <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
            Loading departments...
          </p>
        ) : sortedDepts.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
            {orgScope.level === 'company'
              ? 'No departments found'
              : 'No teams available in your access scope'}
          </p>
        ) : (
          sortedDepts.map((dept) => {
            const isExpanded = expandedDepts.has(dept.id);
            const deptSelected =
              filter.type === 'department' && filter.departmentId === dept.id;

            return (
              <div key={dept.id}>
                <div className="flex items-center gap-0.5 rounded-sm transition-colors hover:bg-accent">
                  <button
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDepartment(dept)}
                    disabled={!canSelectDepartment}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors',
                      deptSelected && 'bg-accent',
                      !canSelectDepartment && 'cursor-default',
                    )}
                  >
                    <BriefcaseBusiness
                      size={14}
                      className={cn(
                        'shrink-0',
                        deptSelected ? 'text-brand' : 'text-muted-foreground',
                      )}
                    />
                    <span className="flex-1 font-semibold text-foreground">
                      {dept.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {dept.teams.length > 0 ? String(dept.teams.length) : ''}
                    </span>
                    {deptSelected && (
                      <Check size={12} className="shrink-0 text-brand" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-4 border-l border-border pl-2">
                    <div className="space-y-0.5 py-1">
                      {dept.teams.length === 0 ? (
                        <p className="px-2 py-2 text-[11px] text-muted-foreground">
                          No teams
                        </p>
                      ) : (
                        dept.teams.map((team) => {
                          const teamExpanded = expandedTeams.has(team.id);
                          const teamSelected =
                            filter.type === 'team' && filter.teamId === team.id;

                          return (
                            <div key={team.id}>
                              <div className="flex items-center gap-0.5 rounded-sm transition-colors hover:bg-accent">
                                <button
                                  type="button"
                                  onClick={() => toggleTeam(team.id)}
                                  className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                                  aria-label={
                                    teamExpanded ? 'Collapse' : 'Expand'
                                  }
                                >
                                  {teamExpanded ? (
                                    <ChevronDown size={12} />
                                  ) : (
                                    <ChevronRight size={12} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => selectTeam(dept, team)}
                                  className={cn(
                                    'flex flex-1 items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors',
                                    teamSelected && 'bg-accent',
                                  )}
                                >
                                  <span className="flex-1 truncate font-medium text-foreground">
                                    {team.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {team.members.length}
                                  </span>
                                  {teamSelected && (
                                    <Check
                                      size={12}
                                      className="shrink-0 text-brand"
                                    />
                                  )}
                                </button>
                              </div>

                              {teamExpanded && (
                                <div className="ml-4 border-l border-border pl-2">
                                  <div className="space-y-0.5 py-1">
                                    {team.members.length === 0 ? (
                                      <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                                        No members
                                      </p>
                                    ) : (
                                      team.members.map((member) => {
                                        const selected =
                                          filter.type === 'member' &&
                                          filter.memberId === member.id;
                                        const displayName =
                                          member.name ??
                                          member.selamnewId ??
                                          'Unknown';
                                        return (
                                          <button
                                            key={member.id}
                                            type="button"
                                            onClick={() =>
                                              selectMember(member, team, dept)
                                            }
                                            className={cn(
                                              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent',
                                              selected && 'bg-accent',
                                            )}
                                          >
                                            <Users
                                              size={12}
                                              className="shrink-0 text-muted-foreground"
                                            />
                                            <span className="flex-1 truncate text-foreground">
                                              {displayName}
                                            </span>
                                            {selected && (
                                              <Check
                                                size={12}
                                                className="shrink-0 text-brand"
                                              />
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!isMaxScopeSelected && (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={selectAll}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-surface-elevated px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <X size={13} />
            Reset to {allLabel.toLowerCase()}
          </button>
        </div>
      )}
    </>
  );

  const triggerButton = (
    <button
      type="button"
      aria-expanded={open}
      aria-label="Filter by organization"
      onClick={variant === 'panel' ? () => setOpen((prev) => !prev) : undefined}
      className={cn(
        'inline-flex min-w-[148px] max-w-[220px] items-center gap-2 rounded-md border px-3 text-foreground',
        HEADER_CONTROL_CLASS,
        !isMaxScopeSelected
          ? 'border-brand-border bg-brand-muted'
          : 'border-border bg-white hover:bg-surface-elevated',
        triggerClassName,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
      <ChevronDown
        size={16}
        className={cn(
          'shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180',
        )}
      />
    </button>
  );

  if (variant === 'panel') {
    return (
      <div className={cn('w-full space-y-2', className)}>
        {triggerButton}
        {open ? (
          <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
            {tree}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent align={align} className="w-[320px] p-2">
          {tree}
        </PopoverContent>
      </Popover>
    </div>
  );
}
