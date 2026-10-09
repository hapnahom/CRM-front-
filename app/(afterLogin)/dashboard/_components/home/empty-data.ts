import type { HomeDashboardApiResponse } from './types';
import { dealUiLabel } from '@/config/salesWorkflow';

/** Client-side empty dashboard when the tenant has no currencies (or metrics cannot load). */
export function createEmptyHomeDashboard(
  overrides?: Partial<HomeDashboardApiResponse>,
): HomeDashboardApiResponse {
  return {
    view: 'executive',
    viewLabel: 'Dashboard',
    viewDescription: '',
    currency: '',
    generatedAt: new Date().toISOString(),
    metrics: {
      pipelineValue: 0,
      pipelineGrowthLabel: 'Opportunities',
      closedRevenue: 0,
      closedRevenueGrowthLabel: 'Won stage',
      forecastValue: 0,
      forecastGrowthLabel: 'No target set',
      winRate: 0,
      winRateLabel: `No closed ${dealUiLabel({ plural: true, lowercase: true })} yet`,
      activeOpportunities: 0,
      activeOpportunitiesLabel: '0 opportunities',
      activeClients: 0,
      activeClientsLabel: 'All customers',
      quotaAchievement: 0,
      quotaAchievementLabel: 'No quota set',
      activeLeads: 0,
      teamMembersCount: 0,
      avgDealCycleDays: 0,
      assignedAccounts: 0,
      tasksDueToday: 0,
      teamName: null,
      sdConversionConfigured: false,
      sdConversionRate: null,
      sdConversionMetricName: null,
      sdConversionDetail: null,
    },
    quotaYtd: {
      percentAchieved: 0,
      target: 0,
      achieved: 0,
      remaining: 0,
      statusLabel: 'On track',
      title: 'Quota Achievement',
      subtitle: 'Year to date',
    },
    quotaAttainment: {
      annual: {
        percentAchieved: 0,
        target: 0,
        achieved: 0,
        remaining: 0,
        statusLabel: 'On track',
        title: 'Overall Company Target',
        subtitle: 'Annual · no target set',
      },
      period: null,
      periodLabel: null,
      defaultMode: 'annual',
    },
    revenueVsTarget: {
      quarterly: [],
      annually: [],
    },
    distribution: {
      title: 'Pipeline Distribution',
      subtitle: '',
      total: 0,
      items: [],
    },
    topCustomers: [],
    closedDeals: [],
    activities: [],
    teamMembers: [],
    ...overrides,
  };
}
