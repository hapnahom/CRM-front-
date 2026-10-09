import { tokens } from '@/lib/design-tokens';

/* ─── Status & enum types ─── */

export type CampaignStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export type CampaignObjective =
  | 'Lead Generation'
  | 'Brand Awareness'
  | 'Product Promotion'
  | 'Customer Retention'
  | 'Event Promotion'
  | 'Revenue Generation'
  | 'Other';

export type ActivityStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Active'
  | 'Paused'
  | 'Completed'
  | 'Sent'
  | 'Cancelled';

export type ChannelCategory = 'Digital' | 'Traditional' | 'Event';

export type DigitalChannelType =
  | 'Email'
  | 'Social Media'
  | 'Search Advertising'
  | 'Display Advertising'
  | 'SEO'
  | 'Content'
  | 'Other Digital';

export type TraditionalChannelType =
  | 'Radio'
  | 'TV'
  | 'Print'
  | 'Outdoor'
  | 'Direct Mail'
  | 'Sponsorship'
  | 'Other Traditional';

export type ChannelType = DigitalChannelType | TraditionalChannelType | 'Event';

export type AssetMediaKind =
  | 'Image'
  | 'Video'
  | 'PDF'
  | 'Document'
  | 'Template'
  | 'Script'
  | 'Link';

export type AssetPlatform =
  | 'YouTube'
  | 'Vimeo'
  | 'Google Drive'
  | 'Dropbox'
  | 'Figma'
  | 'Canva'
  | 'Unsplash'
  | 'Website'
  | 'Other';

export type AssetStatus = 'Approved' | 'In Review' | 'Draft' | 'Archived';

export type EventType =
  | 'Webinar'
  | 'Conference'
  | 'Workshop'
  | 'Trade Show'
  | 'Meetup'
  | 'Launch';

export type EventStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Live'
  | 'Completed'
  | 'Cancelled';

export type IntegrationStatus = 'Not connected' | 'Connected' | 'Error';

export type IntegrationCapability =
  | 'Execute'
  | 'Capture'
  | 'Measure'
  | 'Synchronize';

export type SyncStatus =
  | 'Not synced'
  | 'Manual'
  | 'Pending'
  | 'Synced'
  | 'Failed';

/* ─── Domain entities ─── */

export type MarketingCampaign = {
  id: string;
  name: string;
  description: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  owner: string;
  startDate: string;
  endDate: string;
  budget: number;
  actualSpend: number;
  expectedLeads: number;
  expectedRevenue: number;
  audienceIds: string[];
  assetIds: string[];
  /** CRM-attributed (mock) */
  leadsGenerated: number;
  qualifiedLeads: number;
  opportunities: number;
  revenue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailActivityDetails = {
  subject?: string;
  contentPreview?: string;
  sender?: string;
  provider?: string;
  sendAt?: string;
};

export type SocialActivityDetails = {
  platform?: string;
  activityType?: string;
  caption?: string;
  scheduledAt?: string;
};

export type PaidAdsActivityDetails = {
  platform?: string;
  externalCampaignId?: string;
  adSetName?: string;
};

export type TraditionalActivityDetails = {
  vendor?: string;
  placement?: string;
  location?: string;
};

export type EventActivityDetails = {
  eventId?: string;
};

export type MarketingActivity = {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  channelCategory: ChannelCategory;
  channelType: ChannelType;
  status: ActivityStatus;
  owner: string;
  startDate: string;
  endDate: string;
  budget: number;
  actualSpend: number;
  audienceId?: string;
  assetIds: string[];
  notes?: string;
  /** Phase 2 placeholders */
  externalId?: string;
  syncStatus: SyncStatus;
  channelDetails: EmailActivityDetails &
    SocialActivityDetails &
    PaidAdsActivityDetails &
    TraditionalActivityDetails &
    EventActivityDetails;
};

export type AudienceFilterField =
  | 'vector'
  | 'organizationSize'
  | 'country'
  | 'city';

export type AudienceCondition = {
  field: AudienceFilterField;
  operator: 'equals' | 'in' | 'contains';
  value: string;
  label: string;
};

export type MarketingAudience = {
  id: string;
  name: string;
  description: string;
  targetEntity: 'Customer';
  isActive: boolean;
  conditions: AudienceCondition[];
  /** Resolved count from CRM (mock) */
  matchedCustomers: number;
  matchedContacts: number;
  createdBy: string;
  updatedAt: string;
};

export type MarketingAsset = {
  id: string;
  name: string;
  mediaKind: AssetMediaKind;
  platform: AssetPlatform;
  url: string;
  previewUrl?: string;
  status: AssetStatus;
  campaignIds: string[];
  updatedAt: string;
  owner: string;
  thumbnailColor: string;
  /** Phase 2 storage readiness */
  storageKey?: string | null;
  fileName?: string | null;
};

export type MarketingEvent = {
  id: string;
  name: string;
  type: EventType;
  description: string;
  status: EventStatus;
  date: string;
  endDate?: string;
  location: string;
  owner: string;
  budget: number;
  actualSpend: number;
  campaignId?: string;
  assetIds: string[];
  notes?: string;
  /** Phase 2 / foreshadow — UI may show empty states */
  registered: number;
  attended: number;
  leads: number;
};

export type ParticipantLifecycleStatus =
  | 'Registered'
  | 'Checked In'
  | 'Attended'
  | 'No Show';

export type EventAttendee = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  ticketType?: 'VIP' | 'Standard' | 'Speaker' | 'Partner';
  registrationStatus: 'Pre-registered' | 'Walk-in' | 'VIP Invitation';
  emailVerificationCode?: string;
  emailVerified?: boolean;
  checkInTime?: string;
  attendanceStatus: ParticipantLifecycleStatus;
  leadStatus:
    | 'New Lead'
    | 'Qualified Lead'
    | 'Customer Contact'
    | 'Converted Lead';
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
};

