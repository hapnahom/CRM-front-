import { tokens } from '@/lib/design-tokens';
import {
  FILTER_FIELDS,
  PARENT_CATEGORIES,
  getAvailableReportTypes,
  getCategory,
  getColumnsForCategories,
} from './definitions';
import type {
  GeneratedReport,
  ParentCategoryId,
  ReportBuilderState,
  ReportChart,
  ReportKpi,
  ReportResultRow,
  ReportSection,
  ReportTypeId,
} from './types';

export function createDefaultBuilderState(): ReportBuilderState {
  const categories = PARENT_CATEGORIES.map((c) => c.id);
  return {
    categories,
    criteria: {
      periodMode: 'fiscal',
      fiscalPeriod: { type: 'annual' },
      dateRange: 'this-quarter',
      multi: {},
    },
    grouping: {
      groupBy: ['team'],
      sortBy: 'pipelineValue',
      sortOrder: 'desc',
      selectedColumns: getColumnsForCategories(categories)
        .filter((c) => c.defaultSelected)
        .map((c) => c.id),
      columnsConfigured: false,
    },
  };
}

const SECTION_CATEGORY: Record<ReportTypeId, ParentCategoryId> = {
  'summary-overview': 'sales',
  'pipeline-opportunities': 'sales',
  'leads-acquisition': 'sales',
  'customer-account': 'customers',
  'marketing-performance': 'marketing',
  'partner-vendor-performance': 'partners-vendors',
  'target-vs-performance': 'targets-performance',
  'activity-engagement': 'customers',
  'conversion-analysis': 'sales',
};

