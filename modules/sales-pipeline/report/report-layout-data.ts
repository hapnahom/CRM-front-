import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import {
  filterTotalPipelineCustomFields,
  inactiveAssignmentRoleColumnId,
  inactiveLostOnlyCustomFields,
  inactiveOpportunityCustomColumnId,
  INACTIVE_OPPORTUNITIES_EXPORT_EXCLUDED_COLUMN_IDS,
  mergeInactiveOpportunityCustomFields,
  mergePipelineCustomFields,
  primaryAssignmentRoles,
  projectTableColumns,
  resolveInactiveOpportunityCustomColumnId,
  resolvePipelineCustomColumnId,
  type ReportColumnGroupId,
} from './columns';
import { EMPTY, formatMoneyMap, formatPercent, winRate } from './format';
import type { ReportScopeLevel } from './report-visibility';
import {
  orgTeamColumns,
  productPortfolioColumns,
  salesRepColumns,
  teamEngagementColumns,
  inactiveOpportunityColumns,
  totalPipelineColumns,
  type ProductPortfolioRow,
  type TeamEngagementRow,
} from './table-columns';
import type {
  MoneyByCurrency,
  OrgUnitRow,
  ProductPipelineRow,
  RegistryRow,
  ReportSectionId,
  SalesPipelineReportData,
  SalesRepRow,
  TeamRow,
} from './types';

export type ReportKpiCard = {
  label: string;
  value: string;
  /** Right-aligned companion value (overview cards: ETB left, USD right). */
  valueRight?: string;
  /** Secondary currency line(s), shown smaller under the primary value. */
  valueSecondary?: string;
  context: string;
  valueColor?: string;
};

export type LayoutTable = {
  headers: string[];
  rows: Array<Array<string | number>>;
  widths: number[];
  stageColors?: Array<string | null | undefined>;
};

type Density = 'pdf' | 'xlsx';

/** True when the user selected at least one column in this modal group. */
export function hasSelectedGroupColumns(
  report: SalesPipelineReportData,
  groupId: ReportColumnGroupId,
) {
  const prefix = `${groupId}.`;
  return report.meta.selectedColumnIds.some((id) => id.startsWith(prefix));
}

export function hasSection(
  report: SalesPipelineReportData,
  id: ReportSectionId,
) {
  return report.meta.selectedSections.includes(id);
}

export function scopeExportLabel(
  level: ReportScopeLevel | null | undefined,
): string {
  if (level === 'company') return 'Executive';
  if (level === 'department') return 'Department';
  if (level === 'team') return 'Team';
  if (level === 'personal') return 'My Report';
  return 'Report';
}

export function targetCardTitle(
  level: ReportScopeLevel | null | undefined,
): string {
  if (level === 'department') return 'DEPARTMENT TARGET';
  if (level === 'team') return 'TEAM TARGET';
  if (level === 'personal') return 'INDIVIDUAL TARGET';
  return 'COMPANY TARGET';
}

function moneyPart(
  money: MoneyByCurrency,
  currency: string,
  compact = false,
): string {
  const amount = money[currency];
  if (amount == null || amount === 0) return EMPTY;
  return formatMoneyMap({ [currency]: amount }, compact);
}

/** Prefer ETB as the primary amount; remaining currencies as a secondary line. */
export function splitMoneyPrimarySecondary(
  money: MoneyByCurrency,
  preferredOrder: string[] = ['ETB', 'USD'],
  compact = true,
): { primary: string; secondary?: string } {
  const codes = [
    ...preferredOrder.filter((code) => (money[code] ?? 0) !== 0),
    ...Object.keys(money)
      .filter(
        (code) => !preferredOrder.includes(code) && (money[code] ?? 0) !== 0,
      )
      .sort(),
  ];
  if (!codes.length) {
    const fallback = preferredOrder[0] || Object.keys(money)[0];
    return {
      primary: fallback
        ? formatMoneyMap({ [fallback]: money[fallback] ?? 0 }, compact)
        : EMPTY,
    };
  }
  const [primaryCode, ...rest] = codes;
  return {
    primary: formatMoneyMap(
      { [primaryCode!]: money[primaryCode!] ?? 0 },
      compact,
    ),
    secondary: rest.length
      ? rest
          .map((code) => formatMoneyMap({ [code]: money[code] ?? 0 }, compact))
          .join(' · ')
      : undefined,
  };
}

