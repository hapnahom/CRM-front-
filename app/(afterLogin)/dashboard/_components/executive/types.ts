export type DashboardScope = 'company' | 'department' | 'individual';

export type TrendDirection = 'up' | 'down' | 'neutral';

export type CampaignStatus = 'Live' | 'In Progress' | 'Planned';

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface DashboardFiltersState {
  dateRange: [string, string];
  currency: string;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  valueSuffix?: string;
  trendLabel: string;
  trendContext?: string;
  trendDirection: TrendDirection;
  sparkline: number[];
  progress?: number;
  icon: string;
}

export interface PipelineStageDatum {
  stage: string;
  count: number;
  value: number;
}

export interface MonthlyRevenueDatum {
  month: string;
  revenue: number;
  target: number;
}

export interface VendorPipelineDatum {
  vendor: string;
  value: number;
  color: string;
  percent?: number;
}

export interface ForecastActualDatum {
  month: string;
  forecast: number;
  actual: number;
}

export interface TopOpportunity {
  id: string;
  name: string;
  customer: string;
  stage: string;
  value: number;
  probability: number;
  closeDate: string | null;
  ownerName: string;
  ownerInitials: string;
  ownerAvatarUrl: string | null;
}

export interface MarketingChannel {
  name: string;
  value: number;
  color: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
}

export interface MarketingPerformance {
  leadsGenerated: number;
  opportunities: number;
  revenue: number;
  roi: number;
  channels: MarketingChannel[];
  campaigns: MarketingCampaign[];
}

export interface ActionItem {
  id: string;
  label: string;
  count: number;
  severity: ActionSeverity;
  href?: string;
}

export interface AiInsightCard {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: 'danger' | 'success' | 'info' | 'warning';
}

export interface AiInsights {
  cards: AiInsightCard[];
  suggestedAction: string;
  suggestedLinkLabel: string;
}

export interface LeaderboardRow {
  rank: number;
  teamName: string;
  closedRevenue: number;
  targetAchievement: number;
  winRate: number;
}

export interface DepartmentTeam {
  id: string;
  name: string;
  value: number;
  dealCount: number;
  percent: number;
  color: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  total: number;
  dealCount: number;
  teams: DepartmentTeam[];
}

export interface DepartmentPerformance {
  departments: DepartmentOption[];
}

export interface QuotaProgress {
  periodLabel: string;
  percent: number;
  won: number;
  target: number;
  remaining: number;
}

export interface TeamPerformanceRow {
  id: string;
  name: string;
  initials: string;
  color: string;
  dealCount: number;
  winProbability: number;
  pipelineValue: number;
  idle: boolean;
}

export interface TeamPerformance {
  healthPercent: number;
  activeDealCount: number;
  rows: TeamPerformanceRow[];
}

export interface MemberPerformanceRow {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  color: string;
  subtitle: string;
  pipelineValue: number;
  attainedPercent: number;
}

export interface MemberPerformance {
  leadCount: number;
  overallAttainment: number;
  rows: MemberPerformanceRow[];
}

export interface DealSummary {
  id: string;
  name: string;
  stage: string;
  value: number;
  closeDate?: string | null;
}

export interface ClosedDeals {
  total: number;
  count: number;
  rows: DealSummary[];
}

export interface ExpectedToClose {
  total: number;
  rows: DealSummary[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface ExecutiveDashboardApiResponse {
  scope: DashboardScope;
  scopeLabel: string;
  currency: string;
  currencyId?: string | null;
  kpis: KpiMetric[];
  pipelineByStage: PipelineStageDatum[];
  revenueVsTarget: MonthlyRevenueDatum[];
  forecastVsActual: ForecastActualDatum[];
  topOpportunities: TopOpportunity[];
  actionCenter: ActionItem[];
  leaderboard: LeaderboardRow[];
  departmentPerformance?: DepartmentPerformance;
  quotaProgress?: QuotaProgress;
  pipelineByVendor?: VendorPipelineDatum[];
  primaryVendorName?: string;
  primaryVendorPercent?: number;
  teamPerformance?: TeamPerformance;
  memberPerformance?: MemberPerformance;
  closedDeals?: ClosedDeals;
  expectedToClose?: ExpectedToClose;
  generatedAt: string;
  dateRange: { from: string; to: string };
}

export interface ExecutiveDashboardQueryParams {
  startDate?: string;
  endDate?: string;
  currency?: string;
  currencyId?: string;
}
