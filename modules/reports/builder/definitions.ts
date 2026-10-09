import { DATE_RANGE_PRESET_OPTIONS } from '@/modules/sales-pipeline/report/period-selection';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';
import type {
  ColumnDefinition,
  ColumnId,
  FilterFieldDefinition,
  FilterFieldId,
  GeneratedReport,
  GroupByOptionId,
  ParentCategory,
  ParentCategoryId,
  ReportTypeDefinition,
  SortByOptionId,
} from './types';

type SalesReportCatalog = {
  PARENT_CATEGORIES: ParentCategory[];
  FILTER_FIELDS: Record<string, FilterFieldDefinition>;
  GROUP_BY_OPTIONS: { id: GroupByOptionId; label: string }[];
  SORT_BY_OPTIONS: { id: SortByOptionId; label: string }[];
  REPORT_TYPES: ReportTypeDefinition[];
  CATEGORY_FILTERS: Record<ParentCategoryId, FilterFieldId[]>;
};

const salesReportCatalogCache = new Map<boolean, SalesReportCatalog>();

function salesReportCatalog(): SalesReportCatalog {
  const key = isLeadsEnabled();
  const cached = salesReportCatalogCache.get(key);
  if (cached) return cached;
  const built = buildSalesReportCatalog();
  salesReportCatalogCache.set(key, built);
  return built;
}

function liveValue<T extends object>(
  pick: (catalog: SalesReportCatalog) => T,
  target: T,
): T {
  return new Proxy(target, {
    get(proxyTarget, prop) {
      const source = pick(salesReportCatalog());
      const value = Reflect.get(source, prop, source);
      return typeof value === 'function' ? value.bind(source) : value;
    },
    has(proxyTarget, prop) {
      return Reflect.has(pick(salesReportCatalog()), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(pick(salesReportCatalog()) as object);
    },
    getOwnPropertyDescriptor(proxyTarget, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        pick(salesReportCatalog()) as object,
        prop,
      );
      if (!descriptor) return undefined;
      return { ...descriptor, configurable: true };
    },
  });
}

