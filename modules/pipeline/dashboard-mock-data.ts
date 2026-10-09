export type DashboardPeriod = 'daily' | 'weekly' | 'monthly' | 'quarter';

export type DashboardScope = 'executive' | 'department' | 'team' | 'member';

export type MockTeam = {
  id: string;
  name: string;
  /** Short description shown on rectangular team filter chips. */
  description: string;
};

export type MockRepresentative = {
  id: string;
  name: string;
  teamId: string;
  /** Optional photo URL; chips fall back to initials when missing. */
  avatarUrl?: string;
};

export type MockSolution = {
  id: string;
  name: string;
};

export type PeriodTotals = Record<DashboardPeriod, number>;

export type PeriodValueTotals = Record<DashboardPeriod, number>;

export type StageConversionItem = {
  id: string;
  name: string;
  customer: string;
  value: string;
  owner: string;
  convertedAt: string;
  teamId: string;
  repId: string;
  solutionId?: string;
};

export type StageConversion = {
  id: string;
  fromStage: string;
  toStage: string;
  count: number;
  teamId: string;
  teamName: string;
  repId: string;
  repName: string;
  items: StageConversionItem[];
};

/**
 * A lead/deal can be assigned to:
 * - one sales team + one sales member
 * - one or more pre-sales teams + one or more pre-sales members
 * - one or more channel members
 */
export type HighValueRecord = {
  id: string;
  name: string;
  customer: string;
  value: string;
  valueAmount: number;
  currency: 'ETB' | 'USD';
  stage: string;
  owner: string;
  teamId: string;
  teamName: string;
  repId: string;
  presalesTeamIds: string[];
  presalesRepIds: string[];
  channelRepIds: string[];
  solutionId?: string;
  pqqScore?: number;
};

export type DashboardCurrency = 'ETB' | 'USD';

export type DashboardFilters = {
  salesTeamId?: string;
  salesRepId?: string;
  /** Match records that include any of these pre-sales teams. */
  presalesTeamIds?: string[];
  /** Match records that include any of these pre-sales members. */
  presalesRepIds?: string[];
  /** Match records that include any of these channel members. */
  channelRepIds?: string[];
  solutionId?: string;
  /** When set, only records in this currency are included. */
  currency?: DashboardCurrency;
};

export const MOCK_SALES_TEAMS: MockTeam[] = [
  {
    id: 'team-bfsi',
    name: 'BFSI',
    description: 'Banking & financial services',
  },
  {
    id: 'team-public',
    name: 'Public & Corporate',
    description: 'Government & enterprise',
  },
  {
    id: 'team-corp-intl',
    name: 'Corporate & International',
    description: 'Regional & cross-border',
  },
  {
    id: 'team-channel',
    name: 'Channel & Business Development',
    description: 'Partners & alliances',
  },
];

export const MOCK_PRESALES_TEAMS: MockTeam[] = [
  {
    id: 'presales-encs',
    name: 'ENCS',
    description: 'Enterprise network & cyber',
  },
  {
    id: 'presales-itf',
    name: 'ITF',
    description: 'Infrastructure & platforms',
  },
  {
    id: 'presales-scss',
    name: 'System, Cloud & Software Solution',
    description: 'Cloud & software solutions',
  },
];

export const MOCK_REPRESENTATIVES: MockRepresentative[] = [
  { id: 'rep-lh', name: 'Liya Haile', teamId: 'team-bfsi' },
  { id: 'rep-mg', name: 'Mikiyas Getu', teamId: 'team-public' },
  { id: 'rep-sm', name: 'Sara Mohammed', teamId: 'team-corp-intl' },
  { id: 'rep-nt', name: 'Nahom Tadesse', teamId: 'team-corp-intl' },
  { id: 'rep-da', name: 'Dawit Alemu', teamId: 'team-channel' },
  { id: 'rep-mf', name: 'Marta Fikru', teamId: 'team-channel' },
  { id: 'rep-et', name: 'Eden Tesfaye', teamId: 'team-public' },
];

export const MOCK_PRESALES_MEMBERS: MockRepresentative[] = [
  { id: 'pre-ba', name: 'Betelhem Assefa', teamId: 'presales-encs' },
  { id: 'pre-ad', name: 'Abel Daniel', teamId: 'presales-encs' },
  { id: 'pre-ys', name: 'Yared Solomon', teamId: 'presales-scss' },
  { id: 'pre-rk', name: 'Rahel Kebede', teamId: 'presales-itf' },
];

