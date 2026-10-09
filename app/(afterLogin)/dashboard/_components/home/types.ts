export type HomeDashboardView =
  | 'executive'
  | 'department'
  | 'team_leader'
  | 'team_member';

export type PeriodFilter = 'quarterly' | 'annually';

export interface HomeMetrics {
  pipelineValue: number;
  pipelineGrowthLabel: string;
  closedRevenue: number;
  closedRevenueGrowthLabel: string;
  forecastValue: number;
  forecastGrowthLabel: string;
  winRate: number;
  winRateLabel: string;
  activeOpportunities: number;
  activeOpportunitiesLabel: string;
  activeClients: number;
  activeClientsLabel: string;
  quotaAchievement: number;
  quotaAchievementLabel: string;
  activeLeads: number;
  teamMembersCount: number;
  avgDealCycleDays: number;
  assignedAccounts: number;
  tasksDueToday: number;
  teamName?: string | null;
  sdConversionConfigured: boolean;
  sdConversionRate: number | null;
  sdConversionMetricName: string | null;
  sdConversionDetail: string | null;
}

export interface HomeQuotaYtd {
  percentAchieved: number;
  target: number;
  achieved: number;
  remaining: number;
  statusLabel: string;
  title: string;
  subtitle: string;
}

export type QuotaHorizon = 'annual' | 'period';

export interface HomeQuotaAttainment {
  annual: HomeQuotaYtd;
  period: HomeQuotaYtd | null;
  periodLabel: string | null;
  defaultMode: QuotaHorizon;
}

export interface RevenueVsTargetPoint {
  label: string;
  target: number;
  achieved: number;
}

export type HomeRevenueVsTarget = Record<PeriodFilter, RevenueVsTargetPoint[]>;

export interface HomeDistributionItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface HomeDistributionTeam {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface HomeDistributionDepartment {
  id: string;
  name: string;
  total: number;
  teams: HomeDistributionTeam[];
}

export interface HomeDistribution {
  title: string;
  subtitle: string;
  total: number;
  items: HomeDistributionItem[];
  /** Executive view: filter by department and chart team pipeline. */
  departments?: HomeDistributionDepartment[];
}

export interface HomeCustomerDeal {
  id: string;
  dealNumber: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  leadTeam: string;
  owner: string;
  solutionCategory: string;
  status: 'won' | 'lost' | 'active' | 'inactive';
  notes?: string;
}

export interface HomeTopCustomer {
  id: string;
  name: string;
  initials: string;
  industry: string;
  employees: string;
  location: string;
  owner: string;
  ownerId: string | null;
  ownerAvatarUrl: string | null;
  leadTeam: string;
  vector: string;
  avatarColor: string;
  logoUrl: string | null;
  leadsCount: number;
  dealsCount: number;
  totalLeadsDealsCount: number;
  totalCombinedValue: number;
  deals: HomeCustomerDeal[];
}

export interface HomeClosedDeal {
  id: string;
  dealNumber: string;
  name: string;
  team: string;
  status: string;
  value: number;
  customerId: string | null;
}

export interface HomeActivity {
  id: string;
  title: string;
  time: string;
  tag: string;
  tagColor: string;
  textColor: string;
  customer?: string;
  priority?: string;
}

export type TeamMemberStatus =
  | 'Exceeding'
  | 'On Track'
  | 'Attention'
  | 'Ramping';

export interface HomeTeamMember {
  id: string;
  name: string;
  role: string;
  pipeline: number;
  dealsCount: number;
  leadsCount: number;
  wonRevenue: number;
  quotaTarget: number;
  quotaPacing: number;
  winRate: string;
  status: TeamMemberStatus;
}

export interface HomeDashboardApiResponse {
  view: HomeDashboardView;
  viewLabel: string;
  viewDescription: string;
  currency: string;
  generatedAt: string;
  metrics: HomeMetrics;
  quotaYtd: HomeQuotaYtd;
  quotaAttainment: HomeQuotaAttainment;
  revenueVsTarget: HomeRevenueVsTarget;
  distribution: HomeDistribution;
  topCustomers: HomeTopCustomer[];
  closedDeals: HomeClosedDeal[];
  activities: HomeActivity[];
  teamMembers: HomeTeamMember[];
}

export interface HomeDashboardQueryParams {
  startDate?: string;
  endDate?: string;
  currency?: string;
  currencyId?: string;
  sessionId?: string;
  calendarId?: string;
}