function mockRows(typeId: ReportTypeId): {
  columns: ReportSection['columns'];
  rows: ReportResultRow[];
} {
  switch (typeId) {
    case 'pipeline-opportunities':
      return {
        columns: [
          { id: 'dealName', label: 'Deal' },
          { id: 'customer', label: 'Customer' },
          { id: 'owner', label: 'Owner' },
          { id: 'stage', label: 'Stage' },
          { id: 'dealValue', label: 'Value' },
          { id: 'forecastValue', label: 'Forecast' },
        ],
        rows: [
          row('p1', 'Team A', {
            dealName: 'Ethio Telecom CRM',
            customer: 'Ethio Telecom',
            owner: 'Jane Doe',
            stage: 'Negotiation',
            dealValue: 'ETB 12.4M',
            forecastValue: 'ETB 9.8M',
          }),
          row('p2', 'Team A', {
            dealName: 'CBE Analytics',
            customer: 'Commercial Bank of Ethiopia',
            owner: 'Amina Kebede',
            stage: 'Proposal',
            dealValue: 'ETB 8.2M',
            forecastValue: 'ETB 6.5M',
          }),
          row('p3', 'Team B', {
            dealName: 'Safaricom Cloud',
            customer: 'Safaricom ET',
            owner: 'Michael Scott',
            stage: 'Qualification',
            dealValue: 'ETB 10.1M',
            forecastValue: 'ETB 8.7M',
          }),
        ],
      };
    case 'customer-account':
      return {
        columns: [
          { id: 'customer', label: 'Customer' },
          { id: 'vector', label: 'Vector' },
          { id: 'owner', label: 'Owner' },
          { id: 'openDeals', label: 'Open Deals' },
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'revenue', label: 'Revenue' },
        ],
        rows: [
          row('c1', 'Telecom', {
            customer: 'Ethio Telecom',
            vector: 'Telecom',
            owner: 'Jane Doe',
            openDeals: 4,
            pipeline: 'ETB 18.1M',
            revenue: 'ETB 6.4M',
          }),
          row('c2', 'Banking', {
            customer: 'Commercial Bank of Ethiopia',
            vector: 'Banking',
            owner: 'Amina Kebede',
            openDeals: 3,
            pipeline: 'ETB 11.6M',
            revenue: 'ETB 4.9M',
          }),
          row('c3', 'Banking', {
            customer: 'Dashen Bank',
            vector: 'Banking',
            owner: 'Sara Lemma',
            openDeals: 2,
            pipeline: 'ETB 5.2M',
            revenue: 'ETB 2.1M',
          }),
        ],
      };
    case 'leads-acquisition':
      return {
        columns: [
          { id: 'leadName', label: 'Lead' },
          { id: 'status', label: 'Status' },
          { id: 'owner', label: 'Owner' },
          { id: 'created', label: 'Created' },
        ],
        rows: [
          row('l1', 'Website', {
            leadName: 'Awash Bank HQ',
            source: 'Website',
            status: 'Qualified',
            owner: 'Tom Reynolds',
            created: 'Jul 12',
          }),
          row('l2', 'Event', {
            leadName: 'Ministry of Innovation',
            source: 'Event',
            status: 'New',
            owner: 'Sara Lemma',
            created: 'Jul 18',
          }),
          row('l3', 'Referral', {
            leadName: 'Ethio Roads',
            source: 'Referral',
            status: 'In Progress',
            owner: 'Jane Doe',
            created: 'Aug 2',
          }),
        ],
      };
    case 'marketing-performance':
      return {
        columns: [
          { id: 'campaign', label: 'Campaign' },
          { id: 'channel', label: 'Channel' },
          { id: 'leads', label: 'Leads' },
          { id: 'qualified', label: 'Qualified' },
          { id: 'conversion', label: 'Conversion' },
          { id: 'revenue', label: 'Attributed' },
        ],
        rows: [
          row('m1', 'Digital', {
            campaign: 'Q2 Product Launch',
            channel: 'Paid Ads',
            leads: 186,
            qualified: 42,
            conversion: '22.6%',
            revenue: 'ETB 3.1M',
          }),
          row('m2', 'Digital', {
            campaign: 'Webinar Series',
            channel: 'Email',
            leads: 94,
            qualified: 31,
            conversion: '33.0%',
            revenue: 'ETB 1.8M',
          }),
          row('m3', 'Events', {
            campaign: 'Brand Awareness',
            channel: 'Events',
            leads: 61,
            qualified: 14,
            conversion: '23.0%',
            revenue: 'ETB 0.9M',
          }),
        ],
      };
    case 'partner-vendor-performance':
      return {
        columns: [
          { id: 'implementationPartner', label: 'Partner' },
          { id: 'vendor', label: 'Vendor' },
          { id: 'deals', label: 'Deals' },
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'achievement', label: 'Achievement' },
        ],
        rows: [
          row('v1', 'Microsoft', {
            implementationPartner: 'TechBridge',
            vendor: 'Microsoft',
            deals: 8,
            pipeline: 'ETB 14.2M',
            revenue: 'ETB 5.6M',
            achievement: '112%',
          }),
          row('v2', 'Oracle', {
            implementationPartner: 'CloudNova',
            vendor: 'Oracle',
            deals: 5,
            pipeline: 'ETB 9.4M',
            revenue: 'ETB 3.2M',
            achievement: '87%',
          }),
        ],
      };
    case 'target-vs-performance':
      return {
        columns: [
          { id: 'department', label: 'Department' },
          { id: 'team', label: 'Team' },
          { id: 'quarterTarget', label: 'Target' },
          { id: 'forecast', label: 'Forecast' },
          { id: 'actual', label: 'Actual' },
          { id: 'achievement', label: 'Achievement' },
        ],
        rows: [
          row('t1', 'Sales', {
            department: 'Sales',
            team: 'Team A',
            quarterTarget: 'ETB 20.0M',
            forecast: 'ETB 18.4M',
            actual: 'ETB 11.3M',
            achievement: '56%',
          }),
          row('t2', 'Enterprise', {
            department: 'Enterprise',
            team: 'Enterprise East',
            quarterTarget: 'ETB 16.0M',
            forecast: 'ETB 15.1M',
            actual: 'ETB 9.4M',
            achievement: '59%',
          }),
        ],
      };
    case 'activity-engagement':
      return {
        columns: [
          { id: 'activity', label: 'Activity' },
          { id: 'type', label: 'Type' },
          { id: 'relatedTo', label: 'Related To' },
          { id: 'owner', label: 'Owner' },
          { id: 'date', label: 'Date' },
          { id: 'status', label: 'Status' },
        ],
        rows: [
          row('a1', 'Meetings', {
            activity: 'Q2 business review',
            type: 'Meeting',
            relatedTo: 'Ethio Telecom',
            owner: 'Jane Doe',
            date: 'Aug 4',
            status: 'Completed',
          }),
          row('a2', 'Calls', {
            activity: 'Follow-up call',
            type: 'Call',
            relatedTo: 'Dashen Bank',
            owner: 'Sara Lemma',
            date: 'Aug 7',
            status: 'Completed',
          }),
        ],
      };
    case 'conversion-analysis':
      return {
        columns: [
          { id: 'stage', label: 'Stage' },
          { id: 'count', label: 'Count' },
          { id: 'conversion', label: 'Conversion' },
          { id: 'avgDays', label: 'Avg Days' },
          { id: 'value', label: 'Value' },
        ],
        rows: [
          row('n1', 'Funnel', {
            stage: 'Lead',
            count: 341,
            conversion: '100%',
            avgDays: 0,
            value: 'ETB 62.0M',
          }),
          row('n2', 'Funnel', {
            stage: 'Qualified',
            count: 128,
            conversion: '37.5%',
            avgDays: 9,
            value: 'ETB 41.2M',
          }),
          row('n3', 'Funnel', {
            stage: 'Proposal',
            count: 47,
            conversion: '36.7%',
            avgDays: 18,
            value: 'ETB 28.4M',
          }),
        ],
      };
    default:
      return {
        columns: [
          { id: 'metric', label: 'Metric' },
          { id: 'value', label: 'Value' },
          { id: 'prior', label: 'Prior Period' },
          { id: 'change', label: 'Change' },
        ],
        rows: [
          row('s1', 'Overview', {
            metric: 'Pipeline',
            value: 'ETB 51.6M',
            prior: 'ETB 44.1M',
            change: '+17%',
          }),
          row('s2', 'Overview', {
            metric: 'Closed revenue',
            value: 'ETB 20.7M',
            prior: 'ETB 18.9M',
            change: '+10%',
          }),
          row('s3', 'Overview', {
            metric: 'Active accounts',
            value: 86,
            prior: 79,
            change: '+9%',
          }),
        ],
      };
  }
}