export const MOCK_CHANNEL_MEMBERS: MockRepresentative[] = [
  { id: 'chn-da', name: 'Dawit Alemu', teamId: 'team-channel' },
  { id: 'chn-mf', name: 'Marta Fikru', teamId: 'team-channel' },
  { id: 'chn-et', name: 'Eden Tesfaye', teamId: 'team-channel' },
];

export const MOCK_SOLUTIONS: MockSolution[] = [
  { id: 'sol-encs', name: 'ENCS' },
  { id: 'sol-itf', name: 'ITF' },
  { id: 'sol-scss', name: 'System, Cloud & Software Solution' },
  { id: 'sol-bfsi', name: 'BFSI Solutions' },
  { id: 'sol-public', name: 'Public & Corporate' },
  { id: 'sol-corp', name: 'Corporate & International' },
  { id: 'sol-channel', name: 'Channel & BD' },
];

export const MOCK_LEAD_HIGH_VALUE: HighValueRecord[] = [
  {
    id: 'LD-1048',
    name: 'Core Banking Modernization',
    customer: 'Blue Nile Bank',
    value: 'ETB 18.4M',
    valueAmount: 18_400_000,
    currency: 'ETB',
    stage: 'Negotiation',
    owner: 'Liya Haile',
    teamId: 'team-bfsi',
    teamName: 'BFSI',
    repId: 'rep-lh',
    presalesTeamIds: ['presales-scss', 'presales-encs'],
    presalesRepIds: ['pre-ys', 'pre-ba'],
    channelRepIds: ['chn-mf'],
  },
  {
    id: 'LD-1051',
    name: 'Public Cloud Landing Zone',
    customer: 'Ministry of Digital Services',
    value: 'ETB 12.7M',
    valueAmount: 12_700_000,
    currency: 'ETB',
    stage: 'Proposal Sent',
    owner: 'Mikiyas Getu',
    teamId: 'team-public',
    teamName: 'Public & Corporate',
    repId: 'rep-mg',
    presalesTeamIds: ['presales-scss'],
    presalesRepIds: ['pre-ys'],
    channelRepIds: ['chn-da', 'chn-et'],
  },
  {
    id: 'LD-1055',
    name: 'Regional Data Platform',
    customer: 'East Africa Logistics',
    value: 'USD 245K',
    valueAmount: 245_000,
    currency: 'USD',
    stage: 'Qualified',
    owner: 'Sara Mohammed',
    teamId: 'team-corp-intl',
    teamName: 'Corporate & International',
    repId: 'rep-sm',
    presalesTeamIds: ['presales-itf', 'presales-scss'],
    presalesRepIds: ['pre-rk', 'pre-ys'],
    channelRepIds: [],
  },
  {
    id: 'LD-1058',
    name: 'Enterprise Network Refresh',
    customer: 'Ethio Manufacturing Group',
    value: 'ETB 7.9M',
    valueAmount: 7_900_000,
    currency: 'ETB',
    stage: 'Contacted',
    owner: 'Nahom Tadesse',
    teamId: 'team-corp-intl',
    teamName: 'Corporate & International',
    repId: 'rep-nt',
    presalesTeamIds: ['presales-encs'],
    presalesRepIds: ['pre-ba', 'pre-ad'],
    channelRepIds: [],
  },
  {
    id: 'LD-1060',
    name: 'Vendor Partnership Program',
    customer: 'CloudSphere MEA',
    value: 'ETB 5.2M',
    valueAmount: 5_200_000,
    currency: 'ETB',
    stage: 'New Lead',
    owner: 'Dawit Alemu',
    teamId: 'team-channel',
    teamName: 'Channel & Business Development',
    repId: 'rep-da',
    presalesTeamIds: ['presales-encs', 'presales-itf'],
    presalesRepIds: ['pre-ad', 'pre-rk'],
    channelRepIds: ['chn-da'],
  },
  {
    id: 'LD-1063',
    name: 'Managed Security Operations',
    customer: 'Horizon Telecom',
    value: 'ETB 9.6M',
    valueAmount: 9_600_000,
    currency: 'ETB',
    stage: 'Qualified',
    owner: 'Eden Tesfaye',
    teamId: 'team-public',
    teamName: 'Public & Corporate',
    repId: 'rep-et',
    presalesTeamIds: ['presales-encs'],
    presalesRepIds: ['pre-ad'],
    channelRepIds: ['chn-et', 'chn-mf'],
  },
];