function volumeMix(leads: number, deals: number): string {
  const parts: string[] = [];
  if (isLeadsEnabled() && leads) {
    parts.push(`${leads} Lead${leads === 1 ? '' : 's'}`);
  }
  if (deals) {
    parts.push(
      `${deals} ${dealUiLabel({ plural: deals !== 1, lowercase: true })}`,
    );
  }
  return parts.length ? parts.join(' · ') : EMPTY;
}

function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name || EMPTY;
  const last = parts[parts.length - 1]!;
  return `${parts[0]} ${last[0]}.`;
}

/** Win rate per currency from closed-won vs lost deal values. */
export function winRateByCurrencyValues(
  wonRevenue: MoneyByCurrency,
  lostValue: MoneyByCurrency,
  currencies: string[],
): Record<string, number | null> {
  return Object.fromEntries(
    currencies.map((currency) => {
      const won = wonRevenue[currency] ?? 0;
      const lost = lostValue[currency] ?? 0;
      return [currency, winRate(won, lost)];
    }),
  );
}

function formatWinRateCurrency(
  currency: string,
  rate: number | null | undefined,
): string {
  return rate == null ? `${currency} —` : `${currency} ${Math.round(rate)}%`;
}

function currencyWinRateLine(
  rates: Record<string, number | null>,
  currencies: string[],
): string {
  return currencies
    .map((currency) => formatWinRateCurrency(currency, rates[currency]))
    .join(' · ');
}

function currencyMoneyLine(
  money: MoneyByCurrency,
  currencies: string[],
  compact = true,
): string {
  return currencies
    .map((currency) =>
      formatMoneyMap({ [currency]: money[currency] ?? 0 }, compact),
    )
    .join(' · ');
}

const PIPELINE_TARGET_MULTIPLIER = 3;

function formatOverviewCurrencyMoney(currency: string, amount: number): string {
  return formatMoneyMap({ [currency]: amount }, true);
}

