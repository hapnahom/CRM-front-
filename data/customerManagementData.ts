export type CustomerStatus = 'Lead' | 'Active' | 'Inactive';
export type CustomerLifecycleStage = 'Lead' | 'Deal';

export type AssociationRole =
  | 'Decision Maker'
  | 'Billing Contact'
  | 'Technical Contact'
  | 'Procurement Contact'
  | 'Legal Contact';

export type ActivityType =
  | 'Deal'
  | 'Call'
  | 'Meeting'
  | 'Message'
  | 'Email'
  | 'Note';

export interface CustomerAccount {
  id: string;
  name: string;
  location: string; // Used for table subtitle
  /** @deprecated Prefer vectorName — kept for seed/compat */
  industry: string;
  vectorId?: string | null;
  vectorName?: string;
  /** Backend industry enum slug (e.g. manufacturing) — deprecated */
  industrySlug?: string;
  size: string;
  email?: string;
  phone?: string;
  address?: string;
  city: string;
  country: string;
  website: string;
  parentAccountId?: string;
  primaryContactId?: string;
  owner?: string;
  status?: CustomerStatus;
  lifecycleStage?: CustomerLifecycleStage;
  leadSource?: string;
  expectedDealValue?: number;
  createdAt?: string;
  dealLeadBadge: string; // e.g., "2D 2L"
  dealsCount?: number;
  leadsCount?: number;
  primaryContact: string; // full name
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}

export interface CustomerContact {
  id: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  email: string;
  phone: string;
  owner?: string;
  status?: 'Active' | 'Inactive';
  createdAt?: string;
}

export interface AccountContactAssociation {
  id: string;
  accountId: string;
  contactId: string;
  role?: AssociationRole;
  isPrimary?: boolean;
}

export interface CustomerActivity {
  id: string;
  accountId: string;
  type: ActivityType;
  title: string;
  relatedTo: string;
  date: string;
  owner: string;
}

export const customerOwners = [
  'Sara Tesfaye',
  'Biruk Mekonnen',
  'Daniel Bekele',
  'Nahom Esrael',
  'Hana Worku',
];

export const accountSizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

export const industries = [
  'Manufacturing',
  'Retail',
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Logistics',
];

export const associationRoles: AssociationRole[] = [
  'Decision Maker',
  'Billing Contact',
  'Technical Contact',
  'Procurement Contact',
  'Legal Contact',
];

export const customerAccounts: CustomerAccount[] = [
  {
    id: 'acc-1',
    name: 'Ethio Manufacturing Group',
    location: 'Addis Ababa',
    industry: 'Manufacturing',
    size: '500+',
    email: 'procurement@ethiomfg.com',
    phone: '0114550101',
    address: 'Bole Road',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    website: 'https://ethiomfg.com',
    owner: 'Sara Tesfaye',
    status: 'Active',
    lifecycleStage: 'Deal',
    leadSource: 'Referral',
    expectedDealValue: 240000,
    createdAt: '2025-02-12',
    dealLeadBadge: '2D 2L',
    primaryContact: 'Mekdes Abate',
  },
  {
    id: 'acc-2',
    name: 'Ethio Manufacturing Group - Dire Dawa Plant',
    location: 'Dire Dawa',
    industry: 'Manufacturing',
    size: '201-500',
    email: 'plant.ops@ethiomfg.com',
    phone: '0251118899',
    address: 'Industrial Zone 2',
    city: 'Dire Dawa',
    country: 'Ethiopia',
    website: 'https://ethiomfg.com/dd',
    parentAccountId: 'acc-1',
    owner: 'Biruk Mekonnen',
    status: 'Active',
    lifecycleStage: 'Deal',
    leadSource: 'Upsell',
    expectedDealValue: 140000,
    createdAt: '2025-02-18',
    dealLeadBadge: '1D 0L',
    primaryContact: 'Henok Tilahun',
  },
  {
    id: 'acc-3',
    name: 'Abay Retail PLC',
    location: 'Bahir Dar',
    industry: 'Retail',
    size: '51-200',
    email: 'sales@abayretail.com',
    phone: '0583334499',
    address: 'Kebele 09',
    city: 'Bahir Dar',
    country: 'Ethiopia',
    website: 'https://abayretail.com',
    owner: 'Hana Worku',
    status: 'Lead',
    lifecycleStage: 'Lead',
    leadSource: 'Website',
    expectedDealValue: 85000,
    createdAt: '2025-03-04',
    dealLeadBadge: '1D 2L',
    primaryContact: 'Rahel Demissie',
  },
  {
    id: 'acc-4',
    name: 'MedNova Diagnostics',
    location: 'Addis Ababa',
    industry: 'Healthcare',
    size: '11-50',
    email: 'admin@mednova.et',
    phone: '0116001020',
    address: 'CMC Avenue',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    website: 'https://mednova.et',
    owner: 'Daniel Bekele',
    status: 'Inactive',
    lifecycleStage: 'Lead',
    leadSource: 'Outbound',
    expectedDealValue: 30000,
    createdAt: '2025-01-11',
    dealLeadBadge: '1D 0L',
    primaryContact: 'Samuel Gizaw',
  },
];