export type MarketingIntegration = {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: 'Advertising' | 'Social' | 'Email' | 'Analytics';
  status: IntegrationStatus;
  capabilities: IntegrationCapability[];
  lastSyncAt?: string | null;
  connectedAccount?: string | null;
};

export type ActivityFeedItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: 'campaign' | 'lead' | 'budget' | 'event' | 'asset' | 'activity';
};

export type OverviewKpi = {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  trendLabel: string;
  trendDirection: 'up' | 'down' | 'neutral';
  sparkline: number[];
  progress?: number;
  icon: string;
};

/* ─── Mock datasets ─── */

export const MARKETING_AUDIENCES: MarketingAudience[] = [
  {
    id: 'aud-1',
    name: 'Enterprise Telecom Customers',
    description: 'Large Ethiopian enterprise accounts in telecom vector',
    targetEntity: 'Customer',
    isActive: true,
    conditions: [
      {
        field: 'vector',
        operator: 'equals',
        value: 'Enterprise',
        label: 'Vector = Enterprise',
      },
      {
        field: 'country',
        operator: 'equals',
        value: 'Ethiopia',
        label: 'Country = Ethiopia',
      },
      {
        field: 'organizationSize',
        operator: 'in',
        value: '51-200,201-500,500+',
        label: 'Org size = 51–200+',
      },
    ],
    matchedCustomers: 128,
    matchedContacts: 312,
    createdBy: 'Sara Bekele',
    updatedAt: '2026-08-01',
  },
  {
    id: 'aud-2',
    name: 'Addis SME Prospects',
    description: 'SME customers concentrated in Addis Ababa',
    targetEntity: 'Customer',
    isActive: true,
    conditions: [
      {
        field: 'city',
        operator: 'equals',
        value: 'Addis Ababa',
        label: 'City = Addis Ababa',
      },
      {
        field: 'organizationSize',
        operator: 'in',
        value: '1-10,11-50',
        label: 'Org size = 1–50',
      },
    ],
    matchedCustomers: 420,
    matchedContacts: 680,
    createdBy: 'Daniel Haile',
    updatedAt: '2026-07-22',
  },
  {
    id: 'aud-3',
    name: 'Government & Public Sector',
    description: 'Public sector accounts for event and RFP outreach',
    targetEntity: 'Customer',
    isActive: true,
    conditions: [
      {
        field: 'vector',
        operator: 'equals',
        value: 'Government',
        label: 'Vector = Government',
      },
      {
        field: 'country',
        operator: 'equals',
        value: 'Ethiopia',
        label: 'Country = Ethiopia',
      },
    ],
    matchedCustomers: 64,
    matchedContacts: 145,
    createdBy: 'Sara Bekele',
    updatedAt: '2026-06-18',
  },
  {
    id: 'aud-4',
    name: 'Inactive draft segment',
    description: 'Work-in-progress filter set',
    targetEntity: 'Customer',
    isActive: false,
    conditions: [
      {
        field: 'vector',
        operator: 'equals',
        value: 'Banking',
        label: 'Vector = Banking',
      },
    ],
    matchedCustomers: 0,
    matchedContacts: 0,
    createdBy: 'Yonas Tadesse',
    updatedAt: '2026-05-02',
  },
];