/** KPI cards aligned above the overview charts on the executive page. */
export function buildOverviewKpiCards(
  report: SalesPipelineReportData,
): ReportKpiCard[] {
  const { summary } = report;
  const currencies = ['ETB', 'USD'];
  const pipelineCount =
    summary.totalDeals + (isLeadsEnabled() ? summary.totalLeads : 0);
  const winRates =
    summary.winRateByCurrency ??
    winRateByCurrencyValues(summary.wonRevenue, summary.lostValue, currencies);
  const quarterlyTargetRow = (currency: string) =>
    summary.achievementByCurrency.find(
      (row) => row.currency.toUpperCase() === currency,
    );
  const pipelineTargetEtb =
    (quarterlyTargetRow('ETB')?.target ?? 0) * PIPELINE_TARGET_MULTIPLIER;
  const pipelineTargetUsd =
    (quarterlyTargetRow('USD')?.target ?? 0) * PIPELINE_TARGET_MULTIPLIER;
  const hasPipelineTarget = pipelineTargetEtb > 0 || pipelineTargetUsd > 0;
  const achievementRates = summary.pipelineAchievementByCurrency ?? {};
  const achievementConfigured = summary.pipelineAchievementConfigured === true;
  const hasAchievementValue =
    achievementConfigured &&
    currencies.some((currency) => achievementRates[currency] != null);
  const sdConfigured = summary.sdConversionConfigured === true;
  const sdRates = summary.sdConversionRateByCurrency ?? {};
  const sdLabel =
    summary.sdConversionMetricName?.trim() || 'SD CONVERSION RATE';
  const stagnationConfigured = summary.stagnationConfigured === true;
  const salesCycleConfigured = summary.salesCycleConfigured === true;

  const cards: ReportKpiCard[] = [
    {
      label: 'TOTAL PIPELINE',
      value: `${pipelineCount} pipeline${pipelineCount === 1 ? '' : 's'}`,
      context: currencyMoneyLine(summary.totalPipeline, currencies),
    },
    {
      label: 'WIN RATE',
      value: formatWinRateCurrency('ETB', winRates.ETB),
      valueRight: formatWinRateCurrency('USD', winRates.USD),
      context: EMPTY,
    },
    {
      label: 'PIPELINE TARGET',
      value: formatOverviewCurrencyMoney('ETB', pipelineTargetEtb),
      valueRight: formatOverviewCurrencyMoney('USD', pipelineTargetUsd),
      context: hasPipelineTarget ? '3× quarterly target' : 'Not configured yet',
      valueColor: hasPipelineTarget ? undefined : '#94A3B8',
    },
    {
      label: 'PIPELINE ACHIEVEMENT',
      value: formatWinRateCurrency('ETB', achievementRates.ETB),
      valueRight: formatWinRateCurrency('USD', achievementRates.USD),
      context: !achievementConfigured
        ? 'Not configured yet'
        : hasAchievementValue
          ? 'Qualified pipeline ÷ pipeline target'
          : hasPipelineTarget
            ? 'No qualified pipeline or target for period'
            : 'Not configured yet',
      valueColor:
        achievementConfigured && hasAchievementValue ? undefined : '#94A3B8',
    },
  ];

  if (sdConfigured) {
    cards.push({
      label: sdLabel.toUpperCase(),
      value: formatWinRateCurrency('ETB', sdRates.ETB ?? 0),
      valueRight: formatWinRateCurrency('USD', sdRates.USD ?? 0),
      context:
        summary.sdConversionDetail ??
        'Target exits ÷ completed exits from source stage',
    });
  }

  if (stagnationConfigured) {
    cards.push({
      label: `STAGNANT ${dealUiLabel({ plural: true }).toUpperCase()}`,
      value:
        summary.stagnantDealCount != null
          ? String(summary.stagnantDealCount)
          : '—',
      context:
        summary.stagnationThresholdDays != null
          ? `Open ${dealUiLabel({ plural: true, lowercase: true })} with no stage move for ${summary.stagnationThresholdDays}+ days`
          : 'Stagnation threshold configured',
    });
  }

  if (salesCycleConfigured) {
    cards.push({
      label: 'AVG SALES CYCLE',
      value:
        summary.salesCycleAverageDays != null
          ? `${Math.round(summary.salesCycleAverageDays)} days`
          : '—',
      context:
        summary.salesCycleDetail ??
        `${summary.salesCycleCompletedCycles} completed cycle${summary.salesCycleCompletedCycles === 1 ? '' : 's'}`,
      valueColor: summary.salesCycleAverageDays != null ? undefined : '#94A3B8',
    });
  }

  return cards;
}