function row(
  id: string,
  groupLabel: string,
  cells: Record<string, string | number>,
): ReportResultRow {
  return { id, groupLabel, cells };
}

function kpisFor(categories: ParentCategoryId[]): ReportKpi[] {
  const all: ReportKpi[] = [
    {
      id: 'active-pipeline',
      label: 'Total Active Pipeline',
      value: '16 records',
      hint: 'ETB 8.04M · USD 1.05M',
      accentColor: '#2563eb',
    },
    {
      id: 'closed-won',
      label: 'Closed Won Revenue',
      value: 'ETB 1.58M',
      hint: '2 deals won · 67% Win Rate',
      accentColor: '#16a34a',
      valueColor: '#16a34a',
    },
    {
      id: 'company-target',
      label: 'Company Target (ETB)',
      value: 'ETB 765M',
      hint: 'Remaining Gap: ETB 762.8M',
      accentColor: '#f59e0b',
    },
    {
      id: 'dropped-lost',
      label: 'Dropped / Lost Deals',
      value: '1 deal',
      hint: '33% Churn · ETB 162.5M (EFD)',
      accentColor: '#dc2626',
      valueColor: '#dc2626',
    },
    {
      id: 'customers',
      label: 'Active accounts',
      value: '86',
      hint: 'This quarter',
      trend: '+9%',
    },
    {
      id: 'campaigns',
      label: 'Campaign leads',
      value: '341',
      hint: '3 active campaigns',
      trend: '+6%',
    },
    {
      id: 'partners',
      label: 'Partner pipeline',
      value: 'ETB 23.6M',
      hint: '2 partners',
      trend: '+4%',
    },
    {
      id: 'achievement',
      label: 'Achievement',
      value: '57%',
      hint: 'vs Q2 target',
      trend: '-3%',
    },
  ];

  const byCategory: Record<ParentCategoryId, string[]> = {
    sales: ['active-pipeline', 'closed-won', 'company-target', 'dropped-lost'],
    customers: ['customers'],
    marketing: ['campaigns'],
    'partners-vendors': ['partners'],
    'targets-performance': ['achievement'],
  };

  const wanted = new Set(categories.flatMap((c) => byCategory[c] ?? []));
  const picked = all.filter((k) => wanted.has(k.id));
  return picked.length > 0 ? picked : all.slice(0, 4);
}

