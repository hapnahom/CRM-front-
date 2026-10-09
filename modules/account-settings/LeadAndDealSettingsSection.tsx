'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Target,
  Briefcase,
  Tag,
  Columns3,
  Users,
  FileText,
  GitBranch,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadsSettingsPage } from '../leads/lead-settings/LeadsSettingsPage';
import DealsSettingsView from '@/app/(afterLogin)/(deal)/deals/settings/DealsSettingsView';
import { EntityTypesSettingsTab } from '@/components/pipeline/EntityTypesSettingsTab';
import { CustomFieldsSettingsTab } from '@/components/pipeline/CustomFieldsSettingsTab';
import { AssignmentRolesSettingsTab } from '@/components/pipeline/AssignmentRolesSettingsTab';
import { PipelineReportSettingsTab } from '@/components/pipeline/PipelineReportSettingsTab';
import { settingsPath } from '@/lib/routes/settings';
import {
  formatEntityUsageParts,
  getSalesWorkflowMode,
  isLeadsEnabled,
  pipelineStagesSettingsTabLabel,
  resolveLeadDealSettingsTab,
  saveTenantSalesWorkflowMode,
  type SalesWorkflowMode,
} from '@/config/salesWorkflow';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { canEditSettings } from '@/utils/dataScope';
import { useOpportunityTypesSettings } from '@/store/server/features/opportunity-types/queries';
import {
  useCreateOpportunityType,
  useDeleteOpportunityType,
  useUpdateOpportunityType,
} from '@/store/server/features/opportunity-types/mutations';

export type LeadDealSettingsTab =
  | 'leads'
  | 'deals'
  | 'types'
  | 'custom-fields'
  | 'roles'
  | 'reports'
  | 'workflow';

interface LeadAndDealSettingsSectionProps {
  initialTab?: LeadDealSettingsTab;
}

function SalesWorkflowChoice() {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const canEdit = canEditSettings();
  const mode = getSalesWorkflowMode();

  const selectMode = (next: SalesWorkflowMode) => {
    if (!canEdit || !tenantId || next === mode) return;
    saveTenantSalesWorkflowMode(tenantId, next);
    window.location.reload();
  };

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="m-0 text-[13px] font-semibold text-foreground">
        Sales workflow
      </h3>
      <p className="m-0 mt-1 text-[12px] text-muted-foreground">
        Choose how this organization works with leads and deals. The choice
        applies across the app in this browser.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <WorkflowOption
          selected={mode === 'unified'}
          disabled={!canEdit || !tenantId}
          title="Unified opportunities"
          onSelect={() => selectMode('unified')}
        />
        <WorkflowOption
          selected={mode === 'classic'}
          disabled={!canEdit || !tenantId}
          title="Leads and deals"
          onSelect={() => selectMode('classic')}
        />
      </div>
    </section>
  );
}

function WorkflowOption({
  selected,
  disabled,
  title,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'rounded-lg border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-brand bg-brand-muted'
          : 'border-border bg-surface-elevated hover:border-brand/40',
        disabled && 'cursor-default opacity-70',
      )}
    >
      <span className="block text-[12px] font-semibold text-foreground">
        {title}
      </span>
    </button>
  );
}

