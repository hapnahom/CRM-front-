import { tokens } from '@/lib/design-tokens';
import {
  formatCustomFieldListValue,
  type CustomFieldDirectory,
} from '@/lib/pipeline/format-custom-field-value';
import {
  mergePipelineCustomFields,
  pipelineCustomColumnId,
  type MergedPipelineCustomField,
} from '@/modules/sales-pipeline/report/columns';
import type { OrgFiscalSession } from '@/store/server/features/salesTargeting/types';
import type { Partner } from '../types';
import type { PartnerRole } from '../roles/types';
import type { PartnerTierDefinition } from '../tiers/types';
import type { PartnerPartnershipTypeDefinition } from '../partnership-types/types';
import {
  extractPartnerOriginatedOpportunities,
  extractPartnerSolutionInvolvements,
  type PartnerOriginatedOpportunity,
  type PartnerSolutionInvolvement,
} from './involvements';
import type {
  PartnerLeadPipelineRow,
  PartnerPipelineRow,
  PartnerReportAssignmentRole,
  PartnerReportChartPartner,
  PartnerReportCustomFieldColumn,
  PartnerReportFilters,
  PartnerReportSectionId,
  PartnerReportStageSlice,
  PartnerReportTargetRow,
  PartnersReportData,
} from './types';
import type { PipelineDeal } from '@/store/server/features/deals/pipeline/types';
import type { PipelineLead } from '@/store/server/features/leads/pipeline/types';

type FiscalYearLike = {
  id: string;
  name: string;
  sessions?: OrgFiscalSession[];
};

function moneySum(values: Record<string, number> | undefined): number {
  if (!values) return 0;
  return Object.values(values).reduce(
    (sum, amount) => sum + (Number(amount) || 0),
    0,
  );
}

function partnerTarget(partner: Partner): number {
  if (typeof partner.annualTarget === 'number' && partner.annualTarget > 0) {
    return partner.annualTarget;
  }
  const fromCurrency = (partner.currencyTargets ?? []).reduce(
    (sum, row) => sum + (Number(row.annualAmount) || 0),
    0,
  );
  return fromCurrency > 0 ? fromCurrency : 0;
}

function displayName(
  user?: {
    name?: string | null;
    email?: string | null;
    selamnewId?: string | null;
  } | null,
): string {
  if (!user) return '';
  return (
    user.name?.trim() || user.selamnewId?.trim() || user.email?.trim() || ''
  );
}

function resolveUserName(
  userId: string | null | undefined,
  nameById: Map<string, string>,
): string {
  if (!userId) return '';
  return (nameById.get(userId) ?? '').trim();
}

function formatAssignmentRoleValues(
  involvement: PartnerSolutionInvolvement,
  roles: PartnerReportAssignmentRole[],
  nameById: Map<string, string>,
): Record<string, string> {
  const byRole = new Map<string, Set<string>>();

  const addName = (roleId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed || looksLikeUserId(trimmed)) return;
    const bucket = byRole.get(roleId) ?? new Set<string>();
    bucket.add(trimmed);
    byRole.set(roleId, bucket);
  };

  for (const assignment of involvement.roleAssignments ?? []) {
    if (!assignment.roleId) continue;
    const name =
      displayName(assignment.user) ||
      resolveUserName(assignment.userId, nameById);
    addName(assignment.roleId, name);
  }

  // Solution-level role assignments — prefer directory names over raw ids
  for (const solution of involvement.solutions ?? []) {
    for (const entry of solution.roleAssignments ?? []) {
      if (!entry.roleId) continue;
      for (const userId of entry.userIds ?? []) {
        addName(entry.roleId, resolveUserName(userId, nameById));
      }
      for (const user of entry.users ?? []) {
        const label =
          resolveUserName(user.id, nameById) ||
          displayName(user) ||
          (user.selamnewId ?? '').trim();
        addName(entry.roleId, label);
      }
    }
  }

  const values: Record<string, string> = {};
  for (const role of roles) {
    let name = [...(byRole.get(role.id) ?? [])].join('\n');
    if (!name && role.isPrimary) {
      name =
        displayName(involvement.responsibleUser) ||
        resolveUserName(involvement.responsibleUserId, nameById);
      if (looksLikeUserId(name)) name = '';
    }
    values[role.id] = name;
  }
  return values;
}