export const MARKETING_ASSETS: MarketingAsset[] = [
  {
    id: 'ast-1',
    name: 'Product Launch Hero',
    mediaKind: 'Image',
    platform: 'Canva',
    url: 'https://canva.com/design/launch-hero',
    previewUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=640&q=80',
    status: 'Approved',
    campaignIds: ['cmp-1'],
    updatedAt: '2026-08-05',
    owner: 'Sara Bekele',
    thumbnailColor: '#E8F1FF',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-2',
    name: 'Launch Announcement Email',
    mediaKind: 'Template',
    platform: 'Website',
    url: 'https://drive.google.com/email-template-launch',
    status: 'Approved',
    campaignIds: ['cmp-1'],
    updatedAt: '2026-08-04',
    owner: 'Daniel Haile',
    thumbnailColor: '#E7F8EF',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-3',
    name: 'LinkedIn Carousel — Features',
    mediaKind: 'Image',
    platform: 'Figma',
    url: 'https://figma.com/file/linkedin-carousel',
    previewUrl:
      'https://images.unsplash.com/photo-1611162617474-5b21e11e480f?w=640&q=80',
    status: 'In Review',
    campaignIds: ['cmp-1'],
    updatedAt: '2026-08-08',
    owner: 'Sara Bekele',
    thumbnailColor: tokens.color.brandMuted,
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-4',
    name: 'Radio Script — 30s Spot',
    mediaKind: 'Script',
    platform: 'Google Drive',
    url: 'https://drive.google.com/radio-script-30s',
    status: 'Approved',
    campaignIds: ['cmp-1', 'cmp-3'],
    updatedAt: '2026-07-28',
    owner: 'Yonas Tadesse',
    thumbnailColor: '#FFF1E8',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-5',
    name: 'Q3 Brand Film',
    mediaKind: 'Video',
    platform: 'YouTube',
    url: 'https://youtube.com/watch?v=brand-q3',
    previewUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=640&q=80',
    status: 'Approved',
    campaignIds: ['cmp-2'],
    updatedAt: '2026-07-15',
    owner: 'Sara Bekele',
    thumbnailColor: '#E0F7FA',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-6',
    name: 'Enterprise Brochure PDF',
    mediaKind: 'PDF',
    platform: 'Google Drive',
    url: 'https://drive.google.com/enterprise-brochure',
    status: 'Approved',
    campaignIds: ['cmp-2', 'cmp-1'],
    updatedAt: '2026-06-30',
    owner: 'Daniel Haile',
    thumbnailColor: '#E7E7FF',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-7',
    name: 'Billboard Creative — Bole',
    mediaKind: 'Image',
    platform: 'Canva',
    url: 'https://canva.com/design/billboard-bole',
    previewUrl:
      'https://images.unsplash.com/photo-1542744173-8e2bd231463a?w=640&q=80',
    status: 'Draft',
    campaignIds: ['cmp-3'],
    updatedAt: '2026-08-10',
    owner: 'Yonas Tadesse',
    thumbnailColor: '#FAFAFA',
    storageKey: null,
    fileName: null,
  },
  {
    id: 'ast-8',
    name: 'Webinar Landing Page Copy',
    mediaKind: 'Document',
    platform: 'Google Drive',
    url: 'https://drive.google.com/webinar-copy',
    status: 'Approved',
    campaignIds: ['cmp-1'],
    updatedAt: '2026-08-02',
    owner: 'Sara Bekele',
    thumbnailColor: '#E8F1FF',
    storageKey: null,
    fileName: null,
  },
];

export const MARKETING_EVENTS: MarketingEvent[] = [
  {
    id: 'evt-1',
    name: '2026 Product Launch Event',
    type: 'Launch',
    description:
      'In-person product reveal for enterprise customers and partners',
    status: 'Scheduled',
    date: '2026-09-18',
    endDate: '2026-09-18',
    location: 'Skylight Hotel, Addis Ababa',
    owner: 'Sara Bekele',
    budget: 450000,
    actualSpend: 120000,
    campaignId: 'cmp-1',
    assetIds: ['ast-1', 'ast-6'],
    notes: 'VIP lounge for top accounts',
    registered: 0,
    attended: 0,
    leads: 0,
  },
  {
    id: 'evt-2',
    name: 'Enterprise Solutions Webinar',
    type: 'Webinar',
    description: 'Virtual deep-dive for telecom decision makers',
    status: 'Scheduled',
    date: '2026-08-28',
    location: 'Online',
    owner: 'Daniel Haile',
    budget: 35000,
    actualSpend: 8000,
    campaignId: 'cmp-1',
    assetIds: ['ast-8'],
    registered: 0,
    attended: 0,
    leads: 0,
  },
  {
    id: 'evt-3',
    name: 'ICT Expo Ethiopia',
    type: 'Trade Show',
    description: 'Booth and demos at national ICT expo',
    status: 'Completed',
    date: '2026-05-12',
    endDate: '2026-05-14',
    location: 'Millennium Hall',
    owner: 'Yonas Tadesse',
    budget: 680000,
    actualSpend: 652000,
    campaignId: 'cmp-2',
    assetIds: ['ast-5', 'ast-6'],
    registered: 0,
    attended: 0,
    leads: 42,
  },
  {
    id: 'evt-4',
    name: 'Partner Breakfast Meetup',
    type: 'Meetup',
    description: 'Informal partner networking',
    status: 'Draft',
    date: '2026-10-05',
    location: 'Hilton Addis',
    owner: 'Sara Bekele',
    budget: 25000,
    actualSpend: 0,
    assetIds: [],
    registered: 0,
    attended: 0,
    leads: 0,
  },
];

