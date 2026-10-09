'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  FileSpreadsheet,
  FileText,
  Loader2,
  PieChart,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useGetClientById } from '@/store/server/features/tenant-management/clients/queries';
import { usePipelineFilterTree } from '@/store/server/features/deals/pipeline/filter-tree-queries';
import { useDealStages } from '@/store/server/features/deals/pipeline/queries';
import { useLeadStages } from '@/store/server/features/leads/pipeline/queries';
import { usePipelineSettings } from '@/store/server/features/pipeline/settings';
import {
  normalizeCustomPipelineMetrics,
  type CustomPipelineMetricsConfig,
} from '@/modules/pipeline/custom-pipeline-metrics';
import {
  useCatalogProducts,
  useProductFamilies,
  useProductPerformance,
} from '@/store/server/features/product-catalog/queries';
import { usePrmCatalogPartners } from '@/store/server/features/partners/usePrmCatalogPartners';
import {
  useGetPersonProgress,
  useGetPlanProgress,
  useGetSalesTargetPlans,
} from '@/store/server/features/salesTargeting/queries';
import { usePipelineSalesTargetProgress } from '@/hooks/usePipelineSalesTargetProgress';
import {
  usePipelineRoles,
  type PipelineRoleDto,
} from '@/store/server/features/pipeline-roles/queries';
import type { FilterTreeDepartment } from '@/store/server/features/deals/pipeline/filter-tree-queries';
import { useGetTenantCurrencies } from '@/store/server/features/tenant-management/tenant-currencies/queries';
import { useGetCustomers } from '@/store/server/features/customers/queries';
import { useGetVectors } from '@/store/server/features/vectors/queries';
import { currentFiscalSession } from './pipeline-filter';
import { usePipelineFiscalSessions } from './pipeline-filters';
import { buildPipelineReport, countActiveFilters } from './report/aggregate';
import { usePipelineStageAnalytics } from '@/store/server/features/pipeline/stage-analytics/queries';
import { exportPipelinePdf } from './report/export-pdf';
import { exportPipelineXlsx } from './report/export-xlsx';
import { loadReportRecords } from './report/load';
import { useReportExportScope } from '@/hooks/useReportExportScope';
import {
  defaultReportOrgFilters,
  findUserOrgContext,
  normalizeReportOrgFilters,
  resolveReportScopeNames,
  scopeAllLabel,
  scopeFilterTreeDepartments,
} from './report/scope-filters';
import {
  DEFAULT_PIPELINE_ROW_COLOR_MODE,
  loadPipelineRowColorMode,
  loadReportPreferences,
  pruneIds,
  saveReportPreferences,
  type PipelineRowColorMode,
} from './report/preferences';
import {
  buildAvailableReportColumns,
  resolveSelectedColumnIds,
} from './report/columns';
import {
  loadInactiveLostStageCustomFieldDefinitions,
  loadReportCustomFieldDefinitions,
} from './report/custom-fields';
import { resolveReportPeriodValue } from './report/period';
import {
  DEFAULT_REPORT_PERIOD_VALUE,
  type ReportPeriodValue,
} from './report/period-selection';
import { ReportPeriodPicker } from './report/ReportPeriodPicker';
import {
  filterReportColumnsByAccess,
  filterReportColumnIdsByAccess,
} from './report/report-field-access';
import {
  filterColumnIdsForScope,
  filterColumnsForScope,
  filterSectionsForScope,
} from './report/report-visibility';
import { ReportColumnsPanel } from './report/ReportColumnsPanel';
import { ReportPreview } from './report/ReportPreview';
import { ReportTreeMultiSelect } from './report/ReportTreeMultiSelect';
import {
  EMPTY_REPORT_FILTERS,
  REPORT_SECTION_IDS,
  type ReportCustomFieldColumn,
  type ReportFilters,
  type ReportSourcePayload,
  type SalesPipelineReportData,
} from './report/types';
import {
  fetchPipelineReportTargetProgress,
  pipelineReportRequestParams,
  usePipelineReportTargetProgress,
} from '@/store/server/features/reports/queries';

const ALL_SECTIONS = [...REPORT_SECTION_IDS];

/** Stable fallbacks — `data: x = []` in hooks creates a new array every render while loading. */
const EMPTY_PIPELINE_ROLES: PipelineRoleDto[] = [];
const EMPTY_DEPARTMENTS: FilterTreeDepartment[] = [];
const EMPTY_CUSTOM_FIELD_COLUMNS: ReportCustomFieldColumn[] = [];

function sameStringArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function sameCustomFieldColumns(
  a: ReportCustomFieldColumn[],
  b: ReportCustomFieldColumn[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (field, index) =>
        field.id === b[index]?.id && field.label === b[index]?.label,
    )
  );
}

function cloneFilters(filters: ReportFilters): ReportFilters {
  return {
    ownerIds: [...filters.ownerIds],
    teamIds: [...filters.teamIds],
    dealStageIds: [...filters.dealStageIds],
    productFamilyIds: [...filters.productFamilyIds],
    productIds: [...filters.productIds],
    vectorIds: [...filters.vectorIds],
    currencies: [...filters.currencies],
  };
}

