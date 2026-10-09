'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitFork, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NotificationMessage from '@/components/common/notification/notificationMessage';
import {
  PrimaryButton,
  TARGETS_CARD_CLASS,
  TARGETS_TABLE_HEAD_CLASS,
  TARGETS_TABLE_HEAD_ROW_CLASS,
} from '@/components/sales-targeting/ui-kit';
import { SettingsListSectionSkeleton } from '@/components/loading/skeleton-screens';
import {
  completionLabel,
  createEmptyTargetPrerequisiteRule,
  defaultRequiredCompletion,
  horizonLabel,
  normalizeTargetPrerequisites,
  validateTargetPrerequisites,
} from '@/components/sales-targeting/targetPrerequisiteUtils';
import { useGetDepartments } from '@/store/server/features/departments/queries';
import { useGetCrmTeams } from '@/store/server/features/teams/queries';
import { useGetSalesTargetingSettings } from '@/store/server/features/salesTargeting/queries';
import { useUpdateSalesTargetingSettings } from '@/store/server/features/salesTargeting/mutations';
import type {
  TargetPrerequisite,
  TargetPrerequisiteEntityType,
} from '@/store/server/features/salesTargeting/types';
import { canEditSettings, canViewSettings } from '@/utils/dataScope';

type TargetPrerequisitesSettingsSectionProps = {
  embedded?: boolean;
};

function entityOptions(
  type: TargetPrerequisiteEntityType,
  departments: Array<{ value: string; label: string }>,
  teams: Array<{ value: string; label: string; departmentId?: string | null }>,
) {
  return type === 'department' ? departments : teams;
}

function summarizeRule(
  rule: TargetPrerequisite,
  departmentById: Map<string, string>,
  teamById: Map<string, string>,
): string {
  const dependent =
    rule.blockedType === 'department'
      ? (departmentById.get(rule.blockedId) ?? 'Department')
      : (teamById.get(rule.blockedId) ?? 'Team');
  const prerequisiteNames =
    rule.requiredType === 'department'
      ? rule.requiredIds.map((id) => departmentById.get(id) ?? 'Department')
      : rule.requiredIds.map((id) => teamById.get(id) ?? 'Team');
  return `${dependent} → ${prerequisiteNames.join(', ')} (${horizonLabel(rule.level)})`;
}

