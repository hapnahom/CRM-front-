import { opportunityNameColumnLabel } from '@/config/salesWorkflow';
import { formatTargetAmount } from '@/lib/target-format';
import {
  EMPTY,
  formatCompactAmount,
  formatDate,
  formatDetailedAmount,
  formatMoneyMap,
  formatPercent,
  winRate,
} from './format';
import {
  assignmentRoleColumnId,
  coalesceInactiveCustomFieldValue,
  inactiveAssignmentRoleColumnId,
  inactiveOpportunityCustomColumnId,
  mergeInactiveOpportunityCustomFields,
  mergePipelineCustomFields,
  pipelineCustomColumnId,
  type TableColumnSpec,
} from './columns';
import type {
  MoneyByCurrency,
  NewlyAddedRow,
  OrgUnitRow,
  RegistryRow,
  ReportCustomFieldColumn,
  RiskFlagRow,
  SalesRepRow,
} from './types';

type Density = 'pdf' | 'xlsx';

function money(value: number, currency: string) {
  return formatMoneyMap({ [currency]: value }, true);
}

/** Income amount only — currency is a separate column. */
function incomeAmount(value: number, compact: boolean) {
  return compact
    ? formatCompactAmount(value, '')
    : formatDetailedAmount(value, '');
}

function w(density: Density, pdf: number, xlsx: number) {
  return density === 'pdf' ? pdf : xlsx;
}

const REP_WIN_RATE_CURRENCIES = ['ETB', 'USD'] as const;

function repZeroMoney(compact: boolean): string {
  return compact ? formatCompactAmount(0, '') : formatTargetAmount(0);
}

/** Money cells for sales rep performance — zero amounts render as 0, not —. */
function repMoney(
  money: MoneyByCurrency | null | undefined,
  compact: boolean,
): string {
  if (money == null) return EMPTY;
  return formatMoneyMap(money, compact, repZeroMoney(compact));
}

function repWinRate(won: MoneyByCurrency, lost: MoneyByCurrency): string {
  return REP_WIN_RATE_CURRENCIES.map((currency) => {
    const wonAmount = won[currency] ?? 0;
    const lostAmount = lost[currency] ?? 0;
    const rate = winRate(wonAmount, lostAmount);
    return `${currency} ${Math.round(rate ?? 0)}%`;
  }).join(' · ');
}

function repPipelineAchievement(
  rates: Record<string, number | null> | null | undefined,
): string {
  if (rates == null) return EMPTY;
  return REP_WIN_RATE_CURRENCIES.map((currency) => {
    const rate = rates[currency];
    return rate == null ? `${currency} —` : `${currency} ${Math.round(rate)}%`;
  }).join(' · ');
}

/**
 * Full catalogs for every report table.
 * PDF/Excel only render columns that are selected (and in selection order).
 */

export function orgTeamColumns(
  density: Density = 'xlsx',
): TableColumnSpec<OrgUnitRow>[] {
  const compact = density === 'pdf';
  return [
    {
      id: 'org_teams.department',
      header: 'Department',
      width: w(density, 85, 22),
      cell: (row) => row.department,
    },
    {
      id: 'org_teams.team',
      header: 'Sales team',
      width: w(density, 80, 22),
      cell: (row) => row.team,
    },
    {
      id: 'org_teams.vector',
      header: 'Business vector / sector',
      width: w(density, 95, 26),
      cell: (row) => row.vector,
    },
    {
      id: 'org_teams.opportunities',
      header: 'Opportunities',
      width: w(density, 50, 14),
      cell: (row) => row.leads + row.deals,
    },
    {
      id: 'org_teams.pipeline',
      header: 'Pipeline value',
      width: w(density, 105, 28),
      cell: (row) => formatMoneyMap(row.pipeline, compact),
    },
    {
      id: 'org_teams.target',
      header: 'Target',
      width: w(density, 70, 18),
      cell: (row) => (row.target ? formatMoneyMap(row.target, compact) : EMPTY),
    },
    {
      id: 'org_teams.achieved',
      header: 'Achieved',
      width: w(density, 70, 18),
      cell: (row) =>
        row.achieved ? formatMoneyMap(row.achieved, compact) : EMPTY,
    },
    {
      id: 'org_teams.remaining',
      header: 'Remaining',
      width: w(density, 70, 18),
      cell: (row) =>
        row.remaining ? formatMoneyMap(row.remaining, compact) : EMPTY,
    },
  ];
}