export function LeadAndDealSettingsSection({
  initialTab = resolveLeadDealSettingsTab(undefined),
}: LeadAndDealSettingsSectionProps) {
  const router = useRouter();
  const showLeadsTab = isLeadsEnabled();
  const [activeTab, setActiveTab] = useState<LeadDealSettingsTab>(
    showLeadsTab ? initialTab : initialTab === 'leads' ? 'deals' : initialTab,
  );

  const opportunityTypesQuery = useOpportunityTypesSettings();
  const createOpportunityType = useCreateOpportunityType();
  const updateOpportunityType = useUpdateOpportunityType();
  const deleteOpportunityType = useDeleteOpportunityType();

  useEffect(() => {
    if (!initialTab) return;
    setActiveTab(
      showLeadsTab ? initialTab : initialTab === 'leads' ? 'deals' : initialTab,
    );
  }, [initialTab, showLeadsTab]);

  const selectTab = (tab: LeadDealSettingsTab) => {
    setActiveTab(tab);
    router.replace(settingsPath(tab), { scroll: false });
  };

  const pipelineStagesLabel = pipelineStagesSettingsTabLabel();
  const PipelineStagesIcon = showLeadsTab ? Briefcase : GitBranch;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center gap-1 border-b border-border">
        {showLeadsTab ? (
          <button
            type="button"
            onClick={() => selectTab('leads')}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
              activeTab === 'leads'
                ? 'border-brand font-semibold text-brand'
                : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            <Target size={14} />
            Leads
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => selectTab('deals')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'deals'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <PipelineStagesIcon size={14} />
          {pipelineStagesLabel}
        </button>

        <button
          type="button"
          onClick={() => selectTab('types')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'types'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <Tag size={14} />
          Types
        </button>

        <button
          type="button"
          onClick={() => selectTab('custom-fields')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'custom-fields'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <Columns3 size={14} />
          Custom fields
        </button>

        <button
          type="button"
          onClick={() => selectTab('roles')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'roles'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <Users size={14} />
          Assignment roles
        </button>

        <button
          type="button"
          onClick={() => selectTab('reports')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'reports'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText size={14} />
          Reports
        </button>

        <button
          type="button"
          onClick={() => selectTab('workflow')}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition-colors',
            activeTab === 'workflow'
              ? 'border-brand font-semibold text-brand'
              : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
          )}
        >
          <Workflow size={14} />
          Sales workflow
        </button>
      </div>

      <div>
        {showLeadsTab && activeTab === 'leads' ? (
          <LeadsSettingsPage embedded />
        ) : null}
        {activeTab === 'deals' && <DealsSettingsView embedded />}
        {activeTab === 'types' && (
          <EntityTypesSettingsTab
            types={(opportunityTypesQuery.data ?? []).map((type) => {
              const leadsCount = type.leadsCount ?? 0;
              const dealsCount = type.dealsCount ?? 0;
              const usageDetail = formatEntityUsageParts(
                leadsCount,
                dealsCount,
              );
              return {
                id: type.id,
                name: type.name,
                description: type.description ?? null,
                appliesTo: showLeadsTab ? (type.appliesTo ?? 'BOTH') : 'DEAL',
                category: type.category ?? 'SD',
                usageCount: type.usageCount ?? leadsCount + dealsCount,
                usageDetail: usageDetail || undefined,
              };
            })}
            isLoading={opportunityTypesQuery.isLoading}
            isSaving={
              createOpportunityType.isLoading ||
              updateOpportunityType.isLoading ||
              deleteOpportunityType.isLoading
            }
            onCreate={async ({ name, description, appliesTo, category }) => {
              await createOpportunityType.mutateAsync({
                name,
                description,
                appliesTo: showLeadsTab ? appliesTo : 'DEAL',
                category: showLeadsTab ? undefined : (category ?? 'SD'),
              });
            }}
            onUpdate={async (
              id,
              { name, description, appliesTo, category },
            ) => {
              await updateOpportunityType.mutateAsync({
                id,
                data: {
                  name,
                  description,
                  appliesTo: showLeadsTab ? appliesTo : 'DEAL',
                  category: showLeadsTab ? undefined : category,
                },
              });
            }}
            onDelete={async (id) => {
              await deleteOpportunityType.mutateAsync(id);
            }}
          />
        )}
        {activeTab === 'custom-fields' && <CustomFieldsSettingsTab />}
        {activeTab === 'roles' && <AssignmentRolesSettingsTab />}
        {activeTab === 'reports' && <PipelineReportSettingsTab />}
        {activeTab === 'workflow' && <SalesWorkflowChoice />}
      </div>
    </div>
  );
}