export function TargetPrerequisitesSettingsSection({
  embedded = false,
}: TargetPrerequisitesSettingsSectionProps) {
  const canView = canViewSettings();
  const canEdit = canEditSettings();

  const { data: serverSettings, isLoading: settingsLoading } =
    useGetSalesTargetingSettings(canView);
  const { data: departmentsData, isLoading: departmentsLoading } =
    useGetDepartments(undefined, { enabled: canView });
  const { data: teamsData, isLoading: teamsLoading } = useGetCrmTeams({
    enabled: canView,
  });
  const updateSettings = useUpdateSalesTargetingSettings();

  const departmentOptions = useMemo(
    () =>
      (departmentsData?.data ?? [])
        .map((dept) => ({ value: dept.id, label: dept.name.trim() }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [departmentsData?.data],
  );

  const teamOptions = useMemo(
    () =>
      (teamsData?.data ?? [])
        .map((team) => ({
          value: team.id,
          label: team.name.trim(),
          departmentId: team.departmentId,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [teamsData?.data],
  );

  const departmentById = useMemo(
    () =>
      new Map(departmentOptions.map((option) => [option.value, option.label])),
    [departmentOptions],
  );
  const teamById = useMemo(
    () => new Map(teamOptions.map((option) => [option.value, option.label])),
    [teamOptions],
  );

  const [rules, setRules] = useState<TargetPrerequisite[]>([]);
  const [baseline, setBaseline] = useState('');

  useEffect(() => {
    const loaded = normalizeTargetPrerequisites(
      serverSettings?.targetPrerequisites,
    );
    setRules(loaded);
    setBaseline(JSON.stringify(loaded));
  }, [serverSettings?.targetPrerequisites]);

  const hasChanges = baseline !== JSON.stringify(rules);

  if (!canView) return null;

  if (settingsLoading || departmentsLoading || teamsLoading) {
    return (
      <section className={cn(TARGETS_CARD_CLASS, 'overflow-hidden p-5')}>
        <SettingsListSectionSkeleton rows={4} />
      </section>
    );
  }

  const updateRule = (index: number, patch: Partial<TargetPrerequisite>) => {
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  };

  const addRule = () => {
    setRules((current) => [...current, createEmptyTargetPrerequisiteRule()]);
  };

  const removeRule = (index: number) => {
    setRules((current) => current.filter((rule, i) => i !== index));
  };

  const handleSave = async () => {
    const validationError = validateTargetPrerequisites(rules);
    if (validationError) {
      NotificationMessage.error({
        message: 'Invalid dependency',
        description: validationError,
      });
      return;
    }

    try {
      const saved = await updateSettings.mutateAsync({
        targetPrerequisites: rules,
      });
      const next = normalizeTargetPrerequisites(saved.targetPrerequisites);
      setRules(next);
      setBaseline(JSON.stringify(next));
      NotificationMessage.success({
        message: 'Target sequencing saved',
        description: 'Dependency rules are now active for this tenant.',
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Could not save target sequencing settings';
      NotificationMessage.error({ message: 'Error', description: message });
    }
  };

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <GitFork className="size-4 rotate-90" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Target Sequencing & Precedence Rules
          </h3>
          <p className="max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
            Configure horizontal dependencies between departments and teams.
            Prerequisite targets must be established before dependent targets
            can be finalized. Vertical hierarchy is enforced automatically.
          </p>
        </div>
      </div>
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 self-start text-xs font-semibold sm:self-center"
          onClick={addRule}
        >
          <Plus className="h-3.5 w-3.5 text-brand" />
          Add dependency
        </Button>
      ) : null}
    </div>
  );

  const rulesContent =
    rules.length === 0 ? (
      <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <GitFork className="size-6 rotate-90" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          No horizontal dependencies configured
        </p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Add a rule when one department or team must wait for another to
          complete target setting.
        </p>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 h-8 gap-1.5 text-xs font-semibold"
            onClick={addRule}
          >
            <Plus className="h-3.5 w-3.5 text-brand" />
            Add First Dependency
          </Button>
        ) : null}
      </div>
    ) : (
      <div className="space-y-3">
        <div
          className={cn(
            TARGETS_TABLE_HEAD_ROW_CLASS,
            'hidden rounded-t-lg px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.2fr)_minmax(0,0.7fr)_auto]',
            'lg:items-center lg:gap-3',
          )}
        >
          <span className={TARGETS_TABLE_HEAD_CLASS}>Dependent</span>
          <span className="hidden lg:block" />
          <span className={TARGETS_TABLE_HEAD_CLASS}>Prerequisite</span>
          <span className={TARGETS_TABLE_HEAD_CLASS}>Horizon</span>
          <span className={TARGETS_TABLE_HEAD_CLASS}> </span>
        </div>

        {rules.map((rule, index) => {
          const dependentOptions = entityOptions(
            rule.blockedType,
            departmentOptions,
            teamOptions,
          );
          const prerequisiteOptions = entityOptions(
            rule.requiredType,
            departmentOptions,
            teamOptions,
          );

          return (
            <article
              key={`target-seq-${index}`}
              className="rounded-lg border border-border bg-surface-elevated/40 p-4"
            >
              <p className="mb-3 text-[11px] font-medium text-muted-foreground lg:hidden">
                {summarizeRule(rule, departmentById, teamById)}
              </p>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.2fr)_minmax(0,0.7fr)_auto] lg:items-start lg:gap-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:sr-only">
                    Dependent
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={rule.blockedType}
                      onValueChange={(blockedType) =>
                        updateRule(index, {
                          blockedType:
                            blockedType as TargetPrerequisiteEntityType,
                          blockedId: '',
                        })
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-9 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.blockedId || undefined}
                      onValueChange={(blockedId) =>
                        updateRule(index, { blockedId })
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-9 text-[12px]">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        {dependentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="hidden items-center justify-center pt-6 lg:flex">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:sr-only">
                    Prerequisite
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={rule.requiredType}
                      onValueChange={(requiredType) =>
                        updateRule(index, {
                          requiredType:
                            requiredType as TargetPrerequisiteEntityType,
                          requiredIds: [],
                          requiredCompletion: defaultRequiredCompletion(
                            requiredType as TargetPrerequisiteEntityType,
                          ),
                        })
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-9 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>

                    {rule.requiredType === 'department' ? (
                      <Select
                        value={rule.requiredIds[0] || undefined}
                        onValueChange={(requiredId) =>
                          updateRule(index, { requiredIds: [requiredId] })
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-9 text-[12px]">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {prerequisiteOptions
                            .filter(
                              (option) =>
                                !(
                                  rule.blockedType === 'department' &&
                                  option.value === rule.blockedId
                                ),
                            )
                            .map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="flex h-9 items-center rounded-md border border-border bg-surface-card px-3 text-[11px] text-muted-foreground">
                        Select teams below
                      </p>
                    )}
                  </div>

                  {rule.requiredType === 'department' ? (
                    <Select
                      value={rule.requiredCompletion}
                      onValueChange={(requiredCompletion) =>
                        updateRule(index, {
                          requiredCompletion:
                            requiredCompletion as TargetPrerequisite['requiredCompletion'],
                        })
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-9 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department_target">
                          Department target is set
                        </SelectItem>
                        <SelectItem value="all_team_targets">
                          All teams in department have targets
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-md border border-border bg-surface-card p-2">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Prerequisite teams
                      </p>
                      <div className="max-h-32 space-y-1 overflow-y-auto">
                        {teamOptions
                          .filter(
                            (option) =>
                              !(
                                rule.blockedType === 'team' &&
                                option.value === rule.blockedId
                              ),
                          )
                          .map((option) => {
                            const checked = rule.requiredIds.includes(
                              option.value,
                            );
                            return (
                              <label
                                key={option.value}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-muted/40"
                              >
                                <input
                                  type="checkbox"
                                  className="size-3.5 accent-brand"
                                  checked={checked}
                                  disabled={!canEdit}
                                  onChange={() => {
                                    const next = checked
                                      ? rule.requiredIds.filter(
                                          (id) => id !== option.value,
                                        )
                                      : [...rule.requiredIds, option.value];
                                    updateRule(index, {
                                      requiredIds: next,
                                      requiredCompletion: 'each_team_target',
                                    });
                                  }}
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:sr-only">
                    Horizon
                  </p>
                  <Select
                    value={rule.level}
                    onValueChange={(level) =>
                      updateRule(index, {
                        level: level as TargetPrerequisite['level'],
                      })
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-9 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="session">Period</SelectItem>
                      <SelectItem value="both">Annual & period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {canEdit ? (
                  <div className="flex justify-end lg:pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeRule(index)}
                      aria-label="Remove dependency"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <p className="mt-3 hidden text-[11px] text-muted-foreground lg:block">
                {summarizeRule(rule, departmentById, teamById)} ·{' '}
                {completionLabel(rule.requiredType, rule.requiredCompletion)}
              </p>
            </article>
          );
        })}
      </div>
    );

  const saveFooter =
    canEdit && rules.length > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/60 px-5 py-3.5">
        <span className="text-xs font-medium text-muted-foreground">
          {rules.length}{' '}
          {rules.length === 1 ? 'dependency rule' : 'dependency rules'}{' '}
          configured
        </span>
        <PrimaryButton
          type="button"
          size="sm"
          disabled={!hasChanges || updateSettings.isLoading}
          onClick={() => void handleSave()}
          className="h-8 gap-1.5 rounded-md px-3 text-[12px] font-semibold shadow-xs"
        >
          Save sequencing
        </PrimaryButton>
      </div>
    ) : !canEdit ? (
      <p className="px-5 pb-4 text-[11px] text-muted-foreground">
        Edit settings permission is required to modify target sequencing.
      </p>
    ) : null;

  if (embedded) {
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <div className="border-b border-border/80 px-5 py-4">{header}</div>
        <div className="px-5 py-4">{rulesContent}</div>
        {saveFooter}
      </section>
    );
  }

  return (
    <section className={cn(TARGETS_CARD_CLASS, 'space-y-4 p-5')}>
      {header}
      {rulesContent}
      {canEdit && rules.length > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <PrimaryButton
            type="button"
            size="sm"
            disabled={!hasChanges || updateSettings.isLoading}
            onClick={() => void handleSave()}
          >
            Save sequencing
          </PrimaryButton>
        </div>
      ) : !canEdit ? (
        <p className="text-[11px] text-muted-foreground">
          Edit settings permission is required to modify target sequencing.
        </p>
      ) : null}
    </section>
  );
}
