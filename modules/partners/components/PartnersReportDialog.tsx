'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { ReportMultiSelect } from '@/modules/sales-pipeline/report/ReportMultiSelect';
import { ReportPeriodPicker } from '@/modules/sales-pipeline/report/ReportPeriodPicker';
import {
  DEFAULT_REPORT_PERIOD_VALUE,
  type ReportPeriodValue,
} from '@/modules/sales-pipeline/report/period-selection';
import { resolveReportPeriodValue } from '@/modules/sales-pipeline/report/period';
import { loadReportCustomFields } from '@/modules/sales-pipeline/report/custom-fields';
import { usePipelineFiscalSessions } from '@/modules/sales-pipeline/pipeline-filters';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { useGetClientById } from '@/store/server/features/tenant-management/clients/queries';
import {
  usePartners,
  usePartnerAccessScope,
} from '@/store/server/features/partners/queries';
import { fetchAllPipelineDeals } from '@/store/server/features/deals/pipeline/queries';
import { fetchAllPipelineLeads } from '@/store/server/features/leads/pipeline/queries';
import { usePipelineRoles } from '@/store/server/features/pipeline-roles/queries';
import { useProductFamilies } from '@/store/server/features/product-catalog/queries';
import { usePipelineFilterTree } from '@/store/server/features/deals/pipeline/filter-tree-queries';
import { useQuery } from 'react-query';
import { usePartnerRoles } from '../roles';
import { usePartnerTiers } from '../tiers';
import { usePartnerPartnershipTypes } from '../partnership-types';
import {
  buildPartnersReport,
  countPartnerReportFilters,
  primaryTypeRoleLabel,
} from '../report/aggregate';
import {
  exportPartnersReportPdf,
  exportPartnersReportXlsx,
} from '../report/export-report';
import { PartnersReportPreview } from '../report/PartnersReportPreview';
import {
  DEFAULT_PIPELINE_ROW_COLOR_MODE,
  loadPartnersPipelineRowColorMode,
} from '../report/preferences';
import {
  DEFAULT_PARTNER_REPORT_SECTIONS,
  EMPTY_PARTNER_REPORT_FILTERS,
  PARTNER_REPORT_SECTION_IDS,
  getPartnerReportSectionMeta,
  type PartnerReportFilters,
  type PartnerReportSectionId,
  type PartnersReportData,
} from '../report/types';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';
import type { CustomFieldDirectory } from '@/lib/pipeline/format-custom-field-value';
import type { ReportCustomFieldColumn } from '@/modules/sales-pipeline/report/types';

function cloneFilters(filters: PartnerReportFilters): PartnerReportFilters {
  return {
    statusIds: [...filters.statusIds],
    roleIds: [...filters.roleIds],
    partnershipTypeIds: [...filters.partnershipTypeIds],
    accountManagers: [...filters.accountManagers],
    productFamilyIds: [...filters.productFamilyIds],
  };
}

type PipelineSource = {
  deals: PipelineDeal[];
  leads: PipelineLead[];
  dealCustomFields: ReportCustomFieldColumn[];
  leadCustomFields: ReportCustomFieldColumn[];
  dealCustomValuesById: Map<string, Record<string, unknown>>;
  leadCustomValuesById: Map<string, Record<string, unknown>>;
  customFieldDirectory: CustomFieldDirectory;
};

/**
 * Partners Report — configure → preview → export PDF/Excel.
 * Sheets mirror vendor pipeline reference workbooks.
 */