function buildSalesReportCatalog(): SalesReportCatalog {
  const opportunityLabel = dealUiLabel();
  const opportunitiesLabel = dealUiLabel({ plural: true });
  const opportunitiesLabelLower = dealUiLabel({
    plural: true,
    lowercase: true,
  });

  const PARENT_CATEGORIES: ParentCategory[] = [
    {
      id: 'customers',
      name: 'Customers',
      shortName: 'Customers',
      description: 'Accounts, contacts & customer activities',
      iconColor: '#059669',
      iconBg: '#d1fae5',
      children: ['Customers', 'Contacts', 'Customer Activities'],
      reportCount: 4,
    },
    {
      id: 'sales',
      name: 'Sales',
      shortName: 'Sales',
      description: isLeadsEnabled()
        ? 'Leads, deals, pipeline & sales activities'
        : `${opportunitiesLabel}, pipeline & sales activities`,
      iconColor: '#ed6925',
      iconBg: '#fdf0e9',
      children: isLeadsEnabled()
        ? ['Leads', 'Deals', 'Pipeline', 'Sales Activities']
        : [opportunitiesLabel, 'Pipeline', 'Sales Activities'],
      reportCount: 7,
    },
    {
      id: 'marketing',
      name: 'Marketing',
      shortName: 'Marketing',
      description: 'Campaigns, marketing leads & conversion',
      iconColor: '#7c3aed',
      iconBg: '#ede9fe',
      children: [
        'Digital Campaigns',
        'Traditional Campaigns',
        'Events',
        'Marketing Activities',
      ],
      reportCount: 5,
    },
    {
      id: 'partners-vendors',
      name: 'Partners & Vendors',
      shortName: 'Partners',
      description: 'Vendors, implementation partners & performance',
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      children: [
        'Vendors',
        'Implementation Partners',
        'Partner/Vendor Pipeline',
        'Partner/Vendor Performance',
      ],
      reportCount: 4,
    },
    {
      id: 'targets-performance',
      name: 'Targets & Performance',
      shortName: 'Targets',
      description: 'Targets, forecast, actual & achievement',
      iconColor: '#dc2626',
      iconBg: '#fee2e2',
      children: [
        'Annual Target',
        'Quarterly Target',
        'Forecast',
        'Actual',
        'Achievement',
        'Variance',
      ],
      reportCount: 2,
    },
  ];

  const FILTER_FIELDS: Record<string, FilterFieldDefinition> = {
    dateRange: {
      id: 'dateRange',
      label: 'Date Range',
      kind: 'select',
      options: [...DATE_RANGE_PRESET_OPTIONS],
    },
    fromTo: {
      id: 'fromTo',
      label: 'From – To',
      kind: 'date-range',
      placeholder: 'Select date range',
    },
    currency: {
      id: 'currency',
      label: 'Currency',
      kind: 'multi',
      placeholder: 'All currencies',
      options: [],
    },
    fiscalYear: {
      id: 'fiscalYear',
      label: 'Fiscal Year',
      kind: 'select',
      options: [
        { id: 'fy-2026-27', label: 'FY 2026/27' },
        { id: 'fy-2025-26', label: 'FY 2025/26' },
        { id: 'fy-2024-25', label: 'FY 2024/25' },
      ],
    },
    quarter: {
      id: 'quarter',
      label: 'Quarter',
      kind: 'select',
      options: [
        { id: 'q1', label: 'Q1' },
        { id: 'q2', label: 'Q2' },
        { id: 'q3', label: 'Q3' },
        { id: 'q4', label: 'Q4' },
        { id: 'all', label: 'All Quarters' },
      ],
    },
    department: {
      id: 'department',
      label: 'Department',
      kind: 'multi',
      placeholder: 'All departments',
      options: [
        { id: 'sales', label: 'Sales' },
        { id: 'enterprise', label: 'Enterprise' },
        { id: 'public', label: 'Public' },
        { id: 'presales', label: 'Presales' },
        { id: 'marketing', label: 'Marketing' },
      ],
    },
    team: {
      id: 'team',
      label: 'Team',
      kind: 'multi',
      placeholder: 'All teams',
      options: [
        { id: 'team-a', label: 'Team A' },
        { id: 'team-b', label: 'Team B' },
        { id: 'team-c', label: 'Team C' },
        { id: 'enterprise-east', label: 'Enterprise East' },
        { id: 'enterprise-west', label: 'Enterprise West' },
      ],
    },
    owner: {
      id: 'owner',
      label: 'Owner',
      kind: 'multi',
      placeholder: 'All owners',
      options: [
        { id: 'jd', label: 'Jane Doe' },
        { id: 'ms', label: 'Michael Scott' },
        { id: 'ak', label: 'Amina Kebede' },
        { id: 'tr', label: 'Tom Reynolds' },
        { id: 'sl', label: 'Sara Lemma' },
      ],
    },
    customer: {
      id: 'customer',
      label: 'Customer',
      kind: 'multi',
      placeholder: 'All customers',
      options: [
        { id: 'ethio-telecom', label: 'Ethio Telecom' },
        { id: 'cbe', label: 'Commercial Bank of Ethiopia' },
        { id: 'safaricom', label: 'Safaricom ET' },
        { id: 'dashen', label: 'Dashen Bank' },
        { id: 'awash', label: 'Awash Bank' },
      ],
    },
    solution: {
      id: 'solution',
      label: 'Solution',
      kind: 'multi',
      placeholder: 'Select solutions...',
      options: [
        { id: 'crm-suite', label: 'CRM Suite' },
        { id: 'erp-core', label: 'ERP Core' },
        { id: 'analytics', label: 'Analytics Platform' },
        { id: 'security', label: 'Security Suite' },
        { id: 'cloud', label: 'Cloud Infrastructure' },
      ],
    },
    vendor: {
      id: 'vendor',
      label: 'Vendor',
      kind: 'multi',
      placeholder: 'Search vendors...',
      options: [
        { id: 'microsoft', label: 'Microsoft' },
        { id: 'oracle', label: 'Oracle' },
        { id: 'sap', label: 'SAP' },
        { id: 'cisco', label: 'Cisco' },
        { id: 'aws', label: 'AWS' },
      ],
    },
    implementationPartner: {
      id: 'implementationPartner',
      label: 'Implementation Partner',
      kind: 'multi',
      placeholder: 'Search implementation partners...',
      options: [
        { id: 'techbridge', label: 'TechBridge' },
        { id: 'cloudnova', label: 'CloudNova' },
        { id: 'datasphere', label: 'DataSphere' },
        { id: 'nexora', label: 'Nexora Partners' },
      ],
    },
    vector: {
      id: 'vector',
      label: 'Vector',
      kind: 'multi',
      placeholder: 'Select vectors...',
      options: [
        { id: 'telecom', label: 'Telecom' },
        { id: 'banking', label: 'Banking' },
        { id: 'government', label: 'Government' },
        { id: 'manufacturing', label: 'Manufacturing' },
        { id: 'energy', label: 'Energy' },
      ],
    },
    dealStage: {
      id: 'dealStage',
      label: `${opportunityLabel} Stage`,
      kind: 'multi',
      placeholder: 'Select stages...',
      options: [
        { id: 'qualification', label: 'Qualification' },
        { id: 'proposal', label: 'Proposal' },
        { id: 'negotiation', label: 'Negotiation' },
        { id: 'closed-won', label: 'Closed Won' },
        { id: 'closed-lost', label: 'Closed Lost' },
      ],
    },
    dealStatus: {
      id: 'dealStatus',
      label: `${opportunityLabel} Status`,
      kind: 'multi',
      placeholder: 'Select statuses...',
      options: [
        { id: 'open', label: 'Open' },
        { id: 'won', label: 'Won' },
        { id: 'lost', label: 'Lost' },
        { id: 'on-hold', label: 'On Hold' },
      ],
    },
    status: {
      id: 'status',
      label: 'Status',
      kind: 'multi',
      placeholder: 'Select statuses...',
      options: [
        { id: 'active', label: 'Active' },
        { id: 'open', label: 'Open' },
        { id: 'in-progress', label: 'In Progress' },
        { id: 'completed', label: 'Completed' },
        { id: 'archived', label: 'Archived' },
      ],
    },
    probability: {
      id: 'probability',
      label: 'Probability',
      kind: 'multi',
      placeholder: 'Select ranges...',
      options: [
        { id: '0-25', label: '0–25%' },
        { id: '26-50', label: '26–50%' },
        { id: '51-75', label: '51–75%' },
        { id: '76-100', label: '76–100%' },
      ],
    },
    campaign: {
      id: 'campaign',
      label: 'Campaign',
      kind: 'multi',
      placeholder: 'Search campaigns...',
      options: [],
    },
    marketingChannel: {
      id: 'marketingChannel',
      label: 'Marketing Channel',
      kind: 'multi',
      placeholder: 'Select channels...',
      options: [
        { id: 'Email', label: 'Email' },
        { id: 'Social Media', label: 'Social Media' },
        { id: 'Search Advertising', label: 'Search Advertising' },
        { id: 'Display Advertising', label: 'Display Advertising' },
        { id: 'SEO', label: 'SEO' },
        { id: 'Content', label: 'Content' },
        { id: 'Event', label: 'Event' },
      ],
    },
    campaignType: {
      id: 'campaignType',
      label: 'Campaign Type',
      kind: 'multi',
      placeholder: 'Select types...',
      options: [
        { id: 'Lead Generation', label: 'Lead Generation' },
        { id: 'Brand Awareness', label: 'Brand Awareness' },
        { id: 'Product Promotion', label: 'Product Promotion' },
        { id: 'Customer Retention', label: 'Customer Retention' },
        { id: 'Event Promotion', label: 'Event Promotion' },
        { id: 'Revenue Generation', label: 'Revenue Generation' },
        { id: 'Other', label: 'Other' },
      ],
    },
  };

  const GROUP_BY_OPTIONS: { id: GroupByOptionId; label: string }[] = [
    { id: 'department', label: 'Department' },
    { id: 'team', label: 'Team' },
    { id: 'owner', label: 'Owner' },
    { id: 'customer', label: 'Customer' },
    { id: 'solution', label: 'Solution' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'implementationPartner', label: 'Implementation Partner' },
    { id: 'dealStage', label: `${opportunityLabel} Stage` },
    { id: 'status', label: 'Status' },
    { id: 'vector', label: 'Vector' },
    { id: 'campaign', label: 'Campaign' },
    { id: 'user', label: 'User' },
  ];

  const SORT_BY_OPTIONS: { id: SortByOptionId; label: string }[] = [
    { id: 'pipelineValue', label: 'Pipeline Value' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'target', label: 'Target' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'achievement', label: 'Achievement %' },
    { id: 'dealCount', label: `${opportunityLabel} Count` },
    { id: 'leadCount', label: 'Lead Count' },
    { id: 'customerCount', label: 'Customer Count' },
    { id: 'activityCount', label: 'Activity Count' },
    { id: 'conversionRate', label: 'Conversion Rate' },
  ];

  const COMMON_TIME_FILTERS = ['dateRange', 'fromTo'] as const;
  const COMMON_CURRENCY_FILTER = ['currency'] as const;

  const ORG_FILTERS = ['department', 'team', 'owner', 'vector'] as const;

  const REPORT_TYPES: ReportTypeDefinition[] = [
    {
      id: 'summary-overview',
      name: 'Summary Overview',
      description: 'High-level KPIs across selected business areas',
      categories: [
        'customers',
        'marketing',
        'partners-vendors',
        'targets-performance',
      ],
      alwaysAvailable: true,
      filters: [...COMMON_TIME_FILTERS, ...ORG_FILTERS],
      groupBy: ['department', 'team', 'vector'],
      sortBy: ['pipelineValue', 'revenue', 'dealCount', 'leadCount'],
      columns: [
        { id: 'metric', label: 'Metric', defaultSelected: true },
        { id: 'value', label: 'Value', defaultSelected: true },
        { id: 'prior', label: 'Prior Period', defaultSelected: true },
        { id: 'change', label: 'Change %', defaultSelected: true },
        { id: 'owner', label: 'Owner', defaultSelected: false },
      ],
      about:
        'Aggregates key metrics from all selected categories into a single executive summary.',
    },
    {
      id: 'pipeline-opportunities',
      name: 'Pipeline & Opportunities',
      description: `Analyze ${opportunitiesLabelLower}, stages, value and forecast`,
      categories: ['partners-vendors'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'customer',
        'solution',
        'vendor',
        'implementationPartner',
        'status',
        'dealStage',
        'dealStatus',
        'probability',
      ],
      groupBy: [
        'team',
        'owner',
        'department',
        'customer',
        'solution',
        'vendor',
        'implementationPartner',
        'dealStage',
        'status',
        'vector',
      ],
      sortBy: ['pipelineValue', 'forecast', 'dealCount', 'revenue'],
      columns: [
        {
          id: 'dealName',
          label: `${opportunityLabel} Name`,
          defaultSelected: true,
        },
        { id: 'customer', label: 'Customer', defaultSelected: true },
        { id: 'owner', label: 'Owner', defaultSelected: true },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'department', label: 'Department', defaultSelected: false },
        { id: 'solution', label: 'Solution', defaultSelected: false },
        { id: 'vendor', label: 'Vendor', defaultSelected: false },
        {
          id: 'implementationPartner',
          label: 'Implementation Partner',
          defaultSelected: false,
        },
        { id: 'stage', label: 'Stage', defaultSelected: true },
        { id: 'status', label: 'Status', defaultSelected: true },
        { id: 'probability', label: 'Probability', defaultSelected: true },
        {
          id: 'dealValue',
          label: `${opportunityLabel} Value`,
          defaultSelected: true,
        },
        { id: 'forecastValue', label: 'Forecast Value', defaultSelected: true },
        { id: 'expectedClose', label: 'Expected Close', defaultSelected: true },
      ],
      about:
        'Shows open and historical pipeline opportunities with grouping by team, owner, stage, vendor, or implementation partner.',
    },
    {
      id: 'leads-acquisition',
      name: 'Leads & Acquisition',
      description: 'Lead volume, sources and qualification trends',
      categories: ['marketing'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'status',
        'campaign',
        'customer',
      ],
      groupBy: ['team', 'owner', 'campaign', 'status', 'vector'],
      sortBy: ['leadCount', 'conversionRate', 'activityCount'],
      columns: [
        { id: 'leadName', label: 'Lead', defaultSelected: true },
        { id: 'status', label: 'Status', defaultSelected: true },
        { id: 'owner', label: 'Owner', defaultSelected: true },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'campaign', label: 'Campaign', defaultSelected: false },
        { id: 'created', label: 'Created', defaultSelected: true },
        { id: 'score', label: 'Score', defaultSelected: false },
      ],
      about:
        'Tracks lead intake and qualification across sales and marketing sources.',
    },
    {
      id: 'customer-account',
      name: 'Customer & Account',
      description: 'Account health, pipeline and activity overview',
      categories: ['customers'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'customer',
        'solution',
        'status',
      ],
      groupBy: ['customer', 'owner', 'team', 'vector', 'department'],
      sortBy: ['revenue', 'pipelineValue', 'customerCount', 'activityCount'],
      columns: [
        { id: 'customer', label: 'Customer', defaultSelected: true },
        { id: 'vector', label: 'Vector', defaultSelected: true },
        { id: 'owner', label: 'Owner', defaultSelected: true },
        { id: 'contacts', label: 'Contacts', defaultSelected: false },
        {
          id: 'openDeals',
          label: `Open ${opportunitiesLabel}`,
          defaultSelected: true,
        },
        { id: 'pipeline', label: 'Pipeline', defaultSelected: true },
        { id: 'forecast', label: 'Forecast', defaultSelected: true },
        { id: 'revenue', label: 'Revenue', defaultSelected: true },
        { id: 'lastActivity', label: 'Last Activity', defaultSelected: true },
      ],
      about:
        'Combines account profile data with related opportunities, pipeline, forecast and recent activity.',
    },
    {
      id: 'marketing-performance',
      name: 'Marketing Performance',
      description: 'Campaign results, channels and engagement',
      categories: ['marketing'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'campaign',
        'marketingChannel',
        'campaignType',
        'status',
      ],
      groupBy: ['campaign', 'team', 'owner', 'vector'],
      sortBy: ['leadCount', 'conversionRate', 'activityCount', 'revenue'],
      columns: [
        { id: 'campaign', label: 'Campaign', defaultSelected: true },
        { id: 'channel', label: 'Channel', defaultSelected: true },
        { id: 'type', label: 'Type', defaultSelected: true },
        { id: 'leads', label: 'Leads', defaultSelected: true },
        { id: 'qualified', label: 'Qualified', defaultSelected: true },
        { id: 'conversion', label: 'Conversion %', defaultSelected: true },
        { id: 'cost', label: 'Cost', defaultSelected: false },
        { id: 'revenue', label: 'Attributed Revenue', defaultSelected: true },
      ],
      about:
        'Measures campaign effectiveness across channels, lead quality and attributed revenue.',
    },
    {
      id: 'partner-vendor-performance',
      name: 'Partner & Vendor Performance',
      description: 'Vendor and implementation partner pipeline & achievement',
      categories: ['partners-vendors'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'implementationPartner',
        'vendor',
        'solution',
        'customer',
        'status',
      ],
      groupBy: ['implementationPartner', 'vendor', 'solution', 'team', 'owner'],
      sortBy: ['pipelineValue', 'revenue', 'dealCount', 'achievement'],
      columns: [
        {
          id: 'implementationPartner',
          label: 'Implementation Partner',
          defaultSelected: true,
        },
        { id: 'vendor', label: 'Vendor', defaultSelected: true },
        { id: 'solution', label: 'Solution', defaultSelected: true },
        { id: 'deals', label: opportunitiesLabel, defaultSelected: true },
        { id: 'pipeline', label: 'Pipeline', defaultSelected: true },
        { id: 'forecast', label: 'Forecast', defaultSelected: true },
        { id: 'revenue', label: 'Revenue', defaultSelected: true },
        { id: 'achievement', label: 'Achievement %', defaultSelected: true },
      ],
      about:
        'Evaluates vendor and implementation partner contribution to pipeline, forecast and closed revenue.',
    },
    {
      id: 'target-vs-performance',
      name: 'Target vs Performance',
      description: 'Target, forecast, actual, variance & achievement',
      categories: ['targets-performance'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'solution',
        'vendor',
        'implementationPartner',
      ],
      groupBy: [
        'department',
        'team',
        'user',
        'solution',
        'vendor',
        'implementationPartner',
        'vector',
      ],
      sortBy: ['target', 'forecast', 'achievement', 'revenue'],
      columns: [
        { id: 'department', label: 'Department', defaultSelected: true },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'user', label: 'User', defaultSelected: false },
        { id: 'annualTarget', label: 'Annual Target', defaultSelected: true },
        { id: 'quarterTarget', label: 'Quarter Target', defaultSelected: true },
        { id: 'forecast', label: 'Forecast', defaultSelected: true },
        { id: 'actual', label: 'Actual', defaultSelected: true },
        { id: 'variance', label: 'Variance', defaultSelected: true },
        { id: 'achievement', label: 'Achievement %', defaultSelected: true },
      ],
      about:
        'Compares organizational targets against forecast and actual results with variance and achievement %.',
    },
    {
      id: 'activity-engagement',
      name: 'Activity & Engagement',
      description: 'Calls, meetings, tasks and follow-ups',
      categories: ['customers', 'marketing', 'partners-vendors'],
      alwaysAvailable: true,
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'customer',
        'status',
        'campaign',
      ],
      groupBy: ['team', 'owner', 'customer', 'status'],
      sortBy: ['activityCount', 'dealCount', 'leadCount'],
      columns: [
        { id: 'activity', label: 'Activity', defaultSelected: true },
        { id: 'type', label: 'Type', defaultSelected: true },
        { id: 'relatedTo', label: 'Related To', defaultSelected: true },
        { id: 'owner', label: 'Owner', defaultSelected: true },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'date', label: 'Date', defaultSelected: true },
        { id: 'status', label: 'Status', defaultSelected: true },
      ],
      about: 'Summarizes engagement activities across the selected CRM areas.',
    },
    {
      id: 'conversion-analysis',
      name: 'Conversion Analysis',
      description: 'Funnel conversion across stages and sources',
      categories: ['marketing', 'customers'],
      alwaysAvailable: true,
      filters: [
        ...COMMON_TIME_FILTERS,
        ...ORG_FILTERS,
        'campaign',
        'dealStage',
        'status',
      ],
      groupBy: ['team', 'owner', 'campaign', 'vector'],
      sortBy: ['conversionRate', 'leadCount', 'dealCount', 'revenue'],
      columns: [
        { id: 'stage', label: 'Stage', defaultSelected: true },
        { id: 'count', label: 'Count', defaultSelected: true },
        { id: 'conversion', label: 'Conversion %', defaultSelected: true },
        { id: 'avgDays', label: 'Avg Days', defaultSelected: true },
        { id: 'value', label: 'Value', defaultSelected: true },
      ],
      about: isLeadsEnabled()
        ? 'Shows how records move through the funnel from lead to revenue across selected modules.'
        : 'Shows how records move through the funnel to revenue across selected modules.',
    },
    {
      id: 'sales-team-performance',
      name: 'CRM Team Performance',
      description: 'Department, team, and vector pipeline breakdown',
      categories: ['sales'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...COMMON_CURRENCY_FILTER,
        ...ORG_FILTERS,
      ],
      groupBy: ['department', 'team', 'vector'],
      sortBy: ['pipelineValue', 'dealCount', 'leadCount'],
      columns: [
        { id: 'department', label: 'Department', defaultSelected: true },
        { id: 'team', label: 'Sales team', defaultSelected: true },
        {
          id: 'vector',
          label: 'Business vector / sector',
          defaultSelected: true,
        },
        ...(isLeadsEnabled()
          ? [{ id: 'leads' as const, label: 'Leads', defaultSelected: true }]
          : []),
        { id: 'deals', label: opportunitiesLabel, defaultSelected: true },
        { id: 'pipeline', label: 'Pipeline value', defaultSelected: true },
      ],
      about:
        'Organization-level pipeline view aligned with the Sales Hub pipeline report.',
    },
    {
      id: 'sales-rep-performance',
      name: 'Sales Representative Performance',
      description: 'Individual contributor pipeline, won revenue, and win rate',
      categories: ['sales'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...COMMON_CURRENCY_FILTER,
        ...ORG_FILTERS,
      ],
      groupBy: ['owner', 'team', 'department'],
      sortBy: ['pipelineValue', 'revenue', 'dealCount', 'leadCount'],
      columns: [
        {
          id: 'representative',
          label: 'Sales representative',
          defaultSelected: true,
        },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'department', label: 'Department', defaultSelected: true },
        ...(isLeadsEnabled()
          ? [{ id: 'leads' as const, label: 'Leads', defaultSelected: true }]
          : []),
        { id: 'deals', label: opportunitiesLabel, defaultSelected: true },
        { id: 'openPipeline', label: 'Open pipeline', defaultSelected: true },
        { id: 'wonRevenue', label: 'Won revenue', defaultSelected: true },
        { id: 'winRate', label: 'Win rate', defaultSelected: true },
      ],
      about:
        'Sales rep performance table aligned with the Sales Hub pipeline report.',
    },
    {
      id: 'sales-customer-concentration',
      name: 'Customer Pipeline Concentration',
      description: 'Account-level concentration and volume view',
      categories: ['sales'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...COMMON_CURRENCY_FILTER,
        ...ORG_FILTERS,
        'customer',
        'vector',
      ],
      groupBy: ['customer', 'vector'],
      sortBy: ['pipelineValue', 'revenue', 'dealCount'],
      columns: [
        { id: 'customer', label: 'Customer', defaultSelected: true },
        { id: 'vector', label: 'Assigned vector', defaultSelected: true },
        {
          id: 'activeDeals',
          label: `Active ${opportunitiesLabelLower}`,
          defaultSelected: true,
        },
        {
          id: 'openPipeline',
          label: 'Open pipeline value',
          defaultSelected: true,
        },
        { id: 'wonRevenue', label: 'Won revenue', defaultSelected: true },
        { id: 'totalVolume', label: 'Total volume', defaultSelected: true },
      ],
      about:
        'Customer concentration view aligned with the Sales Hub pipeline report.',
    },
    {
      id: 'sales-opportunity-registry',
      name: 'Total Opportunity',
      description: isLeadsEnabled()
        ? 'Union of deal and lead opportunities for the selected scope'
        : `${opportunitiesLabel} inventory for the selected scope`,
      categories: ['sales'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...COMMON_CURRENCY_FILTER,
        ...ORG_FILTERS,
        'dealStage',
        'dealStatus',
        'status',
      ],
      groupBy: ['owner', 'team', 'customer', 'dealStage'],
      sortBy: ['pipelineValue', 'dealCount', 'leadCount'],
      columns: [
        { id: 'value', label: 'Value', defaultSelected: true },
        { id: 'customer', label: 'Customer', defaultSelected: true },
        { id: 'opportunity', label: 'Name', defaultSelected: true },
        {
          id: 'opportunityType',
          label: 'Type',
          defaultSelected: true,
        },
        { id: 'owner', label: 'Owner', defaultSelected: true },
        { id: 'stage', label: 'Stage', defaultSelected: true },
        { id: 'expectedClose', label: 'Expected Close', defaultSelected: true },
      ],
      about: isLeadsEnabled()
        ? `Union of Total ${opportunitiesLabel} and Total Leads with Opportunity Type (${opportunityLabel} / Lead).`
        : `Total ${opportunitiesLabel} inventory for the selected scope.`,
    },
    {
      id: 'sales-closed-won',
      name: `Closed Won ${opportunitiesLabel}`,
      description: 'Won opportunities in the selected scope and period',
      categories: ['sales'],
      filters: [
        ...COMMON_TIME_FILTERS,
        ...COMMON_CURRENCY_FILTER,
        ...ORG_FILTERS,
      ],
      groupBy: ['owner', 'team', 'department', 'customer'],
      sortBy: ['revenue', 'dealCount'],
      columns: [
        { id: 'opportunity', label: 'Name', defaultSelected: true },
        { id: 'customer', label: 'Customer', defaultSelected: true },
        { id: 'team', label: 'Team', defaultSelected: true },
        { id: 'department', label: 'Department', defaultSelected: true },
        { id: 'value', label: 'Value', defaultSelected: true },
        { id: 'closedDate', label: 'Closed date', defaultSelected: true },
      ],
      about: `Closed won ${opportunitiesLabelLower} table aligned with the Sales Hub pipeline report.`,
    },
  ];

  const CATEGORY_FILTERS: Record<ParentCategoryId, FilterFieldId[]> = {
    customers: [
      ...COMMON_TIME_FILTERS,
      ...COMMON_CURRENCY_FILTER,
      'department',
      'team',
      'owner',
      'customer',
      'solution',
      'vector',
      'status',
    ],
    sales: [
      ...COMMON_TIME_FILTERS,
      ...COMMON_CURRENCY_FILTER,
      ...ORG_FILTERS,
      'customer',
      'solution',
      'vendor',
      'implementationPartner',
      'status',
      'dealStage',
      'dealStatus',
      'probability',
    ],
    marketing: [
      ...COMMON_TIME_FILTERS,
      ...COMMON_CURRENCY_FILTER,
      'department',
      'team',
      'owner',
      'campaign',
      'marketingChannel',
      'campaignType',
      'status',
    ],
    'partners-vendors': [
      ...COMMON_TIME_FILTERS,
      ...COMMON_CURRENCY_FILTER,
      'department',
      'team',
      'owner',
      'vendor',
      'implementationPartner',
      'solution',
      'customer',
      'status',
    ],
    'targets-performance': [
      ...COMMON_TIME_FILTERS,
      ...COMMON_CURRENCY_FILTER,
      ...ORG_FILTERS,
      'solution',
      'vendor',
      'implementationPartner',
    ],
  };

  return {
    PARENT_CATEGORIES,
    FILTER_FIELDS,
    GROUP_BY_OPTIONS,
    SORT_BY_OPTIONS,
    REPORT_TYPES,
    CATEGORY_FILTERS,
  };
}