export function buildKpiCards(
  report: SalesPipelineReportData,
): [ReportKpiCard, ReportKpiCard, ReportKpiCard, ReportKpiCard] {
  const { summary, meta } = report;
  const recordCount =
    meta.recordCount || summary.totalDeals + summary.totalLeads;
  const preferred = [
    'ETB',
    'USD',
    ...meta.currencies.filter((c) => c !== 'ETB' && c !== 'USD'),
  ];
  const wonSplit = splitMoneyPrimarySecondary(
    summary.wonRevenue,
    preferred,
    true,
  );
  const targetSplit = splitMoneyPrimarySecondary(
    summary.target,
    preferred,
    true,
  );
  const remainingSplit = splitMoneyPrimarySecondary(
    summary.remaining,
    preferred,
    true,
  );

  return [
    {
      label: 'TOTAL ACTIVE PIPELINE',
      value: `${recordCount} record${recordCount === 1 ? '' : 's'}`,
      context: formatMoneyMap(summary.openPipeline, true),
    },
    {
      label: 'CLOSED WON REVENUE',
      value: wonSplit.primary,
      valueSecondary: wonSplit.secondary,
      context: `${summary.wonDeals} ${dealUiLabel({ plural: summary.wonDeals !== 1, lowercase: true })} won · ${currencyWinRateLine(
        summary.winRateByCurrency ??
          winRateByCurrencyValues(
            summary.wonRevenue,
            summary.lostValue,
            preferred,
          ),
        preferred,
      )}`,
      valueColor: '#059669',
    },
    {
      label: targetCardTitle(meta.permissionScopeLevel),
      value: targetSplit.primary,
      valueSecondary: targetSplit.secondary,
      context: `Remaining Gap: ${
        remainingSplit.secondary
          ? `${remainingSplit.primary} · ${remainingSplit.secondary}`
          : remainingSplit.primary
      }`,
    },
    {
      label: isLeadsEnabled()
        ? 'DROPPED / LOST DEALS'
        : 'DROPPED / LOST OPPORTUNITIES',
      value: `${summary.lostDeals} ${dealUiLabel({ plural: summary.lostDeals !== 1, lowercase: true })}`,
      context: `${
        summary.churnRate == null
          ? EMPTY
          : `${Math.round(summary.churnRate)}% Churn`
      }${
        moneyTotalNonZero(summary.lostValue)
          ? ` · ${formatMoneyMap(summary.lostValue, true)}`
          : ''
      }`,
      valueColor: '#DC2626',
    },
  ];
}

function moneyTotalNonZero(money: MoneyByCurrency): boolean {
  return Object.values(money).some((amount) => amount !== 0);
}

function collectProductPortfolioRows(
  products: ProductPipelineRow[],
  registry: RegistryRow[],
): ProductPortfolioRow[] {
  const byFamily = new Map<
    string,
    {
      family: string;
      vendors: Set<string>;
      leads: number;
      deals: number;
      value: MoneyByCurrency;
      stages: Set<string>;
    }
  >();

  for (const row of registry) {
    const families = (row.productFamily || 'Unassigned')
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
    const vendors = (row.vendor || '')
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
    const keys = families.length ? families : ['Unassigned'];
    for (const family of keys) {
      const existing = byFamily.get(family) ?? {
        family,
        vendors: new Set<string>(),
        leads: 0,
        deals: 0,
        value: {},
        stages: new Set<string>(),
      };
      if (row.recordType === 'Lead') existing.leads += 1;
      else existing.deals += 1;
      if (row.value) {
        existing.value[row.currency] =
          (existing.value[row.currency] ?? 0) + row.value;
      }
      existing.stages.add(row.stage);
      for (const vendor of vendors) existing.vendors.add(vendor);
      byFamily.set(family, existing);
    }
  }

  if (!byFamily.size) {
    for (const product of products) {
      byFamily.set(product.label, {
        family: product.label,
        vendors: new Set(),
        leads: 0,
        deals: product.count,
        value: { ...product.value },
        stages: new Set(),
      });
    }
  }

  const list = [...byFamily.values()].sort(
    (a, b) =>
      Object.values(b.value).reduce((s, n) => s + n, 0) -
      Object.values(a.value).reduce((s, n) => s + n, 0),
  );
  const totalValue = list.reduce(
    (sum, row) =>
      sum + Object.values(row.value).reduce((inner, n) => inner + n, 0),
    0,
  );

  const rows: ProductPortfolioRow[] = list.map((row) => {
    const rowTotal = Object.values(row.value).reduce((s, n) => s + n, 0);
    const share =
      totalValue > 0 ? Math.round((rowTotal / totalValue) * 100) : 0;
    return {
      family: row.family,
      vendors: [...row.vendors].slice(0, 3).join('\n') || EMPTY,
      volume: volumeMix(row.leads, row.deals),
      value: { ...row.value },
      share: share ? `${share}%` : '< 1%',
      status: [...row.stages].slice(0, 2).join(' · ') || 'Active',
    };
  });

  if (list.length) {
    const rollupValue: MoneyByCurrency = {};
    let leads = 0;
    let deals = 0;
    for (const row of list) {
      leads += row.leads;
      deals += row.deals;
      for (const [code, amount] of Object.entries(row.value)) {
        rollupValue[code] = (rollupValue[code] ?? 0) + amount;
      }
    }
    rows.push({
      family: 'Total Allocated Portfolio',
      vendors: 'Multi-Vendor Technology Ecosystem',
      volume: volumeMix(leads, deals),
      value: rollupValue,
      share: '100%',
      status: 'Full Rollup',
    });
  }

  return rows;
}

