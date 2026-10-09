export type AiInsightPriority = 'high' | 'medium' | 'low';

export type AiTaskType = 'task' | 'call' | 'meeting';

export type AiInsightKind =
  | 'outreach_gap'
  | 'meeting'
  | 'stale'
  | 'closing_soon'
  | 'coordination'
  | 'at_risk'
  | 'general';

export type AiInsightMeta = {
  daysSinceLastOutreach?: number | null;
  lastOutreachKind?: string | null;
  actorCount?: number;
};

export type AiInsightAction = {
  type: 'view_record' | 'create_task';
  label: string;
  entityType?: 'lead' | 'deal' | 'customer';
  entityId?: string;
  /** Suggested Productivity task type for create_task. */
  taskType?: AiTaskType;
  /** Suggested task title for create_task. */
  title?: string;
};

export type AiInsight = {
  id: string;
  priority: AiInsightPriority;
  signal: string;
  insight: string;
  recommendation: string;
  actions: AiInsightAction[];
  module: 'leads' | 'deals' | 'customers' | 'activities' | 'dashboard';
  kind?: AiInsightKind;
  tags?: string[];
  meta?: AiInsightMeta;
};

export type AiInsightsResponse = {
  insights: AiInsight[];
  generatedAt: string;
  scope: {
    level: string;
    label: string;
    dashboardView?: string;
  };
  modulesIncluded: string[];
  emptyReason?: string;
};

export type GeneratePipelineInsightsBody = {
  teamId?: string;
  teamIds?: string[];
  departmentId?: string;
  ownerIds?: string[];
  responsibleUserId?: string;
  currency?: string;
};

export type GenerateCustomersInsightsBody = {
  search?: string;
};

export type GenerateDashboardInsightsBody = {
  currency?: string;
};