export const MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'cmp-1',
    name: '2026 Product Launch',
    description: '',
    objective: 'Product Promotion',
    status: 'Active',
    owner: 'Sara Bekele',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    budget: 1200000,
    actualSpend: 486000,
    expectedLeads: 250,
    expectedRevenue: 8500000,
    audienceIds: ['aud-1', 'aud-2'],
    assetIds: ['ast-1', 'ast-2', 'ast-3', 'ast-4', 'ast-6', 'ast-8'],
    leadsGenerated: 86,
    qualifiedLeads: 41,
    opportunities: 18,
    revenue: 2100000,
    createdBy: 'Sara Bekele',
    createdAt: '2026-06-15',
    updatedAt: '2026-08-11',
  },
  {
    id: 'cmp-2',
    name: 'Enterprise Brand Awareness Q3',
    description: 'Brand and thought-leadership push for enterprise vector.',
    objective: 'Brand Awareness',
    status: 'Active',
    owner: 'Daniel Haile',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    budget: 800000,
    actualSpend: 512000,
    expectedLeads: 120,
    expectedRevenue: 4000000,
    audienceIds: ['aud-1'],
    assetIds: ['ast-5', 'ast-6'],
    leadsGenerated: 54,
    qualifiedLeads: 22,
    opportunities: 9,
    revenue: 980000,
    createdBy: 'Daniel Haile',
    createdAt: '2026-06-20',
    updatedAt: '2026-08-09',
  },
  {
    id: 'cmp-3',
    name: 'Addis Outdoor & Radio Burst',
    description: 'Traditional media burst supporting SME acquisition.',
    objective: 'Lead Generation',
    status: 'Scheduled',
    owner: 'Yonas Tadesse',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    budget: 350000,
    actualSpend: 0,
    expectedLeads: 80,
    expectedRevenue: 1500000,
    audienceIds: ['aud-2'],
    assetIds: ['ast-4', 'ast-7'],
    leadsGenerated: 0,
    qualifiedLeads: 0,
    opportunities: 0,
    revenue: 0,
    createdBy: 'Yonas Tadesse',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-10',
  },
  {
    id: 'cmp-4',
    name: 'Customer Retention Newsletter',
    description: 'Monthly nurture for existing accounts.',
    objective: 'Customer Retention',
    status: 'Paused',
    owner: 'Sara Bekele',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 120000,
    actualSpend: 48000,
    expectedLeads: 40,
    expectedRevenue: 2000000,
    audienceIds: ['aud-1', 'aud-3'],
    assetIds: ['ast-2'],
    leadsGenerated: 19,
    qualifiedLeads: 11,
    opportunities: 4,
    revenue: 420000,
    createdBy: 'Sara Bekele',
    createdAt: '2025-12-10',
    updatedAt: '2026-07-01',
  },
  {
    id: 'cmp-5',
    name: 'Gov RFP Awareness (Draft)',
    description: 'Early planning for public-sector outreach.',
    objective: 'Lead Generation',
    status: 'Draft',
    owner: 'Daniel Haile',
    startDate: '2026-10-01',
    endDate: '2026-12-15',
    budget: 200000,
    actualSpend: 0,
    expectedLeads: 30,
    expectedRevenue: 5000000,
    audienceIds: ['aud-3'],
    assetIds: [],
    leadsGenerated: 0,
    qualifiedLeads: 0,
    opportunities: 0,
    revenue: 0,
    createdBy: 'Daniel Haile',
    createdAt: '2026-08-08',
    updatedAt: '2026-08-08',
  },
  {
    id: 'cmp-6',
    name: 'FY25 Year-End Promo',
    description: 'Completed year-end promotional campaign.',
    objective: 'Revenue Generation',
    status: 'Completed',
    owner: 'Yonas Tadesse',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    budget: 500000,
    actualSpend: 478000,
    expectedLeads: 100,
    expectedRevenue: 3000000,
    audienceIds: ['aud-2'],
    assetIds: [],
    leadsGenerated: 112,
    qualifiedLeads: 48,
    opportunities: 21,
    revenue: 2750000,
    createdBy: 'Yonas Tadesse',
    createdAt: '2025-10-15',
    updatedAt: '2026-01-05',
  },
];