/** Product portfolio — headers match the report modal column labels. */
export function buildProductPortfolioRows(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'product_portfolio')) {
    return { headers: [], rows: [], widths: [] };
  }
  const data = collectProductPortfolioRows(
    report.productPipeline,
    report.pipelineRegistry,
  );
  const projected = projectTableColumns(
    productPortfolioColumns(density),
    report.meta.selectedColumnIds,
    data,
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
  };
}

export function buildOrgHierarchyRows(
  orgUnits: OrgUnitRow[],
  teams: TeamRow[],
  salesReps: SalesRepRow[],
  currencies: string[],
): {
  headers: string[];
  rows: Array<Array<string | number>>;
  widths: number[];
} {
  const [etb, usd] = [
    currencies[0] || 'ETB',
    currencies[1] ||
      currencies.find((c) => c !== (currencies[0] || 'ETB')) ||
      '',
  ];
  const headers = [
    'DEPARTMENT / TEAM ORGANIZATION',
    'TEAM SIZE & KEY REPS',
    'VOLUME & MIX',
    `OPEN ${etb} PIPE`,
    usd ? `OPEN ${usd} PIPE` : 'OPEN PIPE (ALT)',
    `REALIZED WON (${etb})`,
    'ATTAINMENT',
  ];

  const byDept = new Map<string, OrgUnitRow[]>();
  for (const unit of orgUnits) {
    const key = unit.department || 'Unassigned';
    const list = byDept.get(key) ?? [];
    list.push(unit);
    byDept.set(key, list);
  }

  const rows: Array<Array<string | number>> = [];
  const companyPipe: MoneyByCurrency = {};
  const companyWon: MoneyByCurrency = {};
  let companyLeads = 0;
  let companyDeals = 0;
  let companyReps = 0;

  for (const [department, units] of byDept) {
    const deptReps = salesReps.filter((rep) => rep.department === department);
    const deptTeams = teams.filter((team) => team.department === department);
    rows.push([
      `🏢 ${department} (${units.length} Team${units.length === 1 ? '' : 's'} · ${deptReps.length} Representative${deptReps.length === 1 ? '' : 's'})`,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    const deptPipe: MoneyByCurrency = {};
    const deptWon: MoneyByCurrency = {};
    let deptLeads = 0;
    let deptDeals = 0;

    for (const unit of units) {
      const teamReps = salesReps.filter((rep) => rep.team === unit.team);
      const teamMeta = deptTeams.find((team) => team.name === unit.team);
      const won = teamMeta?.won ?? {};
      for (const [code, amount] of Object.entries(unit.pipeline)) {
        deptPipe[code] = (deptPipe[code] ?? 0) + amount;
        companyPipe[code] = (companyPipe[code] ?? 0) + amount;
      }
      for (const [code, amount] of Object.entries(won)) {
        deptWon[code] = (deptWon[code] ?? 0) + amount;
        companyWon[code] = (companyWon[code] ?? 0) + amount;
      }
      deptLeads += unit.leads;
      deptDeals += unit.deals;
      companyLeads += unit.leads;
      companyDeals += unit.deals;

      rows.push([
        unit.team || EMPTY,
        teamReps
          .map((rep) => shortenName(rep.name))
          .slice(0, 3)
          .join(' & ') || EMPTY,
        volumeMix(unit.leads, unit.deals),
        moneyPart(unit.pipeline, etb, false),
        usd ? moneyPart(unit.pipeline, usd, false) : EMPTY,
        moneyPart(won, etb, false),
        teamMeta?.winRate != null
          ? formatPercent(teamMeta.winRate)
          : unit.coverageLabel || EMPTY,
      ]);
    }

    companyReps += deptReps.length;
    rows.push([
      `${department} Subtotal`,
      `${deptReps.length} Representatives`,
      volumeMix(deptLeads, deptDeals),
      moneyPart(deptPipe, etb, false),
      usd ? moneyPart(deptPipe, usd, false) : EMPTY,
      moneyPart(deptWon, etb, false),
      'Dept Rollup',
    ]);
  }

  if (rows.length) {
    rows.push([
      'Total Company Portfolio',
      `${companyReps} Reps & Solution Engineers`,
      volumeMix(companyLeads, companyDeals),
      moneyPart(companyPipe, etb, false),
      usd ? moneyPart(companyPipe, usd, false) : EMPTY,
      moneyPart(companyWon, etb, false),
      'Full Rollup',
    ]);
  }

  return { headers, rows, widths: [30, 26, 16, 16, 16, 16, 14] };
}

/** Sales reps — headers match the report modal column labels. */
export function buildSalesRepRows(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'sales_reps')) {
    return { headers: [], rows: [], widths: [] };
  }
  const columns = salesRepColumns(density);
  const selectedSet = new Set(report.meta.selectedColumnIds);
  const orderedSelectedIds = columns
    .map((column) => column.id)
    .filter((id) => selectedSet.has(id));
  const projected = projectTableColumns(
    columns,
    orderedSelectedIds,
    report.salesReps,
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
  };
}

