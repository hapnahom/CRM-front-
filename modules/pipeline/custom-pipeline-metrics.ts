/**
 * Optional tenant config for custom pipeline KPIs (stage sets + metric definitions).
 * Empty / null → KPIs are not configured; core workflow is unaffected.
 */

export type PipelineMetricKind =
  | 'value_over_pipeline_target'
  | 'stage_exit_conversion';

export interface PipelineMetricStageSet {
  id: string;
  name: string;
  /** Deal stage IDs included in this set. */
  stageIds: string[];
}

/** Outcomes counted in the denominator of stage_exit_conversion (besides the target group). */
export type PipelineMetricExitOutcome =
  | { type: 'category'; category: 'lost' }
  | { type: 'stage_set'; stageSetId: string };

export interface PipelineMetricDefinition {
  id: string;
  name: string;
  kind: PipelineMetricKind;
  enabled: boolean;
  /** value_over_pipeline_target: stage set whose values are summed (QPV). */
  stageSetId?: string | null;
  /** stage_exit_conversion: exits leaving this set (via previousStageId). */
  fromStageSetId?: string | null;
  /** stage_exit_conversion: target destination set (numerator). */
  successStageSetId?: string | null;
  /** stage_exit_conversion: additional destination outcomes in the denominator. */
  alsoCount?: PipelineMetricExitOutcome[];
}

export interface PipelineStagnationLevelThresholds {
  highDays?: number;
  criticalDays?: number;
}

/** Tenant-configurable stage history analytics (no hardcoded defaults). */
export interface PipelineStageHistoryAnalyticsConfig {
  stagnationThresholdDays?: number | null;
  stagnationLevelThresholds?: PipelineStagnationLevelThresholds | null;
  dropAnalysisStageSetId?: string | null;
  salesCycleStartStageSetId?: string | null;
  salesCycleEndStageSetId?: string | null;
}

export interface CustomPipelineMetricsConfig {
  stageSets: PipelineMetricStageSet[];
  metrics: PipelineMetricDefinition[];
  stageHistoryAnalytics?: PipelineStageHistoryAnalyticsConfig | null;
}

export const EMPTY_CUSTOM_PIPELINE_METRICS: CustomPipelineMetricsConfig = {
  stageSets: [],
  metrics: [],
};

export const PIPELINE_METRIC_KIND_OPTIONS: Array<{
  value: PipelineMetricKind;
  label: string;
  shortHint: string;
}> = [
  {
    value: 'value_over_pipeline_target',
    label: 'Pipeline achievement',
    shortHint: 'Total value in a stage group vs your pipeline target.',
  },
  {
    value: 'stage_exit_conversion',
    label: 'Conversion rate',
    shortHint:
      'Share of exits from a starting group that reach a target group vs other exit outcomes (e.g. Shape → Proposal vs Lost + Dropped).',
  },
];

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
}

function normalizeExitOutcome(raw: unknown): PipelineMetricExitOutcome | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.type === 'category' && row.category === 'lost') {
    return { type: 'category', category: 'lost' };
  }
  if (
    row.type === 'stage_set' &&
    typeof row.stageSetId === 'string' &&
    row.stageSetId
  ) {
    return { type: 'stage_set', stageSetId: row.stageSetId };
  }
  return null;
}

export function includesLostCategoryInAlsoCount(
  alsoCount: PipelineMetricExitOutcome[] | undefined,
): boolean {
  return (alsoCount ?? []).some(
    (outcome) => outcome.type === 'category' && outcome.category === 'lost',
  );
}

export function exitStageSetIdsFromAlsoCount(
  alsoCount: PipelineMetricExitOutcome[] | undefined,
): string[] {
  return (alsoCount ?? [])
    .filter(
      (outcome): outcome is { type: 'stage_set'; stageSetId: string } =>
        outcome.type === 'stage_set',
    )
    .map((outcome) => outcome.stageSetId);
}

export function buildConversionAlsoCount(
  includeLostCategory: boolean,
  exitStageSetIds: string[],
): PipelineMetricExitOutcome[] {
  const outcomes: PipelineMetricExitOutcome[] = [];
  if (includeLostCategory) {
    outcomes.push({ type: 'category', category: 'lost' });
  }
  for (const stageSetId of exitStageSetIds) {
    outcomes.push({ type: 'stage_set', stageSetId });
  }
  return outcomes;
}

