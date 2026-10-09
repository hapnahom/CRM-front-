import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';
import { authHeaders, retryUnlessUnauthorized } from './api';

export type PipelineCurrency = string;

export interface DashboardKpis {
  pipelineValue: string;
  pipelineTrend: string;
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  expiredLeads: number;
  leadsTrend: string;
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  dealsTrend: string;
  winRate: string;
  winRateDetail: string;
  targetPercent: number;
  targetAchievedValue?: number;
  targetTargetValue?: number;
  achieved: string;
  target: string;
  remaining: string;
  teamMeta: string;
  qualifiedLabel: string;
  expiredLabel: string;
}

export interface PipelineStageInsight {
  id: string;
  label: string;
  group: 'Lead' | 'Deal';
  amount: string;
  share: number;
  color: string;
  count: number;
}

export interface PipelineRecordInsight {
  id: string;
  name: string;
  account: string;
  owner: string;
  ownerId: string;
  teamId?: string;
  kind: 'deal' | 'lead';
  stage: string;
  amount: string;
  age: string;
  daysInCurrentStage?: number | null;
  lastActivityDate?: string | null;
  status: 'healthy' | 'attention' | 'at-risk' | 'won' | 'lost' | 'expired';
  outcomeGroup: 'active' | 'closed';
  expectedClose?: string | null;
  source?: string | null;
  type?: string | null;
  typeId?: string | null;
  typeCategory?: string | null;
  createdAt?: string | null;
  contact?: string | null;
  contactPosition?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currency?: string | null;
  valueAmount?: number | null;
  solution?: string | null;
  vendor?: string | null;
  drStatus?: string | null;
  fiscalYear?: string | null;
  quarter?: string | null;
  quarterClosed?: string | null;
  roleDisplayValues?: Record<string, string>;
  observers?: string[];
  products?: string[];
  roleAssignments?: Array<{
    roleId: string;
    userId: string;
    roleName?: string;
    isPrimary?: boolean;
    user?: {
      id: string;
      selamnewId?: string | null;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    } | null;
  }>;
}

export interface TeamInsight {
  id: string;
  name: string;
  lead: string;
  initials: string;
  pipeline: string;
  leads: number;
  deals: number;
  performance: number;
  target: number;
  targetLabel: string;
  trend: string;
}

export interface FilterMember {
  id: string;
  name: string;
}

export interface FilterTeam {
  id: string;
  name: string;
  members: FilterMember[];
}

export interface PipelineRecordsPagination {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export interface OpportunityCategoryKpi {
  category: string;
  total: number;
  open: number;
  won: number;
  lost: number;
}

export interface PipelineDashboardView {
  kpis: DashboardKpis;
  stages?: PipelineStageInsight[];
}

export interface PipelineDashboardData {
  label: string;
  shortLabel: string;
  tableTitle: string;
  teamSectionTitle: string;
  teamSectionDescription: string;
  kpis: DashboardKpis;
  stages: PipelineStageInsight[];
  teams: TeamInsight[];
  records: PipelineRecordInsight[];
  recordsPagination?: PipelineRecordsPagination;
  opportunityCategoryKpis?: OpportunityCategoryKpi[];
  filterTeams?: FilterTeam[];
  filterMembers?: FilterMember[];
  chartView?: PipelineDashboardView;
  targetView?: PipelineDashboardView;
}

export interface PipelineDashboardParams {
  currency?: PipelineCurrency;
  departmentId?: string;
  teamId?: string;
  responsibleUserId?: string;
  affectedUserId?: string;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  sessionIds?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  stageId?: string;
  includeLeads?: boolean;
  chartCurrency?: PipelineCurrency;
  chartSessionId?: string;
  chartSessionIds?: string;
  chartStartDate?: string;
  chartEndDate?: string;
  targetSessionId?: string;
  targetSessionIds?: string;
  targetStartDate?: string;
  targetEndDate?: string;
}

function buildPipelineDashboardRequestParams(params: PipelineDashboardParams) {
  return {
    ...(params.currency ? { currency: params.currency } : { currency: 'ALL' }),
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
    ...(params.teamId ? { teamId: params.teamId } : {}),
    ...(params.responsibleUserId
      ? { responsibleUserId: params.responsibleUserId }
      : {}),
    ...(params.affectedUserId ? { affectedUserId: params.affectedUserId } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
    ...(params.sessionIds && !params.sessionId
      ? { sessionIds: params.sessionIds }
      : {}),
    ...(params.page ? { page: params.page } : {}),
    ...(params.pageSize ? { pageSize: params.pageSize } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.stageId ? { stageId: params.stageId } : {}),
    ...(params.includeLeads === false ? { includeLeads: false } : {}),
    ...(params.chartCurrency ? { chartCurrency: params.chartCurrency } : {}),
    ...(params.chartSessionId ? { chartSessionId: params.chartSessionId } : {}),
    ...(params.chartSessionIds && !params.chartSessionId
      ? { chartSessionIds: params.chartSessionIds }
      : {}),
    ...(params.chartStartDate ? { chartStartDate: params.chartStartDate } : {}),
    ...(params.chartEndDate ? { chartEndDate: params.chartEndDate } : {}),
    ...(params.targetSessionId
      ? { targetSessionId: params.targetSessionId }
      : {}),
    ...(params.targetSessionIds && !params.targetSessionId
      ? { targetSessionIds: params.targetSessionIds }
      : {}),
    ...(params.targetStartDate
      ? { targetStartDate: params.targetStartDate }
      : {}),
    ...(params.targetEndDate ? { targetEndDate: params.targetEndDate } : {}),
  };
}

/** Merge primary, chart, and target dashboard params into one consolidated API request. */
export function mergePipelineDashboardViewParams(
  primary: PipelineDashboardParams,
  chart?: PipelineDashboardParams,
  target?: PipelineDashboardParams,
): PipelineDashboardParams {
  return {
    ...primary,
    ...(chart?.currency ? { chartCurrency: chart.currency } : {}),
    ...(chart?.sessionId ? { chartSessionId: chart.sessionId } : {}),
    ...(chart?.sessionIds ? { chartSessionIds: chart.sessionIds } : {}),
    ...(chart?.startDate ? { chartStartDate: chart.startDate } : {}),
    ...(chart?.endDate ? { chartEndDate: chart.endDate } : {}),
    ...(target?.sessionId ? { targetSessionId: target.sessionId } : {}),
    ...(target?.sessionIds ? { targetSessionIds: target.sessionIds } : {}),
    ...(target?.startDate ? { targetStartDate: target.startDate } : {}),
    ...(target?.endDate ? { targetEndDate: target.endDate } : {}),
  };
}

export function usePipelineDashboard(
  params: PipelineDashboardParams = {},
  options?: { enabled?: boolean },
) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);
  const hookEnabled = options?.enabled !== false;

  return useQuery({
    queryKey: ['pipeline-dashboard', tenantId, params],
    queryFn: async (): Promise<PipelineDashboardData> => {
      const headers = await authHeaders();
      const response = await crudRequest({
        url: `${CRM_URL}/pipeline/dashboard`,
        method: 'GET',
        headers,
        params: buildPipelineDashboardRequestParams(params),
      });

      // The API returns the dashboard data directly
      if (response && typeof response === 'object' && 'kpis' in response) {
        return response as unknown as PipelineDashboardData;
      }
      throw new Error('Invalid pipeline dashboard response');
    },
    enabled: Boolean(tenantId) && hookEnabled,
    retry: retryUnlessUnauthorized,
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    keepPreviousData: true,
  });
}