/** Team / org units — headers match the report modal column labels. */
export function buildOrgTeamsTable(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'org_teams')) {
    return { headers: [], rows: [], widths: [] };
  }
  const projected = projectTableColumns(
    orgTeamColumns(density),
    report.meta.selectedColumnIds,
    report.orgUnits,
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
  };
}

function collectTeamEngagementRows(
  registry: RegistryRow[],
): TeamEngagementRow[] {
  const byProduct = new Map<
    string,
    {
      product: string;
      accounts: Set<string>;
      owners: Set<string>;
      leads: number;
      deals: number;
      value: MoneyByCurrency;
      stages: Set<string>;
    }
  >();

  for (const row of registry) {
    const products = (row.product || row.productFamily || 'Unassigned')
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
    const keys = products.length ? products : ['Unassigned'];
    for (const product of keys) {
      const existing = byProduct.get(product) ?? {
        product,
        accounts: new Set<string>(),
        owners: new Set<string>(),
        leads: 0,
        deals: 0,
        value: {},
        stages: new Set<string>(),
      };
      if (row.customer) existing.accounts.add(row.customer);
      if (row.owner) existing.owners.add(shortenName(row.owner));
      if (row.recordType === 'Lead') existing.leads += 1;
      else existing.deals += 1;
      if (row.value) {
        existing.value[row.currency] =
          (existing.value[row.currency] ?? 0) + row.value;
      }
      existing.stages.add(`${row.recordType} · ${row.stage}`);
      byProduct.set(product, existing);
    }
  }

  const list = [...byProduct.values()];
  const rows: TeamEngagementRow[] = list.map((row) => ({
    product: row.product,
    accounts: `${[...row.accounts].slice(0, 2).join(' & ') || EMPTY} · ${
      [...row.owners].slice(0, 2).join(' & ') || EMPTY
    }`,
    volume: volumeMix(row.leads, row.deals),
    value: { ...row.value },
    stage: [...row.stages].slice(0, 2).join(' · ') || EMPTY,
    status: 'Active Engagement',
  }));

  if (rows.length) {
    const rollupValue: MoneyByCurrency = {};
    let leads = 0;
    let deals = 0;
    for (const row of list) {
      leads += row.leads;
      deals += row.deals;
      for (const [code, amount] of Object.entries(row.value)) {
        rollupValue[code] = (rollupValue[code] ?? 0) + amount;
      }
    }
    rows.push({
      product: 'Team Portfolio Rollup',
      accounts: `${list.length} Solution Engagements`,
      volume: volumeMix(leads, deals),
      value: rollupValue,
      stage: EMPTY,
      status: 'Full Rollup',
    });
  }

  return rows;
}