export const PARENT_CATEGORIES = liveValue(
  (catalog) => catalog.PARENT_CATEGORIES,
  [] as ParentCategory[],
);
export const FILTER_FIELDS = liveValue(
  (catalog) => catalog.FILTER_FIELDS,
  {} as Record<string, FilterFieldDefinition>,
);
export const GROUP_BY_OPTIONS = liveValue(
  (catalog) => catalog.GROUP_BY_OPTIONS,
  [] as { id: GroupByOptionId; label: string }[],
);
export const SORT_BY_OPTIONS = liveValue(
  (catalog) => catalog.SORT_BY_OPTIONS,
  [] as { id: SortByOptionId; label: string }[],
);
export const REPORT_TYPES = liveValue(
  (catalog) => catalog.REPORT_TYPES,
  [] as ReportTypeDefinition[],
);
export const CATEGORY_FILTERS = liveValue(
  (catalog) => catalog.CATEGORY_FILTERS,
  {} as Record<ParentCategoryId, FilterFieldId[]>,
);

const FILTER_ORDER: FilterFieldId[] = [
  'dateRange',
  'fromTo',
  'currency',
  'department',
  'team',
  'owner',
  'customer',
  'solution',
  'status',
  'dealStage',
  'dealStatus',
  'probability',
  'vendor',
  'implementationPartner',
  'vector',
  'campaign',
  'marketingChannel',
  'campaignType',
];