export const MOCK_DEAL_HIGH_VALUE: HighValueRecord[] = [
  {
    id: 'DL-1048',
    name: 'Core Banking Modernization',
    customer: 'Blue Nile Bank',
    value: 'ETB 18.4M',
    valueAmount: 18_400_000,
    currency: 'ETB',
    stage: 'Negotiation',
    owner: 'Liya Haile',
    teamId: 'team-bfsi',
    teamName: 'BFSI',
    repId: 'rep-lh',
    solutionId: 'sol-bfsi',
    presalesTeamIds: ['presales-scss', 'presales-encs'],
    presalesRepIds: ['pre-ys', 'pre-ba'],
    channelRepIds: ['chn-mf'],
    pqqScore: 87,
  },
  {
    id: 'DL-1051',
    name: 'Public Cloud Landing Zone',
    customer: 'Ministry of Digital Services',
    value: 'ETB 12.7M',
    valueAmount: 12_700_000,
    currency: 'ETB',
    stage: 'Proposal',
    owner: 'Mikiyas Getu',
    teamId: 'team-public',
    teamName: 'Public & Corporate',
    repId: 'rep-mg',
    solutionId: 'sol-scss',
    presalesTeamIds: ['presales-scss'],
    presalesRepIds: ['pre-ys'],
    channelRepIds: ['chn-da', 'chn-et'],
    pqqScore: 92,
  },
  {
    id: 'DL-1055',
    name: 'Regional Data Platform',
    customer: 'East Africa Logistics',
    value: 'USD 245K',
    valueAmount: 245_000,
    currency: 'USD',
    stage: 'Discovery',
    owner: 'Sara Mohammed',
    teamId: 'team-corp-intl',
    teamName: 'Corporate & International',
    repId: 'rep-sm',
    solutionId: 'sol-corp',
    presalesTeamIds: ['presales-itf', 'presales-scss'],
    presalesRepIds: ['pre-rk', 'pre-ys'],
    channelRepIds: [],
    pqqScore: 78,
  },
  {
    id: 'DL-1062',
    name: 'Security Operations Center',
    customer: 'Horizon Telecom',
    value: 'ETB 9.6M',
    valueAmount: 9_600_000,
    currency: 'ETB',
    stage: 'Closed Won',
    owner: 'Marta Fikru',
    teamId: 'team-channel',
    teamName: 'Channel & Business Development',
    repId: 'rep-mf',
    solutionId: 'sol-encs',
    presalesTeamIds: ['presales-encs'],
    presalesRepIds: ['pre-ad'],
    channelRepIds: ['chn-mf', 'chn-da'],
    pqqScore: 84,
  },
  {
    id: 'DL-1065',
    name: 'National Identity Platform',
    customer: 'Federal ICT Authority',
    value: 'ETB 11.2M',
    valueAmount: 11_200_000,
    currency: 'ETB',
    stage: 'Proposal',
    owner: 'Eden Tesfaye',
    teamId: 'team-public',
    teamName: 'Public & Corporate',
    repId: 'rep-et',
    solutionId: 'sol-public',
    presalesTeamIds: ['presales-itf', 'presales-encs'],
    presalesRepIds: ['pre-rk', 'pre-ba'],
    channelRepIds: ['chn-et'],
    pqqScore: 81,
  },
  {
    id: 'DL-1068',
    name: 'Branch Network Expansion',
    customer: 'Awash Bank',
    value: 'ETB 8.1M',
    valueAmount: 8_100_000,
    currency: 'ETB',
    stage: 'Negotiation',
    owner: 'Nahom Tadesse',
    teamId: 'team-corp-intl',
    teamName: 'Corporate & International',
    repId: 'rep-nt',
    solutionId: 'sol-corp',
    presalesTeamIds: ['presales-encs'],
    presalesRepIds: ['pre-ba'],
    channelRepIds: [],
    pqqScore: 76,
  },
];

const LEAD_STAGE_FLOW = [
  { from: 'New Lead', to: 'Contacted' },
  { from: 'Contacted', to: 'Qualified' },
  { from: 'Qualified', to: 'Proposal Sent' },
  { from: 'Proposal Sent', to: 'Negotiation' },
];

const DEAL_STAGE_FLOW = [
  { from: 'Discovery', to: 'Proposal' },
  { from: 'Proposal', to: 'Negotiation' },
  { from: 'Negotiation', to: 'Closed Won' },
  { from: 'Negotiation', to: 'Closed Lost' },
];

/** Ordered stage names — mirrors the kanban column order so badge colors stay consistent. */
export const LEAD_STAGE_ORDER = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
];