/** Team solution engagements — headers match the report modal column labels. */
export function buildTeamEngagementRows(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'team_engagements')) {
    return { headers: [], rows: [], widths: [] };
  }
  const data = collectTeamEngagementRows(report.pipelineRegistry);
  const projected = projectTableColumns(
    teamEngagementColumns(density),
    report.meta.selectedColumnIds,
    data,
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
  };
}

export function buildDeptTeamProductRows(
  orgUnits: OrgUnitRow[],
  salesReps: SalesRepRow[],
  registry: RegistryRow[],
  currencies: string[],
): {
  headers: string[];
  rows: Array<Array<string | number>>;
  widths: number[];
} {
  const [etb, usd] = [currencies[0] || 'ETB', currencies[1] || ''];
  const rows = orgUnits.map((unit) => {
    const reps = salesReps.filter((rep) => rep.team === unit.team);
    const teamRecords = registry.filter((row) => row.team === unit.team);
    const products = [
      ...new Set(
        teamRecords
          .flatMap((row) =>
            (row.product || row.productFamily || '')
              .split('\n')
              .map((part) => part.trim())
              .filter(Boolean),
          )
          .slice(0, 3),
      ),
    ].join(' & ');
    const target = reps.find((rep) => rep.target)?.target;
    return [
      unit.team || EMPTY,
      products || EMPTY,
      reps.map((rep) => shortenName(rep.name)).join(' & ') || EMPTY,
      volumeMix(unit.leads, unit.deals),
      moneyPart(unit.pipeline, etb, false),
      usd ? moneyPart(unit.pipeline, usd, false) : EMPTY,
      target
        ? `Target: ${formatMoneyMap(target, true)}`
        : unit.coverageLabel || EMPTY,
    ];
  });
  if (rows.length) {
    const pipe: MoneyByCurrency = {};
    let leads = 0;
    let deals = 0;
    for (const unit of orgUnits) {
      leads += unit.leads;
      deals += unit.deals;
      for (const [code, amount] of Object.entries(unit.pipeline)) {
        pipe[code] = (pipe[code] ?? 0) + amount;
      }
    }
    rows.push([
      'Department Rollup',
      'All Active Solutions',
      `${salesReps.length} Reps Portfolio`,
      volumeMix(leads, deals),
      moneyPart(pipe, etb, false),
      usd ? moneyPart(pipe, usd, false) : EMPTY,
      'Dept Attainment',
    ]);
  }
  return {
    headers: [
      'SECTOR TEAM',
      'ACTIVE PRODUCTS & SOLUTIONS',
      'REPRESENTATIVES',
      'VOLUME & MIX',
      `${etb} PIPELINE`,
      usd ? `${usd} PIPELINE` : 'ALT PIPELINE',
      'TARGET / REALIZATION',
    ],
    rows,
    widths: [26, 30, 24, 14, 16, 16, 20],
  };
}