export const MARKETING_ACTIVITIES: MarketingActivity[] = [
  {
    id: 'act-1',
    campaignId: 'cmp-1',
    name: 'Product announcement email',
    description: 'Launch email to enterprise and SME audiences',
    channelCategory: 'Digital',
    channelType: 'Email',
    status: 'Completed',
    owner: 'Daniel Haile',
    startDate: '2026-07-15',
    endDate: '2026-07-15',
    budget: 15000,
    actualSpend: 12000,
    audienceId: 'aud-1',
    assetIds: ['ast-2'],
    notes: 'Sent via internal email tool; tracking recorded manually',
    syncStatus: 'Not synced',
    channelDetails: {
      subject: 'Introducing our 2026 Enterprise Platform',
      contentPreview: 'Announce key features, CTA to launch event RSVP…',
      sender: 'marketing@company.et',
      provider: 'Internal / manual',
      sendAt: '2026-07-15T09:00',
    },
  },
  {
    id: 'act-2',
    campaignId: 'cmp-1',
    name: 'LinkedIn promotion',
    description: 'Sponsored + organic LinkedIn posts',
    channelCategory: 'Digital',
    channelType: 'Social Media',
    status: 'Active',
    owner: 'Sara Bekele',
    startDate: '2026-07-20',
    endDate: '2026-09-15',
    budget: 180000,
    actualSpend: 94000,
    audienceId: 'aud-1',
    assetIds: ['ast-3'],
    syncStatus: 'Not synced',
    channelDetails: {
      platform: 'LinkedIn',
      activityType: 'Sponsored post',
      caption: 'See what’s new for enterprise teams in 2026.',
      scheduledAt: '2026-07-20T10:00',
    },
  },
  {
    id: 'act-3',
    campaignId: 'cmp-1',
    name: 'Google Ads — Search',
    description: 'Search advertising for product keywords',
    channelCategory: 'Digital',
    channelType: 'Search Advertising',
    status: 'Active',
    owner: 'Sara Bekele',
    startDate: '2026-07-10',
    endDate: '2026-09-30',
    budget: 320000,
    actualSpend: 210000,
    audienceId: 'aud-2',
    assetIds: ['ast-1'],
    externalId: undefined,
    syncStatus: 'Not synced',
    channelDetails: {
      platform: 'Google Ads',
      adSetName: 'Launch — Brand + Competitor',
    },
  },
  {
    id: 'act-4',
    campaignId: 'cmp-1',
    name: 'Radio advertisement',
    description: '30-second spots on major Addis stations',
    channelCategory: 'Traditional',
    channelType: 'Radio',
    status: 'Scheduled',
    owner: 'Yonas Tadesse',
    startDate: '2026-09-01',
    endDate: '2026-09-20',
    budget: 150000,
    actualSpend: 40000,
    audienceId: 'aud-2',
    assetIds: ['ast-4'],
    syncStatus: 'Not synced',
    channelDetails: {
      vendor: 'Fana Broadcasting',
      placement: 'Drive-time 30s',
      location: 'Addis Ababa',
    },
  },
  {
    id: 'act-5',
    campaignId: 'cmp-1',
    name: 'Product launch event',
    description: 'Links to dedicated event record',
    channelCategory: 'Event',
    channelType: 'Event',
    status: 'Scheduled',
    owner: 'Sara Bekele',
    startDate: '2026-09-18',
    endDate: '2026-09-18',
    budget: 450000,
    actualSpend: 120000,
    assetIds: ['ast-1', 'ast-6'],
    syncStatus: 'Not synced',
    channelDetails: {
      eventId: 'evt-1',
    },
  },
  {
    id: 'act-6',
    campaignId: 'cmp-2',
    name: 'Brand film — YouTube pre-roll',
    description: 'Paid video placements',
    channelCategory: 'Digital',
    channelType: 'Display Advertising',
    status: 'Active',
    owner: 'Daniel Haile',
    startDate: '2026-07-05',
    endDate: '2026-09-30',
    budget: 260000,
    actualSpend: 198000,
    audienceId: 'aud-1',
    assetIds: ['ast-5'],
    syncStatus: 'Not synced',
    channelDetails: {
      platform: 'YouTube / Google Ads',
      adSetName: 'Brand film Q3',
    },
  },
  {
    id: 'act-7',
    campaignId: 'cmp-2',
    name: 'Thought leadership content series',
    description: 'Owned blog + gated PDF',
    channelCategory: 'Digital',
    channelType: 'Content',
    status: 'Active',
    owner: 'Daniel Haile',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    budget: 80000,
    actualSpend: 45000,
    audienceId: 'aud-1',
    assetIds: ['ast-6'],
    syncStatus: 'Not synced',
    channelDetails: {},
  },
  {
    id: 'act-8',
    campaignId: 'cmp-3',
    name: 'Bole Road billboard',
    description: 'Outdoor placement for September burst',
    channelCategory: 'Traditional',
    channelType: 'Outdoor',
    status: 'Draft',
    owner: 'Yonas Tadesse',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    budget: 200000,
    actualSpend: 0,
    audienceId: 'aud-2',
    assetIds: ['ast-7'],
    syncStatus: 'Not synced',
    channelDetails: {
      vendor: 'Alliance Media',
      placement: 'Billboard — Bole Road',
      location: 'Addis Ababa',
    },
  },
  {
    id: 'act-9',
    campaignId: 'cmp-4',
    name: 'Monthly retention email',
    description: 'Nurture newsletter',
    channelCategory: 'Digital',
    channelType: 'Email',
    status: 'Paused',
    owner: 'Sara Bekele',
    startDate: '2026-01-05',
    endDate: '2026-12-31',
    budget: 60000,
    actualSpend: 28000,
    audienceId: 'aud-1',
    assetIds: ['ast-2'],
    syncStatus: 'Not synced',
    channelDetails: {
      subject: 'What’s new for your team this month',
      sender: 'success@company.et',
      provider: 'Internal / manual',
    },
  },
];