/** Resolve which report types belong to the selected parent categories */
export function getAvailableReportTypes(selected: string[]) {
  if (selected.length === 0) return [];
  return REPORT_TYPES.filter((rt) =>
    rt.categories.some((c) => selected.includes(c)),
  );
}

export function getFiltersForCategories(
  selected: ParentCategoryId[],
): FilterFieldId[] {
  const seen = new Set<FilterFieldId>();
  for (const cat of selected) {
    for (const field of CATEGORY_FILTERS[cat] ?? []) {
      seen.add(field);
    }
  }
  const leftover = [...seen].filter((id) => !FILTER_ORDER.includes(id));
  return [...FILTER_ORDER.filter((id) => seen.has(id)), ...leftover];
}

export function getGroupByForCategories(selected: ParentCategoryId[]) {
  const types = getAvailableReportTypes(selected);
  const seen = new Set<GroupByOptionId>();
  for (const type of types) {
    for (const id of type.groupBy) seen.add(id);
  }
  return GROUP_BY_OPTIONS.filter((o) => seen.has(o.id));
}

export function getSortByForCategories(selected: ParentCategoryId[]) {
  const types = getAvailableReportTypes(selected);
  const seen = new Set<SortByOptionId>();
  for (const type of types) {
    for (const id of type.sortBy) seen.add(id);
  }
  return SORT_BY_OPTIONS.filter((o) => seen.has(o.id));
}

