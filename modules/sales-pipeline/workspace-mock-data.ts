import { tokens } from '@/lib/design-tokens';

export type PipelineVector = 'sales' | 'presales' | 'channel';

export type LinkedStage = {
  vector: PipelineVector;
  label: string;
};

export type PipelineRecord = {
  id: string;
  title: string;
  account: string;
  stageId: string;
  owner: string;
  ownerInitials: string;
  value?: string;
  age: string;
  priority: 'high' | 'medium' | 'normal';
  department?: string;
  tags: string[];
  linked: LinkedStage[];
  nextAction: string;
};

export type PipelineStageDefinition = {
  id: string;
  label: string;
  color: string;
};

export type PipelineVectorDefinition = {
  id: PipelineVector;
  label: string;
  shortLabel: string;
  description: string;
  recordLabel: string;
  color: string;
  stages: PipelineStageDefinition[];
  records: PipelineRecord[];
};

const salesStages: PipelineStageDefinition[] = [
  { id: 'lead-ingestion', label: 'Lead Ingestion', color: tokens.color.purple },
  { id: 'qualified', label: 'Qualified', color: tokens.color.accentBlue },
  {
    id: 'proposal-submitted',
    label: 'Proposal Submitted',
    color: tokens.color.brand,
  },
  {
    id: 'commercial-negotiation',
    label: 'Commercial Negotiation',
    color: tokens.color.warning,
  },
  { id: 'closed-won', label: 'Closed Won', color: tokens.color.success },
  { id: 'closed-lost', label: 'Closed Lost', color: tokens.color.error },
];

const presalesStages: PipelineStageDefinition[] = [
  {
    id: 'tender-received',
    label: 'RFP / Tender Received',
    color: tokens.color.purple,
  },
  {
    id: 'technical-qualification',
    label: 'Technical Qualification',
    color: tokens.color.accentBlue,
  },
  {
    id: 'solution-design',
    label: 'Architecture & Solution Design',
    color: tokens.color.blue,
  },
  { id: 'proposal-draft', label: 'Proposal Draft', color: tokens.color.brand },
  {
    id: 'technical-review',
    label: 'Technical Review',
    color: tokens.color.warning,
  },
  { id: 'bid-submitted', label: 'Bid Submitted', color: tokens.color.success },
  { id: 'clarifications', label: 'Clarifications', color: tokens.color.error },
];

const channelStages: PipelineStageDefinition[] = [
  {
    id: 'vendor-identification',
    label: 'Vendor Identification',
    color: tokens.color.purple,
  },
  {
    id: 'initial-outreach',
    label: 'Initial Outreach',
    color: tokens.color.accentBlue,
  },
  { id: 'nda-signed', label: 'NDA Signed', color: tokens.color.brand },
  {
    id: 'agreement-alignment',
    label: 'Partnership Agreement Alignment',
    color: tokens.color.warning,
  },
  {
    id: 'onboarded-certified',
    label: 'Onboarded & Certified',
    color: tokens.color.success,
  },
];