export function salesRepColumns(
  density: Density = 'xlsx',
): TableColumnSpec<SalesRepRow>[] {
  const compact = density === 'pdf';
  return [
    {
      id: 'sales_reps.name',
      header: 'Sales representative',
      width: w(density, 90, 26),
      cell: (row) => row.name,
    },
    {
      id: 'sales_reps.team',
      header: 'Team',
      width: w(density, 55, 18),
      cell: (row) => row.team || EMPTY,
    },
    {
      id: 'sales_reps.department',
      header: 'Department',
      width: w(density, 55, 18),
      cell: (row) => row.department || EMPTY,
    },
    {
      id: 'sales_reps.opportunities',
      header: 'Opportunities',
      width: w(density, 50, 14),
      cell: (row) => row.leads + row.deals,
    },
    {
      id: 'sales_reps.open_pipeline',
      header: 'Open pipeline',
      width: w(density, 60, 22),
      cell: (row) => repMoney(row.pipeline, compact),
    },
    {
      id: 'sales_reps.target',
      header: 'Target',
      width: w(density, 55, 18),
      cell: (row) => repMoney(row.target, compact),
    },
    {
      id: 'sales_reps.won_revenue',
      header: 'Won',
      width: w(density, 55, 18),
      cell: (row) => repMoney(row.won, compact),
    },
    {
      id: 'sales_reps.remaining',
      header: 'Remaining',
      width: w(density, 55, 18),
      cell: (row) => repMoney(row.remaining, compact),
    },
    {
      id: 'sales_reps.achievement',
      header: 'Achievement (%)',
      width: w(density, 42, 14),
      cell: (row) =>
        row.achievementPct == null ? EMPTY : formatPercent(row.achievementPct),
    },
    {
      id: 'sales_reps.win_rate',
      header: 'Win Rate',
      width: w(density, 72, 20),
      cell: (row) => repWinRate(row.won, row.lost),
    },
    {
      id: 'sales_reps.pipeline_target',
      header: 'Pipeline Target',
      width: w(density, 60, 20),
      cell: (row) => repMoney(row.pipelineTarget, compact),
    },
    {
      id: 'sales_reps.pipeline_achievement',
      header: 'Pipeline Achievement',
      width: w(density, 72, 22),
      cell: (row) => repPipelineAchievement(row.pipelineAchievement),
    },
  ];
}

export function newlyAddedColumns(
  density: Density = 'xlsx',
): TableColumnSpec<NewlyAddedRow>[] {
  return [
    {
      id: 'newly_added.opportunity',
      header: 'Opportunity',
      width: w(density, 120, 34),
      cell: (row) => row.name,
    },
    {
      id: 'newly_added.customer',
      header: 'Customer',
      width: w(density, 85, 22),
      cell: (row) => row.customer,
    },
    {
      id: 'newly_added.added_by',
      header: 'Added by',
      width: w(density, 70, 18),
      cell: (row) => row.addedBy || EMPTY,
    },
    {
      id: 'newly_added.intake_stage',
      header: 'Intake stage',
      width: w(density, 70, 18),
      cell: (row) => row.intakeStage,
      stageColor: (row) => row.stageColor,
    },
    {
      id: 'newly_added.estimated_value',
      header: 'Estimated value',
      width: w(density, 60, 14),
      cell: (row) => money(row.value, row.currency),
    },
  ];
}