export function getColumnsForCategories(
  selected: ParentCategoryId[],
): ColumnDefinition[] {
  const types = getAvailableReportTypes(selected);
  const byId = new Map<string, ColumnDefinition>();
  for (const type of types) {
    for (const col of type.columns) {
      if (!byId.has(col.id)) byId.set(col.id, col);
    }
  }
  return [...byId.values()];
}

/** Columns grouped by selected category → report section (for the column picker). */
export type ColumnSectionGroup = {
  reportTypeId: string;
  sectionLabel: string;
  columns: ColumnDefinition[];
};

export type ColumnCategoryGroup = {
  categoryId: ParentCategoryId;
  categoryLabel: string;
  sections: ColumnSectionGroup[];
};

export function getColumnsGroupedByCategory(
  selected: ParentCategoryId[],
): ColumnCategoryGroup[] {
  if (!selected.length) return [];

  const types = getAvailableReportTypes(selected);
  const groups: ColumnCategoryGroup[] = [];

  for (const categoryId of selected) {
    const category = getCategory(categoryId);
    const sections: ColumnSectionGroup[] = [];

    for (const type of types) {
      if (!type.categories.includes(categoryId)) continue;
      // Assign multi-category sections to one selected category (first match)
      const preferred =
        type.categories.find((c) => selected.includes(c)) ?? type.categories[0];
      if (preferred !== categoryId) continue;
      if (!type.columns.length) continue;

      sections.push({
        reportTypeId: type.id,
        sectionLabel: type.name,
        columns: type.columns,
      });
    }

    if (!sections.length) continue;
    groups.push({
      categoryId,
      categoryLabel: category?.shortName ?? categoryId,
      sections,
    });
  }

  return groups;
}