export const pipelineVectors: Record<PipelineVector, PipelineVectorDefinition> =
  {
    sales: {
      id: 'sales',
      label: 'Sales Pipeline',
      shortLabel: 'Sales',
      description: 'Commercial conversion, negotiation, and revenue closure.',
      recordLabel: 'opportunity',
      color: tokens.color.brand,
      stages: salesStages,
      records: [
        {
          id: 'SAL-1048',
          title: 'National Core Banking Modernization',
          account: 'Blue Nile Bank',
          stageId: 'commercial-negotiation',
          owner: 'Liya Haile',
          ownerInitials: 'LH',
          value: 'ETB 18.4M',
          age: '8d',
          priority: 'high',
          department: 'BFSI',
          tags: ['RFP', 'Enterprise'],
          linked: [
            { vector: 'presales', label: 'Technical Review' },
            { vector: 'channel', label: 'NDA Signed' },
          ],
          nextAction: 'Commercial terms review · Jul 24',
        },
        {
          id: 'SAL-1051',
          title: 'Public Cloud Landing Zone',
          account: 'Ministry of Digital Services',
          stageId: 'proposal-submitted',
          owner: 'Mikiyas Getu',
          ownerInitials: 'MG',
          value: 'ETB 12.7M',
          age: '12d',
          priority: 'high',
          department: 'Public & Telecom',
          tags: ['Government', 'Cloud'],
          linked: [
            { vector: 'presales', label: 'Bid Submitted' },
            { vector: 'channel', label: 'Agreement Alignment' },
          ],
          nextAction: 'Procurement follow-up · Jul 23',
        },
        {
          id: 'SAL-1055',
          title: 'Regional Data Platform',
          account: 'East Africa Logistics',
          stageId: 'qualified',
          owner: 'Sara Mohammed',
          ownerInitials: 'SM',
          value: 'USD 245K',
          age: '5d',
          priority: 'medium',
          department: 'Corporate & International',
          tags: ['International', 'Data'],
          linked: [{ vector: 'presales', label: 'Solution Design' }],
          nextAction: 'Discovery workshop · Jul 25',
        },
        {
          id: 'SAL-1058',
          title: 'Enterprise Network Refresh',
          account: 'Ethio Manufacturing Group',
          stageId: 'lead-ingestion',
          owner: 'Nahom Tadesse',
          ownerInitials: 'NT',
          value: 'ETB 7.9M',
          age: '2d',
          priority: 'normal',
          department: 'Corporate & International',
          tags: ['Network'],
          linked: [],
          nextAction: 'Qualification call · Jul 22',
        },
        {
          id: 'SAL-1036',
          title: 'Managed Security Operations',
          account: 'Horizon Telecom',
          stageId: 'closed-won',
          owner: 'Liya Haile',
          ownerInitials: 'LH',
          value: 'ETB 9.6M',
          age: '1d',
          priority: 'normal',
          department: 'Public & Telecom',
          tags: ['Security'],
          linked: [
            { vector: 'presales', label: 'Bid Submitted' },
            { vector: 'channel', label: 'Certified' },
          ],
          nextAction: 'Execution handoff · Jul 22',
        },
      ],
    },
    presales: {
      id: 'presales',
      label: 'Pre-Sales Pipeline',
      shortLabel: 'Pre-Sales',
      description: 'Technical qualification, solutioning, and bid execution.',
      recordLabel: 'bid',
      color: tokens.color.blue,
      stages: presalesStages,
      records: [
        {
          id: 'PRE-221',
          title: 'Core Banking Technical Response',
          account: 'Blue Nile Bank',
          stageId: 'technical-review',
          owner: 'Betelhem Assefa',
          ownerInitials: 'BA',
          age: '6d',
          priority: 'high',
          department: 'System, Cloud & Software',
          tags: ['RFP', 'Compliance 84%'],
          linked: [
            { vector: 'sales', label: 'Commercial Negotiation' },
            { vector: 'channel', label: 'NDA Signed' },
          ],
          nextAction: 'Architecture sign-off · Jul 23',
        },
        {
          id: 'PRE-225',
          title: 'Cloud Landing Zone Bid',
          account: 'Ministry of Digital Services',
          stageId: 'bid-submitted',
          owner: 'Yared Solomon',
          ownerInitials: 'YS',
          age: '3d',
          priority: 'high',
          department: 'System, Cloud & Software',
          tags: ['Tender', 'Cloud'],
          linked: [
            { vector: 'sales', label: 'Proposal Submitted' },
            { vector: 'channel', label: 'Agreement Alignment' },
          ],
          nextAction: 'Await clarification window · Jul 29',
        },
        {
          id: 'PRE-227',
          title: 'Regional Data Architecture',
          account: 'East Africa Logistics',
          stageId: 'solution-design',
          owner: 'Rahel Kebede',
          ownerInitials: 'RK',
          age: '9d',
          priority: 'medium',
          department: 'ITF',
          tags: ['Data', 'Discovery'],
          linked: [{ vector: 'sales', label: 'Qualified' }],
          nextAction: 'Design review · Jul 24',
        },
        {
          id: 'PRE-231',
          title: 'Telecom Security Clarification',
          account: 'Horizon Telecom',
          stageId: 'clarifications',
          owner: 'Abel Daniel',
          ownerInitials: 'AD',
          age: '14d',
          priority: 'high',
          department: 'ENCS',
          tags: ['Blocked', 'Security'],
          linked: [{ vector: 'sales', label: 'Closed Won' }],
          nextAction: 'Client clarification response · Jul 22',
        },
      ],
    },
    channel: {
      id: 'channel',
      label: 'Channel & Partnership Pipeline',
      shortLabel: 'Channel & BD',
      description:
        'Vendor recruitment, agreements, onboarding, and certification.',
      recordLabel: 'partner',
      color: tokens.color.purple,
      stages: channelStages,
      records: [
        {
          id: 'CHN-089',
          title: 'CloudSphere Strategic Partnership',
          account: 'CloudSphere MEA',
          stageId: 'agreement-alignment',
          owner: 'Dawit Alemu',
          ownerInitials: 'DA',
          age: '11d',
          priority: 'high',
          tags: ['Cloud', 'Gold Tier'],
          linked: [
            { vector: 'sales', label: 'Proposal Submitted' },
            { vector: 'presales', label: 'Bid Submitted' },
          ],
          nextAction: 'Legal redline review · Jul 25',
        },
        {
          id: 'CHN-092',
          title: 'SecureNet Deal Registration',
          account: 'SecureNet Africa',
          stageId: 'nda-signed',
          owner: 'Marta Fikru',
          ownerInitials: 'MF',
          age: '4d',
          priority: 'high',
          tags: ['Security', 'Deal registration'],
          linked: [
            { vector: 'sales', label: 'Commercial Negotiation' },
            { vector: 'presales', label: 'Technical Review' },
          ],
          nextAction: 'Submit deal registration · Jul 22',
        },
        {
          id: 'CHN-096',
          title: 'DataWorks Vendor Assessment',
          account: 'DataWorks Global',
          stageId: 'initial-outreach',
          owner: 'Eden Tesfaye',
          ownerInitials: 'ET',
          age: '7d',
          priority: 'medium',
          tags: ['Data', 'Assessment'],
          linked: [{ vector: 'sales', label: 'Qualified' }],
          nextAction: 'Capability call · Jul 26',
        },
        {
          id: 'CHN-081',
          title: 'NetworkOne Certification',
          account: 'NetworkOne',
          stageId: 'onboarded-certified',
          owner: 'Dawit Alemu',
          ownerInitials: 'DA',
          age: '2d',
          priority: 'normal',
          tags: ['Network', 'Certified'],
          linked: [{ vector: 'sales', label: 'Closed Won' }],
          nextAction: 'Catalog enablement · Jul 24',
        },
      ],
    },
  };