export function normalizeConversionAlsoCount(
  alsoCount: PipelineMetricExitOutcome[] | undefined,
): PipelineMetricExitOutcome[] {
  const includeLost = includesLostCategoryInAlsoCount(alsoCount);
  const groupIds = exitStageSetIdsFromAlsoCount(alsoCount);
  return buildConversionAlsoCount(includeLost, groupIds);
}

function normalizeStageSet(raw: unknown): PipelineMetricStageSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;
  return {
    id: row.id,
    name,
    stageIds: asStringArray(row.stageIds),
  };
}

function normalizeMetric(raw: unknown): PipelineMetricDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;
  const kind = row.kind;
  if (
    kind !== 'value_over_pipeline_target' &&
    kind !== 'stage_exit_conversion'
  ) {
    return null;
  }

  const alsoCount = Array.isArray(row.alsoCount)
    ? row.alsoCount
        .map(normalizeExitOutcome)
        .filter((item): item is PipelineMetricExitOutcome => item != null)
    : [];

  return {
    id: row.id,
    name,
    kind,
    enabled: row.enabled !== false,
    stageSetId:
      typeof row.stageSetId === 'string' && row.stageSetId
        ? row.stageSetId
        : null,
    fromStageSetId:
      typeof row.fromStageSetId === 'string' && row.fromStageSetId
        ? row.fromStageSetId
        : null,
    successStageSetId:
      typeof row.successStageSetId === 'string' && row.successStageSetId
        ? row.successStageSetId
        : null,
    alsoCount,
  };
}

function positiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  return n > 0 ? n : null;
}

function normalizeStagnationThresholds(
  raw: unknown,
): PipelineStagnationLevelThresholds | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const highDays = positiveInt(row.highDays);
  const criticalDays = positiveInt(row.criticalDays);
  if (!highDays && !criticalDays) return null;
  return {
    ...(highDays ? { highDays } : {}),
    ...(criticalDays ? { criticalDays } : {}),
  };
}

export function normalizeStageHistoryAnalytics(
  raw: unknown,
): PipelineStageHistoryAnalyticsConfig {
  if (!raw || typeof raw !== 'object') return {};

  const row = raw as Record<string, unknown>;
  const stagnationThresholdDays =
    row.stagnationThresholdDays === null
      ? null
      : (positiveInt(row.stagnationThresholdDays) ?? undefined);

  const optionalSetId = (key: string): string | null | undefined => {
    const value = row[key];
    if (typeof value === 'string' && value) return value;
    return value === null ? null : undefined;
  };

  const stagnationLevelThresholds = normalizeStagnationThresholds(
    row.stagnationLevelThresholds,
  );

  return {
    ...(stagnationThresholdDays !== undefined
      ? { stagnationThresholdDays }
      : {}),
    ...(optionalSetId('dropAnalysisStageSetId') !== undefined
      ? { dropAnalysisStageSetId: optionalSetId('dropAnalysisStageSetId') }
      : {}),
    ...(optionalSetId('salesCycleStartStageSetId') !== undefined
      ? {
          salesCycleStartStageSetId: optionalSetId('salesCycleStartStageSetId'),
        }
      : {}),
    ...(optionalSetId('salesCycleEndStageSetId') !== undefined
      ? { salesCycleEndStageSetId: optionalSetId('salesCycleEndStageSetId') }
      : {}),
    ...(stagnationLevelThresholds ? { stagnationLevelThresholds } : {}),
  };
}

export function hasStageHistoryAnalyticsConfig(
  config: PipelineStageHistoryAnalyticsConfig | null | undefined,
): boolean {
  if (!config) return false;
  return (
    config.stagnationThresholdDays != null ||
    Boolean(config.dropAnalysisStageSetId) ||
    Boolean(config.salesCycleEndStageSetId) ||
    config.salesCycleStartStageSetId != null
  );
}

export function normalizeCustomPipelineMetrics(
  raw: Partial<CustomPipelineMetricsConfig> | null | undefined,
): CustomPipelineMetricsConfig {
  if (!raw || typeof raw !== 'object') {
    return { stageSets: [], metrics: [] };
  }

  const stageSets = Array.isArray(raw.stageSets)
    ? raw.stageSets
        .map(normalizeStageSet)
        .filter((item): item is PipelineMetricStageSet => item != null)
    : [];

  const metrics = Array.isArray(raw.metrics)
    ? raw.metrics
        .map(normalizeMetric)
        .filter((item): item is PipelineMetricDefinition => item != null)
    : [];

  const stageHistoryAnalytics =
    raw.stageHistoryAnalytics === null
      ? null
      : normalizeStageHistoryAnalytics(raw.stageHistoryAnalytics);

  return {
    stageSets,
    metrics,
    ...(stageHistoryAnalytics !== undefined ? { stageHistoryAnalytics } : {}),
  };
}