export const MARKETING_INTEGRATIONS: MarketingIntegration[] = [
  {
    id: 'int-google',
    provider: 'google_ads',
    name: 'Google Ads',
    description:
      'Sync spend, clicks, and conversions. Publish search and display activities.',
    category: 'Advertising',
    status: 'Not connected',
    capabilities: ['Execute', 'Capture', 'Measure', 'Synchronize'],
    lastSyncAt: null,
    connectedAccount: null,
  },
  {
    id: 'int-meta',
    provider: 'meta',
    name: 'Meta Ads',
    description:
      'Facebook and Instagram campaign sync, lead forms, and performance.',
    category: 'Advertising',
    status: 'Not connected',
    capabilities: ['Execute', 'Capture', 'Measure', 'Synchronize'],
    lastSyncAt: null,
    connectedAccount: null,
  },
  {
    id: 'int-linkedin',
    provider: 'linkedin',
    name: 'LinkedIn Campaign Manager',
    description: 'ABM and lead-gen ads with audience and lead sync.',
    category: 'Social',
    status: 'Not connected',
    capabilities: ['Execute', 'Capture', 'Measure', 'Synchronize'],
    lastSyncAt: null,
    connectedAccount: null,
  },
  {
    id: 'int-email',
    provider: 'email',
    name: 'Email provider',
    description: '',
    category: 'Email',
    status: 'Not connected',
    capabilities: ['Execute', 'Capture', 'Measure', 'Synchronize'],
    lastSyncAt: null,
    connectedAccount: null,
  },
  {
    id: 'int-ga',
    provider: 'google_analytics',
    name: 'Google Analytics',
    description: 'Import web conversion and attribution signals.',
    category: 'Analytics',
    status: 'Not connected',
    capabilities: ['Measure', 'Synchronize'],
    lastSyncAt: null,
    connectedAccount: null,
  },
];

export const MARKETING_KPIS: OverviewKpi[] = [
  {
    id: 'kpi-campaigns',
    label: 'Active Campaigns',
    value: '2',
    trendLabel: '+1',
    trendDirection: 'up',
    sparkline: [3, 3, 4, 3, 2, 2, 2],
    icon: 'campaigns',
  },
  {
    id: 'kpi-spend',
    label: 'Marketing Spend',
    value: 'ETB 1.05M',
    secondaryValue: 'of 2.67M',
    trendLabel: '39% of budget',
    trendDirection: 'neutral',
    sparkline: [],
    progress: 39,
    icon: 'spend',
  },
  {
    id: 'kpi-leads',
    label: 'Leads Generated',
    value: '159',
    trendLabel: '+14%',
    trendDirection: 'up',
    sparkline: [98, 110, 118, 125, 132, 145, 159],
    icon: 'leads',
  },
  {
    id: 'kpi-roi',
    label: 'Attributed ROI',
    value: '318%',
    trendLabel: '+22%',
    trendDirection: 'up',
    sparkline: [210, 230, 245, 260, 280, 295, 318],
    icon: 'roi',
  },
];

export const CHANNEL_MIX = [
  { name: 'Email', value: 22, color: tokens.color.brand },
  { name: 'Social Media', value: 18, color: tokens.color.blue },
  { name: 'Search Ads', value: 24, color: '#0E7490' },
  { name: 'Traditional', value: 16, color: tokens.color.purple },
  { name: 'Events', value: 20, color: tokens.color.success },
];

export const CHANNEL_PERFORMANCE = [
  {
    channel: 'Digital',
    activities: 6,
    spend: 587000,
    leads: 112,
    opportunities: 24,
    roi: 342,
  },
  {
    channel: 'Traditional',
    activities: 2,
    spend: 40000,
    leads: 18,
    opportunities: 4,
    roi: 180,
  },
  {
    channel: 'Events',
    activities: 1,
    spend: 120000,
    leads: 29,
    opportunities: 7,
    roi: 265,
  },
];