export const linkedOpportunityMatrix = [
  {
    id: 'LINK-01',
    opportunity: 'National Core Banking Modernization',
    account: 'Blue Nile Bank',
    value: 'ETB 18.4M',
    sales: { label: 'Commercial Negotiation', state: 'active' as const },
    presales: { label: 'Technical Review', state: 'attention' as const },
    channel: { label: 'NDA Signed', state: 'active' as const },
    owner: 'Liya Haile',
  },
  {
    id: 'LINK-02',
    opportunity: 'Public Cloud Landing Zone',
    account: 'Ministry of Digital Services',
    value: 'ETB 12.7M',
    sales: { label: 'Proposal Submitted', state: 'active' as const },
    presales: { label: 'Bid Submitted', state: 'healthy' as const },
    channel: { label: 'Agreement Alignment', state: 'attention' as const },
    owner: 'Mikiyas Getu',
  },
  {
    id: 'LINK-03',
    opportunity: 'Regional Data Platform',
    account: 'East Africa Logistics',
    value: 'USD 245K',
    sales: { label: 'Qualified', state: 'active' as const },
    presales: { label: 'Solution Design', state: 'active' as const },
    channel: { label: 'Not required', state: 'muted' as const },
    owner: 'Sara Mohammed',
  },
  {
    id: 'LINK-04',
    opportunity: 'Managed Security Operations',
    account: 'Horizon Telecom',
    value: 'ETB 9.6M',
    sales: { label: 'Closed Won', state: 'healthy' as const },
    presales: { label: 'Clarifications', state: 'attention' as const },
    channel: { label: 'Certified', state: 'healthy' as const },
    owner: 'Liya Haile',
  },
];

export const unifiedActivities = [
  {
    id: 'ACT-01',
    vector: 'presales' as const,
    title: 'Technical compliance matrix updated',
    record: 'Core Banking Technical Response',
    actor: 'Betelhem Assefa',
    time: '18 minutes ago',
    detail: 'Compliance coverage increased from 78% to 84%.',
  },
  {
    id: 'ACT-02',
    vector: 'channel' as const,
    title: 'Vendor deal registration requested',
    record: 'SecureNet Deal Registration',
    actor: 'Marta Fikru',
    time: '42 minutes ago',
    detail: 'Linked automatically from SAL-1048.',
  },
  {
    id: 'ACT-03',
    vector: 'sales' as const,
    title: 'Commercial follow-up completed',
    record: 'National Core Banking Modernization',
    actor: 'Liya Haile',
    time: '1 hour ago',
    detail: 'Client requested revised payment milestones.',
  },
  {
    id: 'ACT-04',
    vector: 'presales' as const,
    title: 'Bid submitted',
    record: 'Cloud Landing Zone Bid',
    actor: 'Yared Solomon',
    time: '3 hours ago',
    detail: 'Technical and financial envelopes submitted.',
  },
  {
    id: 'ACT-05',
    vector: 'channel' as const,
    title: 'Partnership agreement redline received',
    record: 'CloudSphere Strategic Partnership',
    actor: 'Dawit Alemu',
    time: 'Yesterday',
    detail: 'Legal review task assigned to the Channel Manager.',
  },
];
