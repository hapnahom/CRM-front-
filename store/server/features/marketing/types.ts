export type MarketingCampaign = {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: string;
  owner: string;
  ownerUserId?: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  actualSpend: number;
  activitySpend?: number;
  eventSpend?: number;
  totalSpend?: number;
  expectedLeads: number;
  expectedRevenue: number;
  audienceIds: string[];
  assetIds: string[];
  activityCount?: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  opportunities: number;
  revenue: number;
  roi?: number | null;
  emailResults?: {
    activities: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  activities?: MarketingActivity[];
};

export type MarketingActivity = {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  channelCategory: string;
  channelType: string;
  status: string;
  owner: string;
  ownerUserId?: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  actualSpend: number;
  audienceIds: string[];
  audienceId?: string;
  assetIds: string[];
  notes?: string;
  externalId?: string | null;
  syncStatus: string;
  connectedAccountId?: string | null;
  eventId?: string | null;
  channelDetails: Record<string, unknown>;
};

export type MarketingAudience = {
  id: string;
  name: string;
  description: string;
  targetEntity: string;
  isActive: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    label: string;
  }>;
  matchedCustomers: number;
  matchedContacts: number;
  createdBy: string;
  updatedAt: string;
  members?: AudienceMemberRow[];
};

export type AudienceMemberRow = {
  id: string;
  accountName: string;
  vector: string;
  city: string;
  country: string;
  orgSize: string;
  primaryContact: string;
  contactId?: string | null;
  email?: string | null;
};

export type MarketingAsset = {
  id: string;
  name: string;
  mediaKind: string;
  platform: string;
  url: string;
  previewUrl?: string;
  status: string;
  campaignIds: string[];
  updatedAt: string;
  owner: string;
  ownerUserId?: string | null;
  thumbnailColor?: string;
  storageKey?: string | null;
  fileName?: string | null;
};

export type MarketingEvent = {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  date: string;
  endDate?: string;
  location: string;
  owner: string;
  ownerUserId?: string | null;
  budget: number;
  actualSpend: number;
  campaignId?: string;
  assetIds: string[];
  notes?: string;
  registered: number;
  attended: number;
  leads: number;
};

export type MarketingIntegration = {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: string;
  status: string;
  capabilities: string[];
  lastSyncAt?: string | null;
  connectedAccount?: string | null;
  connectedAccountId?: string | null;
};

export type MarketingOverview = {
  kpis: Array<{
    id: string;
    label: string;
    value: string;
    secondaryValue?: string;
    trendLabel: string;
    trendDirection: 'up' | 'down' | 'neutral';
    sparkline: number[];
    progress?: number;
    icon: string;
  }>;
  channelMix: Array<{
    name: string;
    value: number;
    color: string;
    leads?: number;
  }>;
  channelPerformance: Array<{
    channel: string;
    activities: number;
    spend: number;
    leads: number;
    opportunities: number;
    roi: number;
  }>;
  topCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    leads: number;
    spend: number;
    revenue: number;
    roi: number | null;
  }>;
  upcomingEvents: MarketingEvent[];
  recentActivity: Array<{
    id: string;
    title: string;
    detail: string;
    time: string;
    type: string;
  }>;
  period?: {
    from: string;
    to: string;
  };
};

export type MarketingMailbox = {
  id: string;
  provider: string;
  status: string;
  emailAddress: string;
  displayName?: string | null;
};