export function totalPipelineColumns(
  dealCustomFields: ReportCustomFieldColumn[] = [],
  leadCustomFields: ReportCustomFieldColumn[] = [],
  density: Density = 'xlsx',
  assignmentRoles: Array<{
    id: string;
    label: string;
    isPrimary?: boolean;
    displayOrder?: number;
  }> = [],
): TableColumnSpec<RegistryRow>[] {
  const compact = density === 'pdf';
  const roleColumns = [...(assignmentRoles ?? [])]
    .filter((role) => Boolean(role.id))
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => ({
      id: assignmentRoleColumnId(role.id),
      header: role.label,
      width: w(density, 55, 16),
      cell: (row: RegistryRow) => row.roleValues?.[role.id] ?? EMPTY,
    }));

  const customColumns = mergePipelineCustomFields(
    dealCustomFields,
    leadCustomFields,
  ).map((field) => ({
    id: pipelineCustomColumnId(field),
    header: field.label,
    width: w(density, 55, 16),
    cell: (row: RegistryRow) => {
      if (row.recordType === 'Deal' && field.dealField) {
        return row.customValues?.[field.dealField.id] ?? EMPTY;
      }
      if (row.recordType === 'Lead' && field.leadField) {
        return row.customValues?.[field.leadField.id] ?? EMPTY;
      }
      return EMPTY;
    },
  }));

  const afterCustomColumns = [
    {
      id: 'total_pipeline.days_in_current_stage',
      header: 'Days in Current Stage',
      width: w(density, 40, 14),
      cell: (row: RegistryRow) =>
        row.daysInCurrentStage == null ? EMPTY : String(row.daysInCurrentStage),
    },
    {
      id: 'total_pipeline.last_activity_date',
      header: 'Last Activity Date',
      width: w(density, 55, 16),
      cell: (row: RegistryRow) =>
        row.lastActivityDate ? formatDate(row.lastActivityDate) : EMPTY,
    },
  ] satisfies TableColumnSpec<RegistryRow>[];

  const builtinBefore = [
    {
      id: 'total_pipeline.customer',
      header: 'Client name',
      width: w(density, 80, 24),
      cell: (row: RegistryRow) => row.customer,
    },
    {
      id: 'total_pipeline.name',
      header: opportunityNameColumnLabel(),
      width: w(density, 110, 36),
      cell: (row: RegistryRow) => row.name,
    },
    {
      id: 'total_pipeline.type',
      header: 'Type',
      width: w(density, 50, 14),
      cell: (row: RegistryRow) => row.type || EMPTY,
    },
    {
      id: 'total_pipeline.stage',
      header: 'Stage',
      width: w(density, 60, 18),
      cell: (row: RegistryRow) => row.stage,
      stageColor: (row: RegistryRow) => row.stageColor,
    },
    {
      id: 'total_pipeline.value',
      header: 'Estimated Value',
      width: w(density, 55, 14),
      cell: (row: RegistryRow) => incomeAmount(row.value, compact),
    },
    {
      id: 'total_pipeline.currency',
      header: 'Currency',
      width: w(density, 45, 12),
      cell: (row: RegistryRow) => row.currency || EMPTY,
    },
    {
      id: 'total_pipeline.product_family',
      header: 'Solution',
      width: w(density, 70, 22),
      cell: (row: RegistryRow) => row.productFamily || EMPTY,
    },
    {
      id: 'total_pipeline.vendor',
      header: 'Vendor',
      width: w(density, 70, 20),
      cell: (row: RegistryRow) => row.vendor || EMPTY,
    },
    {
      id: 'total_pipeline.dr_status',
      header: 'DR Status',
      width: w(density, 55, 16),
      cell: (row: RegistryRow) => row.drStatus || row.dealRegistration || EMPTY,
    },
  ] satisfies TableColumnSpec<RegistryRow>[];

  const builtinAfter = [
    {
      id: 'total_pipeline.fiscal_year',
      header: 'FY',
      width: w(density, 50, 14),
      cell: (row: RegistryRow) => row.fiscalYear || EMPTY,
    },
    {
      id: 'total_pipeline.quarter',
      header: 'Opportunity Originated',
      width: w(density, 40, 12),
      cell: (row: RegistryRow) => row.quarter || EMPTY,
    },
    {
      id: 'total_pipeline.quarter_closed',
      header: 'Current Reporting',
      width: w(density, 40, 12),
      cell: (row: RegistryRow) => row.quarterClosed || EMPTY,
    },
    {
      id: 'total_pipeline.contact',
      header: 'Client Contact',
      width: w(density, 70, 20),
      cell: (row: RegistryRow) => row.contact || EMPTY,
    },
    {
      id: 'total_pipeline.contact_position',
      header: 'Client Contact Position',
      width: w(density, 55, 16),
      cell: (row: RegistryRow) => row.contactPosition || EMPTY,
    },
    {
      id: 'total_pipeline.contact_email',
      header: 'Client Contact Email',
      width: w(density, 70, 22),
      cell: (row: RegistryRow) => row.contactEmail || EMPTY,
    },
    {
      id: 'total_pipeline.contact_phone',
      header: 'Client Contact Phone',
      width: w(density, 55, 16),
      cell: (row: RegistryRow) => row.contactPhone || EMPTY,
    },
  ] satisfies TableColumnSpec<RegistryRow>[];

  return [
    ...builtinBefore,
    ...customColumns,
    ...afterCustomColumns,
    ...roleColumns,
    ...builtinAfter,
  ];
}