function looksLikeUserId(value: string): boolean {
  const trimmed = value.trim();
  // UUID v4-ish or other opaque ids should never appear in report cells.
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/^[0-9a-f]{24,}$/i.test(trimmed)) return true;
  return false;
}

function sessionFiscalLabels(
  sessionId: string | null | undefined,
  sessions: OrgFiscalSession[],
  fiscalYears: FiscalYearLike[],
): { fiscalYear: string; quarter: string } {
  if (!sessionId) return { fiscalYear: '', quarter: '' };
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return { fiscalYear: '', quarter: '' };
  const year =
    fiscalYears.find((item) => item.id === session.calendarId) ??
    fiscalYears.find((item) => item.sessions?.some((s) => s.id === sessionId));
  return {
    fiscalYear: year?.name?.trim() || '',
    quarter: (session.name ?? '').trim(),
  };
}

function collectUserNames(
  deals: PipelineDeal[],
  leads: PipelineLead[],
  extraNames?: Record<string, string> | Map<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  const put = (
    id: string | null | undefined,
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      selamnewId?: string | null;
    } | null,
  ) => {
    const key = id || user?.id;
    if (!key) return;
    const name = displayName(user);
    if (!name) {
      if (!map.has(key)) map.set(key, '');
      return;
    }
    map.set(key, name);
  };

  if (extraNames instanceof Map) {
    for (const [id, name] of extraNames.entries()) {
      const trimmed = (name ?? '').trim();
      if (id && trimmed && !looksLikeUserId(trimmed)) map.set(id, trimmed);
    }
  } else if (extraNames) {
    for (const [id, name] of Object.entries(extraNames)) {
      const trimmed = (name ?? '').trim();
      if (id && trimmed && !looksLikeUserId(trimmed)) map.set(id, trimmed);
    }
  }

  const ingest = (record: PipelineDeal | PipelineLead) => {
    put(record.responsibleUserId, record.responsibleUser);
    for (const assignment of record.roleAssignments ?? []) {
      put(assignment.userId, assignment.user);
    }
    for (const solution of record.solutions ?? []) {
      for (const entry of solution.roleAssignments ?? []) {
        for (const user of entry.users ?? []) {
          put(user.id, user);
        }
        for (const userId of entry.userIds ?? []) {
          put(userId, null);
        }
      }
    }
  };

  for (const deal of deals) ingest(deal);
  for (const lead of leads) ingest(lead);
  return map;
}

function partnerMatchesFilters(
  partner: Partner,
  filters: PartnerReportFilters,
): boolean {
  if (filters.statusIds.length && !filters.statusIds.includes(partner.status)) {
    return false;
  }
  if (filters.roleIds.length) {
    const roleIds = partner.roleIds ?? [];
    if (!filters.roleIds.some((id) => roleIds.includes(id))) return false;
  }
  if (filters.partnershipTypeIds.length) {
    const typeId = partner.partnershipTypeId || '';
    const typeName = partner.partnershipType || '';
    if (
      !filters.partnershipTypeIds.includes(typeId) &&
      !filters.partnershipTypeIds.includes(typeName)
    ) {
      return false;
    }
  }
  if (filters.accountManagers.length) {
    const am = (partner.accountManager || '').trim();
    if (!filters.accountManagers.includes(am)) return false;
  }
  return true;
}

function hasPrimaryRole(
  partner: Partner,
  primaryRoleId: string | null,
): boolean {
  if (!primaryRoleId) return true;
  return (partner.roleIds ?? []).includes(primaryRoleId);
}

