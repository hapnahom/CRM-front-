import type { ReportColumnGroupId } from './columns';
import type { ReportSectionId } from './types';

export type ReportScopeLevel =
  | 'company'
  | 'department'
  | 'team'
  | 'personal'
  | null
  | undefined;

/**
 * Which report tables a scope may see — mirrors dashboard intent:
 * - company / department: org breakdown + rep performance
 * - team: rep performance (team leader view), not multi-team org table
 * - personal: own pipeline only — no team/org performance tables
 */
export type ReportTableVisibility = {
  executiveSummary: boolean;
  productPortfolio: boolean;
  teamEngagements: boolean;
  orgTeams: boolean;
  salesReps: boolean;
  closedWon: boolean;
  concentration: boolean;
  totalPipeline: boolean;
  inactiveOpportunities: boolean;
};

export function reportTableVisibility(
  scopeLevel: ReportScopeLevel,
): ReportTableVisibility {
  if (scopeLevel === 'personal') {
    return {
      executiveSummary: false,
      productPortfolio: false,
      teamEngagements: false,
      orgTeams: false,
      salesReps: false,
      closedWon: false,
      concentration: false,
      totalPipeline: true,
      inactiveOpportunities: true,
    };
  }

  return {
    executiveSummary: true,
    productPortfolio: true,
    teamEngagements: false,
    orgTeams: true,
    salesReps: true,
    closedWon: false,
    concentration: false,
    totalPipeline: true,
    inactiveOpportunities: true,
  };
}

export function isReportColumnGroupVisible(
  groupId: ReportColumnGroupId,
  scopeLevel: ReportScopeLevel,
): boolean {
  const visibility = reportTableVisibility(scopeLevel);
  switch (groupId) {
    case 'product_portfolio':
      return visibility.productPortfolio;
    case 'team_engagements':
      return visibility.teamEngagements;
    case 'org_teams':
      return visibility.orgTeams;
    case 'sales_reps':
      return visibility.salesReps;
    case 'total_pipeline':
      return visibility.totalPipeline;
    case 'inactive_opportunities':
      return visibility.inactiveOpportunities;
    default:
      return true;
  }
}

export function isReportSectionVisible(
  sectionId: ReportSectionId,
  scopeLevel: ReportScopeLevel,
): boolean {
  const visibility = reportTableVisibility(scopeLevel);
  switch (sectionId) {
    case 'executive_summary':
      return visibility.executiveSummary;
    case 'team_performance':
      return visibility.orgTeams || visibility.salesReps;
    case 'deal_registry':
      return visibility.totalPipeline;
    default:
      return true;
  }
}

export function filterSectionsForScope(
  sections: ReportSectionId[],
  scopeLevel: ReportScopeLevel,
): ReportSectionId[] {
  return sections.filter((id) => isReportSectionVisible(id, scopeLevel));
}

export function filterColumnsForScope<
  T extends { groupId: ReportColumnGroupId },
>(columns: T[], scopeLevel: ReportScopeLevel): T[] {
  return columns.filter((column) =>
    isReportColumnGroupVisible(column.groupId, scopeLevel),
  );
}

export function filterColumnIdsForScope(
  columnIds: string[],
  columns: Array<{ id: string; groupId: ReportColumnGroupId }>,
  scopeLevel: ReportScopeLevel,
): string[] {
  const allowed = new Set(
    filterColumnsForScope(columns, scopeLevel).map((column) => column.id),
  );
  return columnIds.filter((id) => allowed.has(id));
}