export function inactiveOpportunityColumns(
  dealCustomFields: ReportCustomFieldColumn[] = [],
  leadCustomFields: ReportCustomFieldColumn[] = [],
  density: Density = 'xlsx',
  assignmentRoles: Array<{
    id: string;
    label: string;
    isPrimary?: boolean;
    displayOrder?: number;
  }> = [],
): TableColumnSpec<RegistryRow>[] {
  const compact = density === 'pdf';
  const roleColumns = [...(assignmentRoles ?? [])]
    .filter((role) => Boolean(role.id))
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        (a.label ?? '').localeCompare(b.label ?? ''),
    )
    .map((role) => ({
      id: inactiveAssignmentRoleColumnId(role.id),
      header: role.label,
      width: w(density, 55, 16),
      cell: (row: RegistryRow) => row.roleValues?.[role.id] ?? EMPTY,
    }));

  const customColumns = mergeInactiveOpportunityCustomFields(
    dealCustomFields,
    leadCustomFields,
  ).map((field) => ({
    id: inactiveOpportunityCustomColumnId(field),
    header: field.label,
    width: w(density, 55, 16),
    cell: (row: RegistryRow) => {
      if (row.recordType === 'Deal') {
        return (
          coalesceInactiveCustomFieldValue(
            row.customValues,
            field.dealFields.map((dealField) => dealField.id),
          ) || EMPTY
        );
      }
      if (row.recordType === 'Lead') {
        return (
          coalesceInactiveCustomFieldValue(
            row.customValues,
            field.leadFields.map((leadField) => leadField.id),
          ) || EMPTY
        );
      }
      return EMPTY;
    },
  }));

  const builtinBefore = [
    {
      id: 'inactive_opportunities.customer',
      header: 'Client name',
      width: w(density, 80, 24),
      cell: (row: RegistryRow) => row.customer,
    },
    {
      id: 'inactive_opportunities.name',
      header: opportunityNameColumnLabel(),
      width: w(density, 110, 36),
      cell: (row: RegistryRow) => row.name,
    },
    {
      id: 'inactive_opportunities.type',
      header: 'Type',
      width: w(density, 50, 14),
      cell: (row: RegistryRow) => row.type || EMPTY,
    },
    {
      id: 'inactive_opportunities.stage',
      header: 'Stage',
      width: w(density, 60, 18),
      cell: (row: RegistryRow) => row.stage,
      stageColor: (row: RegistryRow) => row.stageColor,
    },
    {
      id: 'inactive_opportunities.previous_stage',
      header: 'Previous Stage',
      width: w(density, 60, 18),
      cell: (row: RegistryRow) => row.previousStage || EMPTY,
    },
    {
      id: 'inactive_opportunities.value',
      header: 'Estimated Value',
      width: w(density, 55, 14),
      cell: (row: RegistryRow) => incomeAmount(row.value, compact),
    },
    {
      id: 'inactive_opportunities.currency',
      header: 'Currency',
      width: w(density, 45, 12),
      cell: (row: RegistryRow) => row.currency || EMPTY,
    },
    {
      id: 'inactive_opportunities.product_family',
      header: 'Solution',
      width: w(density, 70, 22),
      cell: (row: RegistryRow) => row.productFamily || EMPTY,
    },
  ] satisfies TableColumnSpec<RegistryRow>[];

  return [...builtinBefore, ...customColumns, ...roleColumns];
}