export const TOP_CAMPAIGNS = MARKETING_CAMPAIGNS.filter((c) =>
  ['Active', 'Completed', 'Paused'].includes(c.status),
)
  .map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    leads: c.leadsGenerated,
    spend: c.actualSpend,
    revenue: c.revenue,
    roi:
      c.actualSpend > 0
        ? Math.round(((c.revenue - c.actualSpend) / c.actualSpend) * 100)
        : 0,
  }))
  .sort((a, b) => b.leads - a.leads)
  .slice(0, 5);

export const RECENT_ACTIVITY: ActivityFeedItem[] = [
  {
    id: 'ra-1',
    title: 'Lead attributed',
    detail: 'EthioTel HQ → 2026 Product Launch / LinkedIn promotion',
    time: '2h ago',
    type: 'lead',
  },
  {
    id: 'ra-2',
    title: 'Activity updated',
    detail: 'Google Ads — Search spend updated to ETB 210K',
    time: '5h ago',
    type: 'activity',
  },
  {
    id: 'ra-3',
    title: 'Asset approved',
    detail: 'LinkedIn Carousel — Features moved to In Review',
    time: '1d ago',
    type: 'asset',
  },
  {
    id: 'ra-4',
    title: 'Event scheduled',
    detail: 'Enterprise Solutions Webinar — Aug 28',
    time: '2d ago',
    type: 'event',
  },
  {
    id: 'ra-5',
    title: 'Campaign activated',
    detail: 'Enterprise Brand Awareness Q3 set to Active',
    time: '3d ago',
    type: 'campaign',
  },
];

