'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AccessGuard from '@/utils/permissionGuard';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import {
  usePipelineSettings,
  useUpdatePipelineSettings,
} from '@/store/server/features/pipeline/settings';
import {
  buildConversionAlsoCount,
  conversionDenominatorConfigured,
  createLocalId,
  EMPTY_CUSTOM_PIPELINE_METRICS,
  exitStageSetIdsFromAlsoCount,
  hasStageHistoryAnalyticsConfig,
  includesLostCategoryInAlsoCount,
  normalizeConversionAlsoCount,
  normalizeCustomPipelineMetrics,
  normalizeStageHistoryAnalytics,
  PIPELINE_METRIC_KIND_OPTIONS,
  type CustomPipelineMetricsConfig,
  type PipelineMetricDefinition,
  type PipelineMetricKind,
  type PipelineMetricStageSet,
  type PipelineStageHistoryAnalyticsConfig,
} from '@/modules/pipeline/custom-pipeline-metrics';

type StageOption = {
  id: string;
  name: string;
  color?: string | null;
  category?: string | null;
};

function configsEqual(
  a: CustomPipelineMetricsConfig,
  b: CustomPipelineMetricsConfig,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-foreground">
      {children}
    </label>
  );
}

function StageGroupPicker({
  stages,
  selectedIds,
  disabled,
  onToggle,
}: {
  stages: StageOption[];
  selectedIds: string[];
  disabled?: boolean;
  onToggle: (stageId: string) => void;
}) {
  if (!stages.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Add pipeline stages first to build a group.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {stages.map((stage) => {
        const selected = selectedIds.includes(stage.id);
        return (
          <button
            key={stage.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(stage.id)}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              selected
                ? 'border-brand bg-brand-muted text-foreground'
                : 'border-border bg-surface-card text-muted-foreground hover:border-border-strong hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {stage.color ? (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
                aria-hidden
              />
            ) : null}
            <span className="truncate">{stage.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function StageSetEditor({
  stageSet,
  stages,
  disabled,
  onChange,
  onRemove,
}: {
  stageSet: PipelineMetricStageSet;
  stages: StageOption[];
  disabled?: boolean;
  onChange: (next: PipelineMetricStageSet) => void;
  onRemove: () => void;
}) {
  const toggleStage = (stageId: string) => {
    const has = stageSet.stageIds.includes(stageId);
    onChange({
      ...stageSet,
      stageIds: has
        ? stageSet.stageIds.filter((id) => id !== stageId)
        : [...stageSet.stageIds, stageId],
    });
  };

  const selectedCount = stageSet.stageIds.length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="flex items-center gap-2 border-b border-border bg-surface-elevated/40 px-3 py-2.5">
        <Input
          value={stageSet.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...stageSet, name: e.target.value })}
          placeholder="Group name"
          className="h-8 flex-1 border-border bg-surface-card text-sm"
        />
        <Badge variant={selectedCount > 0 ? 'brand' : 'muted'}>
          {selectedCount} stage{selectedCount === 1 ? '' : 's'}
        </Badge>
        {!disabled ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove stage group"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="px-3 py-3">
        <StageGroupPicker
          stages={stages}
          selectedIds={stageSet.stageIds}
          disabled={disabled}
          onToggle={toggleStage}
        />
      </div>
    </div>
  );
}

function StageGroupSelect({
  label,
  value,
  stageSets,
  disabled,
  placeholder,
  onValueChange,
}: {
  label: string;
  value: string | null | undefined;
  stageSets: PipelineMetricStageSet[];
  disabled?: boolean;
  placeholder?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value ?? undefined}
        disabled={disabled || stageSets.length === 0}
        onValueChange={onValueChange}
      >
        <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
          <SelectValue placeholder={placeholder ?? 'Select group'} />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          {stageSets.map((set) => (
            <SelectItem key={set.id} value={set.id}>
              {set.name || 'Untitled group'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExitOutcomePicker({
  label,
  includeLost,
  stageSets,
  selectedGroupIds,
  disabled,
  onToggleLost,
  onChangeGroups,
}: {
  label: string;
  includeLost: boolean;
  stageSets: PipelineMetricStageSet[];
  selectedGroupIds: string[];
  disabled?: boolean;
  onToggleLost: () => void;
  onChangeGroups: (nextIds: string[]) => void;
}) {
  const chipClass = (selected: boolean) =>
    cn(
      'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
      selected
        ? 'border-brand bg-brand-muted text-foreground'
        : 'border-border bg-surface-card text-muted-foreground hover:border-border-strong hover:text-foreground',
      disabled && 'cursor-not-allowed opacity-60',
    );

  const toggleGroup = (setId: string) => {
    onChangeGroups(
      selectedGroupIds.includes(setId)
        ? selectedGroupIds.filter((id) => id !== setId)
        : [...selectedGroupIds, setId],
    );
  };

  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleLost}
          className={chipClass(includeLost)}
        >
          Lost
        </button>
        {stageSets.map((set) => {
          const selected = selectedGroupIds.includes(set.id);
          return (
            <button
              key={set.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleGroup(set.id)}
              className={chipClass(selected)}
            >
              <span className="truncate">{set.name || 'Untitled group'}</span>
              <Badge
                variant={selected ? 'brand' : 'muted'}
                className="px-1.5 py-0"
              >
                {set.stageIds.length}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricEditor({
  metric,
  stageSets,
  disabled,
  onChange,
  onRemove,
}: {
  metric: PipelineMetricDefinition;
  stageSets: PipelineMetricStageSet[];
  disabled?: boolean;
  onChange: (next: PipelineMetricDefinition) => void;
  onRemove: () => void;
}) {
  const setKind = (kind: PipelineMetricKind) => {
    if (kind === 'value_over_pipeline_target') {
      onChange({
        ...metric,
        kind,
        stageSetId: metric.stageSetId ?? stageSets[0]?.id ?? null,
        fromStageSetId: null,
        successStageSetId: null,
        alsoCount: [],
      });
      return;
    }
    const defaultFrom = metric.fromStageSetId ?? stageSets[0]?.id ?? null;
    const defaultSuccess =
      metric.successStageSetId ??
      stageSets.find((set) => set.id !== defaultFrom)?.id ??
      stageSets[1]?.id ??
      null;
    onChange({
      ...metric,
      kind,
      stageSetId: null,
      fromStageSetId: defaultFrom,
      successStageSetId: defaultSuccess,
      alsoCount: normalizeConversionAlsoCount(metric.alsoCount),
    });
  };

  const includeLost = includesLostCategoryInAlsoCount(metric.alsoCount);
  const selectedExitGroupIds = exitStageSetIdsFromAlsoCount(metric.alsoCount);
  const availableExitGroups = stageSets.filter(
    (set) =>
      set.id !== metric.fromStageSetId &&
      set.id !== metric.successStageSetId &&
      set.stageIds.length > 0,
  );

  const pruneExitGroups = (
    partial: Pick<
      PipelineMetricDefinition,
      'fromStageSetId' | 'successStageSetId'
    >,
  ) => {
    const nextGroupIds = selectedExitGroupIds.filter(
      (id) => id !== partial.fromStageSetId && id !== partial.successStageSetId,
    );
    return buildConversionAlsoCount(includeLost, nextGroupIds);
  };

  const updateDenominator = (
    nextIncludeLost: boolean,
    nextExitGroupIds: string[],
  ) => {
    onChange({
      ...metric,
      alsoCount: buildConversionAlsoCount(nextIncludeLost, nextExitGroupIds),
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <div className="flex items-center gap-2 border-b border-border bg-surface-elevated/40 px-3 py-2.5">
        <BarChart3 className="size-4 shrink-0 text-brand" aria-hidden />
        <Input
          value={metric.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...metric, name: e.target.value })}
          placeholder="KPI name"
          className="h-8 min-w-0 flex-1 border-border bg-surface-card text-sm"
        />
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-foreground">
          <Switch
            checked={metric.enabled}
            disabled={disabled}
            onCheckedChange={(enabled) => onChange({ ...metric, enabled })}
          />
          On
        </label>
        {!disabled ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove KPI"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-3 py-3">
        <div>
          <FieldLabel>Calculation</FieldLabel>
          <Select
            value={metric.kind}
            disabled={disabled}
            onValueChange={(value) => setKind(value as PipelineMetricKind)}
          >
            <SelectTrigger className="h-9 w-full border-border bg-surface-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {PIPELINE_METRIC_KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {metric.kind === 'value_over_pipeline_target' ? (
          <StageGroupSelect
            label="Stage group to measure"
            value={metric.stageSetId}
            stageSets={stageSets}
            disabled={disabled}
            placeholder="Select stage group"
            onValueChange={(value) =>
              onChange({ ...metric, stageSetId: value })
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <StageGroupSelect
                label="From group"
                value={metric.fromStageSetId}
                stageSets={stageSets}
                disabled={disabled}
                placeholder="Select group"
                onValueChange={(value) =>
                  onChange({
                    ...metric,
                    fromStageSetId: value,
                    alsoCount: pruneExitGroups({
                      fromStageSetId: value,
                      successStageSetId: metric.successStageSetId,
                    }),
                  })
                }
              />
              <div
                className="hidden shrink-0 pb-2 text-muted-foreground sm:block"
                aria-hidden
              >
                <ArrowRight className="size-4" />
              </div>
              <StageGroupSelect
                label="Target group"
                value={metric.successStageSetId}
                stageSets={stageSets}
                disabled={disabled}
                placeholder="Select group"
                onValueChange={(value) =>
                  onChange({
                    ...metric,
                    successStageSetId: value,
                    alsoCount: pruneExitGroups({
                      fromStageSetId: metric.fromStageSetId,
                      successStageSetId: value,
                    }),
                  })
                }
              />
            </div>

            <ExitOutcomePicker
              label="Other exit outcomes"
              includeLost={includeLost}
              stageSets={availableExitGroups}
              selectedGroupIds={selectedExitGroupIds}
              disabled={disabled}
              onToggleLost={() =>
                updateDenominator(!includeLost, selectedExitGroupIds)
              }
              onChangeGroups={(nextIds) =>
                updateDenominator(includeLost, nextIds)
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  action,
}: {
  icon: typeof Layers;
  title: string;
  action?: React.ReactNode;
}) {
  const Icon = icon;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function OptionalNumberInput({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setText(value != null ? String(value) : '');
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <div className="min-w-0 flex-1">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        placeholder={placeholder ?? 'Not set'}
        value={text}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit(text);
        }}
        onChange={(e) => {
          setText(e.target.value.replace(/\D/g, ''));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="mt-1.5 h-9 border-border bg-surface-card text-sm"
      />
    </div>
  );
}

function StageHistoryAnalyticsEditor({
  config,
  stageSets,
  disabled,
  onChange,
}: {
  config: PipelineStageHistoryAnalyticsConfig | null | undefined;
  stageSets: PipelineMetricStageSet[];
  disabled?: boolean;
  onChange: (next: PipelineStageHistoryAnalyticsConfig) => void;
}) {
  const analytics = normalizeStageHistoryAnalytics(config ?? {});

  const patch = (partial: Partial<PipelineStageHistoryAnalyticsConfig>) => {
    onChange(normalizeStageHistoryAnalytics({ ...analytics, ...partial }));
  };

  const patchSeverity = (
    key: 'highDays' | 'criticalDays',
    value: number | null,
  ) => {
    const current = analytics.stagnationLevelThresholds ?? {};
    const next = {
      ...current,
      ...(value != null ? { [key]: value } : {}),
    };
    if (value == null) {
      delete next[key];
    }
    const hasHigh = next.highDays != null;
    const hasCritical = next.criticalDays != null;
    patch({
      stagnationLevelThresholds:
        hasHigh || hasCritical
          ? {
              ...(hasHigh ? { highDays: next.highDays! } : {}),
              ...(hasCritical ? { criticalDays: next.criticalDays! } : {}),
            }
          : null,
    });
  };

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-card p-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stagnation
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <OptionalNumberInput
            label="Stagnation threshold (days)"
            value={analytics.stagnationThresholdDays}
            disabled={disabled}
            placeholder="e.g. 30"
            onChange={(value) => patch({ stagnationThresholdDays: value })}
          />
          <OptionalNumberInput
            label="High severity (days)"
            value={analytics.stagnationLevelThresholds?.highDays}
            disabled={disabled}
            placeholder="e.g. 60"
            onChange={(value) => patchSeverity('highDays', value)}
          />
          <OptionalNumberInput
            label="Critical severity (days)"
            value={analytics.stagnationLevelThresholds?.criticalDays}
            disabled={disabled}
            placeholder="e.g. 90"
            onChange={(value) => patchSeverity('criticalDays', value)}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reports
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <StageGroupSelect
            label="Drop analysis"
            value={analytics.dropAnalysisStageSetId}
            stageSets={stageSets}
            disabled={disabled || stageSets.length === 0}
            placeholder="Select group"
            onValueChange={(value) => patch({ dropAnalysisStageSetId: value })}
          />
          <StageGroupSelect
            label="Sales cycle start"
            value={analytics.salesCycleStartStageSetId}
            stageSets={stageSets}
            disabled={disabled || stageSets.length === 0}
            placeholder="Select group"
            onValueChange={(value) =>
              patch({ salesCycleStartStageSetId: value })
            }
          />
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  step,
  title,
  action,
}: {
  step: number;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">
          {step}
        </span>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {action}
    </div>
  );
}

export function CustomPipelineMetricsCard() {
  const canEdit = AccessGuard.checkAccess({ permissions: ['edit-settings'] });
  const settingsQuery = usePipelineSettings('DEAL');
  const updateSettings = useUpdatePipelineSettings();
  const stagesQuery = useDealStages();

  const stages = useMemo(
    () =>
      [...(stagesQuery.data ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          category: s.category,
        })),
    [stagesQuery.data],
  );

  const serverConfig = useMemo(
    () =>
      normalizeCustomPipelineMetrics(
        settingsQuery.data?.customPipelineMetrics ?? null,
      ),
    [settingsQuery.data?.customPipelineMetrics],
  );

  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<CustomPipelineMetricsConfig>(
    EMPTY_CUSTOM_PIPELINE_METRICS,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraft(serverConfig);
  }, [serverConfig]);

  const hasChanges = !configsEqual(draft, serverConfig);
  const isSaving = updateSettings.isLoading;
  const isLoading = settingsQuery.isLoading;

  const enabledMetrics = serverConfig.metrics.filter((m) => m.enabled).length;

  const addStageSet = () => {
    setDraft((prev) => ({
      ...prev,
      stageSets: [
        ...prev.stageSets,
        {
          id: createLocalId('set'),
          name: '',
          stageIds: [],
        },
      ],
    }));
  };

  const addMetric = () => {
    setDraft((prev) => ({
      ...prev,
      metrics: [
        ...prev.metrics,
        {
          id: createLocalId('metric'),
          name: '',
          kind: 'value_over_pipeline_target',
          enabled: true,
          stageSetId: prev.stageSets[0]?.id ?? null,
          fromStageSetId: null,
          successStageSetId: null,
          alsoCount: [],
        },
      ],
    }));
  };

  const handleReset = () => {
    setDraft(serverConfig);
    setFeedback(null);
  };

  const handleSave = async () => {
    setFeedback(null);
    const normalized = normalizeCustomPipelineMetrics(draft);
    const unnamedSet = normalized.stageSets.find((s) => !s.name.trim());
    if (unnamedSet) {
      setFeedback('Each stage group needs a name.');
      return;
    }
    const unnamedMetric = normalized.metrics.find((m) => !m.name.trim());
    if (unnamedMetric) {
      setFeedback('Each KPI needs a name.');
      return;
    }

    for (const metric of normalized.metrics) {
      if (!metric.enabled) continue;
      if (metric.kind === 'value_over_pipeline_target') {
        if (!metric.stageSetId) {
          setFeedback(
            `"${metric.name}" needs a stage group for pipeline achievement.`,
          );
          return;
        }
        const set = normalized.stageSets.find(
          (s) => s.id === metric.stageSetId,
        );
        if (!set?.stageIds.length) {
          setFeedback(`"${metric.name}" stage group has no stages selected.`);
          return;
        }
      }
      if (metric.kind === 'stage_exit_conversion') {
        if (!metric.fromStageSetId || !metric.successStageSetId) {
          setFeedback(
            `"${metric.name}" needs both a from group and a target group.`,
          );
          return;
        }
        const fromSet = normalized.stageSets.find(
          (s) => s.id === metric.fromStageSetId,
        );
        const targetSet = normalized.stageSets.find(
          (s) => s.id === metric.successStageSetId,
        );
        if (!fromSet?.stageIds.length || !targetSet?.stageIds.length) {
          setFeedback(
            `"${metric.name}" from/target groups must include at least one stage each.`,
          );
          return;
        }
        if (!conversionDenominatorConfigured(metric.alsoCount)) {
          setFeedback(
            `"${metric.name}" needs at least one other exit outcome (Lost or a group).`,
          );
          return;
        }
      }
    }

    const levelThresholds =
      normalized.stageHistoryAnalytics?.stagnationLevelThresholds;
    const highDays = levelThresholds?.highDays;
    const criticalDays = levelThresholds?.criticalDays;
    if (highDays != null || criticalDays != null) {
      if (highDays == null || criticalDays == null) {
        setFeedback(
          'Set both high and critical severity days, or leave both empty.',
        );
        return;
      }
      if (criticalDays <= highDays) {
        setFeedback('Critical severity must be greater than high severity.');
        return;
      }
      const stagnationThreshold =
        normalized.stageHistoryAnalytics?.stagnationThresholdDays;
      if (stagnationThreshold != null && highDays <= stagnationThreshold) {
        setFeedback(
          'High severity must be greater than the stagnation threshold.',
        );
        return;
      }
    }

    const payload: CustomPipelineMetricsConfig = {
      ...normalized,
      metrics: normalized.metrics.map((metric) =>
        metric.kind === 'stage_exit_conversion'
          ? {
              ...metric,
              alsoCount: normalizeConversionAlsoCount(metric.alsoCount),
            }
          : metric,
      ),
    };

    try {
      await updateSettings.mutateAsync({
        entityType: 'DEAL',
        customPipelineMetrics:
          payload.stageSets.length === 0 &&
          payload.metrics.length === 0 &&
          !hasStageHistoryAnalyticsConfig(payload.stageHistoryAnalytics)
            ? null
            : payload,
      });
      setFeedback('Saved.');
    } catch {
      setFeedback('Could not save. Try again.');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-elevated/60"
      >
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground">
            Custom pipeline metrics
          </h3>
          {!expanded ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {serverConfig.stageSets.length === 0 &&
              serverConfig.metrics.length === 0 &&
              !hasStageHistoryAnalyticsConfig(
                serverConfig.stageHistoryAnalytics,
              ) ? (
                <span className="text-[11px] text-muted-foreground">
                  Not configured
                </span>
              ) : (
                <>
                  {serverConfig.stageSets.length > 0 ? (
                    <Badge variant="outline">
                      {serverConfig.stageSets.length} group
                      {serverConfig.stageSets.length === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                  {serverConfig.metrics.length > 0 ? (
                    <Badge variant="outline">
                      {enabledMetrics} active KPI
                      {enabledMetrics === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                  {hasStageHistoryAnalyticsConfig(
                    serverConfig.stageHistoryAnalytics,
                  ) ? (
                    <Badge variant="outline">Stage history analytics</Badge>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-6 border-t border-border px-5 py-4">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <>
              <section className="space-y-3">
                <StepHeader
                  step={1}
                  title="Stage groups"
                  action={
                    canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={addStageSet}
                      >
                        <Plus className="size-3.5" />
                        Add group
                      </Button>
                    ) : null
                  }
                />
                {!draft.stageSets.length ? (
                  <EmptyPanel
                    icon={Layers}
                    title="Create groups of stages for your KPIs."
                    action={
                      canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 bg-brand text-xs text-brand-foreground hover:bg-brand-hover"
                          onClick={addStageSet}
                        >
                          <Plus className="size-3.5" />
                          Add first group
                        </Button>
                      ) : null
                    }
                  />
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {draft.stageSets.map((stageSet) => (
                      <StageSetEditor
                        key={stageSet.id}
                        stageSet={stageSet}
                        stages={stages}
                        disabled={!canEdit}
                        onChange={(next) =>
                          setDraft((prev) => ({
                            ...prev,
                            stageSets: prev.stageSets.map((s) =>
                              s.id === next.id ? next : s,
                            ),
                          }))
                        }
                        onRemove={() =>
                          setDraft((prev) => ({
                            ...prev,
                            stageSets: prev.stageSets.filter(
                              (s) => s.id !== stageSet.id,
                            ),
                            metrics: prev.metrics.map((m) => ({
                              ...m,
                              stageSetId:
                                m.stageSetId === stageSet.id
                                  ? null
                                  : m.stageSetId,
                              fromStageSetId:
                                m.fromStageSetId === stageSet.id
                                  ? null
                                  : m.fromStageSetId,
                              successStageSetId:
                                m.successStageSetId === stageSet.id
                                  ? null
                                  : m.successStageSetId,
                              alsoCount: (m.alsoCount ?? []).filter(
                                (o) =>
                                  !(
                                    o.type === 'stage_set' &&
                                    o.stageSetId === stageSet.id
                                  ),
                              ),
                            })),
                          }))
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                className={cn(
                  'space-y-3',
                  draft.stageSets.length === 0 && 'opacity-60',
                )}
              >
                <StepHeader
                  step={2}
                  title="KPIs"
                  action={
                    canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={addMetric}
                        disabled={draft.stageSets.length === 0}
                      >
                        <Plus className="size-3.5" />
                        Add KPI
                      </Button>
                    ) : null
                  }
                />
                {draft.stageSets.length === 0 ? (
                  <EmptyPanel
                    icon={BarChart3}
                    title="Add at least one stage group first."
                  />
                ) : !draft.metrics.length ? (
                  <EmptyPanel
                    icon={BarChart3}
                    title="Define a KPI using your stage groups."
                    action={
                      canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 bg-brand text-xs text-brand-foreground hover:bg-brand-hover"
                          onClick={addMetric}
                        >
                          <Plus className="size-3.5" />
                          Add first KPI
                        </Button>
                      ) : null
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {draft.metrics.map((metric) => (
                      <MetricEditor
                        key={metric.id}
                        metric={metric}
                        stageSets={draft.stageSets}
                        disabled={!canEdit}
                        onChange={(next) =>
                          setDraft((prev) => ({
                            ...prev,
                            metrics: prev.metrics.map((m) =>
                              m.id === next.id ? next : m,
                            ),
                          }))
                        }
                        onRemove={() =>
                          setDraft((prev) => ({
                            ...prev,
                            metrics: prev.metrics.filter(
                              (m) => m.id !== metric.id,
                            ),
                          }))
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                className={cn(
                  'space-y-3',
                  draft.stageSets.length === 0 && 'opacity-60',
                )}
              >
                <StepHeader step={3} title="Stage history analytics" />
                {draft.stageSets.length === 0 ? (
                  <EmptyPanel
                    icon={Layers}
                    title="Add at least one stage group to configure drop analysis and sales cycle."
                  />
                ) : (
                  <StageHistoryAnalyticsEditor
                    config={draft.stageHistoryAnalytics}
                    stageSets={draft.stageSets}
                    disabled={!canEdit}
                    onChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        stageHistoryAnalytics: next,
                      }))
                    }
                  />
                )}
              </section>

              {canEdit ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p
                    className={cn(
                      'text-[11px]',
                      feedback?.startsWith('Saved')
                        ? 'text-emerald-600'
                        : feedback
                          ? 'text-destructive'
                          : hasChanges
                            ? 'text-brand'
                            : 'text-muted-foreground',
                    )}
                  >
                    {feedback ??
                      (hasChanges ? 'Unsaved changes' : 'Up to date')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={!hasChanges || isSaving}
                      onClick={handleReset}
                    >
                      <X className="size-3.5" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 text-xs bg-brand text-brand-foreground hover:bg-brand-hover"
                      disabled={!hasChanges || isSaving}
                      onClick={() => void handleSave()}
                    >
                      <Save className="size-3.5" />
                      {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