export function createLocalId(prefix: string): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Resolves the first enabled value÷pipeline-target metric to its stage IDs.
 * Returns null when the metric / stage set is missing or incomplete.
 */
export function resolveValueOverTargetMetric(
  config: CustomPipelineMetricsConfig | null | undefined,
): { metricName: string; stageSetName: string; stageIds: string[] } | null {
  const normalized = normalizeCustomPipelineMetrics(config);
  const metric = normalized.metrics.find(
    (m) =>
      m.enabled &&
      m.kind === 'value_over_pipeline_target' &&
      typeof m.stageSetId === 'string' &&
      m.stageSetId.length > 0,
  );
  if (!metric?.stageSetId) return null;
  const stageSet = normalized.stageSets.find((s) => s.id === metric.stageSetId);
  if (!stageSet?.stageIds.length) return null;
  return {
    metricName: metric.name,
    stageSetName: stageSet.name,
    stageIds: [...stageSet.stageIds],
  };
}

export type ResolvedStageExitConversionMetric = {
  metricName: string;
  fromStageIds: string[];
  successStageIds: string[];
  /** When true, exits into any lost-category stage count in the denominator. */
  includeLostCategory: boolean;
  /** Explicit destination stage IDs (e.g. Dropped) counted in the denominator. */
  alsoStageIds: string[];
};

function resolveSuccessStageIds(
  metric: PipelineMetricDefinition,
  stageSets: PipelineMetricStageSet[],
): string[] {
  if (!metric.successStageSetId) return [];
  const targetSet = stageSets.find((s) => s.id === metric.successStageSetId);
  return [...(targetSet?.stageIds ?? [])];
}

function expandConversionDenominator(
  alsoCount: PipelineMetricExitOutcome[] | undefined,
  stageSets: PipelineMetricStageSet[],
): { includeLostCategory: boolean; alsoStageIds: string[] } {
  const alsoStageIds = new Set<string>();
  let includeLostCategory = false;

  for (const outcome of alsoCount ?? []) {
    if (outcome.type === 'category' && outcome.category === 'lost') {
      includeLostCategory = true;
      continue;
    }
    if (outcome.type === 'stage_set') {
      const set = stageSets.find((item) => item.id === outcome.stageSetId);
      for (const stageId of set?.stageIds ?? []) alsoStageIds.add(stageId);
    }
  }

  return {
    includeLostCategory,
    alsoStageIds: [...alsoStageIds],
  };
}

export function conversionDenominatorConfigured(
  alsoCount: PipelineMetricExitOutcome[] | undefined,
): boolean {
  return normalizeConversionAlsoCount(alsoCount).length > 0;
}

/**
 * Resolves the first enabled stage-exit conversion metric (e.g. SD Conversion Rate).
 * Returns null when from/target groups are missing or empty.
 */
export function resolveStageExitConversionMetric(
  config: CustomPipelineMetricsConfig | null | undefined,
): ResolvedStageExitConversionMetric | null {
  const normalized = normalizeCustomPipelineMetrics(config);
  const metric = normalized.metrics.find(
    (m) =>
      m.enabled &&
      m.kind === 'stage_exit_conversion' &&
      typeof m.fromStageSetId === 'string' &&
      m.fromStageSetId.length > 0,
  );
  if (!metric?.fromStageSetId) return null;

  const fromSet = normalized.stageSets.find(
    (s) => s.id === metric.fromStageSetId,
  );
  const successStageIds = resolveSuccessStageIds(metric, normalized.stageSets);
  if (!fromSet?.stageIds.length || !successStageIds.length) return null;

  const denominator = expandConversionDenominator(
    metric.alsoCount,
    normalized.stageSets,
  );

  return {
    metricName: metric.name,
    fromStageIds: [...fromSet.stageIds],
    successStageIds,
    includeLostCategory: denominator.includeLostCategory,
    alsoStageIds: denominator.alsoStageIds,
  };
}

/** True when conversion metric has from + target groups configured. */
export function isStageExitConversionConfigured(
  config: CustomPipelineMetricsConfig | null | undefined,
): boolean {
  return resolveStageExitConversionMetric(config) != null;
}