function hasPrimaryPartnershipType(
  partner: Partner,
  primaryType: PartnerPartnershipTypeDefinition | null,
): boolean {
  // No configured primary type → nothing qualifies for the primary-type sheet
  if (!primaryType) return false;
  if (
    partner.partnershipTypeId &&
    partner.partnershipTypeId === primaryType.id
  ) {
    return true;
  }
  return (
    normalize(partner.partnershipType) === normalize(primaryType.name) ||
    normalize(partner.partnershipType) === normalize(primaryType.code)
  );
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function matchesSessionFilter(
  sessionId: string | null | undefined,
  sessionIds: string[] | undefined,
): boolean {
  if (!sessionIds?.length) return true;
  if (!sessionId) return true;
  return sessionIds.includes(sessionId);
}

function matchesProductFamily(
  familyId: string,
  filters: PartnerReportFilters,
): boolean {
  if (!filters.productFamilyIds.length) return true;
  if (!familyId) return false;
  return filters.productFamilyIds.includes(familyId);
}

function opportunityMatchesProductFamily(
  opportunity: { solutions?: Array<{ productFamilyId?: string | null }> },
  filters: PartnerReportFilters,
): boolean {
  if (!filters.productFamilyIds.length) return true;
  const solutions = opportunity.solutions ?? [];
  if (!solutions.length) return false;
  return solutions.some((solution) =>
    matchesProductFamily(solution.productFamilyId || '', filters),
  );
}

type ProductFamilyLink = {
  id: string;
  name: string;
  familyPartners?: Array<{ partnerId: string; partnerRoleId?: string }>;
};

function partnerIdsLinkedToProductFamilies(
  families: ProductFamilyLink[],
  familyIds: string[],
): Set<string> {
  const allowed = new Set(familyIds);
  const partnerIds = new Set<string>();
  for (const family of families) {
    if (!allowed.has(family.id)) continue;
    for (const link of family.familyPartners ?? []) {
      if (link.partnerId) partnerIds.add(link.partnerId);
    }
  }
  return partnerIds;
}

function buildStageSlices(
  involvements: PartnerSolutionInvolvement[],
): PartnerReportStageSlice[] {
  const map = new Map<
    string,
    {
      label: string;
      value: number;
      color: string;
      count: number;
      order: number;
    }
  >();
  for (const row of involvements) {
    const key = row.stage || 'Unstaged';
    const existing = map.get(key);
    if (existing) {
      existing.value += row.amount;
      existing.count += 1;
    } else {
      map.set(key, {
        label: key,
        value: row.amount,
        color: row.stageColor || tokens.color.textSubtle,
        count: 1,
        order: row.stageOrder,
      });
    }
  }
  const total =
    [...map.values()].reduce((sum, item) => sum + item.value, 0) || 1;
  return [...map.entries()]
    .sort((a, b) => a[1].order - b[1].order || b[1].value - a[1].value)
    .map(([id, item]) => ({
      id,
      label: item.label,
      value: item.value,
      share: item.value / total,
      color: item.color,
      count: item.count,
    }));
}

function toPartnerCustomColumns(
  merged: MergedPipelineCustomField[],
): PartnerReportCustomFieldColumn[] {
  return merged.map((entry) => {
    const primary = entry.dealField ?? entry.leadField!;
    const paired =
      entry.dealField && entry.leadField
        ? entry.dealField.id === primary.id
          ? entry.leadField.id
          : entry.dealField.id
        : null;
    return {
      ...primary,
      id: pipelineCustomColumnId(entry),
      label: entry.label,
      pairedFieldId: paired,
    };
  });
}

function formatPartnerCustomValues(
  merged: MergedPipelineCustomField[],
  recordType: 'Deal' | 'Lead',
  values: Record<string, unknown> | undefined,
  directory: CustomFieldDirectory,
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const entry of merged) {
    const columnId = pipelineCustomColumnId(entry);
    const field = recordType === 'Deal' ? entry.dealField : entry.leadField;
    if (!field) {
      formatted[columnId] = '';
      continue;
    }
    formatted[columnId] = formatCustomFieldListValue(
      values?.[field.id],
      field.fieldType,
      field.options,
      directory,
      field.subFields,
    );
  }
  return formatted;
}