/** @deprecated Prefer totalPipelineColumns — kept for transitional imports. */
export function totalDealsColumns(
  customFields: ReportCustomFieldColumn[] = [],
  density: Density = 'xlsx',
): TableColumnSpec<RegistryRow>[] {
  return totalPipelineColumns(customFields, [], density);
}

/** @deprecated Prefer totalPipelineColumns — kept for transitional imports. */
export function totalLeadsColumns(
  customFields: ReportCustomFieldColumn[] = [],
  density: Density = 'xlsx',
): TableColumnSpec<RegistryRow>[] {
  return totalPipelineColumns([], customFields, density);
}

export function riskColumns(
  density: Density = 'xlsx',
): TableColumnSpec<RiskFlagRow>[] {
  return [
    {
      id: 'risk.flag',
      header: 'Risk flag',
      width: w(density, 90, 24),
      cell: (row) => row.flag,
    },
    {
      id: 'risk.severity',
      header: 'Severity',
      width: w(density, 50, 12),
      cell: (row) => (row.severity === 'critical' ? 'CRITICAL' : 'WARNING'),
    },
    {
      id: 'risk.impacted',
      header: 'Impacted opportunities',
      width: w(density, 110, 32),
      cell: (row) => row.impact,
    },
    {
      id: 'risk.action',
      header: 'Required sales action',
      width: w(density, 120, 36),
      cell: (row) => row.action,
    },
  ];
}

export type ProductPortfolioRow = {
  family: string;
  vendors: string;
  volume: string;
  value: import('./types').MoneyByCurrency;
  share: string;
  status: string;
};

export function productPortfolioColumns(
  density: Density = 'xlsx',
): TableColumnSpec<ProductPortfolioRow>[] {
  const compact = density === 'pdf';
  return [
    {
      id: 'product_portfolio.family',
      header: 'Product family',
      width: w(density, 100, 28),
      cell: (row) => row.family,
    },
    {
      id: 'product_portfolio.vendors',
      header: 'Key vendors',
      width: w(density, 100, 30),
      cell: (row) => row.vendors,
    },
    {
      id: 'product_portfolio.volume',
      header: 'Volume & mix',
      width: w(density, 60, 16),
      cell: (row) => row.volume,
    },
    {
      id: 'product_portfolio.value',
      header: 'Pipeline value',
      width: w(density, 80, 22),
      cell: (row) => formatMoneyMap(row.value, compact),
    },
    {
      id: 'product_portfolio.share',
      header: 'Share %',
      width: w(density, 40, 12),
      cell: (row) => row.share,
    },
    {
      id: 'product_portfolio.status',
      header: 'Status',
      width: w(density, 50, 14),
      cell: (row) => row.status,
    },
  ];
}

export type TeamEngagementRow = {
  product: string;
  accounts: string;
  volume: string;
  value: import('./types').MoneyByCurrency;
  stage: string;
  status: string;
};

export function teamEngagementColumns(
  density: Density = 'xlsx',
): TableColumnSpec<TeamEngagementRow>[] {
  const compact = density === 'pdf';
  return [
    {
      id: 'team_engagements.product',
      header: 'Product / solution',
      width: w(density, 110, 30),
      cell: (row) => row.product,
    },
    {
      id: 'team_engagements.accounts',
      header: 'Accounts & owners',
      width: w(density, 110, 30),
      cell: (row) => row.accounts,
    },
    {
      id: 'team_engagements.volume',
      header: 'Volume',
      width: w(density, 50, 14),
      cell: (row) => row.volume,
    },
    {
      id: 'team_engagements.value',
      header: 'Pipeline value',
      width: w(density, 80, 22),
      cell: (row) => formatMoneyMap(row.value, compact),
    },
    {
      id: 'team_engagements.stage',
      header: 'Stage',
      width: w(density, 60, 16),
      cell: (row) => row.stage,
    },
    {
      id: 'team_engagements.status',
      header: 'Status',
      width: w(density, 50, 14),
      cell: (row) => row.status,
    },
  ];
}