export const EVENT_ATTENDEES_PREVIEW: EventAttendee[] = [
  {
    id: 'att-1',
    eventId: 'evt-1',
    name: 'Abebe Kebede',
    email: 'abebe.k@ethiotelecom.et',
    phone: '+251 91 123 4567',
    company: 'Ethio Telecom',
    title: 'Chief Technology Officer',
    ticketType: 'VIP',
    registrationStatus: 'VIP Invitation',
    emailVerificationCode: 'ETH-8491',
    emailVerified: true,
    checkInTime: '09:14 AM',
    attendanceStatus: 'Attended',
    leadStatus: 'Customer Contact',
    registeredAt: '2026-08-15',
    checkedIn: true,
    checkedInAt: '09:14 AM',
  },
  {
    id: 'att-2',
    eventId: 'evt-1',
    name: 'Hanna Mekonnen',
    email: 'hanna.m@safaricom.et',
    phone: '+251 97 234 5678',
    company: 'Safaricom Ethiopia',
    title: 'Head of Enterprise Sales',
    ticketType: 'VIP',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-3912',
    emailVerified: true,
    checkInTime: '09:22 AM',
    attendanceStatus: 'Attended',
    leadStatus: 'Converted Lead',
    registeredAt: '2026-08-18',
    checkedIn: true,
    checkedInAt: '09:22 AM',
  },
  {
    id: 'att-3',
    eventId: 'evt-1',
    name: 'Yohannes Abebe',
    email: 'yohannes.a@cbe.com.et',
    phone: '+251 91 345 6789',
    company: 'Commercial Bank of Ethiopia',
    title: 'Director of Digital Banking',
    ticketType: 'VIP',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-7204',
    emailVerified: true,
    checkInTime: '09:35 AM',
    attendanceStatus: 'Checked In',
    leadStatus: 'Qualified Lead',
    registeredAt: '2026-08-20',
    checkedIn: true,
    checkedInAt: '09:35 AM',
  },
  {
    id: 'att-4',
    eventId: 'evt-1',
    name: 'Samuel Girma',
    email: 'samuel.g@dashenbank.et',
    phone: '+251 92 456 7890',
    company: 'Dashen Bank',
    title: 'IT Infrastructure Manager',
    ticketType: 'Standard',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-1934',
    emailVerified: true,
    checkInTime: undefined,
    attendanceStatus: 'Registered',
    leadStatus: 'New Lead',
    registeredAt: '2026-08-22',
    checkedIn: false,
  },
  {
    id: 'att-5',
    eventId: 'evt-1',
    name: 'Tadesse Wondimu',
    email: 'tadesse.w@awashbank.com',
    phone: '+251 91 567 8901',
    company: 'Awash International Bank',
    title: 'VP Operations',
    ticketType: 'Partner',
    registrationStatus: 'VIP Invitation',
    emailVerificationCode: 'ETH-5821',
    emailVerified: true,
    checkInTime: '10:02 AM',
    attendanceStatus: 'Checked In',
    leadStatus: 'Qualified Lead',
    registeredAt: '2026-08-25',
    checkedIn: true,
    checkedInAt: '10:02 AM',
  },
  {
    id: 'att-6',
    eventId: 'evt-1',
    name: 'Dr. Abiyot Bayu',
    email: 'abiyot.b@mint.gov.et',
    phone: '+251 91 678 9012',
    company: 'Ministry of Innovation & Tech',
    title: 'Senior Advisor',
    ticketType: 'Speaker',
    registrationStatus: 'VIP Invitation',
    emailVerificationCode: 'ETH-4903',
    emailVerified: true,
    checkInTime: '08:45 AM',
    attendanceStatus: 'Attended',
    leadStatus: 'Qualified Lead',
    registeredAt: '2026-08-10',
    checkedIn: true,
    checkedInAt: '08:45 AM',
  },
  {
    id: 'att-7',
    eventId: 'evt-1',
    name: 'Mesfin Tadesse',
    email: 'mesfint@ethiopianairlines.com',
    phone: '+251 91 789 0123',
    company: 'Ethiopian Airlines Group',
    title: 'Procurement Director',
    ticketType: 'VIP',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-6639',
    emailVerified: true,
    checkInTime: undefined,
    attendanceStatus: 'Registered',
    leadStatus: 'Qualified Lead',
    registeredAt: '2026-08-28',
    checkedIn: false,
  },
  {
    id: 'att-8',
    eventId: 'evt-1',
    name: 'Alemtsehay Paulos',
    email: 'alemtsehay.p@mor.gov.et',
    phone: '+251 93 890 1234',
    company: 'Ministry of Revenues',
    title: 'System Integration Lead',
    ticketType: 'Standard',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-2195',
    emailVerified: true,
    checkInTime: undefined,
    attendanceStatus: 'No Show',
    leadStatus: 'New Lead',
    registeredAt: '2026-08-29',
    checkedIn: false,
  },
  {
    id: 'att-9',
    eventId: 'evt-1',
    name: 'Jean-Paul Lambert',
    email: 'jp.lambert@bgiethiopia.com',
    phone: '+251 94 901 2345',
    company: 'BGI Ethiopia',
    title: 'Marketing Director',
    ticketType: 'Partner',
    registrationStatus: 'Walk-in',
    emailVerificationCode: 'ETH-7814',
    emailVerified: true,
    checkInTime: '10:15 AM',
    attendanceStatus: 'Checked In',
    leadStatus: 'Converted Lead',
    registeredAt: '2026-08-30',
    checkedIn: true,
    checkedInAt: '10:15 AM',
  },
  {
    id: 'att-10',
    eventId: 'evt-1',
    name: 'Sisay Desta',
    email: 'sisay.d@afrotsion.com',
    phone: '+251 91 012 3456',
    company: 'Afrotsion Construction',
    title: 'Managing Director',
    ticketType: 'Standard',
    registrationStatus: 'Pre-registered',
    emailVerificationCode: 'ETH-9042',
    emailVerified: true,
    checkInTime: undefined,
    attendanceStatus: 'Registered',
    leadStatus: 'New Lead',
    registeredAt: '2026-09-01',
    checkedIn: false,
  },
];

/** Sample CRM members for audience preview (mock — not duplicated CRM records) */
export const AUDIENCE_MEMBER_PREVIEW = [
  {
    id: 'cust-1',
    accountName: 'Ethio Telecom',
    vector: 'Enterprise',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    orgSize: '500+',
    primaryContact: 'Abebe Kebede',
  },
  {
    id: 'cust-2',
    accountName: 'Safaricom Ethiopia',
    vector: 'Enterprise',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    orgSize: '201-500',
    primaryContact: 'Hanna Mekonnen',
  },
  {
    id: 'cust-3',
    accountName: 'Dashen Bank',
    vector: 'Enterprise',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    orgSize: '500+',
    primaryContact: 'Samuel Girma',
  },
];

export function getCampaign(id: string) {
  return MARKETING_CAMPAIGNS.find((c) => c.id === id);
}

export function getActivitiesForCampaign(campaignId: string) {
  return MARKETING_ACTIVITIES.filter((a) => a.campaignId === campaignId);
}

export function getAudience(id: string) {
  return MARKETING_AUDIENCES.find((a) => a.id === id);
}

export function getAsset(id: string) {
  return MARKETING_ASSETS.find((a) => a.id === id);
}

export function getEvent(id: string) {
  return MARKETING_EVENTS.find((e) => e.id === id);
}

export function getIntegration(provider: string) {
  return MARKETING_INTEGRATIONS.find((i) => i.provider === provider);
}

export function campaignRoi(c: MarketingCampaign) {
  if (c.actualSpend <= 0) return null;
  return Math.round(((c.revenue - c.actualSpend) / c.actualSpend) * 100);
}