export const DEAL_STAGE_ORDER = [
  'Discovery',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

/** Resolves the color-preset index for a mock stage name, for use with `pipelineStageAppearance`. */
export function getHighValueStageIndex(
  module: 'leads' | 'deals',
  stage: string,
): number {
  const order = module === 'leads' ? LEAD_STAGE_ORDER : DEAL_STAGE_ORDER;
  const index = order.indexOf(stage);
  return index === -1 ? 0 : index;
}

function buildConversions(
  module: 'leads' | 'deals',
  stageFlow: Array<{ from: string; to: string }>,
): StageConversion[] {
  const records =
    module === 'leads'
      ? MOCK_LEAD_HIGH_VALUE.map((r) => ({
          id: r.id,
          name: r.name,
          customer: r.customer,
          value: r.value,
          owner: r.owner,
          convertedAt: 'Jul 22, 2026',
          teamId: r.teamId,
          repId: r.repId,
          solutionId: r.solutionId,
        }))
      : MOCK_DEAL_HIGH_VALUE.map((r) => ({
          id: r.id,
          name: r.name,
          customer: r.customer,
          value: r.value,
          owner: r.owner,
          convertedAt: 'Jul 22, 2026',
          teamId: r.teamId,
          repId: r.repId,
          solutionId: r.solutionId,
        }));

  return stageFlow.flatMap((flow, flowIndex) =>
    MOCK_SALES_TEAMS.flatMap((team, teamIndex) => {
      const teamReps = MOCK_REPRESENTATIVES.filter((r) => r.teamId === team.id);
      const rep = teamReps[flowIndex % teamReps.length] ?? teamReps[0];
      if (!rep) return [];

      const teamRecords = records.filter((r) => r.teamId === team.id);
      const items = teamRecords.slice(0, 1 + (teamIndex % 2)).map((r) => ({
        ...r,
        convertedAt: r.convertedAt,
      }));

      return [
        {
          id: `${module}-${flow.from}-${flow.to}-${team.id}`,
          fromStage: flow.from,
          toStage: flow.to,
          count: items.length + (teamIndex % 3),
          teamId: team.id,
          teamName: team.name,
          repId: rep.id,
          repName: rep.name,
          items,
        },
      ];
    }),
  );
}

export const MOCK_LEAD_CONVERSIONS = buildConversions('leads', LEAD_STAGE_FLOW);
export const MOCK_DEAL_CONVERSIONS = buildConversions('deals', DEAL_STAGE_FLOW);

function includesAny(haystack: string[], needles: string[]): boolean {
  return needles.some((id) => haystack.includes(id));
}

export function matchesDashboardFilters(
  record: HighValueRecord,
  filters: DashboardFilters,
  scope: DashboardScope,
): boolean {
  if (filters.salesTeamId && record.teamId !== filters.salesTeamId) {
    return false;
  }
  if (filters.salesRepId && record.repId !== filters.salesRepId) {
    return false;
  }
  if (
    filters.presalesTeamIds?.length &&
    !includesAny(record.presalesTeamIds, filters.presalesTeamIds)
  ) {
    return false;
  }
  if (
    filters.presalesRepIds?.length &&
    !includesAny(record.presalesRepIds, filters.presalesRepIds)
  ) {
    return false;
  }
  if (
    filters.channelRepIds?.length &&
    !includesAny(record.channelRepIds, filters.channelRepIds)
  ) {
    return false;
  }
  if (filters.solutionId && record.solutionId !== filters.solutionId) {
    return false;
  }
  if (filters.currency && record.currency !== filters.currency) {
    return false;
  }
  if (scope === 'member' && !filters.salesRepId) {
    return record.repId === MOCK_REPRESENTATIVES[0]?.id;
  }
  return true;
}

export function getTopHighValueRecords(
  records: HighValueRecord[],
  filters: DashboardFilters,
  scope: DashboardScope,
  limit = 8,
): HighValueRecord[] {
  return records
    .filter((record) => matchesDashboardFilters(record, filters, scope))
    .sort((a, b) => b.valueAmount - a.valueAmount)
    .slice(0, limit);
}

export function getMockPeriodTotals(
  module: 'leads' | 'deals',
  scope: DashboardScope,
  filters: DashboardFilters = {},
): PeriodTotals {
  const source =
    module === 'leads' ? MOCK_LEAD_HIGH_VALUE : MOCK_DEAL_HIGH_VALUE;
  const matched = source.filter((record) =>
    matchesDashboardFilters(record, filters, scope),
  );
  const base = Math.max(matched.length, module === 'leads' ? 6 : 4);
  const multiplier =
    scope === 'executive'
      ? 4
      : scope === 'department'
        ? 2.5
        : scope === 'team'
          ? 1.5
          : 1;

  return {
    daily: Math.round(base * multiplier * 0.18),
    weekly: Math.round(base * multiplier * 0.62),
    monthly: Math.round(base * multiplier * 2.5),
    quarter: Math.round(base * multiplier * 7.5),
  };
}

/**
 * Mock pipeline value totals per period (ETB-equivalent for mixed currencies).
 * Scaled from the filtered set's summed valueAmount so filters update the card.
 */
export function getMockPeriodValueTotals(
  module: 'leads' | 'deals',
  scope: DashboardScope,
  filters: DashboardFilters = {},
): PeriodValueTotals {
  const source =
    module === 'leads' ? MOCK_LEAD_HIGH_VALUE : MOCK_DEAL_HIGH_VALUE;
  const matched = source.filter((record) =>
    matchesDashboardFilters(record, filters, scope),
  );
  const matchedSum = matched.reduce((sum, r) => sum + r.valueAmount, 0);
  const currency = filters.currency ?? 'ETB';
  const fallback =
    currency === 'USD'
      ? module === 'leads'
        ? 480_000
        : 520_000
      : module === 'leads'
        ? 54_000_000
        : 60_000_000;
  const base = Math.max(matchedSum, matched.length > 0 ? matchedSum : fallback);
  const multiplier =
    scope === 'executive'
      ? 3.2
      : scope === 'department'
        ? 2.2
        : scope === 'team'
          ? 1.4
          : 1;

  return {
    daily: Math.round(base * multiplier * 0.08),
    weekly: Math.round(base * multiplier * 0.28),
    monthly: Math.round(base * multiplier * 0.95),
    quarter: Math.round(base * multiplier * 2.8),
  };
}

function formatCompactNumber(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const scale = (value: number, suffix: string) => {
    const digits = value >= 10 ? 1 : 2;
    const compact = value
      .toFixed(digits)
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');
    return `${sign}${compact}${suffix}`;
  };

  if (abs >= 1_000_000_000_000) return scale(abs / 1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return scale(abs / 1_000_000_000, 'B');
  if (abs >= 1_000_000) return scale(abs / 1_000_000, 'M');
  if (abs >= 1_000) return scale(abs / 1_000, 'K');
  return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
}

/** Compact display for dashboard value totals in the selected currency. */
export function formatDashboardValue(
  amount: number,
  currency: string = 'ETB',
): string {
  const code = !currency || currency.toLowerCase() === 'all' ? '' : currency;
  const formatted = formatCompactNumber(Number.isFinite(amount) ? amount : 0);
  return code ? `${code} ${formatted}` : formatted;
}

export function getTeamPeriodBreakdown(
  module: 'leads' | 'deals',
  period: DashboardPeriod,
): Array<{ teamId: string; teamName: string; count: number }> {
  const periodMultiplier: Record<DashboardPeriod, number> = {
    daily: 1,
    weekly: 3,
    monthly: 8,
    quarter: 22,
  };
  const base = module === 'leads' ? 3 : 2;
  const mult = periodMultiplier[period];

  return MOCK_SALES_TEAMS.map((team, index) => ({
    teamId: team.id,
    teamName: team.name,
    count: Math.round(base * mult * (1 + index * 0.2)),
  }));
}

export function getActiveFilterLabel(filters: DashboardFilters): string {
  if (filters.salesRepId) {
    return (
      MOCK_REPRESENTATIVES.find((r) => r.id === filters.salesRepId)?.name ??
      'Sales rep'
    );
  }
  if (filters.presalesRepIds?.length === 1) {
    return (
      MOCK_PRESALES_MEMBERS.find((r) => r.id === filters.presalesRepIds![0])
        ?.name ?? 'Pre-sales member'
    );
  }
  if (filters.presalesRepIds && filters.presalesRepIds.length > 1) {
    return `${filters.presalesRepIds.length} pre-sales members`;
  }
  if (filters.channelRepIds?.length === 1) {
    return (
      MOCK_CHANNEL_MEMBERS.find((r) => r.id === filters.channelRepIds![0])
        ?.name ?? 'Channel member'
    );
  }
  if (filters.channelRepIds && filters.channelRepIds.length > 1) {
    return `${filters.channelRepIds.length} channel members`;
  }
  if (filters.salesTeamId) {
    return (
      MOCK_SALES_TEAMS.find((t) => t.id === filters.salesTeamId)?.name ?? 'Team'
    );
  }
  if (filters.presalesTeamIds?.length === 1) {
    return (
      MOCK_PRESALES_TEAMS.find((t) => t.id === filters.presalesTeamIds![0])
        ?.name ?? 'Pre-sales team'
    );
  }
  if (filters.presalesTeamIds && filters.presalesTeamIds.length > 1) {
    return `${filters.presalesTeamIds.length} pre-sales teams`;
  }
  return 'All teams';
}

export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