function mockCharts(categories: ParentCategoryId[]): ReportChart[] {
  const charts: ReportChart[] = [];

  if (categories.includes('sales')) {
    charts.push({
      id: 'pipeline-stages',
      title: 'Pipeline by stage',
      subtitle: 'Deal value distribution',
      categoryId: 'sales',
      totalLabel: 'ETB 51.6M',
      slices: [
        {
          id: 'qual',
          label: 'Qualification',
          value: 18,
          share: 16,
          color: tokens.color.purple,
          amount: 'ETB 8.2M',
        },
        {
          id: 'prop',
          label: 'Proposal',
          value: 25,
          share: 25,
          color: tokens.color.brand,
          amount: 'ETB 12.9M',
        },
        {
          id: 'neg',
          label: 'Negotiation',
          value: 32,
          share: 32,
          color: tokens.color.warning,
          amount: 'ETB 16.5M',
        },
        {
          id: 'won',
          label: 'Closed won',
          value: 27,
          share: 27,
          color: tokens.color.success,
          amount: 'ETB 14.0M',
        },
      ],
    });
  }

  if (categories.includes('marketing')) {
    charts.push({
      id: 'marketing-channels',
      title: 'Marketing by channel',
      subtitle: 'Lead attribution',
      categoryId: 'marketing',
      totalLabel: '341 leads',
      slices: [
        {
          id: 'paid',
          label: 'Paid ads',
          value: 42,
          share: 42,
          color: tokens.color.brand,
          amount: '143 leads',
        },
        {
          id: 'email',
          label: 'Email',
          value: 28,
          share: 28,
          color: tokens.color.accentBlue,
          amount: '95 leads',
        },
        {
          id: 'events',
          label: 'Events',
          value: 18,
          share: 18,
          color: tokens.color.purple,
          amount: '61 leads',
        },
        {
          id: 'organic',
          label: 'Organic',
          value: 12,
          share: 12,
          color: tokens.color.success,
          amount: '42 leads',
        },
      ],
    });
  }

  if (categories.includes('targets-performance')) {
    charts.push({
      id: 'target-achievement',
      title: 'Target achievement',
      subtitle: 'Actual vs target by department',
      categoryId: 'targets-performance',
      totalLabel: '57%',
      slices: [
        {
          id: 'achieved',
          label: 'Achieved',
          value: 57,
          share: 57,
          color: tokens.color.success,
          amount: 'ETB 93.2M',
        },
        {
          id: 'remaining',
          label: 'Remaining',
          value: 43,
          share: 43,
          color: tokens.color.surfaceHover,
          amount: 'ETB 31.8M',
        },
      ],
    });
  }

  if (categories.includes('customers')) {
    charts.push({
      id: 'customer-vectors',
      title: 'Customers by vector',
      subtitle: 'Active account mix',
      categoryId: 'customers',
      totalLabel: '86 accounts',
      slices: [
        {
          id: 'telecom',
          label: 'Telecom',
          value: 34,
          share: 34,
          color: tokens.color.brand,
          amount: '29 accounts',
        },
        {
          id: 'banking',
          label: 'Banking',
          value: 28,
          share: 28,
          color: tokens.color.accentBlue,
          amount: '24 accounts',
        },
        {
          id: 'gov',
          label: 'Government',
          value: 22,
          share: 22,
          color: tokens.color.purple,
          amount: '19 accounts',
        },
        {
          id: 'other',
          label: 'Other',
          value: 16,
          share: 16,
          color: tokens.color.warning,
          amount: '14 accounts',
        },
      ],
    });
  }

  if (categories.includes('partners-vendors')) {
    charts.push({
      id: 'partner-pipeline',
      title: 'Partner pipeline',
      subtitle: 'Contribution by vendor',
      categoryId: 'partners-vendors',
      totalLabel: 'ETB 23.6M',
      slices: [
        {
          id: 'ms',
          label: 'Microsoft',
          value: 45,
          share: 45,
          color: tokens.color.accentBlue,
          amount: 'ETB 10.6M',
        },
        {
          id: 'ora',
          label: 'Oracle',
          value: 30,
          share: 30,
          color: tokens.color.error,
          amount: 'ETB 7.1M',
        },
        {
          id: 'sap',
          label: 'SAP',
          value: 25,
          share: 25,
          color: tokens.color.brand,
          amount: 'ETB 5.9M',
        },
      ],
    });
  }

  return charts;
}