export function PipelineReportButton({
  className,
}: {
  className?: string;
} = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="default"
        className={
          className ?? 'h-9 min-h-9 shrink-0 gap-1.5 text-[12px] leading-none'
        }
        onClick={() => setOpen(true)}
      >
        <PieChart size={14} />
        Report
      </Button>
      {open ? (
        <PipelineReportDialogContent open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}

function PipelineReportDialogContent({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const userPermissions = useAuthenticationStore(
    (state) => state.userData?.userPermissions ?? [],
  );
  const grantedPermissions = useMemo(() => {
    const slugs: string[] = [];
    for (const entry of userPermissions as Array<{
      permission?: { slug?: string };
    }>) {
      const slug = entry.permission?.slug;
      if (slug) slugs.push(slug);
    }
    return new Set<string>(slugs);
  }, [userPermissions]);
  const [view, setView] = useState<'configure' | 'preview'>('configure');
  const [periodValue, setPeriodValue] = useState<ReportPeriodValue>(
    DEFAULT_REPORT_PERIOD_VALUE,
  );
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [pipelineRowColorMode, setPipelineRowColorMode] =
    useState<PipelineRowColorMode>(DEFAULT_PIPELINE_ROW_COLOR_MODE);
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(
    cloneFilters(EMPTY_REPORT_FILTERS),
  );
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(
    cloneFilters(EMPTY_REPORT_FILTERS),
  );
  const [storedColumnIds, setStoredColumnIds] = useState<string[] | null>(null);
  const [knownColumnIds, setKnownColumnIds] = useState<string[] | null>(null);
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [dealCustomFields, setDealCustomFields] = useState(
    EMPTY_CUSTOM_FIELD_COLUMNS,
  );
  const [leadCustomFields, setLeadCustomFields] = useState(
    EMPTY_CUSTOM_FIELD_COLUMNS,
  );
  const [inactiveLostDealCustomFields, setInactiveLostDealCustomFields] =
    useState(EMPTY_CUSTOM_FIELD_COLUMNS);
  const [inactiveLostLeadCustomFields, setInactiveLostLeadCustomFields] =
    useState(EMPTY_CUSTOM_FIELD_COLUMNS);
  const [source, setSource] = useState<ReportSourcePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const { data: tenant } = useGetClientById(
    tenantId,
    Boolean(open && tenantId),
  );
  const { sessions, allSessions, fiscalYears } = usePipelineFiscalSessions();
  const periodSessions = allSessions.length ? allSessions : sessions;
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    if (prefsReady || !tenantId || !userId) return;
    const prefs = loadReportPreferences(tenantId, userId);
    if (prefs) {
      setExportFormat(prefs.exportFormat);
      setPipelineRowColorMode(
        prefs.pipelineRowColorMode ?? DEFAULT_PIPELINE_ROW_COLOR_MODE,
      );
      // Team filters always open at max access (no narrowing).
      const filters = {
        ...cloneFilters(prefs.filters),
        teamIds: [] as string[],
        ownerIds: [] as string[],
      };
      setDraftFilters(filters);
      setAppliedFilters(filters);
      setStoredColumnIds(prefs.selectedColumnIds);
      setKnownColumnIds(prefs.knownColumnIds);
    }
    setPrefsReady(true);
  }, [prefsReady, tenantId, userId]);

  useEffect(() => {
    if (!open || !tenantId || !userId) return;
    setPipelineRowColorMode(loadPipelineRowColorMode(tenantId, userId));
  }, [open, tenantId, userId]);

  // Load custom field definitions for Columns picker when dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadReportCustomFieldDefinitions().then((defs) => {
      if (cancelled) return;
      setDealCustomFields((current) =>
        sameCustomFieldColumns(current, defs.dealColumns)
          ? current
          : defs.dealColumns,
      );
      setLeadCustomFields((current) =>
        sameCustomFieldColumns(current, defs.leadColumns)
          ? current
          : defs.leadColumns,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reportScope = useReportExportScope();
  /** Prefer backend-resolved scope after records load; fall back to client scope. */
  const effectiveScopeLevel = source?.permissionScopeLevel ?? reportScope.level;

  const { data: pipelineRolesData } = usePipelineRoles({ enabled: open });
  const pipelineRoles = pipelineRolesData ?? EMPTY_PIPELINE_ROLES;
  const assignmentRoles = useMemo(
    () =>
      (Array.isArray(pipelineRoles) ? pipelineRoles : [])
        .filter((role) => role.active !== false && role.id)
        .sort(
          (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
            (a.name ?? '').localeCompare(b.name ?? ''),
        )
        .map((role) => ({
          id: role.id,
          label: role.name?.trim() || 'Unnamed role',
          isPrimary: role.isPrimary,
          countsTowardTargetAchievement: role.countsTowardTargetAchievement,
          displayOrder: role.displayOrder,
          usageContext: role.usageContext,
        })),
    [pipelineRoles],
  );

  const { data: leadStages = [] } = useLeadStages();
  const { data: dealStages = [] } = useDealStages();
  const pipelineSettingsQuery = usePipelineSettings('DEAL');
  const customPipelineMetrics =
    useMemo((): CustomPipelineMetricsConfig | null => {
      const raw = pipelineSettingsQuery.data?.customPipelineMetrics;
      if (!raw) return null;
      const normalized = normalizeCustomPipelineMetrics(raw);
      if (
        normalized.stageSets.length === 0 &&
        normalized.metrics.length === 0
      ) {
        return null;
      }
      return normalized;
    }, [pipelineSettingsQuery.data?.customPipelineMetrics]);
  const dealInactiveStageIds = useMemo(
    () =>
      dealStages
        .filter((stage) => stage.category === 'inactive')
        .map((stage) => stage.id)
        .filter(Boolean),
    [dealStages],
  );
  const dealLostStageIds = useMemo(
    () =>
      dealStages
        .filter((stage) => stage.category === 'lost')
        .map((stage) => stage.id)
        .filter(Boolean),
    [dealStages],
  );
  const leadLostStageIds = useMemo(
    () =>
      leadStages
        .filter((stage) => stage.category === 'lost')
        .map((stage) => stage.id)
        .filter(Boolean),
    [leadStages],
  );
  const dealInactiveLostStageIdsForColumns = useMemo(
    () => [...new Set([...dealInactiveStageIds, ...dealLostStageIds])],
    [dealInactiveStageIds, dealLostStageIds],
  );

  const availableColumns = useMemo(() => {
    const columns = buildAvailableReportColumns({
      dealCustomFields,
      leadCustomFields,
      inactiveLostDealCustomFields,
      inactiveLostLeadCustomFields,
      dealInactiveLostStageIds: dealInactiveLostStageIdsForColumns,
      leadInactiveLostStageIds: leadLostStageIds,
      assignmentRoles,
    });
    return filterReportColumnsByAccess(
      filterColumnsForScope(columns, effectiveScopeLevel),
      grantedPermissions,
    );
  }, [
    dealCustomFields,
    leadCustomFields,
    inactiveLostDealCustomFields,
    inactiveLostLeadCustomFields,
    dealInactiveLostStageIdsForColumns,
    leadLostStageIds,
    assignmentRoles,
    effectiveScopeLevel,
    grantedPermissions,
  ]);

  const allowedSections = useMemo(
    () => filterSectionsForScope(ALL_SECTIONS, effectiveScopeLevel),
    [effectiveScopeLevel],
  );

  // Sync custom field columns from loaded report payload when available.
  useEffect(() => {
    if (!source?.customFields) return;
    const nextDeal = source.customFields.dealColumns;
    const nextLead = source.customFields.leadColumns;
    const nextInactiveLostDeal = source.customFields.inactiveLostDealColumns;
    const nextInactiveLostLead = source.customFields.inactiveLostLeadColumns;
    setDealCustomFields((current) =>
      sameCustomFieldColumns(current, nextDeal) ? current : nextDeal,
    );
    setLeadCustomFields((current) =>
      sameCustomFieldColumns(current, nextLead) ? current : nextLead,
    );
    setInactiveLostDealCustomFields((current) =>
      sameCustomFieldColumns(current, nextInactiveLostDeal)
        ? current
        : nextInactiveLostDeal,
    );
    setInactiveLostLeadCustomFields((current) =>
      sameCustomFieldColumns(current, nextInactiveLostLead)
        ? current
        : nextInactiveLostLead,
    );
  }, [source]);

  // Resolve selection whenever available columns or stored prefs change.
  useEffect(() => {
    if (!prefsReady) return;
    let next = resolveSelectedColumnIds(
      availableColumns,
      storedColumnIds,
      knownColumnIds,
      { dealCustomFields, leadCustomFields },
    );
    next = filterColumnIdsForScope(next, availableColumns, effectiveScopeLevel);
    next = filterReportColumnIdsByAccess(next, grantedPermissions);
    setSelectedColumnIds((current) =>
      sameStringArray(current, next) ? current : next,
    );
  }, [
    prefsReady,
    availableColumns,
    storedColumnIds,
    knownColumnIds,
    effectiveScopeLevel,
    dealCustomFields,
    leadCustomFields,
    grantedPermissions,
  ]);

  const persistModalPreferences = (overrides?: {
    selectedColumnIds?: string[];
    exportFormat?: 'pdf' | 'xlsx';
  }) => {
    const nextIds = overrides?.selectedColumnIds ?? selectedColumnIds;
    const nextFormat = overrides?.exportFormat ?? exportFormat;
    const known = availableColumns.map((column) => column.id);
    saveReportPreferences(tenantId, userId, {
      exportFormat: nextFormat,
      filters: cloneFilters(draftFilters),
      selectedColumnIds: nextIds,
      knownColumnIds: known,
      pipelineRowColorMode,
    });
    setStoredColumnIds(nextIds);
    setKnownColumnIds(known);
  };

  const persistColumnPreferences = (nextIds: string[]) => {
    persistModalPreferences({ selectedColumnIds: nextIds });
  };

  const handleColumnSelectionChange = (ids: string[]) => {
    const nextIds = filterColumnIdsForScope(
      ids,
      availableColumns,
      effectiveScopeLevel,
    );
    setSelectedColumnIds(nextIds);
    persistColumnPreferences(nextIds);
  };

  const handleExportFormatChange = (format: 'pdf' | 'xlsx') => {
    setExportFormat(format);
    persistModalPreferences({ exportFormat: format });
  };

  // Every time Report opens, scope filters reset to maximum access defaults.
  useEffect(() => {
    if (!open || !prefsReady) return;
    const resetScopeFilters = (current: ReportFilters): ReportFilters => {
      if (!current.teamIds.length && !current.ownerIds.length) {
        return current;
      }
      return {
        ...current,
        teamIds: [],
        ownerIds: [],
      };
    };
    setDraftFilters(resetScopeFilters);
    setAppliedFilters(resetScopeFilters);
  }, [open, prefsReady]);

  const { data: departmentsData } = usePipelineFilterTree();
  const departments = departmentsData ?? EMPTY_DEPARTMENTS;
  const userOrg = useMemo(
    () =>
      findUserOrgContext(departments, userId, {
        allowedTeamIds: source?.allowedTeamIds,
      }),
    [departments, userId, source?.allowedTeamIds],
  );
  const scopedDepartments = useMemo(
    () =>
      scopeFilterTreeDepartments(departments, reportScope.level, {
        userTeamId: userOrg.teamId,
        userDepartmentId: userOrg.departmentId,
        userId,
      }),
    [
      departments,
      reportScope.level,
      userOrg.teamId,
      userOrg.departmentId,
      userId,
    ],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadInactiveLostStageCustomFieldDefinitions({
      dealInactiveStageIds,
      dealLostStageIds,
      leadLostStageIds,
    }).then((defs) => {
      if (cancelled) return;
      setInactiveLostDealCustomFields((current) =>
        sameCustomFieldColumns(current, defs.dealColumns)
          ? current
          : defs.dealColumns,
      );
      setInactiveLostLeadCustomFields((current) =>
        sameCustomFieldColumns(current, defs.leadColumns)
          ? current
          : defs.leadColumns,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, dealInactiveStageIds, dealLostStageIds, leadLostStageIds]);

  const { data: families = [] } = useProductFamilies();
  const { data: products = [] } = useCatalogProducts();
  // vendorId on solution lines is a PRM partner id after vendors→partners migration
  const { vendors = [] } = usePrmCatalogPartners();
  const { data: tenantCurrencies = [] } = useGetTenantCurrencies();
  const { data: vectorsData } = useGetVectors();
  const { data: customersData } = useGetCustomers(
    { page: 1, pageSize: 5000 },
    open,
  );
  const { kpi: targetKpi } = usePipelineSalesTargetProgress();
  const { data: plansData } = useGetSalesTargetPlans(fiscalYears[0]?.id, open);
  const plans = Array.isArray(plansData) ? plansData : [];
  const activePlan = plans[0];
  // Annual progress (no sessionId) for achievement legend targets.
  const { data: annualProgressData } = useGetPlanProgress(
    activePlan?.id,
    undefined,
    open && Boolean(activePlan?.id),
  );
  const annualProgress = Array.isArray(annualProgressData)
    ? annualProgressData
    : [];

  const customerVectorById = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const customer of customersData?.data ?? []) {
      map[customer.id] = customer.vectorId ?? customer.vector?.id ?? null;
    }
    return map;
  }, [customersData]);

  const teamGroups = useMemo(
    () =>
      scopedDepartments.flatMap((dept) =>
        (dept.teams ?? []).map((team) => ({
          id: team.id,
          name: team.name,
          children: (team.members ?? []).map((member) => ({
            id: member.id,
            name: member.name ?? member.selamnewId ?? 'Unnamed',
          })),
        })),
      ),
    [scopedDepartments],
  );

  const orgTeams = useMemo(
    () =>
      scopedDepartments.flatMap((dept) =>
        (dept.teams ?? []).map((team) => ({
          id: team.id,
          name: team.name,
          departmentId: dept.id,
          departmentName: dept.name,
          teamLeadId: team.teamLeadId ?? null,
          teamLeadName:
            team.members.find((member) => member.id === team.teamLeadId)
              ?.name ?? null,
        })),
      ),
    [scopedDepartments],
  );

  const reportScopeNames = useMemo(
    () =>
      resolveReportScopeNames({
        level: source?.permissionScopeLevel ?? reportScope.level,
        departments,
        userOrg,
        orgTeams,
        allowedTeamIds: source?.allowedTeamIds,
        teamId: source?.scopeTeamId,
        teamName: source?.scopeTeamName,
        departmentName: source?.scopeDepartmentName,
      }),
    [
      source?.permissionScopeLevel,
      source?.allowedTeamIds,
      source?.scopeTeamId,
      source?.scopeTeamName,
      source?.scopeDepartmentName,
      reportScope.level,
      departments,
      userOrg,
      orgTeams,
    ],
  );

  const ownerOrgs = useMemo(
    () =>
      scopedDepartments.flatMap((dept) =>
        (dept.teams ?? []).flatMap((team) =>
          (team.members ?? []).map((member) => ({
            userId: member.id,
            teamId: team.id,
            teamName: team.name,
            departmentName: dept.name,
          })),
        ),
      ),
    [scopedDepartments],
  );

  const reportVectors = useMemo(
    () =>
      (vectorsData?.data ?? []).map((vector) => ({
        id: vector.id,
        name: vector.name,
      })),
    [vectorsData],
  );

  useEffect(() => {
    if (!prefsReady) return;

    const allowedTeamIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).map((team) => team.id),
    );
    const allowedOwnerIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).flatMap((team) =>
        (team.members ?? []).map((member) => member.id),
      ),
    );

    const applyScopedDefaults = (
      current: ReportFilters,
    ): ReportFilters | null => {
      // Empty / invalid → maximum access for this permission level.
      const { teamIds, ownerIds } = normalizeReportOrgFilters(
        current,
        allowedTeamIds,
        allowedOwnerIds,
        reportScope.level,
        { userId, userTeamId: userOrg.teamId, expandMaxAccess: false },
      );

      if (
        teamIds.length === current.teamIds.length &&
        ownerIds.length === current.ownerIds.length &&
        teamIds.every((id, index) => id === current.teamIds[index]) &&
        ownerIds.every((id, index) => id === current.ownerIds[index])
      ) {
        return null;
      }

      return { ...current, teamIds, ownerIds };
    };

    setDraftFilters((current) => applyScopedDefaults(current) ?? current);
    setAppliedFilters((current) => applyScopedDefaults(current) ?? current);
  }, [
    prefsReady,
    reportScope.level,
    userId,
    userOrg.teamId,
    userOrg.departmentId,
    scopedDepartments,
  ]);

  useEffect(() => {
    if (periodValue.periodMode !== 'fiscal' || !periodSessions.length) return;
    const fiscalPeriod = periodValue.fiscalPeriod;
    if (fiscalPeriod.type === 'session') {
      const exists = periodSessions.some(
        (session) => session.id === fiscalPeriod.sessionId,
      );
      if (exists) return;
      const current = currentFiscalSession(periodSessions);
      if (current) {
        setPeriodValue((prev) => ({
          ...prev,
          fiscalPeriod: { type: 'session', sessionId: current.id },
        }));
      }
      return;
    }
    if (fiscalPeriod.type !== 'annual') return;
    if (fiscalPeriod.calendarId && fiscalYears.length) {
      const exists = fiscalYears.some(
        (year) => year.id === fiscalPeriod.calendarId,
      );
      if (!exists) {
        setPeriodValue((prev) => ({
          ...prev,
          fiscalPeriod: { type: 'annual' },
        }));
      }
    }
  }, [periodValue, periodSessions, fiscalYears]);

  useEffect(() => {
    if (!prefsReady) return;
    const allowedTeams = new Set(teamGroups.map((group) => group.id));
    const allowedOwners = new Set(
      teamGroups.flatMap((group) => group.children.map((child) => child.id)),
    );
    const same = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id, index) => id === b[index]);

    const pruneLoaded = (filters: ReportFilters): ReportFilters => {
      const next = {
        ...filters,
        teamIds: departments.length
          ? pruneIds(filters.teamIds, allowedTeams)
          : filters.teamIds,
        ownerIds: departments.length
          ? pruneIds(filters.ownerIds, allowedOwners)
          : filters.ownerIds,
      };
      if (
        same(next.teamIds, filters.teamIds) &&
        same(next.ownerIds, filters.ownerIds)
      ) {
        return filters;
      }
      return next;
    };

    setDraftFilters((current) => pruneLoaded(current));
    setAppliedFilters((current) => pruneLoaded(current));
  }, [prefsReady, departments.length, teamGroups]);

  const period = useMemo(
    () => resolveReportPeriodValue(periodValue, periodSessions, fiscalYears),
    [periodValue, periodSessions, fiscalYears],
  );

  const { data: wonPerformance } = useProductPerformance(
    period.sessionId,
    period.sessionIds?.join(','),
  );
  const personNameById = useMemo(() => {
    const map = new Map<string, { name: string; team: string }>();
    for (const dept of departments) {
      for (const team of dept.teams ?? []) {
        const leadId = team.teamLeadId?.trim();
        if (leadId) {
          const leadMember = team.members.find(
            (member) => member.id === leadId,
          );
          map.set(leadId, {
            name: leadMember?.name ?? leadMember?.selamnewId ?? 'Team Lead',
            team: team.name,
          });
        }
        for (const member of team.members ?? []) {
          map.set(member.id, {
            name: member.name ?? member.selamnewId ?? 'Unnamed',
            team: team.name,
          });
        }
      }
    }
    return map;
  }, [departments]);

  const userNameById = useMemo(
    () =>
      Object.fromEntries(
        Array.from(personNameById.entries()).map(([id, info]) => [
          id,
          info.name,
        ]),
      ),
    [personNameById],
  );

  const orgCounts = useMemo(
    () => ({
      departments: scopedDepartments.length,
      teams: scopedDepartments.reduce((n, d) => n + (d.teams ?? []).length, 0),
      members: scopedDepartments.reduce(
        (n, d) =>
          n + (d.teams ?? []).reduce((m, t) => m + (t.members ?? []).length, 0),
        0,
      ),
    }),
    [scopedDepartments],
  );

  const targetFetchFilters = useMemo(() => {
    if (!prefsReady) return null;
    const allowedTeamIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).map((team) => team.id),
    );
    const allowedOwnerIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).flatMap((team) =>
        (team.members ?? []).map((member) => member.id),
      ),
    );
    const org = normalizeReportOrgFilters(
      appliedFilters,
      allowedTeamIds,
      allowedOwnerIds,
      reportScope.level,
      { userId, userTeamId: userOrg.teamId, expandMaxAccess: true },
    );
    return { ...appliedFilters, ...org };
  }, [
    prefsReady,
    appliedFilters,
    scopedDepartments,
    reportScope.level,
    userId,
    userOrg.teamId,
  ]);

  const selectedTeamIdForTargets =
    targetFetchFilters?.teamIds.length === 1
      ? targetFetchFilters.teamIds[0]
      : undefined;
  const { data: personProgressData } = useGetPersonProgress(
    activePlan?.id,
    period.sessionId || selectedTeamIdForTargets
      ? {
          ...(period.sessionId ? { sessionId: period.sessionId } : {}),
          ...(selectedTeamIdForTargets
            ? { salesTeamId: selectedTeamIdForTargets }
            : {}),
        }
      : undefined,
    open && Boolean(activePlan?.id),
  );
  const personProgress = Array.isArray(personProgressData)
    ? personProgressData
    : [];

  const targetFetchParams = useMemo(
    () => (targetFetchFilters ? { period, filters: targetFetchFilters } : null),
    [period, targetFetchFilters],
  );

  const { data: scopedTargetInput } = usePipelineReportTargetProgress(
    targetFetchParams,
    open,
  );

  const legacyTargetInput = useMemo(() => {
    if (!targetKpi && !personProgress.length && !activePlan) return null;

    const currencyName = (currencyId: string) =>
      tenantCurrencies.find((item) => item.currencyId === currencyId)?.currency
        ?.name || currencyId;

    const annualProgressByCurrencyId = new Map(
      annualProgress.map((row) => [row.currencyId, row]),
    );
    if (activePlan?.currencyTargets?.length) {
      for (const line of activePlan.currencyTargets) {
        if (annualProgressByCurrencyId.has(line.currencyId)) continue;
        annualProgressByCurrencyId.set(line.currencyId, {
          planId: activePlan.id,
          calendarId: activePlan.calendarId,
          sessionId: null,
          currencyId: line.currencyId,
          companyTargetAmount: line.annualAmount ?? 0,
          companyAchievedAmount: 0,
          companyProgressPercent: 0,
          teams: [],
        });
      }
    }

    const annualCurrencyIds = activePlan?.currencyTargets?.length
      ? activePlan.currencyTargets.map((line) => line.currencyId)
      : [...annualProgressByCurrencyId.keys()];

    const annual = annualCurrencyIds.map((currencyId) => {
      const progress = annualProgressByCurrencyId.get(currencyId);
      const name = currencyName(currencyId);
      const kpiRow = targetKpi?.overall?.rows?.find(
        (row) => row.currency.toUpperCase() === name.toUpperCase(),
      );
      const planLine = activePlan?.currencyTargets?.find(
        (line) => line.currencyId === currencyId,
      );
      const target =
        progress?.companyTargetAmount ?? planLine?.annualAmount ?? 0;
      const achieved = progress?.companyAchievedAmount ?? kpiRow?.achieved ?? 0;
      const remaining =
        progress?.remainingTargetAmount ?? Math.max(0, target - achieved);
      return {
        currency: name,
        target,
        achieved,
        remaining,
      };
    });

    const annualTeams = annualProgress.flatMap((progress) =>
      (progress.teams ?? []).map((team) => ({
        id: team.teamId,
        name: team.teamName,
        currency: currencyName(progress.currencyId),
        target: team.targetAmount,
        achieved: team.achievedAmount,
        remaining: Math.max(0, team.targetAmount - team.achievedAmount),
      })),
    );

    return {
      periodLabel: targetKpi
        ? `${targetKpi.fiscalYear} Q${targetKpi.q}`
        : period.label,
      company:
        targetKpi?.overall?.rows?.map((row) => ({
          currency: row.currency,
          target: row.target,
          achieved: row.achieved,
        })) ?? [],
      teams:
        targetKpi?.teams?.flatMap((team) =>
          (team.rows ?? []).map((row) => ({
            id: team.teamId,
            name: team.teamName,
            currency: row.currency,
            target: row.target,
            achieved: row.achieved,
          })),
        ) ?? [],
      people: personProgress.map((row) => ({
        id: row.userId,
        name: personNameById.get(row.userId)?.name || row.userId,
        team: personNameById.get(row.userId)?.team || '',
        currency: currencyName(row.currencyId),
        target: row.targetAmount,
        achieved: row.achievedAmount,
      })),
      annual: annual.length ? annual : undefined,
      annualTeams: annualTeams.length ? annualTeams : undefined,
    };
  }, [
    targetKpi,
    personProgress,
    period.label,
    personNameById,
    tenantCurrencies,
    activePlan,
    annualProgress,
  ]);

  const orgTargetFiltered =
    (targetFetchFilters?.teamIds.length ?? 0) > 0 ||
    (targetFetchFilters?.ownerIds.length ?? 0) > 0;

  const teamMemberTargetPeople = useMemo(() => {
    if (!personProgress.length || !targetFetchFilters?.teamIds.length) {
      return [];
    }
    const teamLeadIds = new Set(
      orgTeams
        .filter((team) => targetFetchFilters.teamIds.includes(team.id))
        .map((team) => team.teamLeadId?.trim())
        .filter(Boolean) as string[],
    );
    const currencyName = (currencyId: string) =>
      tenantCurrencies.find((item) => item.currencyId === currencyId)?.currency
        ?.name || currencyId;
    return personProgress
      .filter((row) => !teamLeadIds.has(row.userId))
      .map((row) => ({
        id: row.userId,
        name: personNameById.get(row.userId)?.name || row.userId,
        team: personNameById.get(row.userId)?.team || '',
        currency: currencyName(row.currencyId),
        target: row.targetAmount,
        achieved: row.achievedAmount,
      }));
  }, [
    personProgress,
    targetFetchFilters?.teamIds,
    orgTeams,
    tenantCurrencies,
    personNameById,
  ]);

  // When a team/owner is selected, only use dashboard-aligned scoped targets —
  // legacy KPI data ignores report filters and would show the wrong scope.
  const targetInput = useMemo(() => {
    if (!scopedTargetInput) {
      return orgTargetFiltered ? null : legacyTargetInput;
    }
    if (!legacyTargetInput || orgTargetFiltered) {
      const people = scopedTargetInput.people?.length
        ? scopedTargetInput.people
        : teamMemberTargetPeople;
      return { ...scopedTargetInput, people };
    }
    // Company-scoped dashboard targets omit team/person rows — merge from KPI data
    // so rep performance can show split member targets and full team targets for leads.
    return {
      ...scopedTargetInput,
      teams: scopedTargetInput.teams?.length
        ? scopedTargetInput.teams
        : legacyTargetInput.teams,
      people: scopedTargetInput.people?.length
        ? scopedTargetInput.people
        : legacyTargetInput.people,
      annualTeams: scopedTargetInput.annualTeams?.length
        ? scopedTargetInput.annualTeams
        : legacyTargetInput.annualTeams,
    };
  }, [
    scopedTargetInput,
    legacyTargetInput,
    orgTargetFiltered,
    teamMemberTargetPeople,
  ]);

  const catalog = useMemo(
    () => ({
      leadStages,
      dealStages,
      products,
      families,
      vendors: vendors.map((vendor) => ({
        id: vendor.id,
        productFamilyIds: vendor.productFamilyIds,
      })),
      vendorNameById: Object.fromEntries(
        vendors.map((vendor) => [vendor.id, vendor.name]),
      ),
      wonByProductId: wonPerformance?.wonByProductId ?? {},
    }),
    [leadStages, dealStages, products, families, vendors, wonPerformance],
  );

  const stageAnalyticsQuery = usePipelineStageAnalytics({
    period,
    filters: targetFetchFilters ?? appliedFilters,
    enabled: open && Boolean(source) && targetFetchFilters != null,
  });

  const report: SalesPipelineReportData | null = useMemo(() => {
    if (!source) return null;
    return buildPipelineReport({
      source: {
        ...source,
        catalog,
        targets: source.targets ?? targetInput,
        companyName: tenant?.companyName || source.companyName,
        logoUrl: tenant?.logo || source.logoUrl,
        customerVectorById,
        orgTeams,
        ownerOrgs,
        vectors: reportVectors,
        userNameById,
        orgCounts,
        pipelineRowColorMode,
        assignmentRoles,
        customPipelineMetrics,
        reportViewerName: userOrg.memberName || source.reportViewerName || null,
        scopeDepartmentName:
          reportScopeNames.scopeDepartmentName ||
          source.scopeDepartmentName ||
          null,
        scopeTeamName:
          reportScopeNames.scopeTeamName || source.scopeTeamName || null,
        permissionScopeLabel: source.permissionScopeLabel ?? reportScope.label,
        permissionScopeLevel: source.permissionScopeLevel ?? reportScope.level,
        stageAnalytics: stageAnalyticsQuery.data ?? null,
      },
      period,
      filters: targetFetchFilters ?? appliedFilters,
      sections: allowedSections,
      selectedColumnIds: filterColumnIdsForScope(
        selectedColumnIds,
        availableColumns,
        effectiveScopeLevel,
      ),
    });
  }, [
    source,
    catalog,
    targetInput,
    tenant,
    period,
    appliedFilters,
    targetFetchFilters,
    customerVectorById,
    orgTeams,
    ownerOrgs,
    reportVectors,
    userNameById,
    orgCounts,
    pipelineRowColorMode,
    assignmentRoles,
    customPipelineMetrics,
    userOrg.memberName,
    userOrg.departmentName,
    userOrg.teamName,
    reportScopeNames.scopeDepartmentName,
    reportScopeNames.scopeTeamName,
    selectedColumnIds,
    availableColumns,
    effectiveScopeLevel,
    allowedSections,
    reportScope.label,
    reportScope.level,
    stageAnalyticsQuery.data,
  ]);

  const draftFilterCount = countActiveFilters(
    reportScope.level === 'company' || reportScope.level === 'department'
      ? draftFilters
      : reportScope.level === 'personal'
        ? { ...draftFilters, teamIds: [], ownerIds: [] }
        : draftFilters.teamIds.length === 1 &&
            draftFilters.teamIds[0] === userOrg.teamId &&
            draftFilters.ownerIds.length > 0
          ? { ...draftFilters, teamIds: [], ownerIds: [] }
          : draftFilters,
  );

  const sourceKeyRef = useRef<string>('');
  const targetsKeyRef = useRef<string>('');
  const cachedTargetsRef = useRef<
    ReportSourcePayload['targets'] | null | undefined
  >(undefined);
  const builtReportCacheRef = useRef<{
    key: string;
    report: SalesPipelineReportData;
  } | null>(null);

  const resetModal = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setView('configure');
      setSource(null);
      sourceKeyRef.current = '';
      targetsKeyRef.current = '';
      cachedTargetsRef.current = undefined;
      builtReportCacheRef.current = null;
      setExporting(null);
      setExportProgress(null);
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const allowedTeamIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).map((team) => team.id),
    );
    const allowedOwnerIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).flatMap((team) =>
        (team.members ?? []).map((member) => member.id),
      ),
    );

    const org = defaultReportOrgFilters(reportScope.level, {
      userId,
      userTeamId: userOrg.teamId,
      allowedTeamIds,
      allowedOwnerIds,
    });

    const next = {
      ...cloneFilters(EMPTY_REPORT_FILTERS),
      ...org,
    };

    setDraftFilters(next);
    setAppliedFilters(next);
  };

  const withNormalizedOrgFilters = (filters: ReportFilters): ReportFilters => {
    const allowedTeamIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).map((team) => team.id),
    );
    const allowedOwnerIds = scopedDepartments.flatMap((dept) =>
      (dept.teams ?? []).flatMap((team) =>
        (team.members ?? []).map((member) => member.id),
      ),
    );
    const org = normalizeReportOrgFilters(
      filters,
      allowedTeamIds,
      allowedOwnerIds,
      reportScope.level,
      { userId, userTeamId: userOrg.teamId, expandMaxAccess: true },
    );
    return { ...filters, ...org };
  };

  const ensureReport = async (
    filters: ReportFilters = appliedFilters,
    onProgress?: (message: string) => void,
  ): Promise<SalesPipelineReportData> => {
    const scopedFilters = withNormalizedOrgFilters(filters);
    const fetchKey = JSON.stringify(
      pipelineReportRequestParams({ period, filters: scopedFilters }),
    );
    const scopeLevelForColumns =
      source?.permissionScopeLevel ?? reportScope.level;
    const columnIdsForReport = filterColumnIdsForScope(
      selectedColumnIds,
      availableColumns,
      scopeLevelForColumns,
    );
    const reportCacheKey = `${fetchKey}|${columnIdsForReport.join(',')}|${allowedSections.join(',')}`;

    if (builtReportCacheRef.current?.key === reportCacheKey) {
      return builtReportCacheRef.current.report;
    }

    onProgress?.('Loading target progress…');
    const orgFiltered =
      scopedFilters.teamIds.length > 0 || scopedFilters.ownerIds.length > 0;
    let scopedTargets: ReportSourcePayload['targets'];
    if (
      targetsKeyRef.current === fetchKey &&
      cachedTargetsRef.current !== undefined
    ) {
      scopedTargets = cachedTargetsRef.current;
    } else {
      scopedTargets =
        (await fetchPipelineReportTargetProgress({
          period,
          filters: scopedFilters,
        })) ?? (orgFiltered ? null : targetInput);
      targetsKeyRef.current = fetchKey;
      cachedTargetsRef.current = scopedTargets;
    }
    const payload: ReportSourcePayload = {
      ...(source ?? { leads: [], deals: [] }),
      leads: source?.leads ?? [],
      deals: source?.deals ?? [],
      catalog,
      targets: scopedTargets,
      companyName: tenant?.companyName || '',
      logoUrl: tenant?.logo || null,
      sessions: periodSessions,
      fiscalYears,
      customerVectorById,
      orgTeams,
      ownerOrgs,
      vectors: reportVectors,
      userNameById,
      orgCounts,
      pipelineRowColorMode,
      assignmentRoles,
      customPipelineMetrics,
      reportViewerName: userOrg.memberName || null,
      scopeDepartmentName:
        source?.scopeDepartmentName ?? reportScopeNames.scopeDepartmentName,
      scopeTeamName: source?.scopeTeamName ?? reportScopeNames.scopeTeamName,
      scopeTeamId: source?.scopeTeamId,
      scopeDepartmentId: source?.scopeDepartmentId,
      allowedTeamIds: source?.allowedTeamIds,
      permissionScopeLabel: source?.permissionScopeLabel,
      permissionScopeLevel: source?.permissionScopeLevel,
    };
    if (!source || sourceKeyRef.current !== fetchKey) {
      builtReportCacheRef.current = null;
      onProgress?.('Loading pipeline records…');
      const records = await loadReportRecords(period, scopedFilters, {
        dealInactiveStageIds,
        dealLostStageIds,
        leadLostStageIds,
        selectedColumnIds: columnIdsForReport,
      });
      payload.leads = records.leads;
      payload.deals = records.deals;
      payload.permissionScopeLabel = records.scopeLabel;
      payload.permissionScopeLevel = records.scope.level;
      payload.allowedTeamIds = records.scope.allowedTeamIds;
      payload.scopeTeamId = records.scope.teamId ?? null;
      payload.scopeDepartmentId = records.scope.departmentId ?? null;
      payload.customFields = records.customFields;
      payload.lastActivityAtByDealId = records.lastActivityAtByDealId;
      payload.lastActivityAtByLeadId = records.lastActivityAtByLeadId;
      const resolvedScopeNames = resolveReportScopeNames({
        level: records.scope.level,
        departments,
        userOrg: findUserOrgContext(departments, userId, {
          allowedTeamIds: records.scope.allowedTeamIds,
        }),
        orgTeams,
        allowedTeamIds: records.scope.allowedTeamIds,
        teamId: records.scope.teamId,
        teamName: records.scope.teamName,
        departmentName: records.scope.departmentName,
      });
      payload.scopeDepartmentName =
        records.scope.departmentName ?? resolvedScopeNames.scopeDepartmentName;
      payload.scopeTeamName =
        records.scope.teamName ?? resolvedScopeNames.scopeTeamName;
      sourceKeyRef.current = fetchKey;
      setSource(payload);
    }
    const scopeLevel = payload.permissionScopeLevel ?? reportScope.level;
    onProgress?.('Building report…');
    const built = buildPipelineReport({
      source: payload,
      period,
      filters: scopedFilters,
      sections: filterSectionsForScope(ALL_SECTIONS, scopeLevel),
      selectedColumnIds: columnIdsForReport,
    });
    builtReportCacheRef.current = { key: reportCacheKey, report: built };
    return built;
  };

  const persistCurrentPrefs = (format: 'pdf' | 'xlsx' = exportFormat) => {
    persistModalPreferences({ exportFormat: format });
  };

  const handlePreview = async () => {
    setAppliedFilters(cloneFilters(draftFilters));
    setLoading(true);
    try {
      await ensureReport(draftFilters);
      persistCurrentPrefs();
      setView('preview');
    } catch (error) {
      toast.error('Unable to build preview', {
        description:
          error instanceof Error
            ? error.message
            : 'Pipeline data could not be loaded.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' = exportFormat) => {
    setExporting(format);
    setExportProgress('Preparing report…');
    setAppliedFilters(cloneFilters(draftFilters));
    try {
      const data = await ensureReport(draftFilters, setExportProgress);
      setExportProgress(
        format === 'pdf' ? 'Generating PDF…' : 'Generating workbook…',
      );
      if (format === 'pdf') await exportPipelinePdf(data);
      else await exportPipelineXlsx(data);
      persistCurrentPrefs(format);
      toast.success(
        format === 'pdf'
          ? 'Management PDF exported'
          : 'Analytical workbook exported',
        {
          description: `${data.meta.recordCount} permitted records · ${data.meta.periodLabel}`,
        },
      );
    } catch (error) {
      toast.error('Export failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Unable to export the pipeline report.',
      });
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">
            Sales Pipeline Report
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">
            Configure the reporting period and optional scope filters, then
            preview or export the full pipeline report. Access:{' '}
            <span className="font-medium text-foreground">
              {reportScope.label}
            </span>
            {reportScope.level === 'company'
              ? ' — all teams'
              : reportScope.level === 'department'
                ? ' — your department teams only'
                : reportScope.level === 'team'
                  ? ' — your team only'
                  : ' — your own records only'}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {view === 'preview' && report ? (
            <ReportPreview report={report} />
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <SectionHeading
                  title="Reporting period"
                  description="Fiscal year/session, a date preset, or a custom range"
                />
                <ReportPeriodPicker
                  value={periodValue}
                  onChange={setPeriodValue}
                  hideLabel
                />
              </section>

              <section className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <SectionHeading
                    title="Scope filters"
                    description="Narrow the report to specific teams or owners"
                  />
                  {draftFilterCount ? (
                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={resetFilters}
                    >
                      Reset ({draftFilterCount})
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                  <FilterField label="Team & owners">
                    <ReportTreeMultiSelect
                      groups={teamGroups}
                      parentIds={draftFilters.teamIds}
                      childIds={draftFilters.ownerIds}
                      onParentChange={(teamIds) =>
                        setDraftFilters((current) => ({
                          ...current,
                          teamIds,
                        }))
                      }
                      onChildChange={(ownerIds) =>
                        setDraftFilters((current) => ({
                          ...current,
                          ownerIds,
                        }))
                      }
                      allLabel={scopeAllLabel(reportScope.level)}
                      searchPlaceholder="Search teams or owners…"
                      emptyLabel={
                        reportScope.level === 'company'
                          ? 'No teams found'
                          : 'No teams in your access scope'
                      }
                    />
                  </FilterField>
                </div>
              </section>

              <ReportColumnsPanel
                columns={availableColumns}
                selectedIds={selectedColumnIds}
                onChange={handleColumnSelectionChange}
                exportFormat={exportFormat}
              />

              <section className="space-y-3">
                <SectionHeading
                  title="Export format"
                  description="PDF for management summaries · Excel for detailed analysis"
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormatCard
                    active={exportFormat === 'pdf'}
                    icon={<FileText size={16} />}
                    title="PDF"
                    description="Management summary"
                    onSelect={() => handleExportFormatChange('pdf')}
                  />
                  <FormatCard
                    active={exportFormat === 'xlsx'}
                    icon={<FileSpreadsheet size={16} />}
                    title="Excel"
                    description="Analytical workbook"
                    onSelect={() => handleExportFormatChange('xlsx')}
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col items-stretch gap-0 border-t border-border bg-surface-elevated/30 px-5 py-3">
          <div className="flex w-full flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-9 min-w-[96px]"
              onClick={() =>
                view === 'preview' ? setView('configure') : resetModal(false)
              }
              disabled={Boolean(exporting)}
            >
              {view === 'preview' ? 'Back' : 'Cancel'}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                className="h-9 min-w-[96px] gap-1.5"
                onClick={() => void handlePreview()}
                disabled={loading || Boolean(exporting)}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <PieChart size={14} />
                )}
                Preview
              </Button>
              <Button
                type="button"
                size="default"
                className="h-9 min-w-[118px] gap-1.5"
                onClick={() => void handleExport(exportFormat)}
                disabled={Boolean(exporting)}
              >
                {exporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : exportFormat === 'pdf' ? (
                  <FileText size={14} />
                ) : (
                  <FileSpreadsheet size={14} />
                )}
                Export {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
              </Button>
            </div>
          </div>
          {exportProgress ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {exportProgress}
            </p>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FormatCard({
  active,
  icon,
  title,
  description,
  onSelect,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-brand bg-brand-muted/40'
          : 'border-border bg-white hover:bg-surface-elevated',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          active
            ? 'bg-brand text-white'
            : 'bg-surface-elevated text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border',
          active
            ? 'border-brand bg-brand text-white'
            : 'border-border bg-white',
        )}
      >
        {active ? <Check size={10} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-[11px] font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