export function PartnersReportDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'configure' | 'preview'>('configure');
  const [periodValue, setPeriodValue] = useState<ReportPeriodValue>(
    DEFAULT_REPORT_PERIOD_VALUE,
  );
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [draftFilters, setDraftFilters] = useState<PartnerReportFilters>(
    EMPTY_PARTNER_REPORT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<PartnerReportFilters>(
    EMPTY_PARTNER_REPORT_FILTERS,
  );
  const [sections, setSections] = useState<PartnerReportSectionId[]>(
    DEFAULT_PARTNER_REPORT_SECTIONS,
  );
  const [report, setReport] = useState<PartnersReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);

  const partnersQuery = usePartners({ pageSize: 500 });
  const partners = useMemo(
    () => partnersQuery.data?.partners ?? [],
    [partnersQuery.data?.partners],
  );
  const accessScopeQuery = usePartnerAccessScope();
  const accessScope = accessScopeQuery.data;
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const userId = useAuthenticationStore((state) => state.userId);
  const { data: tenant } = useGetClientById(tenantId);
  const { activeRoles, roles } = usePartnerRoles();
  const { activeTiers, tiers } = usePartnerTiers();
  const { activeTypes, types: partnershipTypes } = usePartnerPartnershipTypes();
  const familiesQuery = useProductFamilies();
  const productFamilies = familiesQuery.data ?? [];
  const { data: pipelineRolesData } = usePipelineRoles({ enabled: open });
  const { fiscalYears, sessions, allSessions } = usePipelineFiscalSessions();
  const periodSessions = allSessions.length ? allSessions : sessions;
  const { data: departmentsData } = usePipelineFilterTree();
  const departments = departmentsData ?? [];

  const userNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const dept of departments) {
      for (const team of dept.teams ?? []) {
        for (const member of team.members ?? []) {
          const name =
            member.name?.trim() ||
            member.selamnewId?.trim() ||
            member.email?.trim() ||
            '';
          if (member.id && name) map[member.id] = name;
        }
      }
    }
    return map;
  }, [departments]);

  const pipelineQuery = useQuery({
    queryKey: ['partners-report-pipeline', tenantId],
    queryFn: async (): Promise<PipelineSource> => {
      const [leads, deals] = await Promise.all([
        fetchAllPipelineLeads(),
        fetchAllPipelineDeals(),
      ]);
      // Request all pipeline custom values (headers alone are not enough —
      // without a selectedColumnIds hint, loadReportCustomFields skips values).
      const custom = await loadReportCustomFields({
        dealIds: deals.map((deal) => deal.id),
        leadIds: leads.map((lead) => lead.id),
        selectedColumnIds: ['total_pipeline.custom:_all'],
      });
      return {
        deals,
        leads,
        dealCustomFields: custom.dealColumns,
        leadCustomFields: custom.leadColumns,
        dealCustomValuesById: custom.dealValuesById,
        leadCustomValuesById: custom.leadValuesById,
        customFieldDirectory: custom.directory,
      };
    },
    enabled: Boolean(tenantId) && open,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const assignmentRoles = useMemo(
    () =>
      (Array.isArray(pipelineRolesData) ? pipelineRolesData : [])
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
          displayOrder: role.displayOrder,
          usageContext: role.usageContext,
        })),
    [pipelineRolesData],
  );

  const resolvedPeriod = useMemo(
    () => resolveReportPeriodValue(periodValue, periodSessions, fiscalYears),
    [periodValue, periodSessions, fiscalYears],
  );

  const statusOptions = useMemo(() => {
    const set = new Set(partners.map((p) => p.status).filter(Boolean));
    return [...set].sort().map((status) => ({ id: status, name: status }));
  }, [partners]);

  const roleOptions = useMemo(
    () => activeRoles.map((role) => ({ id: role.id, name: role.name })),
    [activeRoles],
  );

  const partnershipTypeOptions = useMemo(
    () =>
      activeTypes.map((type) => ({
        id: type.id,
        name: type.name,
      })),
    [activeTypes],
  );

  const primaryRoleName = useMemo(() => {
    const list = roles.length ? roles : activeRoles;
    const primary =
      list.find((role) => role.isPrimary && role.isActive !== false) ??
      list.find((role) => role.isActive !== false) ??
      list[0] ??
      null;
    return primary?.name?.trim() || 'Partner';
  }, [roles, activeRoles]);

  const primaryPartnershipTypeName = useMemo(() => {
    const list = partnershipTypes.length ? partnershipTypes : activeTypes;
    const primary =
      list.find((type) => type.isPrimary && type.isActive !== false) ?? null;
    return primary?.name?.trim() || '';
  }, [partnershipTypes, activeTypes]);

  const strategicVendorsSectionTitle = primaryTypeRoleLabel(
    primaryPartnershipTypeName,
    primaryRoleName,
  );

  const sectionMeta = useMemo(
    () =>
      getPartnerReportSectionMeta({
        primaryRoleName,
        primaryPartnershipTypeName,
      }),
    [primaryRoleName, primaryPartnershipTypeName],
  );

  const accountManagerOptions = useMemo(() => {
    const set = new Set(
      partners.map((p) => (p.accountManager || '').trim()).filter(Boolean),
    );
    return [...set].sort().map((name) => ({ id: name, name }));
  }, [partners]);

  const productFamilyOptions = useMemo(() => {
    const all = productFamilies
      .map((family) => ({ id: family.id, name: family.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (accessScope?.level !== 'product-family') return all;
    const allowed = new Set(accessScope.productFamilyIds);
    if (!allowed.size) {
      return (accessScope.productFamilies ?? []).map((family) => ({
        id: family.id,
        name: family.name,
      }));
    }
    return all.filter((family) => allowed.has(family.id));
  }, [productFamilies, accessScope]);

  const draftFilterCount = countPartnerReportFilters(draftFilters);

  const buildReport = (
    filters: PartnerReportFilters = appliedFilters,
    overrides?: {
      partners?: typeof partners;
      source?: PipelineSource | null;
    },
  ): PartnersReportData => {
    const selectedSections =
      sections.length > 0 ? sections : DEFAULT_PARTNER_REPORT_SECTIONS;
    const source = overrides?.source ?? pipelineQuery.data;
    if (!source) {
      throw new Error('Pipeline data is still loading. Try again in a moment.');
    }

    const scopedAccess =
      accessScope?.level === 'product-family'
        ? {
            accessScopeLabel: accessScope.scopeLabel,
            accessProductFamilyNames: (accessScope.productFamilies ?? []).map(
              (family) => family.name,
            ),
          }
        : {
            accessScopeLabel: null,
            accessProductFamilyNames: [] as string[],
          };

    const pipelineRowColorMode =
      tenantId && userId
        ? loadPartnersPipelineRowColorMode(tenantId, userId)
        : DEFAULT_PIPELINE_ROW_COLOR_MODE;

    return buildPartnersReport({
      partners: overrides?.partners ?? partners,
      roles: roles.length ? roles : activeRoles,
      tiers: tiers.length ? tiers : activeTiers,
      partnershipTypes: partnershipTypes.length
        ? partnershipTypes
        : activeTypes,
      deals: source.deals,
      leads: source.leads,
      assignmentRoles,
      dealCustomFields: source.dealCustomFields,
      leadCustomFields: source.leadCustomFields,
      dealCustomValuesById: source.dealCustomValuesById,
      leadCustomValuesById: source.leadCustomValuesById,
      customFieldDirectory: source.customFieldDirectory,
      sessions: periodSessions,
      fiscalYears,
      sessionIds: resolvedPeriod.sessionIds,
      filters,
      sections: selectedSections,
      periodLabel: resolvedPeriod.label,
      periodFrom: resolvedPeriod.from,
      periodTo: resolvedPeriod.to,
      companyName: tenant?.companyName || '',
      logoUrl: tenant?.logo || null,
      exportFiscalYear: resolvedPeriod.fiscalYear,
      exportQuarter: resolvedPeriod.quarter,
      userNameById,
      pipelineRowColorMode,
      productFamilies: productFamilies.map((family) => ({
        id: family.id,
        name: family.name,
        familyPartners: family.familyPartners,
      })),
      ...scopedAccess,
    });
  };

  const resetModal = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setView('configure');
      setReport(null);
      setExporting(null);
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const empty = cloneFilters(EMPTY_PARTNER_REPORT_FILTERS);
    setDraftFilters(empty);
    setAppliedFilters(empty);
  };

  const toggleSection = (id: PartnerReportSectionId) => {
    setSections((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      return [...PARTNER_REPORT_SECTION_IDS].filter(
        (sectionId) => sectionId === id || current.includes(sectionId),
      );
    });
  };

  const ensurePipelineSource = async (): Promise<PipelineSource> => {
    if (pipelineQuery.data) return pipelineQuery.data;
    const result = await pipelineQuery.refetch();
    if (!result.data) {
      throw new Error('Unable to load pipeline opportunities for the report.');
    }
    return result.data;
  };

  const handlePreview = async () => {
    setAppliedFilters(cloneFilters(draftFilters));
    setLoading(true);
    try {
      const source = await ensurePipelineSource();
      const data = buildReport(draftFilters, { source });
      setReport(data);
      setView('preview');
    } catch (error) {
      toast.error('Unable to build preview', {
        description:
          error instanceof Error
            ? error.message
            : 'Partner data could not be loaded.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' = exportFormat) => {
    setExporting(format);
    setAppliedFilters(cloneFilters(draftFilters));
    try {
      const [partnersResult, source] = await Promise.all([
        partnersQuery.refetch(),
        ensurePipelineSource(),
      ]);
      const data = buildReport(draftFilters, {
        partners: partnersResult.data?.partners ?? partners,
        source,
      });
      setReport(data);
      if (format === 'pdf') await exportPartnersReportPdf(data);
      else await exportPartnersReportXlsx(data);
      toast.success(
        format === 'pdf'
          ? 'Partners PDF exported'
          : 'Partners workbook exported',
        {
          description: `${data.meta.recordCount} partners · ${data.summary.pipelineRows} pipeline rows · ${data.summary.leadRows} originated · ${data.meta.periodLabel}`,
        },
      );
    } catch (error) {
      toast.error('Export failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Unable to export the partners report.',
      });
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    void pipelineQuery.refetch();
    // Prefetch pipeline + custom fields while configuring.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated prefetch only
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="default"
        className="h-9 min-h-9 shrink-0 gap-1.5 text-[12px] leading-none"
        onClick={() => setOpen(true)}
      >
        <PieChart size={14} />
        Report
      </Button>

      <Dialog open={open} onOpenChange={resetModal}>
        <DialogContent className="flex max-h-[min(92vh,820px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Partners Report
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              Configure the reporting period and partner scope, then preview or
              export. Sheets use your primary partner role
              {primaryPartnershipTypeName
                ? ` and ${primaryPartnershipTypeName} partnership type`
                : ''}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {view === 'preview' && report ? (
              <PartnersReportPreview report={report} />
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
                      description="Narrow the report to status, roles, partnership types, product families, or account managers"
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
                    <FilterField label="Status">
                      <ReportMultiSelect
                        items={statusOptions}
                        value={draftFilters.statusIds}
                        onChange={(statusIds) =>
                          setDraftFilters((current) => ({
                            ...current,
                            statusIds,
                          }))
                        }
                        allLabel="All statuses"
                        searchPlaceholder="Search statuses…"
                        emptyLabel="No statuses found"
                      />
                    </FilterField>
                    <FilterField label="Roles">
                      <ReportMultiSelect
                        items={roleOptions}
                        value={draftFilters.roleIds}
                        onChange={(roleIds) =>
                          setDraftFilters((current) => ({
                            ...current,
                            roleIds,
                          }))
                        }
                        allLabel="All roles"
                        searchPlaceholder="Search roles…"
                        emptyLabel="No roles found"
                      />
                    </FilterField>
                    <FilterField label="Partnership types">
                      <ReportMultiSelect
                        items={partnershipTypeOptions}
                        value={draftFilters.partnershipTypeIds}
                        onChange={(partnershipTypeIds) =>
                          setDraftFilters((current) => ({
                            ...current,
                            partnershipTypeIds,
                          }))
                        }
                        allLabel="All partnership types"
                        searchPlaceholder="Search partnership types…"
                        emptyLabel="No partnership types found"
                      />
                    </FilterField>
                    <FilterField label="Product families">
                      <ReportMultiSelect
                        items={productFamilyOptions}
                        value={draftFilters.productFamilyIds}
                        onChange={(productFamilyIds) =>
                          setDraftFilters((current) => ({
                            ...current,
                            productFamilyIds,
                          }))
                        }
                        allLabel="All product families"
                        searchPlaceholder="Search product families…"
                        emptyLabel="No product families found"
                      />
                    </FilterField>
                    <FilterField label="Account managers">
                      <ReportMultiSelect
                        items={accountManagerOptions}
                        value={draftFilters.accountManagers}
                        onChange={(accountManagers) =>
                          setDraftFilters((current) => ({
                            ...current,
                            accountManagers,
                          }))
                        }
                        allLabel="All account managers"
                        searchPlaceholder="Search account managers…"
                        emptyLabel="No account managers found"
                      />
                    </FilterField>
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionHeading
                    title="Report sections"
                    description="Choose which sheets to include in preview and export"
                  />
                  <div className="space-y-2 rounded-xl border border-border bg-white p-3">
                    {PARTNER_REPORT_SECTION_IDS.map((sectionId) => {
                      const meta = sectionMeta[sectionId];
                      const title =
                        sectionId === 'strategic_vendors'
                          ? strategicVendorsSectionTitle
                          : sectionId === 'vendor_pipeline'
                            ? primaryRoleName
                              ? `${primaryRoleName} Pipeline`
                              : meta.title
                            : sectionId === 'partner_lead_pipeline'
                              ? primaryRoleName
                                ? `${primaryRoleName} Lead Pipeline`
                                : meta.title
                              : meta.title;
                      const active = sections.includes(sectionId);
                      return (
                        <button
                          key={sectionId}
                          type="button"
                          onClick={() => toggleSection(sectionId)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                            active
                              ? 'border-brand bg-brand-muted/40'
                              : 'border-border hover:bg-surface-elevated',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                              active
                                ? 'border-brand bg-brand text-white'
                                : 'border-border bg-white',
                            )}
                          >
                            {active ? (
                              <Check size={10} strokeWidth={3} />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold text-foreground">
                              {title}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {meta.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

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
                      onSelect={() => setExportFormat('pdf')}
                    />
                    <FormatCard
                      active={exportFormat === 'xlsx'}
                      icon={<FileSpreadsheet size={16} />}
                      title="Excel"
                      description="Analytical workbook"
                      onSelect={() => setExportFormat('xlsx')}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border bg-surface-elevated/30 px-5 py-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-9 min-w-[96px]"
              onClick={() =>
                view === 'preview' ? setView('configure') : resetModal(false)
              }
            >
              {view === 'preview' ? 'Back' : 'Cancel'}
            </Button>
            <div className="flex items-center gap-2">
              {view === 'configure' ? (
                <Button
                  type="button"
                  size="default"
                  className="h-9 min-w-[120px]"
                  disabled={loading || pipelineQuery.isLoading}
                  onClick={() => void handlePreview()}
                >
                  {loading || pipelineQuery.isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Preview
                </Button>
              ) : (
                <Button
                  type="button"
                  size="default"
                  className="h-9 min-w-[140px]"
                  disabled={Boolean(exporting)}
                  onClick={() => void handleExport()}
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
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
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
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {children}
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
        'flex items-start gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-brand bg-brand-muted/40'
          : 'border-border hover:bg-surface-elevated',
      )}
    >
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-[12px] font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