/**
 * Reorder selected columns within one section/category group;
 * other groups keep relative order (same as sales report groups).
 */
export function reorderSelectedIdsInCategory(
  selectedIds: ColumnId[],
  groupColumnIds: ColumnId[],
  activeId: string,
  overId: string,
): ColumnId[] {
  const groupSet = new Set(groupColumnIds);
  const groupSelected = selectedIds.filter((id) => groupSet.has(id));
  const oldIndex = groupSelected.indexOf(activeId as ColumnId);
  const newIndex = groupSelected.indexOf(overId as ColumnId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return selectedIds;
  }
  const reordered = [...groupSelected];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved!);

  let cursor = 0;
  return selectedIds.map((id) =>
    groupSet.has(id) ? reordered[cursor++]! : id,
  );
}

export function defaultColumnsForCategories(
  selected: ParentCategoryId[],
): ColumnId[] {
  const groups = getColumnsGroupedByCategory(selected);
  const seen = new Set<ColumnId>();
  const ids: ColumnId[] = [];
  for (const group of groups) {
    for (const section of group.sections) {
      for (const col of section.columns) {
        if (!col.defaultSelected || seen.has(col.id)) continue;
        seen.add(col.id);
        ids.push(col.id);
      }
    }
  }
  return ids;
}

/**
 * Keep only selected columns (in the user's order). Sections with no
 * remaining columns are omitted so their titles are not shown.
 */
export function applySelectedColumnsToReport(
  report: GeneratedReport,
  selectedColumns: ColumnId[],
): GeneratedReport {
  if (!selectedColumns.length) {
    return { ...report, sections: [] };
  }

  const sections = report.sections
    .map((section) => {
      const columns = selectedColumns
        .map((id) => section.columns.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      if (!columns.length) return null;
      return { ...section, columns };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return { ...report, sections };
}

export function getReportType(id: string | null) {
  return REPORT_TYPES.find((rt) => rt.id === id) ?? null;
}

export function getCategory(id: string) {
  return PARENT_CATEGORIES.find((c) => c.id === id);
}

export function getGroupByLabel(id: GroupByOptionId) {
  return GROUP_BY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function getSortByLabel(id: SortByOptionId) {
  return SORT_BY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
