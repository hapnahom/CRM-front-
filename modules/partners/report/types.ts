import type { ReportCustomFieldColumn } from '@/modules/sales-pipeline/report/types';

export const PARTNER_REPORT_SECTION_IDS = [
  'target_vs_achievement',
  'partners_chart',
  'vendor_pipeline',
  'strategic_vendors',
  'partner_lead_pipeline',
] as const;

export type PartnerReportSectionId =
  (typeof PARTNER_REPORT_SECTION_IDS)[number];

export const DEFAULT_PARTNER_REPORT_SECTIONS: PartnerReportSectionId[] = [
  ...PARTNER_REPORT_SECTION_IDS,
];

/** Section picker labels — derived from configured primary role / partnership type. */
export function getPartnerReportSectionMeta(options?: {
  primaryRoleName?: string | null;
  primaryPartnershipTypeName?: string | null;
}): Record<PartnerReportSectionId, { title: string; description: string }> {
  const role = options?.primaryRoleName?.trim() || 'Partner';
  const type = options?.primaryPartnershipTypeName?.trim() || 'Primary type';
  return {
    target_vs_achievement: {
      title: 'Target vs Achievement',
      description: `${role} partners with targets, open pipeline, and won achievement`,
    },
    partners_chart: {
      title: `${type} partners chart`,
      description: `Pipeline stage pies for ${role} partners on the ${type} partnership type`,
    },
    vendor_pipeline: {
      title: `${role} Pipeline`,
      description: `One row per solution involvement for ${role} partners`,
    },
    strategic_vendors: {
      title: `${type} ${role}s`,
      description: `Same pipeline table limited to ${type} partners`,
    },
    partner_lead_pipeline: {
      title: `${role} Lead Pipeline`,
      description:
        'Opportunities originated by partners (originator type Partner)',
    },
  };
}

export type PartnerReportFilters = {
  statusIds: string[];
  roleIds: string[];
  partnershipTypeIds: string[];
  accountManagers: string[];
  productFamilyIds: string[];
};

export const EMPTY_PARTNER_REPORT_FILTERS: PartnerReportFilters = {
  statusIds: [],
  roleIds: [],
  partnershipTypeIds: [],
  accountManagers: [],
  productFamilyIds: [],
};

export type PartnerReportAssignmentRole = {
  id: string;
  label: string;
  isPrimary?: boolean;
  displayOrder?: number;
  usageContext?: 'ENTITY' | 'SOLUTION';
};

export type PartnerReportCustomFieldColumn = ReportCustomFieldColumn & {
  /** When deal/lead fields share a label, the opposite entity's field id. */
  pairedFieldId?: string | null;
};

export type PartnerReportStageSlice = {
  id: string;
  label: string;
  value: number;
  share: number;
  color: string;
  count: number;
};

export type PartnerReportTargetRow = {
  id: string;
  name: string;
  target: number;
  pipeline: number;
  achievement: number;
  partnershipLevel: string;
  nextPartnershipTarget: string;
  tierColor: string;
};

export type PartnerReportChartPartner = {
  id: string;
  name: string;
  pipeline: number;
  stages: PartnerReportStageSlice[];
};

/** One row per partner solution involvement on a deal/lead. */
export type PartnerPipelineRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  rowNumber: number;
  opportunityType: string;
  customerName: string;
  dealName: string;
  stage: string;
  stageColor: string;
  stageCategory: 'open' | 'won' | 'lost' | 'inactive' | 'other';
  dealRegistrationStatus: string;
  roleValues: Record<string, string>;
  value: number;
  currency: string;
  fiscalYear: string;
  quarter: string;
  customValues: Record<string, string>;
  productFamilyId: string;
  productFamilyName: string;
  recordType: 'Deal' | 'Lead';
  opportunityId: string;
};

export type PartnerLeadPipelineRow = {
  id: string;
  leadId: string;
  partnerName: string;
  clientName: string;
  solutionArea: string;
  estimatedValue: number | null;
  stage: string;
  stageColor: string;
  report: string;
  nextAction: string;
  blockers: string;
  customValues: Record<string, string>;
  recordType: 'Deal' | 'Lead';
};

export type PartnersReportData = {
  meta: {
    title: string;
    reportKindLabel: string;
    companyName: string;
    logoUrl: string | null;
    periodLabel: string;
    periodFrom: string;
    periodTo: string;
    exportFiscalYear?: string;
    exportQuarter?: string;
    generatedAt: string;
    filterLabels: string[];
    filterSummary: string;
    recordCount: number;
    selectedSections: PartnerReportSectionId[];
    /** Present when the viewer lacks view-all-partners. */
    accessScopeLabel?: string | null;
    accessProductFamilyNames?: string[];
    /** Dynamic sheet titles from primary role / partnership type / tier / product family. */
    sheetTitles: {
      targetVsAchievement: string;
      partnersChart: string;
      vendorPipeline: string;
      strategicVendors: string;
      partnerLeadPipeline: string;
    };
    primaryRoleName: string;
    primaryTierName: string;
    primaryPartnershipTypeName: string;
    assignmentRoles: PartnerReportAssignmentRole[];
    /** Merged deal/lead custom fields used as pipeline columns. */
    customFieldColumns: PartnerReportCustomFieldColumn[];
    /** Custom fields used on the vendor lead sheet (may differ when leads enabled). */
    leadCustomFieldColumns: PartnerReportCustomFieldColumn[];
    /**
     * Stage coloring for Partners pipeline sheets (Excel/PDF).
     * Configured under Settings → Partners → Partners report coloring.
     * Full mode colors all columns except the partner name (skipFirstColumnColor).
     */
    pipelineRowColorMode?: 'full' | 'indicator';
  };
  summary: {
    partners: number;
    activePartners: number;
    pipelineRows: number;
    strategicRows: number;
    leadRows: number;
    totalPipeline: number;
    totalAchievement: number;
    totalTarget: number;
  };
  targetVsAchievement: PartnerReportTargetRow[];
  partnerCharts: PartnerReportChartPartner[];
  vendorPipeline: PartnerPipelineRow[];
  strategicPipeline: PartnerPipelineRow[];
  partnerLeadPipeline: PartnerLeadPipelineRow[];
};