function numberRowsPerPartner(
  involvements: PartnerSolutionInvolvement[],
  toRow: (
    involvement: PartnerSolutionInvolvement,
    rowNumber: number,
  ) => PartnerPipelineRow,
): PartnerPipelineRow[] {
  let currentPartnerId = '';
  let rowNumber = 0;
  return involvements.map((involvement) => {
    if (involvement.partnerId !== currentPartnerId) {
      currentPartnerId = involvement.partnerId;
      rowNumber = 0;
    }
    rowNumber += 1;
    return toRow(involvement, rowNumber);
  });
}

/** `<primary partnership type> <primary partner role>s` — e.g. configured names, not hardcoded. */
export function primaryTypeRoleLabel(
  partnershipTypeName: string | null | undefined,
  roleName: string | null | undefined,
): string {
  const type = (partnershipTypeName ?? '').trim();
  const role = (roleName ?? '').trim();
  if (type && role) return `${type} ${role}s`;
  if (type) return type;
  if (role) return `${role}s`;
  return 'Partners';
}

function sheetTitleParts(input: {
  primaryRoleName: string;
  primaryPartnershipTypeName: string;
  productFamilyNames: string[];
}) {
  const role = input.primaryRoleName.trim() || 'Partner';
  const type = input.primaryPartnershipTypeName.trim();
  const family =
    input.productFamilyNames.length === 1 ? input.productFamilyNames[0] : '';
  return {
    targetVsAchievement: 'Target vs Achievement',
    partnersChart: `${type || 'Primary'} partners chart`,
    vendorPipeline: family ? `${family} ${role} Pipeline` : `${role} Pipeline`,
    strategicVendors: primaryTypeRoleLabel(type, role),
    partnerLeadPipeline: `${role} Lead Pipeline`,
  };
}

export function countPartnerReportFilters(
  filters: PartnerReportFilters,
): number {
  return (
    filters.statusIds.length +
    filters.roleIds.length +
    filters.partnershipTypeIds.length +
    filters.accountManagers.length +
    filters.productFamilyIds.length
  );
}

