'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { FormModalSkeleton } from '@/components/loading/skeleton-screens';
import {
  useGetCustomForecasts,
  useGetSalesTargetingSettings,
} from '@/store/server/features/salesTargeting/queries';
import {
  useDeleteCustomForecast,
  useUpdateCustomForecast,
  useUpdateSalesTargetingSettings,
} from '@/store/server/features/salesTargeting/mutations';
import { getCurrencyCode } from '@/store/server/features/salesTargeting/mappers';
import {
  ModuleEmptyState,
  TARGETS_PAGE_PADDING_CLASS,
  SALES_TARGETING_PAGE_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { cn } from '@/lib/utils';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import { ForecastManualForecastDialog } from '@/components/sales-targeting/ForecastManualForecastDialog';
import { buildTargetingTeamGroups } from '@/components/sales-targeting/targetingSectionHelpers';
import { WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL } from '@/components/sales-targeting/targetSettingMethod';
import {
  DateForecastConfig,
  TargetingForecastConfig,
  buildForecastInclusionPayload,
  getDefaultTargetingForecastConfig,
  mergeServerSettingsIntoForecastConfig,
  normalizeForecastConfigForWorkflow,
  resolveValueThresholdsForCurrency,
  setValueThresholdsForCurrency,
  syncFiscalYearIntoDateConfig,
} from '@/components/sales-targeting/targetingUtils';
import { useSalesTargeting } from '@/components/sales-targeting/SalesTargetingContext';
import { SalesTargetingCurrencyToolbar } from '@/components/sales-targeting/SalesTargetingCurrencyToolbar';
import { formatFiscalYearLabel } from '@/components/sales-targeting/targetLayout';
import {
  DateForecastConfigPanel,
  FORECAST_SETTINGS_CONTENT_CLASS,
  ForecastCollapsibleSection,
  ForecastMethodCard,
  ForecastSettingsToolbar,
  ManualForecastTable,
  StageForecastConfigPanel,
  ValueForecastConfigPanel,
} from '@/components/sales-targeting/forecastSettingsLayout';
import {
  canEditCompanyTargets,
  canEditForecast,
  resolveTargetDataScope,
} from '@/utils/dataScope';
import { TargetSettingMethodSettingsSection } from '@/components/sales-targeting/TargetSettingMethodSettingsSection';
import type {
  CustomForecast,
  ForecastInclusionConfig,
} from '@/store/server/features/salesTargeting/types';
export type SalesTargetingSettingsPanelMode = 'forecast' | 'planning-admin';

type SalesTargetingSettingsPanelProps = {
  onBack?: () => void;
  onSave?: () => void;
  /** Override manage gate. Defaults depend on panelMode. */
  canManage?: boolean;
  /** Hide standalone page chrome when hosted inside Enterprise Settings. */
  embedded?: boolean;
  /** forecast = inclusion rules in Targets; planning-admin = methods + sequencing in Settings. */
  panelMode?: SalesTargetingSettingsPanelMode;
};

export function SalesTargetingSettingsPanel({
  onBack,
  onSave,
  canManage: canManageProp,
  embedded = false,
  panelMode = 'forecast',
}: SalesTargetingSettingsPanelProps) {
  const isForecastMode = panelMode === 'forecast';
  const isPlanningAdminMode = panelMode === 'planning-admin';
  const dataScope = resolveTargetDataScope();
  const canManage =
    typeof canManageProp === 'boolean'
      ? canManageProp
      : isForecastMode
        ? canEditForecast()
        : canEditCompanyTargets();

  const {
    activeCurrencyCode,
    activePlanCurrency,
    fiscalCalendar,
    plan,
    planCurrencies,
    salesTeams,
  } = useSalesTargeting();
  const currencyCode = activeCurrencyCode || 'ETB';
  const currencyId = activePlanCurrency?.currencyId;

  const { data: serverSettings, isLoading } = useGetSalesTargetingSettings();
  const { data: leadStages = [] } = useLeadStages();
  const { data: dealStages = [] } = useDealStages();
  const updateSettings = useUpdateSalesTargetingSettings();
  const updateCustom = useUpdateCustomForecast();
  const deleteCustom = useDeleteCustomForecast();

  const [activeTab, setActiveTab] = useState<'forecast' | 'methods'>(
    isPlanningAdminMode ? 'methods' : 'forecast',
  );

  const { data: customForecasts = [], isLoading: customsLoading } =
    useGetCustomForecasts(
      { planId: plan?.id, currencyId },
      Boolean(plan?.id && currencyId),
    );

  const currencyOptions = useMemo(
    () =>
      planCurrencies.map((entry) => ({
        id: entry.currencyId,
        code: getCurrencyCode(entry),
      })),
    [planCurrencies],
  );

  const [config, setConfig] = useState<TargetingForecastConfig>(
    getDefaultTargetingForecastConfig(),
  );
  const [baseline, setBaseline] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    stage: false,
    value: false,
    date: false,
    manual: false,
  });

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingManualItem, setEditingManualItem] =
    useState<CustomForecast | null>(null);

  const manualTeamGroups = useMemo(
    () => buildTargetingTeamGroups(salesTeams),
    [salesTeams],
  );

  const hydrateConfig = useCallback(() => {
    let loaded = getDefaultTargetingForecastConfig();
    loaded = mergeServerSettingsIntoForecastConfig(loaded, serverSettings);
    loaded = syncFiscalYearIntoDateConfig(loaded, fiscalCalendar);
    return normalizeForecastConfigForWorkflow(loaded);
  }, [serverSettings, fiscalCalendar]);

  useEffect(() => {
    const loaded = hydrateConfig();
    setConfig(loaded);
    setBaseline(JSON.stringify(loaded));
  }, [hydrateConfig]);

  const hasChanges = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(config) !== baseline;
  }, [config, baseline]);

  const activeValueThresholds = useMemo(
    () => resolveValueThresholdsForCurrency(config.value, currencyCode),
    [config.value, currencyCode],
  );

  const sortedLeadStages = useMemo(
    () => [...leadStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [leadStages],
  );
  const sortedDealStages = useMemo(
    () => [...dealStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [dealStages],
  );
  const leadStageIds = useMemo(
    () => sortedLeadStages.map((s) => s.id),
    [sortedLeadStages],
  );
  const dealStageIds = useMemo(
    () => sortedDealStages.map((s) => s.id),
    [sortedDealStages],
  );

  const fiscalYearLabel = formatFiscalYearLabel(fiscalCalendar);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of salesTeams) {
      map.set(team.id, team.name);
    }
    return map;
  }, [salesTeams]);

  const manualTableItems = useMemo(
    () =>
      customForecasts.map((item) => ({
        id: item.id,
        name: item.opportunityName,
        amount: Number(item.forecastValue) || 0,
        period: item.periodLabel || fiscalYearLabel,
        department: item.department || undefined,
        team: teamNameById.get(item.salesTeamId) || item.salesTeamId,
        salesRep: item.ownerName || undefined,
        notes: item.notes || undefined,
        isActive: item.isActive !== false,
        createdAt: item.createdAt,
      })),
    [customForecasts, fiscalYearLabel, teamNameById],
  );

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    if (!baseline) return;
    setConfig(JSON.parse(baseline) as TargetingForecastConfig);
  };

  const handleSave = async () => {
    try {
      const inclusion = buildForecastInclusionPayload(config);
      await updateSettings.mutateAsync({
        forecastInclusionConfig: inclusion as ForecastInclusionConfig,
      });
      setBaseline(JSON.stringify(config));
      NotificationMessage.success({
        message: 'Forecast Settings Saved',
        description:
          'Inclusion methods are saved. Enabled methods combine with OR — matching any method includes the opportunity.',
      });
      onSave?.();
    } catch {
      NotificationMessage.error({
        message: 'Save Failed',
        description:
          'Could not persist forecast settings to the server. Check your connection and try again.',
      });
    }
  };

  const handleStageToggle = (
    stageId: string,
    currentIds: string[],
    allIds: string[],
    isLead: boolean,
  ) => {
    let next: string[];
    const allIncluded = currentIds.length === 0;

    if (allIncluded) {
      next = allIds.filter((id) => id !== stageId);
    } else if (currentIds.includes(stageId)) {
      next = currentIds.filter((id) => id !== stageId);
    } else {
      next = [...currentIds, stageId];
      if (next.length >= allIds.length) next = [];
    }

    setConfig((prev) => ({
      ...prev,
      stage: isLead
        ? { ...prev.stage, leadStageIds: next }
        : { ...prev.stage, dealStageIds: next },
    }));
  };

  const handleIncludeAllStages = (isLead: boolean) => {
    setConfig((prev) => ({
      ...prev,
      stage: isLead
        ? { ...prev.stage, leadStageIds: [] }
        : { ...prev.stage, dealStageIds: [] },
    }));
  };

  const handleExcludeAllStages = (isLead: boolean) => {
    setConfig((prev) => ({
      ...prev,
      stage: isLead
        ? { ...prev.stage, leadStageIds: ['none'] }
        : { ...prev.stage, dealStageIds: ['none'] },
    }));
  };

  const handleOpenAddManual = () => {
    if (!plan?.id || !currencyId) {
      NotificationMessage.error({
        message: 'Plan required',
        description:
          'Create a sales target plan for this fiscal year before adding manual forecasts.',
      });
      return;
    }
    setEditingManualItem(null);
    setIsManualModalOpen(true);
  };

  const handleOpenEditManual = (id: string) => {
    const item = customForecasts.find((row) => row.id === id);
    if (!item) return;
    setEditingManualItem(item);
    setIsManualModalOpen(true);
  };

  const handleDeleteManualItem = async (id: string) => {
    try {
      await deleteCustom.mutateAsync(id);
      NotificationMessage.success({
        message: 'Manual Forecast Removed',
        description: 'Deleted from the database.',
      });
    } catch {
      NotificationMessage.error({
        message: 'Delete Failed',
        description: 'Could not delete the manual forecast.',
      });
    }
  };

  const handleToggleManualActive = async (id: string, active: boolean) => {
    try {
      await updateCustom.mutateAsync({ id, isActive: active });
    } catch {
      NotificationMessage.error({
        message: 'Update Failed',
        description: 'Could not update active status.',
      });
    }
  };

  const settingsTabs = isPlanningAdminMode ? (
    <div className="-mb-px flex items-end gap-1 self-stretch">
      <button
        type="button"
        onClick={() => setActiveTab('methods')}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
          activeTab === 'methods'
            ? 'border-brand font-semibold text-brand'
            : 'border-transparent font-medium text-muted-foreground hover:border-border hover:text-foreground',
        )}
      >
        <Layers size={14} />
        Target Setting Methods
      </button>
    </div>
  ) : null;

  if (isLoading || customsLoading) {
    return (
      <div className={cn(!embedded && SALES_TARGETING_PAGE_CLASS)}>
        <ForecastSettingsToolbar
          onBack={onBack}
          hasChanges={false}
          canManage={canManage}
          isSaving={false}
          onReset={() => undefined}
          onSave={() => undefined}
          embedded={embedded}
          tabs={settingsTabs}
          title={isForecastMode ? 'Forecast rules' : 'Target planning'}
          showActions={isForecastMode && activeTab === 'forecast'}
        />
        <div className={embedded ? 'py-2' : TARGETS_PAGE_PADDING_CLASS}>
          <FormModalSkeleton fields={8} />
        </div>
      </div>
    );
  }

  const currencyControl =
    isForecastMode && activeTab === 'forecast' ? (
      <SalesTargetingCurrencyToolbar variant="inline" />
    ) : null;

  return (
    <div className={cn(!embedded && SALES_TARGETING_PAGE_CLASS)}>
      <ForecastSettingsToolbar
        onBack={onBack}
        hasChanges={isForecastMode && activeTab === 'forecast' && hasChanges}
        canManage={canManage}
        isSaving={updateSettings.isLoading}
        onReset={handleReset}
        onSave={() => void handleSave()}
        saveLabel="Save rules"
        title={isForecastMode ? 'Forecast rules' : 'Target planning'}
        currencyControl={currencyControl}
        embedded={embedded}
        tabs={settingsTabs}
        showActions={isForecastMode && activeTab === 'forecast'}
      />

      <div
        className={cn(embedded ? undefined : 'min-h-0 flex-1 overflow-y-auto')}
      >
        <div
          className={cn(
            FORECAST_SETTINGS_CONTENT_CLASS,
            embedded
              ? 'space-y-4 pt-4 pb-6'
              : cn(TARGETS_PAGE_PADDING_CLASS, 'space-y-4'),
          )}
        >
          {isPlanningAdminMode && activeTab === 'methods' ? (
            <TargetSettingMethodSettingsSection embedded />
          ) : (
            <>
              {!canManage ? (
                <ModuleEmptyState
                  title="View-only mode"
                  description="Forecast edit permission is required to modify forecast rules."
                />
              ) : null}

              {dataScope.level !== 'company' ? (
                <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Inclusion rules apply org-wide. Manual forecast lines can be
                  scoped to your team or personal assignments within your
                  permission level.
                </p>
              ) : null}

              <section className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    1. Forecast Methods
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Enabled methods combine with OR. Matching any active method
                    includes the opportunity, so enabling more methods widens
                    the forecast set.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ForecastMethodCard
                    title="Stage-Based"
                    enabled={config.stage.enabled}
                    disabled={!canManage}
                    onToggle={(enabled) =>
                      setConfig((prev) => ({
                        ...prev,
                        stage: { ...prev.stage, enabled },
                      }))
                    }
                  />
                  <ForecastMethodCard
                    title="Value-Based"
                    enabled={config.value.enabled}
                    disabled={!canManage}
                    onToggle={(enabled) =>
                      setConfig((prev) => ({
                        ...prev,
                        value: { ...prev.value, enabled },
                      }))
                    }
                  />
                  <ForecastMethodCard
                    title="Date-Based"
                    enabled={config.date.enabled}
                    disabled={!canManage}
                    onToggle={(enabled) =>
                      setConfig((prev) => ({
                        ...prev,
                        date: { ...prev.date, enabled },
                      }))
                    }
                  />
                  <ForecastMethodCard
                    title="Manual Forecast"
                    enabled={config.manual.enabled}
                    disabled={!canManage}
                    onToggle={(enabled) =>
                      setConfig((prev) => ({
                        ...prev,
                        manual: { ...prev.manual, enabled },
                      }))
                    }
                  />
                </div>
              </section>

              <ForecastCollapsibleSection
                title="2. Stage-Based Forecast Configuration"
                expanded={expandedSections.stage}
                enabled={config.stage.enabled}
                onToggle={() => toggleSection('stage')}
              >
                <StageForecastConfigPanel
                  leadStages={sortedLeadStages}
                  dealStages={sortedDealStages}
                  leadStageIds={config.stage.leadStageIds}
                  dealStageIds={config.stage.dealStageIds}
                  includeLeads={config.stage.includeLeads}
                  includeDeals={config.stage.includeDeals}
                  disabled={!canManage || !config.stage.enabled}
                  onIncludeLeadsChange={(includeLeads) =>
                    setConfig((prev) => ({
                      ...prev,
                      stage: { ...prev.stage, includeLeads },
                    }))
                  }
                  onIncludeDealsChange={(includeDeals) =>
                    setConfig((prev) => ({
                      ...prev,
                      stage: { ...prev.stage, includeDeals },
                    }))
                  }
                  onToggleLeadStage={(stageId) =>
                    handleStageToggle(
                      stageId,
                      config.stage.leadStageIds,
                      leadStageIds,
                      true,
                    )
                  }
                  onToggleDealStage={(stageId) =>
                    handleStageToggle(
                      stageId,
                      config.stage.dealStageIds,
                      dealStageIds,
                      false,
                    )
                  }
                  onIncludeAllLeads={() => handleIncludeAllStages(true)}
                  onExcludeAllLeads={() => handleExcludeAllStages(true)}
                  onIncludeAllDeals={() => handleIncludeAllStages(false)}
                  onExcludeAllDeals={() => handleExcludeAllStages(false)}
                />
              </ForecastCollapsibleSection>

              <ForecastCollapsibleSection
                title="3. Value-Based Forecast Configuration"
                expanded={expandedSections.value}
                enabled={config.value.enabled}
                onToggle={() => toggleSection('value')}
              >
                <ValueForecastConfigPanel
                  currencyCode={currencyCode}
                  minValue={activeValueThresholds.minValue}
                  maxValue={activeValueThresholds.maxValue}
                  source={config.value.source}
                  disabled={!canManage || !config.value.enabled}
                  onMinChange={(minValue) =>
                    setConfig((prev) => ({
                      ...prev,
                      value: setValueThresholdsForCurrency(
                        prev.value,
                        currencyCode,
                        {
                          minValue,
                          maxValue: resolveValueThresholdsForCurrency(
                            prev.value,
                            currencyCode,
                          ).maxValue,
                        },
                      ),
                    }))
                  }
                  onMaxChange={(maxValue) =>
                    setConfig((prev) => ({
                      ...prev,
                      value: setValueThresholdsForCurrency(
                        prev.value,
                        currencyCode,
                        {
                          minValue: resolveValueThresholdsForCurrency(
                            prev.value,
                            currencyCode,
                          ).minValue,
                          maxValue,
                        },
                      ),
                    }))
                  }
                  onSourceChange={(source) =>
                    setConfig((prev) => ({
                      ...prev,
                      value: { ...prev.value, source },
                    }))
                  }
                />
              </ForecastCollapsibleSection>

              <ForecastCollapsibleSection
                title="4. Date-Based Forecast Configuration"
                expanded={expandedSections.date}
                enabled={config.date.enabled}
                onToggle={() => toggleSection('date')}
              >
                <DateForecastConfigPanel
                  dateConfig={config.date}
                  disabled={!canManage || !config.date.enabled}
                  onDateConfigChange={(patch: Partial<DateForecastConfig>) =>
                    setConfig((prev) => ({
                      ...prev,
                      date: { ...prev.date, ...patch },
                    }))
                  }
                  onIncludeOverdueChange={(includeOverdue) =>
                    setConfig((prev) => ({
                      ...prev,
                      date: { ...prev.date, includeOverdue },
                    }))
                  }
                  onExcludeWithoutCloseDateChange={(excludeWithoutCloseDate) =>
                    setConfig((prev) => ({
                      ...prev,
                      date: { ...prev.date, excludeWithoutCloseDate },
                    }))
                  }
                  onSourceChange={(source) =>
                    setConfig((prev) => ({
                      ...prev,
                      date: { ...prev.date, source },
                    }))
                  }
                />
              </ForecastCollapsibleSection>

              <ForecastCollapsibleSection
                title="5. Manual Forecast & Target Definitions"
                expanded={expandedSections.manual}
                enabled={config.manual.enabled}
                onToggle={() => toggleSection('manual')}
                action={
                  canManage && config.manual.enabled ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenAddManual}
                      className="h-8 gap-1 bg-brand text-[11px] font-semibold text-white hover:bg-brand-hover"
                    >
                      <Plus className="size-3.5" />
                      {WORKFLOW_CUSTOM_OPPORTUNITY_ADD_LABEL}
                    </Button>
                  ) : null
                }
              >
                <ManualForecastTable
                  currencyCode={currencyCode}
                  items={manualTableItems}
                  disabled={!canManage || !config.manual.enabled || !plan?.id}
                  onAdd={handleOpenAddManual}
                  onEdit={handleOpenEditManual}
                  onToggleActive={handleToggleManualActive}
                  onDelete={(id) => void handleDeleteManualItem(id)}
                />
              </ForecastCollapsibleSection>
            </>
          )}
        </div>
      </div>

      <ForecastManualForecastDialog
        open={isManualModalOpen}
        onOpenChange={(open) => {
          setIsManualModalOpen(open);
          if (!open) setEditingManualItem(null);
        }}
        planId={plan?.id ?? null}
        currencyOptions={currencyOptions}
        defaultCurrencyId={currencyId || ''}
        currencyCode={currencyCode}
        teamGroups={manualTeamGroups}
        salesTeams={salesTeams}
        editingItem={editingManualItem}
      />
    </div>
  );
}
