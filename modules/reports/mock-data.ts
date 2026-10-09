import { tokens } from '@/lib/design-tokens';

export type ReportCurrency = 'ETB' | 'USD' | 'EUR';
export type ReportPipelineScope = 'all' | 'sales' | 'presales' | 'channel';
export type ReportPeriodId =
  | 'this-quarter'
  | 'last-quarter'
  | 'this-fiscal-year'
  | 'last-30-days';
export type RecordKindFilter = 'all' | 'lead' | 'deal';

export const REPORT_CURRENCIES: { code: ReportCurrency; label: string }[] = [
  { code: 'ETB', label: 'ETB' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
];

export const REPORT_PERIODS: {
  id: ReportPeriodId;
  label: string;
  shortLabel: string;
  rangeLabel: string;
}[] = [
  {
    id: 'this-quarter',
    label: 'This quarter',
    shortLabel: 'QTD',
    rangeLabel: 'Apr 1 – Jun 30, 2026',
  },
  {
    id: 'last-quarter',
    label: 'Last quarter',
    shortLabel: 'Prev Q',
    rangeLabel: 'Jan 1 – Mar 31, 2026',
  },
  {
    id: 'this-fiscal-year',
    label: 'This fiscal year',
    shortLabel: 'FY',
    rangeLabel: 'Jul 1, 2025 – Jun 30, 2026',
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days',
    shortLabel: '30d',
    rangeLabel: 'Jun 23 – Jul 23, 2026',
  },
];

export const REPORT_PIPELINE_SCOPES: {
  id: ReportPipelineScope;
  label: string;
}[] = [
  { id: 'all', label: 'All pipelines' },
  { id: 'sales', label: 'Sales' },
  { id: 'presales', label: 'Pre-Sales' },
  { id: 'channel', label: 'Channel' },
];

export type ReportStageInsight = {
  id: string;
  label: string;
  group: 'Lead' | 'Deal';
  amount: string;
  share: number;
  color: string;
  count: number;
};

export type ReportTeamTarget = {
  id: string;
  name: string;
  initials: string;
  achieved: string;
  target: string;
  percent: number;
  trend: string;
  positive: boolean;
};

export type ReportMonthlyPoint = {
  id: string;
  label: string;
  achievedPercent: number;
  pipelineValue: string;
};

export type ReportHealthSlice = {
  id: string;
  label: string;
  count: number;
  share: number;
  color: string;
};

export type ReportFunnelStep = {
  id: string;
  label: string;
  count: number;
  conversionFromPrev: number | null;
  color: string;
};

export type ReportRecord = {
  id: string;
  name: string;
  account: string;
  owner: string;
  team: string;
  kind: 'deal' | 'lead';
  pipeline: 'Sales' | 'Pre-Sales' | 'Channel';
  stage: string;
  amount: string;
  amountValue: number;
  currency: ReportCurrency;
  age: string;
  status: 'healthy' | 'attention' | 'at-risk' | 'won' | 'lost' | 'expired';
  probability: number;
  lastActivity: string;
};

export type ReportKpis = {
  pipelineValue: string;
  pipelineTrend: string;
  pipelineTrendPositive: boolean;
  wonRevenue: string;
  wonTrend: string;
  wonTrendPositive: boolean;
  targetPercent: number;
  achieved: string;
  target: string;
  remaining: string;
  winRate: string;
  winRateDetail: string;
  avgDealSize: string;
  highValueCount: number;
  highValueShare: string;
  openRecords: number;
  atRiskCount: number;
};

export type ReportSnapshot = {
  periodId: ReportPeriodId;
  currency: ReportCurrency;
  scope: ReportPipelineScope;
  generatedAt: string;
  kpis: ReportKpis;
  stages: ReportStageInsight[];
  teamTargets: ReportTeamTarget[];
  monthlyTrend: ReportMonthlyPoint[];
  health: ReportHealthSlice[];
  funnel: ReportFunnelStep[];
  records: ReportRecord[];
};

const stagePalette = {
  newLead: tokens.color.purple,
  qualified: tokens.color.accentBlue,
  proposal: tokens.color.brand,
  negotiation: tokens.color.warning,
  won: tokens.color.success,
  lost: tokens.color.error,
};

function stagesFrom(
  amounts: [string, string, string, string, string, string],
  shares: [number, number, number, number, number, number],
  counts: [number, number, number, number, number, number],
): ReportStageInsight[] {
  const defs = [
    {
      id: 'new-lead',
      label: 'New lead',
      group: 'Lead' as const,
      color: stagePalette.newLead,
    },
    {
      id: 'qualified-lead',
      label: 'Qualified lead',
      group: 'Lead' as const,
      color: stagePalette.qualified,
    },
    {
      id: 'proposal',
      label: 'Proposal',
      group: 'Deal' as const,
      color: stagePalette.proposal,
    },
    {
      id: 'negotiation',
      label: 'Negotiation',
      group: 'Deal' as const,
      color: stagePalette.negotiation,
    },
    {
      id: 'closed-won',
      label: 'Closed won',
      group: 'Deal' as const,
      color: stagePalette.won,
    },
    {
      id: 'closed-lost',
      label: 'Closed lost',
      group: 'Deal' as const,
      color: stagePalette.lost,
    },
  ];

  return defs.map((stage, index) => ({
    ...stage,
    amount: amounts[index],
    share: shares[index],
    count: counts[index],
  }));
}

const baseRecords: ReportRecord[] = [
  {
    id: 'r-d1',
    name: 'National Retail Expansion',
    account: 'Abay Retail Group',
    owner: 'Liya H.',
    team: 'Enterprise Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Negotiation',
    amount: 'ETB 7.8M',
    amountValue: 7_800_000,
    currency: 'ETB',
    age: '18 days',
    status: 'healthy',
    probability: 72,
    lastActivity: '2 days ago',
  },
  {
    id: 'r-d2',
    name: 'Cloud Modernization',
    account: 'Blue Nile Bank',
    owner: 'Nahom T.',
    team: 'Enterprise Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Proposal',
    amount: 'ETB 6.4M',
    amountValue: 6_400_000,
    currency: 'ETB',
    age: '34 days',
    status: 'attention',
    probability: 48,
    lastActivity: '5 days ago',
  },
  {
    id: 'r-d3',
    name: 'Logistics Platform Rollout',
    account: 'East Africa Freight',
    owner: 'Sara M.',
    team: 'Commercial Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Proposal',
    amount: 'ETB 5.9M',
    amountValue: 5_900_000,
    currency: 'ETB',
    age: '47 days',
    status: 'at-risk',
    probability: 35,
    lastActivity: '11 days ago',
  },
  {
    id: 'r-l1',
    name: 'Customer Data Program',
    account: 'Habesha Consumer',
    owner: 'Yonas K.',
    team: 'Commercial Sales',
    kind: 'lead',
    pipeline: 'Sales',
    stage: 'Qualified',
    amount: 'ETB 4.7M',
    amountValue: 4_700_000,
    currency: 'ETB',
    age: '29 days',
    status: 'attention',
    probability: 55,
    lastActivity: '1 day ago',
  },
  {
    id: 'r-d4',
    name: 'Regional Service Renewal',
    account: 'Orbit Telecom',
    owner: 'Samuel Bekele',
    team: 'Commercial Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Closed won',
    amount: 'ETB 3.8M',
    amountValue: 3_800_000,
    currency: 'ETB',
    age: '—',
    status: 'won',
    probability: 100,
    lastActivity: '8 days ago',
  },
  {
    id: 'r-l2',
    name: 'Public Sector Digitization',
    account: 'Ministry of Trade',
    owner: 'Hana Girma',
    team: 'Growth Accounts',
    kind: 'lead',
    pipeline: 'Sales',
    stage: 'New lead',
    amount: 'ETB 3.2M',
    amountValue: 3_200_000,
    currency: 'ETB',
    age: '8 days',
    status: 'healthy',
    probability: 28,
    lastActivity: 'Today',
  },
  {
    id: 'r-d5',
    name: 'Cross-border Payments Hub',
    account: 'Horn Finance',
    owner: 'Maya Tesfaye',
    team: 'Enterprise Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Negotiation',
    amount: 'USD 185K',
    amountValue: 185_000,
    currency: 'USD',
    age: '22 days',
    status: 'healthy',
    probability: 68,
    lastActivity: '3 days ago',
  },
  {
    id: 'r-d6',
    name: 'EU Partner Expansion',
    account: 'Nordic Trade Desk',
    owner: 'Liya H.',
    team: 'Enterprise Sales',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Proposal',
    amount: 'EUR 96K',
    amountValue: 96_000,
    currency: 'EUR',
    age: '15 days',
    status: 'attention',
    probability: 42,
    lastActivity: '4 days ago',
  },
  {
    id: 'r-p1',
    name: 'Solution Architecture RFP',
    account: 'National Grid Co.',
    owner: 'Kidus M.',
    team: 'Solution Engineering',
    kind: 'deal',
    pipeline: 'Pre-Sales',
    stage: 'Proposal',
    amount: 'ETB 5.1M',
    amountValue: 5_100_000,
    currency: 'ETB',
    age: '12 days',
    status: 'healthy',
    probability: 60,
    lastActivity: 'Yesterday',
  },
  {
    id: 'r-p2',
    name: 'Technical Clarification Pack',
    account: 'Afar Logistics',
    owner: 'Selam T.',
    team: 'Solution Engineering',
    kind: 'lead',
    pipeline: 'Pre-Sales',
    stage: 'Qualified',
    amount: 'ETB 2.8M',
    amountValue: 2_800_000,
    currency: 'ETB',
    age: '19 days',
    status: 'attention',
    probability: 40,
    lastActivity: '6 days ago',
  },
  {
    id: 'r-c1',
    name: 'Partner Marketplace Launch',
    account: 'Addis Channel Partners',
    owner: 'Dawit Alemu',
    team: 'Channel',
    kind: 'deal',
    pipeline: 'Channel',
    stage: 'Negotiation',
    amount: 'ETB 4.2M',
    amountValue: 4_200_000,
    currency: 'ETB',
    age: '27 days',
    status: 'healthy',
    probability: 65,
    lastActivity: '2 days ago',
  },
  {
    id: 'r-c2',
    name: 'Reseller Enablement Suite',
    account: 'Horizon Distributors',
    owner: 'Bethel K.',
    team: 'Channel',
    kind: 'lead',
    pipeline: 'Channel',
    stage: 'New lead',
    amount: 'ETB 2.4M',
    amountValue: 2_400_000,
    currency: 'ETB',
    age: '6 days',
    status: 'healthy',
    probability: 22,
    lastActivity: 'Today',
  },
  {
    id: 'r-d7',
    name: 'Branch Network Upgrade',
    account: 'Unity Microfinance',
    owner: 'Helen B.',
    team: 'Strategic Partnerships',
    kind: 'deal',
    pipeline: 'Sales',
    stage: 'Closed lost',
    amount: 'ETB 2.4M',
    amountValue: 2_400_000,
    currency: 'ETB',
    age: '—',
    status: 'lost',
    probability: 0,
    lastActivity: '21 days ago',
  },
  {
    id: 'r-l3',
    name: 'Branch Experience Refresh',
    account: 'Unity Microfinance',
    owner: 'Biruk A.',
    team: 'Growth Accounts',
    kind: 'lead',
    pipeline: 'Sales',
    stage: 'Qualified',
    amount: 'ETB 2.1M',
    amountValue: 2_100_000,
    currency: 'ETB',
    age: '21 days',
    status: 'healthy',
    probability: 50,
    lastActivity: '3 days ago',
  },
  {
    id: 'r-l4',
    name: 'Analytics Enablement',
    account: 'Metro Distribution',
    owner: 'Dawit Alemu',
    team: 'Strategic Partnerships',
    kind: 'lead',
    pipeline: 'Sales',
    stage: 'Expired',
    amount: 'USD 31K',
    amountValue: 31_000,
    currency: 'USD',
    age: '—',
    status: 'expired',
    probability: 0,
    lastActivity: '45 days ago',
  },
];

type CurrencyBundle = {
  kpis: ReportKpis;
  stages: ReportStageInsight[];
  teamTargets: ReportTeamTarget[];
  monthlyTrend: ReportMonthlyPoint[];
  health: ReportHealthSlice[];
  funnel: ReportFunnelStep[];
};

const currencyBundles: Record<ReportCurrency, CurrencyBundle> = {
  ETB: {
    kpis: {
      pipelineValue: 'ETB 192.7M',
      pipelineTrend: '8.4%',
      pipelineTrendPositive: true,
      wonRevenue: 'ETB 93.2M',
      wonTrend: '11.2%',
      wonTrendPositive: true,
      targetPercent: 76,
      achieved: 'ETB 93.2M',
      target: 'ETB 125M',
      remaining: 'ETB 31.8M',
      winRate: '68%',
      winRateDetail: '54 won of 79 closed',
      avgDealSize: 'ETB 1.72M',
      highValueCount: 15,
      highValueShare: '61% of open pipeline',
      openRecords: 248,
      atRiskCount: 19,
    },
    stages: stagesFrom(
      [
        'ETB 18.2M',
        'ETB 31.4M',
        'ETB 48.6M',
        'ETB 39.1M',
        'ETB 42.8M',
        'ETB 12.6M',
      ],
      [9, 16, 25, 20, 22, 8],
      [186, 124, 68, 47, 54, 25],
    ),
    teamTargets: [
      {
        id: 'enterprise',
        name: 'Enterprise Sales',
        initials: 'ES',
        achieved: 'ETB 34.8M',
        target: 'ETB 40M',
        percent: 87,
        trend: '+6.2%',
        positive: true,
      },
      {
        id: 'commercial',
        name: 'Commercial Sales',
        initials: 'CS',
        achieved: 'ETB 26.1M',
        target: 'ETB 32M',
        percent: 82,
        trend: '+4.1%',
        positive: true,
      },
      {
        id: 'growth',
        name: 'Growth Accounts',
        initials: 'GA',
        achieved: 'ETB 14.4M',
        target: 'ETB 22M',
        percent: 65,
        trend: '-1.8%',
        positive: false,
      },
      {
        id: 'presales',
        name: 'Solution Engineering',
        initials: 'SE',
        achieved: 'ETB 11.2M',
        target: 'ETB 18M',
        percent: 62,
        trend: '+2.4%',
        positive: true,
      },
      {
        id: 'channel',
        name: 'Channel Partners',
        initials: 'CP',
        achieved: 'ETB 6.7M',
        target: 'ETB 13M',
        percent: 52,
        trend: '-3.5%',
        positive: false,
      },
    ],
    monthlyTrend: [
      {
        id: 'm1',
        label: 'Jan',
        achievedPercent: 58,
        pipelineValue: 'ETB 148M',
      },
      {
        id: 'm2',
        label: 'Feb',
        achievedPercent: 63,
        pipelineValue: 'ETB 156M',
      },
      {
        id: 'm3',
        label: 'Mar',
        achievedPercent: 69,
        pipelineValue: 'ETB 168M',
      },
      {
        id: 'm4',
        label: 'Apr',
        achievedPercent: 71,
        pipelineValue: 'ETB 174M',
      },
      {
        id: 'm5',
        label: 'May',
        achievedPercent: 74,
        pipelineValue: 'ETB 185M',
      },
      {
        id: 'm6',
        label: 'Jun',
        achievedPercent: 76,
        pipelineValue: 'ETB 193M',
      },
    ],
    health: [
      {
        id: 'healthy',
        label: 'Healthy',
        count: 142,
        share: 57,
        color: tokens.color.success,
      },
      {
        id: 'attention',
        label: 'Attention',
        count: 61,
        share: 25,
        color: tokens.color.warning,
      },
      {
        id: 'at-risk',
        label: 'At risk',
        count: 19,
        share: 8,
        color: tokens.color.error,
      },
      {
        id: 'won',
        label: 'Won',
        count: 18,
        share: 7,
        color: tokens.color.accentBlue,
      },
      {
        id: 'lost',
        label: 'Lost / expired',
        count: 8,
        share: 3,
        color: tokens.color.textSubtle,
      },
    ],
    funnel: [
      {
        id: 'leads',
        label: 'Leads created',
        count: 486,
        conversionFromPrev: null,
        color: tokens.color.purple,
      },
      {
        id: 'qualified',
        label: 'Qualified',
        count: 248,
        conversionFromPrev: 51,
        color: tokens.color.accentBlue,
      },
      {
        id: 'deals',
        label: 'Deals created',
        count: 164,
        conversionFromPrev: 66,
        color: tokens.color.brand,
      },
      {
        id: 'negotiation',
        label: 'In negotiation',
        count: 79,
        conversionFromPrev: 48,
        color: tokens.color.warning,
      },
      {
        id: 'won',
        label: 'Closed won',
        count: 54,
        conversionFromPrev: 68,
        color: tokens.color.success,
      },
    ],
  },
  USD: {
    kpis: {
      pipelineValue: 'USD 1.42M',
      pipelineTrend: '6.8%',
      pipelineTrendPositive: true,
      wonRevenue: 'USD 612K',
      wonTrend: '9.1%',
      wonTrendPositive: true,
      targetPercent: 64,
      achieved: 'USD 612K',
      target: 'USD 955K',
      remaining: 'USD 343K',
      winRate: '61%',
      winRateDetail: '28 won of 46 closed',
      avgDealSize: 'USD 42K',
      highValueCount: 9,
      highValueShare: '54% of open pipeline',
      openRecords: 86,
      atRiskCount: 8,
    },
    stages: stagesFrom(
      ['USD 118K', 'USD 214K', 'USD 356K', 'USD 288K', 'USD 312K', 'USD 132K'],
      [8, 15, 25, 20, 22, 10],
      [42, 28, 18, 12, 16, 8],
    ),
    teamTargets: [
      {
        id: 'enterprise',
        name: 'Enterprise Sales',
        initials: 'ES',
        achieved: 'USD 248K',
        target: 'USD 320K',
        percent: 78,
        trend: '+5.4%',
        positive: true,
      },
      {
        id: 'commercial',
        name: 'Commercial Sales',
        initials: 'CS',
        achieved: 'USD 164K',
        target: 'USD 240K',
        percent: 68,
        trend: '+2.8%',
        positive: true,
      },
      {
        id: 'growth',
        name: 'Growth Accounts',
        initials: 'GA',
        achieved: 'USD 92K',
        target: 'USD 180K',
        percent: 51,
        trend: '-2.1%',
        positive: false,
      },
      {
        id: 'presales',
        name: 'Solution Engineering',
        initials: 'SE',
        achieved: 'USD 68K',
        target: 'USD 125K',
        percent: 54,
        trend: '+1.6%',
        positive: true,
      },
      {
        id: 'channel',
        name: 'Channel Partners',
        initials: 'CP',
        achieved: 'USD 40K',
        target: 'USD 90K',
        percent: 44,
        trend: '-4.2%',
        positive: false,
      },
    ],
    monthlyTrend: [
      {
        id: 'm1',
        label: 'Jan',
        achievedPercent: 42,
        pipelineValue: 'USD 980K',
      },
      {
        id: 'm2',
        label: 'Feb',
        achievedPercent: 48,
        pipelineValue: 'USD 1.05M',
      },
      {
        id: 'm3',
        label: 'Mar',
        achievedPercent: 52,
        pipelineValue: 'USD 1.12M',
      },
      {
        id: 'm4',
        label: 'Apr',
        achievedPercent: 57,
        pipelineValue: 'USD 1.21M',
      },
      {
        id: 'm5',
        label: 'May',
        achievedPercent: 61,
        pipelineValue: 'USD 1.34M',
      },
      {
        id: 'm6',
        label: 'Jun',
        achievedPercent: 64,
        pipelineValue: 'USD 1.42M',
      },
    ],
    health: [
      {
        id: 'healthy',
        label: 'Healthy',
        count: 48,
        share: 56,
        color: tokens.color.success,
      },
      {
        id: 'attention',
        label: 'Attention',
        count: 22,
        share: 26,
        color: tokens.color.warning,
      },
      {
        id: 'at-risk',
        label: 'At risk',
        count: 8,
        share: 9,
        color: tokens.color.error,
      },
      {
        id: 'won',
        label: 'Won',
        count: 5,
        share: 6,
        color: tokens.color.accentBlue,
      },
      {
        id: 'lost',
        label: 'Lost / expired',
        count: 3,
        share: 3,
        color: tokens.color.textSubtle,
      },
    ],
    funnel: [
      {
        id: 'leads',
        label: 'Leads created',
        count: 164,
        conversionFromPrev: null,
        color: tokens.color.purple,
      },
      {
        id: 'qualified',
        label: 'Qualified',
        count: 86,
        conversionFromPrev: 52,
        color: tokens.color.accentBlue,
      },
      {
        id: 'deals',
        label: 'Deals created',
        count: 54,
        conversionFromPrev: 63,
        color: tokens.color.brand,
      },
      {
        id: 'negotiation',
        label: 'In negotiation',
        count: 28,
        conversionFromPrev: 52,
        color: tokens.color.warning,
      },
      {
        id: 'won',
        label: 'Closed won',
        count: 18,
        conversionFromPrev: 64,
        color: tokens.color.success,
      },
    ],
  },
  EUR: {
    kpis: {
      pipelineValue: 'EUR 784K',
      pipelineTrend: '4.9%',
      pipelineTrendPositive: true,
      wonRevenue: 'EUR 312K',
      wonTrend: '5.6%',
      wonTrendPositive: true,
      targetPercent: 58,
      achieved: 'EUR 312K',
      target: 'EUR 540K',
      remaining: 'EUR 228K',
      winRate: '57%',
      winRateDetail: '16 won of 28 closed',
      avgDealSize: 'EUR 28K',
      highValueCount: 7,
      highValueShare: '49% of open pipeline',
      openRecords: 52,
      atRiskCount: 6,
    },
    stages: stagesFrom(
      ['EUR 64K', 'EUR 112K', 'EUR 196K', 'EUR 158K', 'EUR 168K', 'EUR 86K'],
      [8, 14, 25, 20, 21, 12],
      [22, 16, 12, 8, 10, 6],
    ),
    teamTargets: [
      {
        id: 'enterprise',
        name: 'Enterprise Sales',
        initials: 'ES',
        achieved: 'EUR 128K',
        target: 'EUR 180K',
        percent: 71,
        trend: '+3.8%',
        positive: true,
      },
      {
        id: 'commercial',
        name: 'Commercial Sales',
        initials: 'CS',
        achieved: 'EUR 84K',
        target: 'EUR 140K',
        percent: 60,
        trend: '+1.2%',
        positive: true,
      },
      {
        id: 'growth',
        name: 'Growth Accounts',
        initials: 'GA',
        achieved: 'EUR 46K',
        target: 'EUR 95K',
        percent: 48,
        trend: '-2.6%',
        positive: false,
      },
      {
        id: 'presales',
        name: 'Solution Engineering',
        initials: 'SE',
        achieved: 'EUR 34K',
        target: 'EUR 70K',
        percent: 49,
        trend: '+0.8%',
        positive: true,
      },
      {
        id: 'channel',
        name: 'Channel Partners',
        initials: 'CP',
        achieved: 'EUR 20K',
        target: 'EUR 55K',
        percent: 36,
        trend: '-5.1%',
        positive: false,
      },
    ],
    monthlyTrend: [
      {
        id: 'm1',
        label: 'Jan',
        achievedPercent: 38,
        pipelineValue: 'EUR 520K',
      },
      {
        id: 'm2',
        label: 'Feb',
        achievedPercent: 44,
        pipelineValue: 'EUR 580K',
      },
      {
        id: 'm3',
        label: 'Mar',
        achievedPercent: 49,
        pipelineValue: 'EUR 640K',
      },
      {
        id: 'm4',
        label: 'Apr',
        achievedPercent: 52,
        pipelineValue: 'EUR 690K',
      },
      {
        id: 'm5',
        label: 'May',
        achievedPercent: 55,
        pipelineValue: 'EUR 740K',
      },
      {
        id: 'm6',
        label: 'Jun',
        achievedPercent: 58,
        pipelineValue: 'EUR 784K',
      },
    ],
    health: [
      {
        id: 'healthy',
        label: 'Healthy',
        count: 28,
        share: 54,
        color: tokens.color.success,
      },
      {
        id: 'attention',
        label: 'Attention',
        count: 14,
        share: 27,
        color: tokens.color.warning,
      },
      {
        id: 'at-risk',
        label: 'At risk',
        count: 6,
        share: 12,
        color: tokens.color.error,
      },
      {
        id: 'won',
        label: 'Won',
        count: 3,
        share: 5,
        color: tokens.color.accentBlue,
      },
      {
        id: 'lost',
        label: 'Lost / expired',
        count: 1,
        share: 2,
        color: tokens.color.textSubtle,
      },
    ],
    funnel: [
      {
        id: 'leads',
        label: 'Leads created',
        count: 98,
        conversionFromPrev: null,
        color: tokens.color.purple,
      },
      {
        id: 'qualified',
        label: 'Qualified',
        count: 52,
        conversionFromPrev: 53,
        color: tokens.color.accentBlue,
      },
      {
        id: 'deals',
        label: 'Deals created',
        count: 34,
        conversionFromPrev: 65,
        color: tokens.color.brand,
      },
      {
        id: 'negotiation',
        label: 'In negotiation',
        count: 18,
        conversionFromPrev: 53,
        color: tokens.color.warning,
      },
      {
        id: 'won',
        label: 'Closed won',
        count: 11,
        conversionFromPrev: 61,
        color: tokens.color.success,
      },
    ],
  },
};

const scopePipelineLabel: Record<
  ReportPipelineScope,
  ReportRecord['pipeline'] | null
> = {
  all: null,
  sales: 'Sales',
  presales: 'Pre-Sales',
  channel: 'Channel',
};

const periodFactor: Record<ReportPeriodId, number> = {
  'this-quarter': 1,
  'last-quarter': 0.92,
  'this-fiscal-year': 1.08,
  'last-30-days': 0.78,
};

export function buildReportSnapshot({
  periodId,
  currency,
  scope,
  kindFilter = 'all',
}: {
  periodId: ReportPeriodId;
  currency: ReportCurrency;
  scope: ReportPipelineScope;
  kindFilter?: RecordKindFilter;
}): ReportSnapshot {
  const bundle = currencyBundles[currency];
  const pipelineFilter = scopePipelineLabel[scope];

  let records = baseRecords.filter((record) => record.currency === currency);

  if (pipelineFilter) {
    records = records.filter((record) => record.pipeline === pipelineFilter);
  }

  if (kindFilter !== 'all') {
    records = records.filter((record) => record.kind === kindFilter);
  }

  records = [...records].sort((a, b) => b.amountValue - a.amountValue);

  const factor = periodFactor[periodId];
  const adjustedPercent = Math.min(
    99,
    Math.round(bundle.kpis.targetPercent * factor),
  );

  return {
    periodId,
    currency,
    scope,
    generatedAt: new Date().toISOString(),
    kpis: {
      ...bundle.kpis,
      targetPercent: adjustedPercent,
      highValueCount: records.length,
    },
    stages: bundle.stages,
    teamTargets: bundle.teamTargets,
    monthlyTrend: bundle.monthlyTrend.map((point) => ({
      ...point,
      achievedPercent: Math.min(99, Math.round(point.achievedPercent * factor)),
    })),
    health: bundle.health,
    funnel: bundle.funnel,
    records,
  };
}

export function sortHighValueRecords(records: ReportRecord[]): ReportRecord[] {
  return [...records].sort((a, b) => {
    const statusRank = (status: ReportRecord['status']) => {
      if (status === 'lost' || status === 'expired') return 2;
      if (status === 'won') return 1;
      return 0;
    };
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.amountValue - a.amountValue;
  });
}