export const customerContacts: CustomerContact[] = [
  {
    id: 'con-1',
    firstName: 'Mekdes',
    lastName: 'Abate',
    roleTitle: 'Procurement Director',
    email: 'mekdes.abate@ethiomfg.com',
    phone: '0911223344',
    owner: 'Sara Tesfaye',
    status: 'Active',
    createdAt: '2025-02-12',
  },
  {
    id: 'con-2',
    firstName: 'Henok',
    lastName: 'Tilahun',
    roleTitle: 'Finance Manager',
    email: 'henok.t@ethiomfg.com',
    phone: '0911556677',
    owner: 'Biruk Mekonnen',
    status: 'Active',
    createdAt: '2025-02-15',
  },
  {
    id: 'con-3',
    firstName: 'Rahel',
    lastName: 'Demissie',
    roleTitle: 'Operations Lead',
    email: 'rahel.demissie@abayretail.com',
    phone: '0919001122',
    owner: 'Hana Worku',
    status: 'Active',
    createdAt: '2025-03-05',
  },
  {
    id: 'con-4',
    firstName: 'Samuel',
    lastName: 'Gizaw',
    roleTitle: 'IT Administrator',
    email: 'samuel.g@mednova.et',
    phone: '0917665544',
    owner: 'Daniel Bekele',
    status: 'Inactive',
    createdAt: '2025-01-12',
  },
];

export const accountContactAssociations: AccountContactAssociation[] = [
  {
    id: 'assoc-1',
    accountId: 'acc-1',
    contactId: 'con-1',
    role: 'Decision Maker',
    isPrimary: true,
  },
  {
    id: 'assoc-2',
    accountId: 'acc-1',
    contactId: 'con-2',
    role: 'Billing Contact',
    isPrimary: false,
  },
  {
    id: 'assoc-3',
    accountId: 'acc-2',
    contactId: 'con-2',
    role: 'Procurement Contact',
    isPrimary: true,
  },
  {
    id: 'assoc-4',
    accountId: 'acc-3',
    contactId: 'con-3',
    role: 'Decision Maker',
    isPrimary: true,
  },
  {
    id: 'assoc-5',
    accountId: 'acc-4',
    contactId: 'con-4',
    role: 'Technical Contact',
    isPrimary: true,
  },
];

export const customerActivities: CustomerActivity[] = [
  {
    id: 'act-1',
    accountId: 'acc-1',
    type: 'Deal',
    title: 'Enterprise Renewal Pipeline',
    relatedTo: 'Deal #D-102',
    date: '2026-04-24',
    owner: 'Sara Tesfaye',
  },
  {
    id: 'act-2',
    accountId: 'acc-1',
    type: 'Call',
    title: 'Quarterly procurement call',
    relatedTo: 'Contact: Mekdes Abate',
    date: '2026-04-25',
    owner: 'Biruk Mekonnen',
  },
  {
    id: 'act-3',
    accountId: 'acc-3',
    type: 'Meeting',
    title: 'Initial onboarding workshop',
    relatedTo: 'Lead conversion',
    date: '2026-04-19',
    owner: 'Hana Worku',
  },
];

export type PipelineItemStatus = 'Active' | 'Closed';

export interface PipelineLead {
  id: string;
  accountId: string;
  title: string;
  status: PipelineItemStatus;
  source: string;
  createdAt: string;
}

export interface PipelineDeal {
  id: string;
  accountId: string;
  title: string;
  status: PipelineItemStatus;
  stage: string;
  value: number;
  closedAt?: string;
}

export const pipelineLeads: PipelineLead[] = [
  {
    id: 'lead-1',
    accountId: 'acc-1',
    title: 'New Branch Expansion',
    status: 'Active',
    source: 'Referral',
    createdAt: '2026-04-01',
  },
  {
    id: 'lead-2',
    accountId: 'acc-1',
    title: 'Software License Renewal',
    status: 'Active',
    source: 'Direct',
    createdAt: '2026-04-10',
  },
  {
    id: 'lead-3',
    accountId: 'acc-3',
    title: 'Retail Chain Partnership',
    status: 'Active',
    source: 'Website',
    createdAt: '2026-04-15',
  },
];

export const pipelineDeals: PipelineDeal[] = [
  {
    id: 'deal-1',
    accountId: 'acc-1',
    title: 'Annual Service Contract',
    status: 'Active',
    stage: 'Negotiation',
    value: 50000,
  },
  {
    id: 'deal-2',
    accountId: 'acc-3',
    title: 'Bulk Supply Order',
    status: 'Active',
    stage: 'Proposal',
    value: 25000,
  },
];
