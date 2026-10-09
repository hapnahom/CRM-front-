import { isLeadsEnabled } from '@/config/salesWorkflow';
import {
  roundTarget,
  targetAchievementPercent,
  TARGET_FRACTION_DIGITS,
} from '@/lib/target-format';

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
};

export type LeadQuarterTarget = {
  q: LeadQuarter;
  target: number;
};

export type SalesTeamAllocation = {
  teamId: string;
  teamName: string;
  quarters: LeadQuarterTarget[];
};

export type PersonAllocation = {
  personId: string;
  personName: string;
  teamId: string;
  teamName: string;
  quarters: LeadQuarterTarget[];
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

export function getQuarterPeriodLabel(
  quarterDefinitions: FiscalQuarterDefinition[] | undefined,
  q: LeadQuarter,
): string {
  return (
    quarterDefinitions?.find((row) => row.q === q)?.periodLabel ??
    QUARTER_SHORT_LABELS[q]
  );
}

export function formatMoneyInCurrency(
  amount: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: TARGET_FRACTION_DIGITS,
      maximumFractionDigits: TARGET_FRACTION_DIGITS,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatScaledCompactValue(scaled: number): string {
  const abs = Math.abs(scaled);
  const sign = scaled < 0 ? '-' : '';
  return `${sign}${roundTarget(abs).toFixed(TARGET_FRACTION_DIGITS)}`;
}

export function formatCompactNumber(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${formatScaledCompactValue(amount / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${formatScaledCompactValue(amount / 1_000)}K`;
  }
  return roundTarget(amount).toFixed(TARGET_FRACTION_DIGITS);
}

function formatCompactMoneyIntl(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: TARGET_FRACTION_DIGITS,
    maximumFractionDigits: TARGET_FRACTION_DIGITS,
  }).format(amount);
}

export function formatCompactMoney(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000) {
    try {
      return formatCompactMoneyIntl(amount, currency);
    } catch {
      return `${currency} ${formatCompactNumber(amount)}`;
    }
  }
  return formatMoneyInCurrency(amount, currency);
}

export function computeLeadTargetPct(achieved: number, target: number): number {
  return targetAchievementPercent(achieved, target);
}

export function getQuarterTarget(
  quarters: LeadQuarterTarget[],
  q: LeadQuarter,
): number {
  return quarters.find((row) => row.q === q)?.target ?? 0;
}

export function updateQuarterTarget(
  quarters: LeadQuarterTarget[],
  q: LeadQuarter,
  value: number,
): LeadQuarterTarget[] {
  const next = quarters.map((row) => ({ ...row }));
  const existing = next.find((row) => row.q === q);
  if (existing) {
    existing.target = value;
  } else {
    next.push({ q, target: value });
  }
  return next.sort((a, b) => a.q - b.q);
}

export function quarterSum(row: { quarters: LeadQuarterTarget[] }): number {
  return row.quarters.reduce((sum, q) => sum + q.target, 0);
}

export function emptyQuarterlyTargets(): LeadQuarterTarget[] {
  return ([1, 2, 3, 4] as const).map((q) => ({ q, target: 0 }));
}

export function buildQuarterlyTargets(
  annualTarget: number,
): LeadQuarterTarget[] {
  const weights = [0.22, 0.26, 0.28, 0.24];
  let remainder = annualTarget;
  return ([1, 2, 3, 4] as const).map((q, index) => {
    const value =
      index === 3 ? remainder : roundTarget(annualTarget * weights[index]);
    remainder -= value;
    return { q, target: Math.max(0, roundTarget(value)) };
  });
}

export function sessionsToQuarterDefinitions(
  sessions: { id: string; name: string; startDate: string; endDate: string }[],
): FiscalQuarterDefinition[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  return ([1, 2, 3, 4] as const).map((q, index) => {
    const session = sorted[index];
    if (!session) {
      return { q, periodLabel: QUARTER_SHORT_LABELS[q] };
    }
    const start = new Date(session.startDate);
    const end = new Date(session.endDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      q,
      periodLabel: `${fmt(start)} – ${fmt(end)}`,
    };
  });
}

export function sessionIdForQuarter(
  sessions: { id: string; startDate: string }[],
  q: LeadQuarter,
): string | null {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  return sorted[q - 1]?.id ?? null;
}

export function quarterForSessionId(
  sessions: { id: string; startDate: string }[],
  sessionId: string,
): LeadQuarter | null {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const index = sorted.findIndex((s) => s.id === sessionId);
  if (index < 0 || index > 3) return null;
  return (index + 1) as LeadQuarter;
}

export function getValueTierInfo(value: number): { label: string } {
  if (value >= 500_000) return { label: 'Enterprise' };
  if (value >= 100_000) return { label: 'Large' };
  if (value >= 25_000) return { label: 'Medium' };
  return { label: 'Small' };
}

export function getDateUrgencyInfo(dateStr: string | null | undefined): {
  isOverdue: boolean;
  daysToClose: number;
  label: string;
} {
  if (!dateStr) {
    return {
      isOverdue: false,
      daysToClose: Number.POSITIVE_INFINITY,
      label: 'No date',
    };
  }

  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) {
    return {
      isOverdue: false,
      daysToClose: Number.POSITIVE_INFINITY,
      label: 'No date',
    };
  }

  const daysToClose = Math.ceil(
    (timestamp - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (daysToClose < 0) {
    return { isOverdue: true, daysToClose, label: 'Overdue' };
  }
  if (daysToClose <= 30)
    return { isOverdue: false, daysToClose, label: '≤ 30 days' };
  if (daysToClose <= 60)
    return { isOverdue: false, daysToClose, label: '31–60 days' };
  if (daysToClose <= 90)
    return { isOverdue: false, daysToClose, label: '61–90 days' };
  return { isOverdue: false, daysToClose, label: '90+ days' };
}

// --- Four Forecast Methods Configuration & Deduplication Engine ---

export type ForecastMethodId = 'stage' | 'value' | 'date' | 'manual';

export interface StageForecastConfig {
  enabled: boolean;
  includeLeads: boolean;
  includeDeals: boolean;
  leadStageIds: string[]; // empty means all included
  dealStageIds: string[]; // empty means all included
}

export interface ValueForecastConfig {
  enabled: boolean;
  thresholdsByCurrency: Record<
    string,
    { minValue: number; maxValue: number | null }
  >;
  source: 'leads' | 'deals' | 'both';
}

export function resolveValueThresholdsForCurrency(
  valueConfig: ValueForecastConfig,
  currencyCode: string,
): { minValue: number; maxValue: number | null } {
  const code = currencyCode.trim().toUpperCase();
  const entry = code ? valueConfig.thresholdsByCurrency?.[code] : undefined;
  const maxRaw = entry?.maxValue;
  const maxValue = maxRaw == null ? null : Number(maxRaw);
  return {
    minValue: Number(entry?.minValue) || 0,
    maxValue: maxValue != null && Number.isFinite(maxValue) ? maxValue : null,
  };
}

export function setValueThresholdsForCurrency(
  valueConfig: ValueForecastConfig,
  currencyCode: string,
  thresholds: { minValue: number; maxValue: number | null },
): ValueForecastConfig {
  const code = currencyCode.trim().toUpperCase();
  const maxParsed =
    thresholds.maxValue == null ? null : Number(thresholds.maxValue);
  return {
    ...valueConfig,
    thresholdsByCurrency: {
      ...(valueConfig.thresholdsByCurrency ?? {}),
      [code]: {
        minValue: Number(thresholds.minValue) || 0,
        maxValue:
          maxParsed != null && Number.isFinite(maxParsed) ? maxParsed : null,
      },
    },
  };
}

export interface DateForecastConfig {
  enabled: boolean;
  /** Fiscal year / session tree, or free-form calendar range. */
  periodMode: 'fiscal' | 'custom';
  calendarId: string | null;
  sessionId: string | null;
  customStartDate?: string | null;
  customEndDate?: string | null;
  /** Match horizon against created date or expected close date. */
  dateField: 'createdAt' | 'expectedClose';
  source: 'leads' | 'deals' | 'both';
  includeOverdue: boolean;
  excludeWithoutCloseDate: boolean;
  /** Resolved bounds for client-side preview. */
  fiscalYearStart?: string | null;
  fiscalYearEnd?: string | null;
}

export interface ManualForecastItem {
  id: string;
  name: string;
  amount: number;
  period: string; // e.g. "2026", "Q3 2026", "September 2026"
  department?: string;
  team?: string;
  salesRep?: string;
  vendorSolution?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ManualForecastConfig {
  enabled: boolean;
}

export interface TargetingForecastConfig {
  stage: StageForecastConfig;
  value: ValueForecastConfig;
  date: DateForecastConfig;
  manual: ManualForecastConfig;
}

export const DEFAULT_TARGETING_FORECAST_CONFIG: TargetingForecastConfig = {
  stage: {
    enabled: true,
    includeLeads: true,
    includeDeals: true,
    leadStageIds: [],
    dealStageIds: [],
  },
  value: {
    enabled: false,
    thresholdsByCurrency: {},
    source: 'both',
  },
  date: {
    enabled: false,
    periodMode: 'fiscal',
    calendarId: null,
    sessionId: null,
    customStartDate: null,
    customEndDate: null,
    dateField: 'expectedClose',
    source: 'both',
    includeOverdue: false,
    excludeWithoutCloseDate: false,
  },
  manual: {
    enabled: true,
  },
};

export function normalizeForecastConfigForWorkflow(
  config: TargetingForecastConfig,
): TargetingForecastConfig {
  if (isLeadsEnabled()) return config;

  return {
    ...config,
    stage: {
      ...config.stage,
      includeLeads: false,
      includeDeals: config.stage.includeDeals !== false,
    },
    value: {
      ...config.value,
      source: 'deals',
    },
    date: {
      ...config.date,
      source: 'deals',
    },
  };
}

/** Default config used until server settings hydrate. */
export function getDefaultTargetingForecastConfig(): TargetingForecastConfig {
  return normalizeForecastConfigForWorkflow({
    stage: { ...DEFAULT_TARGETING_FORECAST_CONFIG.stage },
    value: {
      ...DEFAULT_TARGETING_FORECAST_CONFIG.value,
      thresholdsByCurrency: {
        ...DEFAULT_TARGETING_FORECAST_CONFIG.value.thresholdsByCurrency,
      },
    },
    date: { ...DEFAULT_TARGETING_FORECAST_CONFIG.date },
    manual: { ...DEFAULT_TARGETING_FORECAST_CONFIG.manual },
  });
}

function normalizeDateConfig(
  raw: Partial<DateForecastConfig> | undefined,
): DateForecastConfig {
  return {
    ...DEFAULT_TARGETING_FORECAST_CONFIG.date,
    ...(raw || {}),
    periodMode: raw?.periodMode ?? 'fiscal',
    calendarId: raw?.calendarId ?? null,
    sessionId: raw?.sessionId ?? null,
    customStartDate: raw?.customStartDate ?? null,
    customEndDate: raw?.customEndDate ?? null,
    dateField: raw?.dateField ?? 'expectedClose',
  };
}

/** Hydrate client forecast config from server inclusion settings. */
export function mergeServerSettingsIntoForecastConfig(
  config: TargetingForecastConfig,
  server?: {
    forecastInclusionConfig?: {
      stage?: Partial<StageForecastConfig>;
      value?: Partial<ValueForecastConfig>;
      date?: Partial<DateForecastConfig>;
      manual?: { enabled?: boolean };
    } | null;
  } | null,
): TargetingForecastConfig {
  const inclusion = server?.forecastInclusionConfig;
  if (!inclusion) return normalizeForecastConfigForWorkflow(config);

  return normalizeForecastConfigForWorkflow({
    ...config,
    stage: {
      ...config.stage,
      ...(inclusion.stage || {}),
      leadStageIds: [
        ...(inclusion.stage?.leadStageIds ?? config.stage.leadStageIds),
      ],
      dealStageIds: [
        ...(inclusion.stage?.dealStageIds ?? config.stage.dealStageIds),
      ],
    },
    value: {
      enabled: inclusion.value?.enabled ?? config.value.enabled,
      source: inclusion.value?.source ?? config.value.source,
      thresholdsByCurrency: {
        ...config.value.thresholdsByCurrency,
        ...(inclusion.value?.thresholdsByCurrency ?? {}),
      },
    },
    date: normalizeDateConfig({
      ...config.date,
      ...(inclusion.date || {}),
    }),
    manual: {
      enabled: inclusion.manual?.enabled ?? config.manual.enabled,
    },
  });
}

export function syncFiscalYearIntoDateConfig(
  config: TargetingForecastConfig,
  calendar?: { id: string; startDate: string; endDate: string } | null,
): TargetingForecastConfig {
  if (!calendar) return config;
  if (config.date.periodMode !== 'fiscal') return config;
  if (config.date.calendarId || config.date.sessionId) return config;
  return {
    ...config,
    date: {
      ...config.date,
      calendarId: calendar.id,
      fiscalYearStart: calendar.startDate,
      fiscalYearEnd: calendar.endDate,
    },
  };
}

export function buildForecastInclusionPayload(
  config: TargetingForecastConfig,
): {
  stage: StageForecastConfig;
  value: ValueForecastConfig;
  date: {
    enabled: boolean;
    periodMode: 'fiscal' | 'custom';
    calendarId: string | null;
    sessionId: string | null;
    customStartDate: string | null;
    customEndDate: string | null;
    dateField: 'createdAt' | 'expectedClose';
    source: 'leads' | 'deals' | 'both';
    includeOverdue: boolean;
    excludeWithoutCloseDate: boolean;
  };
  manual: { enabled: boolean };
} {
  return {
    stage: { ...config.stage },
    value: {
      enabled: config.value.enabled,
      source: config.value.source,
      thresholdsByCurrency: { ...config.value.thresholdsByCurrency },
    },
    date: {
      enabled: config.date.enabled,
      periodMode: config.date.periodMode ?? 'fiscal',
      calendarId: config.date.calendarId ?? null,
      sessionId: config.date.sessionId ?? null,
      customStartDate: config.date.customStartDate ?? null,
      customEndDate: config.date.customEndDate ?? null,
      dateField: config.date.dateField ?? 'expectedClose',
      source: config.date.source,
      includeOverdue: config.date.includeOverdue,
      excludeWithoutCloseDate: config.date.excludeWithoutCloseDate,
    },
    manual: { enabled: config.manual.enabled },
  };
}

/**
 * Resolve the date-method horizon into concrete start/end bounds.
 */
export function resolveDateForecastBounds(
  config: DateForecastConfig,
  options?: {
    fiscalYears?: Array<{
      id: string;
      startDate: string;
      endDate: string;
      sessions: Array<{ id: string; startDate: string; endDate: string }>;
    }>;
  },
): { start: string | null; end: string | null } {
  if (config.periodMode === 'custom') {
    return {
      start: config.customStartDate?.slice(0, 10) ?? null,
      end: config.customEndDate?.slice(0, 10) ?? null,
    };
  }

  const years = options?.fiscalYears ?? [];
  if (config.sessionId) {
    for (const year of years) {
      const session = year.sessions.find((s) => s.id === config.sessionId);
      if (session) {
        return {
          start: session.startDate.slice(0, 10),
          end: session.endDate.slice(0, 10),
        };
      }
    }
  }

  if (config.calendarId) {
    const year = years.find((y) => y.id === config.calendarId);
    if (year) {
      return {
        start: year.startDate.slice(0, 10),
        end: year.endDate.slice(0, 10),
      };
    }
  }

  if (config.fiscalYearStart || config.fiscalYearEnd) {
    return {
      start: config.fiscalYearStart?.slice(0, 10) ?? null,
      end: config.fiscalYearEnd?.slice(0, 10) ?? null,
    };
  }

  return { start: null, end: null };
}

/**
 * Checks if a date falls within the configured date-method horizon.
 * For expectedClose: supports overdue / missing-date toggles.
 * For createdAt: strict range match on the creation timestamp.
 */
export function isDateInForecastRange(
  dateStr: string | null | undefined,
  config: DateForecastConfig,
  bounds?: { start: string | null; end: string | null },
): boolean {
  const dateField = config.dateField ?? 'expectedClose';
  const resolved = bounds ?? resolveDateForecastBounds(config);

  if (dateField === 'createdAt') {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (resolved.start) {
      const start = new Date(resolved.start).getTime();
      if (d.getTime() < start) return false;
    }
    if (resolved.end) {
      const end = new Date(resolved.end);
      end.setHours(23, 59, 59, 999);
      if (d.getTime() > end.getTime()) return false;
    }
    return Boolean(resolved.start || resolved.end);
  }

  if (!dateStr) {
    return !config.excludeWithoutCloseDate;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return !config.excludeWithoutCloseDate;

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (d.getTime() < todayStart) {
    return config.includeOverdue;
  }

  if (resolved.start) {
    const start = new Date(resolved.start).getTime();
    if (d.getTime() < start) return false;
  }
  if (resolved.end) {
    const end = new Date(resolved.end);
    end.setHours(23, 59, 59, 999);
    if (d.getTime() > end.getTime()) return false;
  }

  if (!resolved.start && !resolved.end) {
    return false;
  }

  return true;
}

export interface OpportunityForecastEvaluation {
  opportunityId: string;
  opportunityName: string;
  opportunityValue: number;
  type: 'lead' | 'deal';
  stageId: string;
  expectedCloseDate: string | null;
  matchesStage: boolean;
  matchesValue: boolean;
  matchesDate: boolean;
  isEligible: boolean;
  forecastContribution: number;
}

/**
 * Evaluates a single opportunity against enabled forecasting methods (OR).
 * Full value is contributed once if it matches any enabled method.
 */
export function evaluateOpportunityMultiMethod(
  op: {
    id: string;
    name: string;
    value: number;
    type: 'lead' | 'deal';
    stageId: string;
    expectedCloseDate?: string | null;
    createdAt?: string | null;
  },
  config: TargetingForecastConfig,
  currencyCode?: string,
): OpportunityForecastEvaluation {
  const value = Math.max(0, op.value || 0);

  let matchesStage = false;
  if (config.stage.enabled) {
    if (op.type === 'lead' && config.stage.includeLeads) {
      matchesStage =
        !config.stage.leadStageIds.includes('none') &&
        (config.stage.leadStageIds.length === 0 ||
          config.stage.leadStageIds.includes(op.stageId));
    } else if (op.type === 'deal' && config.stage.includeDeals) {
      matchesStage =
        !config.stage.dealStageIds.includes('none') &&
        (config.stage.dealStageIds.length === 0 ||
          config.stage.dealStageIds.includes(op.stageId));
    }
  }

  let matchesValue = false;
  if (config.value.enabled) {
    const typeAllowed =
      config.value.source === 'both' ||
      (config.value.source === 'leads' && op.type === 'lead') ||
      (config.value.source === 'deals' && op.type === 'deal');

    if (typeAllowed) {
      const thresholds = resolveValueThresholdsForCurrency(
        config.value,
        currencyCode || '',
      );
      const minOk = value >= thresholds.minValue;
      const maxOk = thresholds.maxValue == null || value <= thresholds.maxValue;
      matchesValue = minOk && maxOk;
    }
  }

  let matchesDate = false;
  if (config.date.enabled) {
    const typeAllowed =
      config.date.source === 'both' ||
      (config.date.source === 'leads' && op.type === 'lead') ||
      (config.date.source === 'deals' && op.type === 'deal');

    if (typeAllowed) {
      const dateField = config.date.dateField ?? 'expectedClose';
      const dateValue =
        dateField === 'createdAt' ? op.createdAt : op.expectedCloseDate;
      matchesDate = isDateInForecastRange(dateValue, config.date);
    }
  }

  const isEligible = matchesStage || matchesValue || matchesDate;

  return {
    opportunityId: op.id,
    opportunityName: op.name,
    opportunityValue: value,
    type: op.type,
    stageId: op.stageId,
    expectedCloseDate: op.expectedCloseDate ?? null,
    matchesStage,
    matchesValue,
    matchesDate,
    isEligible,
    forecastContribution: isEligible ? value : 0,
  };
}

export interface TargetingForecastSummary {
  /** Sum of values matching each method (may overlap across methods). */
  stageForecast: number;
  valueForecast: number;
  dateForecast: number;
  manualForecast: number;
  /** Deduplicated OR total of eligible pipeline opportunities. */
  totalPipelineForecast: number;
  /** Pipeline OR total + manual. */
  totalForecast: number;
  eligibleOpportunityCount: number;
  totalOpportunityCount: number;
  evaluations: OpportunityForecastEvaluation[];
}

/**
 * Computes forecast breakdown. Method cards show matching totals (can overlap).
 * Total pipeline uses OR deduplication — each opportunity counted once.
 */
export function calculateTargetingForecastSummary(
  opportunities: Array<{
    id: string;
    name: string;
    value: number;
    type: 'lead' | 'deal';
    stageId: string;
    expectedCloseDate?: string | null;
    createdAt?: string | null;
  }>,
  config: TargetingForecastConfig,
  manualTotal = 0,
  currencyCode?: string,
): TargetingForecastSummary {
  const evaluations = opportunities.map((op) =>
    evaluateOpportunityMultiMethod(op, config, currencyCode),
  );

  let stageForecast = 0;
  let valueForecast = 0;
  let dateForecast = 0;
  let totalPipelineForecast = 0;
  let eligibleOpportunityCount = 0;

  for (const ev of evaluations) {
    if (ev.matchesStage) stageForecast += ev.opportunityValue;
    if (ev.matchesValue) valueForecast += ev.opportunityValue;
    if (ev.matchesDate) dateForecast += ev.opportunityValue;
    if (ev.isEligible) {
      eligibleOpportunityCount += 1;
      totalPipelineForecast += ev.opportunityValue;
    }
  }

  const manualForecast =
    config.manual.enabled !== false ? Math.max(0, manualTotal) : 0;
  const totalForecast = totalPipelineForecast + manualForecast;

  return {
    stageForecast,
    valueForecast,
    dateForecast,
    manualForecast,
    totalPipelineForecast,
    totalForecast,
    eligibleOpportunityCount,
    totalOpportunityCount: opportunities.length,
    evaluations,
  };
}

export type ForecastPeriodType = 'annual' | 'quarterly' | 'monthly';
export type ForecastPeriodStatus = 'draft' | 'generated' | 'locked';

export interface ForecastPeriodDefinition {
  id: string;
  type: ForecastPeriodType;
  label: string;
  subLabel?: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
}

function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar months overlapping a fiscal year, clipped to FY boundaries. */
export function buildFiscalMonthlyPeriods(
  calendar: { startDate: string; endDate: string } | null,
): ForecastPeriodDefinition[] {
  if (!calendar) return [];

  const fyStart = new Date(calendar.startDate.slice(0, 10));
  const fyEnd = new Date(calendar.endDate.slice(0, 10));
  if (isNaN(fyStart.getTime()) || isNaN(fyEnd.getTime())) return [];

  const months: ForecastPeriodDefinition[] = [];
  let cursor = new Date(fyStart.getFullYear(), fyStart.getMonth(), 1);

  while (cursor <= fyEnd) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    const startDate = monthStart < fyStart ? fyStart : monthStart;
    const endDate = monthEnd > fyEnd ? fyEnd : monthEnd;
    const startStr = toDateOnlyString(startDate);
    const endStr = toDateOnlyString(endDate);

    months.push({
      id: `m-${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      type: 'monthly',
      label: monthStart.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      dateRangeLabel: `${startStr} — ${endStr}`,
      startDate: startStr,
      endDate: endStr,
    });

    cursor = new Date(year, monthIndex + 1, 1);
  }

  return months;
}

/** Fiscal session that overlaps the given date window (for monthly forecast API calls). */
export function findSessionForDateRange(
  sessions: { id: string; startDate: string; endDate: string }[],
  startDate: string,
  endDate: string,
): string | null {
  if (!sessions.length) return null;

  const rangeStart = new Date(startDate.slice(0, 10)).getTime();
  const rangeEnd = new Date(endDate.slice(0, 10)).getTime();
  if (isNaN(rangeStart) || isNaN(rangeEnd)) return sessions[0]!.id;

  const overlap = sessions.find((session) => {
    const sessionStart = new Date(session.startDate.slice(0, 10)).getTime();
    const sessionEnd = new Date(session.endDate.slice(0, 10)).getTime();
    return rangeStart <= sessionEnd && rangeEnd >= sessionStart;
  });

  return overlap?.id ?? sessions[0]!.id;
}

export function defaultMonthlyPeriodId(
  months: ForecastPeriodDefinition[],
): string {
  if (!months.length) return '';
  const today = toDateOnlyString(new Date());
  const current = months.find(
    (month) => today >= month.startDate && today <= month.endDate,
  );
  return current?.id ?? months[0]!.id;
}

export function isOpportunityInPeriodRange(
  expectedCloseDate: string | null | undefined,
  startDate: string,
  endDate: string,
): boolean {
  if (!expectedCloseDate) return false;
  const target = new Date(expectedCloseDate).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(target) || isNaN(start) || isNaN(end)) return true;
  return target >= start && target <= end;
}