export function buildPartnersReport(input: {
  partners: Partner[];
  roles: PartnerRole[];
  tiers: PartnerTierDefinition[];
  partnershipTypes?: PartnerPartnershipTypeDefinition[];
  deals: PipelineDeal[];
  leads: PipelineLead[];
  assignmentRoles: PartnerReportAssignmentRole[];
  dealCustomFields: PartnerReportCustomFieldColumn[];
  leadCustomFields: PartnerReportCustomFieldColumn[];
  dealCustomValuesById: Map<string, Record<string, unknown>>;
  leadCustomValuesById: Map<string, Record<string, unknown>>;
  customFieldDirectory?: CustomFieldDirectory;
  sessions: OrgFiscalSession[];
  fiscalYears: FiscalYearLike[];
  sessionIds?: string[];
  filters: PartnerReportFilters;
  sections: PartnerReportSectionId[];
  periodLabel: string;
  periodFrom: string;
  periodTo: string;
  companyName: string;
  logoUrl: string | null;
  exportFiscalYear?: string;
  exportQuarter?: string;
  /** Product-family access label when the user lacks view-all-partners. */
  accessScopeLabel?: string | null;
  accessProductFamilyNames?: string[];
  /** Directory of user id → display name for solution role columns. */
  userNameById?: Record<string, string> | Map<string, string>;
  /** Stage coloring for pipeline sheets (Settings → Partners). */
  pipelineRowColorMode?: 'full' | 'indicator';
  /** Used to resolve partners linked to selected product families. */
  productFamilies?: ProductFamilyLink[];
}): PartnersReportData {
  const primaryRole =
    input.roles.find((role) => role.isPrimary && role.isActive !== false) ??
    input.roles.find((role) => role.isActive !== false) ??
    input.roles[0] ??
    null;
  const primaryTier =
    input.tiers.find((tier) => tier.isPrimary && tier.isActive !== false) ??
    input.tiers.find((tier) => tier.isActive !== false) ??
    input.tiers[0] ??
    null;
  const partnershipTypes = input.partnershipTypes ?? [];
  // Only an explicitly marked primary type qualifies for the primary-type sheet
  const primaryPartnershipType =
    partnershipTypes.find(
      (type) => type.isPrimary && type.isActive !== false,
    ) ?? null;

  const primaryRoleId = primaryRole?.id ?? null;
  const primaryRoleName = primaryRole?.name?.trim() || 'Partner';
  const primaryTierName = primaryTier?.name?.trim() || '';
  const primaryPartnershipTypeName = primaryPartnershipType?.name?.trim() || '';

  const filteredPartners = input.partners.filter((partner) =>
    partnerMatchesFilters(partner, input.filters),
  );
  let primaryRolePartners = filteredPartners.filter((partner) =>
    hasPrimaryRole(partner, primaryRoleId),
  );

  let allInvolvements = extractPartnerSolutionInvolvements({
    partners: primaryRolePartners,
    deals: input.deals,
    leads: input.leads,
  }).filter(
    (row) =>
      matchesSessionFilter(row.sessionId, input.sessionIds) &&
      matchesProductFamily(row.productFamilyId, input.filters),
  );

  // Product-family filter: keep only partners related to the selected families
  // (catalog links and/or solution involvements) and their matching opportunities.
  if (input.filters.productFamilyIds.length) {
    const linkedIds = partnerIdsLinkedToProductFamilies(
      input.productFamilies ?? [],
      input.filters.productFamilyIds,
    );
    for (const row of allInvolvements) linkedIds.add(row.partnerId);
    primaryRolePartners = primaryRolePartners.filter((partner) =>
      linkedIds.has(partner.id),
    );
    const scopedIds = new Set(primaryRolePartners.map((partner) => partner.id));
    allInvolvements = allInvolvements.filter((row) =>
      scopedIds.has(row.partnerId),
    );
  }

  const primaryRolePartnerIds = new Set(
    primaryRolePartners.map((partner) => partner.id),
  );

  const userNameById = collectUserNames(
    input.deals,
    input.leads,
    input.userNameById,
  );
  const mergedCustomFields = mergePipelineCustomFields(
    input.dealCustomFields,
    input.leadCustomFields,
  );
  const customColumns = toPartnerCustomColumns(mergedCustomFields);

  const toPipelineRow = (
    involvement: PartnerSolutionInvolvement,
    rowNumber: number,
  ): PartnerPipelineRow => {
    const fiscal = sessionFiscalLabels(
      involvement.sessionId,
      input.sessions,
      input.fiscalYears,
    );
    const customSource =
      involvement.recordType === 'Deal'
        ? input.dealCustomValuesById.get(involvement.opportunityId)
        : input.leadCustomValuesById.get(involvement.opportunityId);
    return {
      id: involvement.id,
      partnerId: involvement.partnerId,
      partnerName: involvement.partnerName,
      rowNumber,
      opportunityType: involvement.opportunityType,
      customerName: involvement.customerName,
      dealName: involvement.opportunityName,
      stage: involvement.stage,
      stageColor: involvement.stageColor,
      stageCategory: involvement.stageCategory,
      dealRegistrationStatus: involvement.dealRegistrationStatus,
      roleValues: formatAssignmentRoleValues(
        involvement,
        input.assignmentRoles,
        userNameById,
      ),
      value: involvement.amount,
      currency: involvement.currency,
      fiscalYear: fiscal.fiscalYear || input.exportFiscalYear || '',
      quarter: fiscal.quarter || input.exportQuarter || '',
      customValues: formatPartnerCustomValues(
        mergedCustomFields,
        involvement.recordType,
        customSource,
        input.customFieldDirectory ?? {},
      ),
      productFamilyId: involvement.productFamilyId,
      productFamilyName: involvement.productFamilyName,
      recordType: involvement.recordType,
      opportunityId: involvement.opportunityId,
    };
  };

  // Group by partner for stable ordering, then number rows per partner.
  const sortedInvolvements = [...allInvolvements].sort((a, b) => {
    const partnerCmp = a.partnerName.localeCompare(b.partnerName);
    if (partnerCmp) return partnerCmp;
    if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
    return a.opportunityName.localeCompare(b.opportunityName);
  });

  const vendorPipeline = numberRowsPerPartner(
    sortedInvolvements,
    toPipelineRow,
  );

  // Same opportunity rows as vendor pipeline, limited to primary partnership type partners
  const strategicPartnerIds = new Set(
    primaryRolePartners
      .filter((partner) =>
        hasPrimaryPartnershipType(partner, primaryPartnershipType),
      )
      .map((partner) => partner.id),
  );
  const strategicInvolvements = sortedInvolvements.filter((row) =>
    strategicPartnerIds.has(row.partnerId),
  );
  const strategicPipeline = numberRowsPerPartner(
    strategicInvolvements,
    toPipelineRow,
  );

  // Target vs Achievement: primary-role partners that have a target.
  const openByPartner = new Map<string, number>();
  const wonByPartner = new Map<string, number>();
  for (const row of allInvolvements) {
    if (row.stageCategory === 'won') {
      wonByPartner.set(
        row.partnerId,
        (wonByPartner.get(row.partnerId) ?? 0) + row.amount,
      );
    } else if (row.stageCategory !== 'lost') {
      openByPartner.set(
        row.partnerId,
        (openByPartner.get(row.partnerId) ?? 0) + row.amount,
      );
    }
  }

  const targetVsAchievement: PartnerReportTargetRow[] = primaryRolePartners
    .map((partner) => {
      const target = partnerTarget(partner);
      const pipeline = openByPartner.get(partner.id) ?? 0;
      const achievement = wonByPartner.get(partner.id) ?? 0;
      return {
        id: partner.id,
        name: partner.name,
        target,
        pipeline,
        achievement,
        partnershipLevel: partner.tier || '',
        nextPartnershipTarget: 'Maintain',
        tierColor: partner.tierColor || tokens.color.brand,
      };
    })
    .filter((row) => row.target > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Charts: primary role + primary partnership type partners with pipeline.
  const partnerCharts: PartnerReportChartPartner[] = [...strategicPartnerIds]
    .map((partnerId) => {
      const partner = primaryRolePartners.find((p) => p.id === partnerId);
      if (!partner) return null;
      const rows = allInvolvements.filter(
        (row) => row.partnerId === partnerId && row.stageCategory !== 'lost',
      );
      const pipeline = rows.reduce((sum, row) => sum + row.amount, 0);
      if (pipeline <= 0 && !rows.length) return null;
      return {
        id: partner.id,
        name: partner.name,
        pipeline,
        stages: buildStageSlices(rows),
      };
    })
    .filter((row): row is PartnerReportChartPartner => Boolean(row))
    .sort((a, b) => b.pipeline - a.pipeline || a.name.localeCompare(b.name));

  const opportunityById = new Map<string, PipelineDeal | PipelineLead>();
  for (const deal of input.deals) opportunityById.set(deal.id, deal);
  for (const lead of input.leads) opportunityById.set(lead.id, lead);

  const originated = extractPartnerOriginatedOpportunities({
    partners: primaryRolePartners,
    deals: input.deals,
    leads: input.leads,
  }).filter((row) => {
    if (!matchesSessionFilter(row.sessionId, input.sessionIds)) return false;
    if (!primaryRolePartnerIds.has(row.partnerId)) return false;
    const opportunity = opportunityById.get(row.opportunityId);
    if (!opportunity) return !input.filters.productFamilyIds.length;
    return opportunityMatchesProductFamily(opportunity, input.filters);
  });

  const partnerLeadPipeline: PartnerLeadPipelineRow[] = originated
    .sort((a, b) => a.partnerName.localeCompare(b.partnerName))
    .map((row: PartnerOriginatedOpportunity, index) => {
      const customSource =
        row.recordType === 'Deal'
          ? input.dealCustomValuesById.get(row.opportunityId)
          : input.leadCustomValuesById.get(row.opportunityId);
      return {
        id: row.id,
        leadId: String(index + 1),
        partnerName: row.partnerName,
        clientName: row.clientName,
        solutionArea: row.solutionArea,
        estimatedValue: row.estimatedValue || null,
        stage: row.stage,
        stageColor: row.stageColor,
        report: row.description,
        nextAction: '',
        blockers: '',
        customValues: formatPartnerCustomValues(
          mergedCustomFields,
          row.recordType,
          customSource,
          input.customFieldDirectory ?? {},
        ),
        recordType: row.recordType,
      };
    });

  const filterLabels: string[] = [];
  if (input.filters.statusIds.length) {
    filterLabels.push(`Status: ${input.filters.statusIds.join(', ')}`);
  }
  if (input.filters.roleIds.length) {
    const names = input.filters.roleIds.map(
      (id) => input.roles.find((role) => role.id === id)?.name || id,
    );
    filterLabels.push(`Role: ${names.join(', ')}`);
  }
  if (input.filters.partnershipTypeIds.length) {
    const names = input.filters.partnershipTypeIds.map(
      (id) => partnershipTypes.find((type) => type.id === id)?.name || id,
    );
    filterLabels.push(`Partnership type: ${names.join(', ')}`);
  }
  if (input.filters.accountManagers.length) {
    filterLabels.push(
      `Account manager: ${input.filters.accountManagers.join(', ')}`,
    );
  }
  const productFamilyNames = input.filters.productFamilyIds.map((id) => {
    const fromCatalog = (input.productFamilies ?? []).find(
      (family) => family.id === id,
    )?.name;
    if (fromCatalog) return fromCatalog;
    const fromInvolvement = allInvolvements.find(
      (row) => row.productFamilyId === id,
    )?.productFamilyName;
    return fromInvolvement || id;
  });
  if (productFamilyNames.length) {
    filterLabels.push(`Product family: ${productFamilyNames.join(', ')}`);
  }

  const accessFamilyNames = (input.accessProductFamilyNames ?? []).filter(
    Boolean,
  );
  const titleFamilyNames =
    productFamilyNames.length > 0 ? productFamilyNames : accessFamilyNames;
  if (input.accessScopeLabel?.trim()) {
    filterLabels.unshift(input.accessScopeLabel.trim());
  }

  const totalPipeline = targetVsAchievement.reduce(
    (sum, row) => sum + row.pipeline,
    0,
  );
  const totalAchievement = targetVsAchievement.reduce(
    (sum, row) => sum + row.achievement,
    0,
  );
  const totalTarget = targetVsAchievement.reduce(
    (sum, row) => sum + row.target,
    0,
  );

  return {
    meta: {
      title: 'Partners Report',
      reportKindLabel: `${primaryRoleName} Pipeline Report`,
      companyName: input.companyName,
      logoUrl: input.logoUrl,
      periodLabel: input.periodLabel,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      exportFiscalYear: input.exportFiscalYear,
      exportQuarter: input.exportQuarter,
      generatedAt: new Date().toLocaleString(),
      filterLabels,
      filterSummary: filterLabels.join(' · '),
      recordCount: primaryRolePartners.length,
      selectedSections: input.sections,
      accessScopeLabel: input.accessScopeLabel?.trim() || null,
      accessProductFamilyNames: accessFamilyNames,
      sheetTitles: sheetTitleParts({
        primaryRoleName,
        primaryPartnershipTypeName,
        productFamilyNames: titleFamilyNames,
      }),
      primaryRoleName,
      primaryTierName,
      primaryPartnershipTypeName,
      assignmentRoles: [...input.assignmentRoles].sort(
        (a, b) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          a.label.localeCompare(b.label),
      ),
      customFieldColumns: customColumns,
      leadCustomFieldColumns: customColumns,
      pipelineRowColorMode: input.pipelineRowColorMode ?? 'full',
    },
    summary: {
      partners: primaryRolePartners.length,
      activePartners: primaryRolePartners.filter((p) => p.status === 'Active')
        .length,
      pipelineRows: vendorPipeline.length,
      strategicRows: strategicPipeline.length,
      leadRows: partnerLeadPipeline.length,
      totalPipeline,
      totalAchievement,
      totalTarget,
    },
    targetVsAchievement,
    partnerCharts,
    vendorPipeline,
    strategicPipeline,
    partnerLeadPipeline,
  };
}

/** @deprecated kept for any leftover imports — prefer moneySum of currency maps */
export function sumPartnerCurrencyAmounts(
  values: Record<string, number> | undefined,
): number {
  return moneySum(values);
}