/** Total pipeline registry — headers match the report modal column labels. */
export function buildPipelineSheetTable(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'total_pipeline')) {
    return { headers: [], rows: [], widths: [] };
  }
  const totalPipelineCustom = filterTotalPipelineCustomFields(report.meta);
  const mergedCustomFields = mergePipelineCustomFields(
    totalPipelineCustom.dealCustomFields,
    totalPipelineCustom.leadCustomFields,
  );
  const selectedPipelineIds = new Set(
    report.meta.selectedColumnIds
      .filter((id) => id.startsWith('total_pipeline.'))
      .map((id) => resolvePipelineCustomColumnId(id, mergedCustomFields)),
  );
  const allPipelineColumns = totalPipelineColumns(
    totalPipelineCustom.dealCustomFields,
    totalPipelineCustom.leadCustomFields,
    density,
    report.meta.assignmentRoles,
  );
  const pipelineSelectedIds = allPipelineColumns
    .map((column) => column.id)
    .filter((id) => selectedPipelineIds.has(id));
  const projected = projectTableColumns(
    allPipelineColumns,
    pipelineSelectedIds,
    report.pipelineRegistry,
    {
      stageColumnId: 'total_pipeline.stage',
      stageColBase: 0,
    },
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
    stageColors:
      projected.stageColors ??
      report.pipelineRegistry.map((row) => row.stageColor),
  };
}

/** Inactive and lost opportunities — headers match the report modal column labels. */
export function buildInactiveOpportunitiesSheetTable(
  report: SalesPipelineReportData,
  density: Density = 'xlsx',
): LayoutTable {
  if (!hasSelectedGroupColumns(report, 'inactive_opportunities')) {
    return { headers: [], rows: [], widths: [] };
  }
  const inactiveCustom = inactiveLostOnlyCustomFields(report.meta);
  const mergedCustomFields = mergeInactiveOpportunityCustomFields(
    inactiveCustom.dealCustomFields,
    inactiveCustom.leadCustomFields,
  );
  const allowedCustomColumnIds = new Set(
    mergedCustomFields.map((field) => inactiveOpportunityCustomColumnId(field)),
  );
  const exportAssignmentRoles = primaryAssignmentRoles(
    report.meta.assignmentRoles,
  );
  const allowedRoleColumnIds = new Set(
    exportAssignmentRoles.map((role) =>
      inactiveAssignmentRoleColumnId(role.id),
    ),
  );
  const inactiveSelectedIds = report.meta.selectedColumnIds
    .filter((id) => id.startsWith('inactive_opportunities.'))
    .filter((id) => !INACTIVE_OPPORTUNITIES_EXPORT_EXCLUDED_COLUMN_IDS.has(id))
    .filter(
      (id) =>
        !id.startsWith('inactive_opportunities.role:') ||
        allowedRoleColumnIds.has(id),
    )
    .filter((id) => {
      if (
        !id.startsWith('inactive_opportunities.custom:') &&
        !id.startsWith('inactive_opportunities.group:') &&
        !id.startsWith('inactive_opportunities.deal_custom:') &&
        !id.startsWith('inactive_opportunities.lead_custom:')
      ) {
        return true;
      }
      return allowedCustomColumnIds.has(
        resolveInactiveOpportunityCustomColumnId(id, mergedCustomFields),
      );
    })
    .map((id) =>
      resolveInactiveOpportunityCustomColumnId(id, mergedCustomFields),
    );
  const projected = projectTableColumns(
    inactiveOpportunityColumns(
      inactiveCustom.dealCustomFields,
      inactiveCustom.leadCustomFields,
      density,
      exportAssignmentRoles,
    ),
    inactiveSelectedIds,
    report.inactiveOpportunitiesRegistry,
    {
      stageColumnId: 'inactive_opportunities.stage',
      stageColBase: 0,
    },
  );
  return {
    headers: projected.headers,
    rows: projected.data,
    widths: projected.widths,
    stageColors:
      projected.stageColors ??
      report.inactiveOpportunitiesRegistry.map((row) => row.stageColor),
  };
}