function filterTags(state: ReportBuilderState, periodLabel: string): string[] {
  const tags: string[] = [periodLabel];

  for (const [field, ids] of Object.entries(state.criteria.multi)) {
    if (!ids?.length) continue;
    const def = FILTER_FIELDS[field as keyof typeof FILTER_FIELDS];
    for (const id of ids) {
      tags.push(def?.options?.find((o) => o.id === id)?.label ?? id);
    }
  }
  return tags;
}

export function buildMockGeneratedReport(
  state: ReportBuilderState,
  reportName: string,
  periodLabel: string,
): GeneratedReport {
  const types = getAvailableReportTypes(state.categories);
  const sections: ReportSection[] = types.map((type) => {
    const data = mockRows(type.id);
    return {
      id: type.id,
      categoryId:
        type.categories.find((c) => state.categories.includes(c)) ??
        SECTION_CATEGORY[type.id],
      title: type.name,
      description: type.description,
      columns: data.columns,
      rows: data.rows,
    };
  });

  const periodLabelResolved = periodLabel;

  return {
    name: reportName,
    categories: state.categories,
    generatedAt: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    generatedBy: 'Jane Doe',
    periodLabel: periodLabelResolved,
    filterTags: [
      ...state.categories.map((id) => getCategory(id)?.shortName ?? id),
      ...filterTags(state, periodLabelResolved),
    ],
    grouping: state.grouping,
    kpis: kpisFor(state.categories),
    charts: mockCharts(state.categories),
    sections,
    ...(state.categories.length === 1 && state.categories[0] === 'sales'
      ? {
          excelLayout: {
            mode: 'sales-two-sheet' as const,
            overviewSheet: 'Executive Overview',
            registrySheet: 'Sales Registry',
          },
        }
      : {}),
  };
}

/** Categories without backend implementation — keep existing UI mock output. */
export const UI_ONLY_REPORT_CATEGORIES: ParentCategoryId[] = [];

export const IMPLEMENTED_REPORT_CATEGORIES: ParentCategoryId[] = [
  'sales',
  'customers',
  'targets-performance',
  'marketing',
  'partners-vendors',
];

/**
 * Build mock slices only for marketing / partners-vendors so they can be
 * merged into a live backend report without changing the UI.
 */
export function buildUiOnlyMockPartial(
  state: ReportBuilderState,
  reportName: string,
  periodLabel: string,
): Pick<GeneratedReport, 'sections' | 'charts' | 'kpis'> {
  const uiCategories = state.categories.filter((c) =>
    UI_ONLY_REPORT_CATEGORIES.includes(c),
  );
  if (uiCategories.length === 0) {
    return { sections: [], charts: [], kpis: [] };
  }

  const mock = buildMockGeneratedReport(
    { ...state, categories: uiCategories },
    reportName,
    periodLabel,
  );

  return {
    sections: mock.sections.filter((s) =>
      UI_ONLY_REPORT_CATEGORIES.includes(s.categoryId),
    ),
    charts: mock.charts.filter((c) =>
      UI_ONLY_REPORT_CATEGORIES.includes(c.categoryId),
    ),
    kpis: mock.kpis,
  };
}
