export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archive';

export interface EmailAddress {
  name: string;
  email: string;
  /** Pre-minted signed CRM avatar proxy URL from list/detail API. */
  avatarUrl?: string | null;
  /** Graph RSVP: accepted | declined | tentativelyAccepted | none | notResponded | organizer | crm_only */
  responseStatus?: string | null;
  hasEmail?: boolean;
  userId?: string | null;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'xls' | 'img' | 'other';
}

export interface Email {
  id: string;
  folder: EmailFolder;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  body: string;
  bodyPreview: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  tags?: string[];
  threadCount?: number;
  /** Microsoft Graph conversationId (or equivalent) for true thread fetch. */
  providerConversationId?: string | null;
  /** Pre-minted signed avatar for the list row display person. */
  senderAvatarUrl?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type:
    | 'meeting'
    | 'call'
    | 'demo'
    | 'follow-up'
    | 'deadline'
    | 'task'
    | 'other';
  attendees?: EmailAddress[];
  location?: string;
  isAllDay?: boolean;
  /** IANA / Windows zone stored with timed events for Graph round-trip. */
  timeZone?: string | null;
  color?: string;
  origin?: 'provider' | 'crm_manual' | 'crm_task';
  taskId?: string | null;
  connectedAccountId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
}

export type TodoPriority = 'high' | 'medium' | 'low';
export type TodoTaskType = 'task' | 'call' | 'meeting';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  taskType?: TodoTaskType;
  priority: TodoPriority;
  dueDate?: string;
  /** Linked calendar event is an all-day block. */
  isAllDay?: boolean;
  tags?: string[];
  createdAt: string;
  relatedTo?: {
    type: 'deal' | 'lead' | 'contact' | 'customer' | 'email';
    name: string;
    id?: string;
  };
  relatedLinks?: Array<{
    type: 'deal' | 'lead' | 'contact' | 'customer';
    name: string;
    id: string;
    customerId?: string | null;
  }>;
  leadId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  connectedAccountId?: string | null;
  calendarEventId?: string | null;
  calendarSyncStatus?: string | null;
  assigneeUserIds?: string[];
  ownerUserId?: string;
}

export type TodoTask = TodoItem;

export const TODO_PRIORITY_CONFIG: Record<
  TodoPriority,
  { label: string; color: string; bg: string }
> = {
  high: {
    label: 'High',
    color: '#ef4444',
    bg: 'bg-red-50 text-red-600 border-red-200',
  },
  medium: {
    label: 'Medium',
    color: '#f59e0b',
    bg: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bg: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

// ── Mock Emails ──────────────────────────────────────────────────────────────

export const MOCK_EMAILS: Email[] = [
  // INBOX
  {
    id: 'e1',
    folder: 'inbox',
    subject: 'Re: Q3 Enterprise Deal — Final Terms',
    from: { name: 'Sarah Mitchell', email: 'sarah.mitchell@acmecorp.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    cc: [
      { name: 'John Lawson', email: 'john.lawson@acmecorp.com' },
      { name: 'Legal Team', email: 'legal@company.com' },
    ],
    bodyPreview:
      'Hi, following up on our call yesterday — we have reviewed the terms and our legal team has a few minor adjustments...',
    body: `<p>Hi,</p>
<p>Following up on our call yesterday — we have reviewed the terms and our legal team has a few minor adjustments to the contract. Specifically, sections 4.2 and 7.1 need clarification around SLA commitments and data residency requirements.</p>
<p>Could we schedule a 30-minute call this Thursday at 2 PM EST to align before we proceed to signatures?</p>
<p>Looking forward to closing this out.</p>
<p>Best regards,<br/>Sarah Mitchell<br/>VP of Procurement, Acme Corp</p>`,
    date: '2026-08-03T09:14:00Z',
    isRead: false,
    isStarred: true,
    hasAttachments: true,
    attachments: [
      { id: 'a1', name: 'Contract_Draft_v3.pdf', size: '284 KB', type: 'pdf' },
      {
        id: 'a2',
        name: 'Redlined_Terms.docx',
        size: '128 KB',
        type: 'doc',
      },
    ],
    tags: ['Enterprise', 'Urgent'],
    threadCount: 6,
  },
  {
    id: 'e2',
    folder: 'inbox',
    subject: 'Introduction — TechNova Partnership Opportunity',
    from: { name: 'David Park', email: 'd.park@technova.io' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'Hope this finds you well. I was referred by Marcus Webb and wanted to explore a potential integration partnership...',
    body: `<p>Hi,</p>
<p>Hope this finds you well. I was referred by Marcus Webb and wanted to explore a potential integration partnership between TechNova and your platform.</p>
<p>We have 50,000+ active users in the mid-market segment that we believe would be an excellent fit for your CRM solution. Could we arrange a discovery call next week?</p>
<p>Best,<br/>David Park<br/>Head of Partnerships, TechNova</p>`,
    date: '2026-08-03T08:03:00Z',
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    tags: ['Partnership'],
  },
  {
    id: 'e3',
    folder: 'inbox',
    subject: 'Demo Feedback — Very Impressed',
    from: { name: 'Rachel Okonkwo', email: 'rachel.o@deltaventures.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'The demo yesterday was excellent. Our team was particularly impressed with the pipeline automation features...',
    body: `<p>Hi,</p>
<p>The demo yesterday was excellent. Our team was particularly impressed with the pipeline automation features and the reporting dashboards.</p>
<p>We would like to move forward with a 3-month pilot for 15 seats. Please send over the pilot agreement and pricing details at your earliest convenience.</p>
<p>Thanks again,<br/>Rachel Okonkwo<br/>Director of Sales, Delta Ventures</p>`,
    date: '2026-08-02T16:45:00Z',
    isRead: true,
    isStarred: true,
    hasAttachments: false,
    tags: ['Hot Lead'],
  },
  {
    id: 'e4',
    folder: 'inbox',
    subject: 'Annual Subscription Renewal — Action Required',
    from: { name: 'Billing System', email: 'billing@stripe.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'Your annual subscription is due for renewal on August 15, 2026. Please review and confirm...',
    body: `<p>Your annual subscription is due for renewal on <strong>August 15, 2026</strong>.</p>
<p>Current plan: <strong>Business Pro — 50 seats</strong><br/>Amount: <strong>$14,400 / year</strong></p>
<p>Please log in to your billing portal to confirm renewal or make changes.</p>`,
    date: '2026-08-01T10:00:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      { id: 'a3', name: 'Invoice_2026_Q3.pdf', size: '56 KB', type: 'pdf' },
    ],
  },
  {
    id: 'e5',
    folder: 'inbox',
    subject: 'Competitor Analysis Report — July 2026',
    from: { name: 'Alex Turner', email: 'alex.turner@company.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'Attached is the July competitor analysis. Key takeaways: HubSpot lowered SMB pricing, Salesforce launched a new AI module...',
    body: `<p>Hi team,</p>
<p>Attached is the July competitor analysis. Key takeaways:</p>
<ul>
  <li>HubSpot has lowered SMB pricing by 15%</li>
  <li>Salesforce launched a new AI-assisted pipeline module</li>
  <li>Pipedrive lost 3 enterprise clients to churn — opportunity for us</li>
</ul>
<p>Full report attached. Let me know if you have questions.</p>
<p>— Alex</p>`,
    date: '2026-07-31T14:22:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        id: 'a4',
        name: 'Competitor_Analysis_July2026.xlsx',
        size: '412 KB',
        type: 'xls',
      },
    ],
  },
  {
    id: 'e6',
    folder: 'inbox',
    subject: 'Re: Proposal for GlobalRetail Inc.',
    from: { name: 'Marcus Webb', email: 'mwebb@globalretail.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'We have reviewed the proposal. The pricing is higher than anticipated. Is there flexibility on the enterprise tier?',
    body: `<p>Hi,</p>
<p>We have reviewed the proposal. The pricing is higher than what we had anticipated based on our initial conversations. Is there any flexibility on the enterprise tier pricing, especially given the volume we would bring?</p>
<p>We are also evaluating two other vendors and need to make a decision by EOW.</p>
<p>Marcus</p>`,
    date: '2026-07-30T11:30:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    tags: ['Negotiation'],
    threadCount: 3,
  },

  // SENT
  {
    id: 'e7',
    folder: 'sent',
    subject: 'Pilot Agreement — Delta Ventures (15 seats)',
    from: { name: 'Me', email: 'me@company.com' },
    to: [{ name: 'Rachel Okonkwo', email: 'rachel.o@deltaventures.com' }],
    bodyPreview:
      'Hi Rachel, Thank you for the kind words. Attached is the pilot agreement for your review...',
    body: `<p>Hi Rachel,</p>
<p>Thank you for the kind words about the demo. I am delighted your team found it valuable.</p>
<p>Attached is the pilot agreement for a 3-month engagement covering 15 seats. Highlights:</p>
<ul>
  <li>Duration: 90 days from activation</li>
  <li>Seats: 15 (expandable)</li>
  <li>Dedicated onboarding support: 4 sessions included</li>
  <li>Price locked at the quoted rate if converted within 30 days of pilot end</li>
</ul>
<p>Please review and do not hesitate to reach out with any questions. I am available for a call any time this week.</p>
<p>Looking forward to working with you,<br/>Me</p>`,
    date: '2026-08-02T18:10:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        id: 'a5',
        name: 'Pilot_Agreement_DeltaVentures.pdf',
        size: '198 KB',
        type: 'pdf',
      },
    ],
  },
  {
    id: 'e8',
    folder: 'sent',
    subject: 'Follow-Up — TechNova Meeting Request',
    from: { name: 'Me', email: 'me@company.com' },
    to: [{ name: 'David Park', email: 'd.park@technova.io' }],
    bodyPreview:
      'Hi David, great to connect. I have reviewed your company profile and I think there is a strong alignment...',
    body: `<p>Hi David,</p>
<p>Great to connect. I reviewed TechNova's profile and I see strong alignment — especially around the mid-market segment.</p>
<p>I would love to schedule a discovery call. I have availability this Thursday 10–11 AM or Friday 2–3 PM EST. Does either work for you?</p>
<p>Best,<br/>Me</p>`,
    date: '2026-08-03T11:05:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: 'e9',
    folder: 'sent',
    subject: 'GlobalRetail — Revised Proposal with Volume Discount',
    from: { name: 'Me', email: 'me@company.com' },
    to: [{ name: 'Marcus Webb', email: 'mwebb@globalretail.com' }],
    bodyPreview:
      'Hi Marcus, I have spoken with our pricing team. Attached is a revised proposal with a 12% volume discount applied...',
    body: `<p>Hi Marcus,</p>
<p>I have spoken with our pricing team and I am pleased to offer a revised proposal with a <strong>12% volume discount</strong> applied to the enterprise tier, given your projected seat count.</p>
<p>This brings the annual cost to <strong>$38,400</strong>, which I believe is highly competitive in this space.</p>
<p>Let me know if you would like to jump on a call to walk through the updated terms.</p>
<p>Best,<br/>Me</p>`,
    date: '2026-07-30T16:45:00Z',
    isRead: true,
    isStarred: true,
    hasAttachments: true,
    attachments: [
      {
        id: 'a6',
        name: 'Revised_Proposal_GlobalRetail.pdf',
        size: '244 KB',
        type: 'pdf',
      },
    ],
  },

  // DRAFTS
  {
    id: 'e10',
    folder: 'drafts',
    subject: 'Q4 Planning — Sales Enablement Resources',
    from: { name: 'Me', email: 'me@company.com' },
    to: [{ name: 'Sales Team', email: 'sales@company.com' }],
    bodyPreview:
      'Team, as we head into Q4 I want to share the updated battlecards and objection handling guides...',
    body: `<p>Team,</p>
<p>As we head into Q4 I want to share the updated battlecards and objection handling guides. Still working on finalizing the pricing slide...</p>`,
    date: '2026-08-03T07:30:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: 'e11',
    folder: 'drafts',
    subject: 'Partnership Proposal — FinEdge Capital',
    from: { name: 'Me', email: 'me@company.com' },
    to: [{ name: 'Tom Nguyen', email: 'tom.n@finedge.com' }],
    bodyPreview:
      'Hi Tom, following our LinkedIn conversation I wanted to formalize the co-marketing proposal we discussed...',
    body: `<p>Hi Tom,</p>
<p>Following our LinkedIn conversation I wanted to formalize the co-marketing proposal we discussed. [TODO: attach deck, add pricing section]</p>`,
    date: '2026-08-01T15:00:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },

  // ARCHIVE
  {
    id: 'e12',
    folder: 'archive',
    subject: 'Welcome to the CRM Platform — Getting Started',
    from: { name: 'Onboarding Team', email: 'onboarding@company.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'Welcome! Here are your first steps to get the most out of the platform...',
    body: `<p>Welcome to the CRM platform!</p>
<p>Here are your first steps to get the most out of your account:</p>
<ol>
  <li>Complete your profile</li>
  <li>Import your contacts</li>
  <li>Set up your first pipeline</li>
  <li>Schedule your onboarding call</li>
</ol>`,
    date: '2026-06-01T09:00:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
  },
  {
    id: 'e13',
    folder: 'archive',
    subject: 'Re: NexGen Retail — Deal Closed',
    from: { name: 'Jennifer Holt', email: 'j.holt@nexgenretail.com' },
    to: [{ name: 'Me', email: 'me@company.com' }],
    bodyPreview:
      'Confirming we have signed the agreement. Looking forward to the onboarding process...',
    body: `<p>Hi,</p>
<p>Confirming we have signed the agreement. Looking forward to the onboarding process. Please coordinate with our IT team at it@nexgenretail.com.</p>
<p>Best,<br/>Jennifer</p>`,
    date: '2026-07-20T14:20:00Z',
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachments: [
      {
        id: 'a7',
        name: 'Signed_Agreement_NexGen.pdf',
        size: '302 KB',
        type: 'pdf',
      },
    ],
    tags: ['Closed Won'],
  },
];

// ── Mock Calendar Events ─────────────────────────────────────────────────────

const today = new Date();
const d = (offsetDays: number, h: number, m = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offsetDays);
  date.setHours(h, m, 0, 0);
  return date;
};

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'ev1',
    title: 'Discovery Call — TechNova',
    description:
      'Initial discovery call with David Park to explore partnership opportunity.',
    start: d(0, 10, 0),
    end: d(0, 11, 0),
    type: 'call',
    attendees: [{ name: 'David Park', email: 'd.park@technova.io' }],
    location: 'Zoom',
    color: '#3b82f6',
  },
  {
    id: 'ev2',
    title: 'Contract Review — Acme Corp',
    description: 'Review redlined contract terms with legal team and Sarah.',
    start: d(1, 14, 0),
    end: d(1, 15, 0),
    type: 'meeting',
    attendees: [
      { name: 'Sarah Mitchell', email: 'sarah.mitchell@acmecorp.com' },
      { name: 'Legal Team', email: 'legal@company.com' },
    ],
    location: 'Google Meet',
    color: '#8b5cf6',
  },
  {
    id: 'ev3',
    title: 'Product Demo — Delta Ventures',
    description: 'Full product demo for Rachel and the Delta Ventures team.',
    start: d(2, 9, 30),
    end: d(2, 10, 30),
    type: 'demo',
    attendees: [
      { name: 'Rachel Okonkwo', email: 'rachel.o@deltaventures.com' },
    ],
    location: 'Microsoft Teams',
    color: '#10b981',
  },
  {
    id: 'ev4',
    title: 'Weekly Sales Sync',
    description: 'Team-wide pipeline review and forecast update.',
    start: d(2, 15, 0),
    end: d(2, 16, 0),
    type: 'meeting',
    location: 'Conference Room A',
    color: '#f59e0b',
  },
  {
    id: 'ev5',
    title: 'Follow-Up — GlobalRetail',
    description: 'Follow up with Marcus on the revised proposal and pricing.',
    start: d(3, 11, 0),
    end: d(3, 11, 30),
    type: 'follow-up',
    attendees: [{ name: 'Marcus Webb', email: 'mwebb@globalretail.com' }],
    color: '#ef4444',
  },
  {
    id: 'ev6',
    title: 'Q3 Forecast Review',
    description: 'Quarterly forecast presentation to leadership team.',
    start: d(4, 10, 0),
    end: d(4, 11, 30),
    type: 'meeting',
    location: 'Board Room',
    color: '#8b5cf6',
    isAllDay: false,
  },
  {
    id: 'ev7',
    title: 'Onboarding — NexGen Retail',
    description: 'Kick-off onboarding session for new enterprise client.',
    start: d(5, 14, 0),
    end: d(5, 16, 0),
    type: 'meeting',
    attendees: [{ name: 'Jennifer Holt', email: 'j.holt@nexgenretail.com' }],
    location: 'Zoom',
    color: '#10b981',
  },
  {
    id: 'ev8',
    title: 'Proposal Deadline — FinEdge Capital',
    description: 'Send finalized partnership proposal to Tom at FinEdge.',
    start: d(3, 17, 0),
    end: d(3, 17, 30),
    type: 'deadline',
    color: '#ef4444',
  },
  {
    id: 'ev9',
    title: 'Sales Training — Objection Handling',
    description: 'Internal workshop on handling pricing objections.',
    start: d(6, 9, 0),
    end: d(6, 12, 0),
    type: 'meeting',
    location: 'Conference Room B',
    color: '#f59e0b',
  },
  {
    id: 'ev10',
    title: 'Check-In — Acme Corp',
    description: 'Quarterly relationship check-in call.',
    start: d(7, 13, 0),
    end: d(7, 13, 30),
    type: 'call',
    attendees: [
      { name: 'Sarah Mitchell', email: 'sarah.mitchell@acmecorp.com' },
    ],
    color: '#3b82f6',
  },
];

export const EVENT_TYPE_CONFIG: Record<
  CalendarEvent['type'],
  { label: string; color: string; bg: string }
> = {
  meeting: {
    label: 'Meeting',
    color: '#8b5cf6',
    bg: 'bg-violet-100 text-violet-700',
  },
  call: { label: 'Call', color: '#3b82f6', bg: 'bg-blue-100 text-blue-700' },
  demo: {
    label: 'Demo',
    color: '#10b981',
    bg: 'bg-emerald-100 text-emerald-700',
  },
  'follow-up': {
    label: 'Follow-Up',
    color: '#f59e0b',
    bg: 'bg-amber-100 text-amber-700',
  },
  deadline: {
    label: 'Deadline',
    color: '#ef4444',
    bg: 'bg-red-100 text-red-700',
  },
  task: {
    label: 'Task',
    color: '#0d9488',
    bg: 'bg-teal-100 text-teal-800',
  },
  other: { label: 'Other', color: '#6b7280', bg: 'bg-gray-100 text-gray-600' },
};

/** Address-book style contacts for compose autocomplete */
export const MOCK_CONTACTS: EmailAddress[] = [
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@acmecorp.com' },
  { name: 'John Lawson', email: 'john.lawson@acmecorp.com' },
  { name: 'David Park', email: 'd.park@technova.io' },
  { name: 'Rachel Okonkwo', email: 'rachel.o@deltaventures.com' },
  { name: 'Marcus Webb', email: 'mwebb@globalretail.com' },
  { name: 'Alex Turner', email: 'alex.turner@company.com' },
  { name: 'Tom Nguyen', email: 'tom.n@finedge.com' },
  { name: 'Jennifer Holt', email: 'j.holt@nexgenretail.com' },
  { name: 'Legal Team', email: 'legal@company.com' },
  { name: 'Sales Team', email: 'sales@company.com' },
  { name: 'Priya Sharma', email: 'priya.sharma@northstar.io' },
  { name: 'James Chen', email: 'j.chen@brightpath.com' },
  { name: 'Olivia Brooks', email: 'olivia@harborlogistics.com' },
  { name: 'Carlos Rivera', email: 'c.rivera@apexmanufacturing.com' },
];

export const MOCK_TODOS: TodoItem[] = [
  {
    id: 't1',
    title: 'Follow up with Sarah Mitchell on Q3 contract terms',
    description: 'Review redlined sections 4.2 and 7.1 before Thursday call',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-03',
    tags: ['Enterprise', 'Urgent'],
    relatedTo: { type: 'deal', name: 'Acme Corp Q3 Deal' },
    createdAt: '2026-08-01T09:30:00Z',
  },
  {
    id: 't2',
    title: 'Send pilot agreement to Delta Ventures',
    description: '3-month pilot, 15 seats — attach PDF and pricing details',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-02',
    tags: ['Hot Lead'],
    relatedTo: { type: 'lead', name: 'Delta Ventures' },
    createdAt: '2026-07-30T18:00:00Z',
  },
  {
    id: 't3',
    title: 'Prepare Q3 forecast presentation',
    description: 'Include pipeline metrics, win rates, and revenue projections',
    completed: false,
    priority: 'medium',
    dueDate: '2026-08-04',
    tags: ['Internal'],
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 't4',
    title: 'Schedule discovery call with TechNova',
    description: 'David Park — partnership opportunity, 50k+ users',
    completed: true,
    priority: 'medium',
    dueDate: '2026-08-01',
    tags: ['Partnership'],
    relatedTo: { type: 'lead', name: 'TechNova' },
    createdAt: '2026-07-28T08:00:00Z',
  },
  {
    id: 't5',
    title: 'Update competitor battlecards for Q4',
    description:
      'HubSpot pricing change, Salesforce AI module, Pipedrive churn',
    completed: false,
    priority: 'low',
    dueDate: '2026-08-12',
    tags: ['Internal'],
    createdAt: '2026-07-25T14:00:00Z',
  },
  {
    id: 't6',
    title: 'Review GlobalRetail revised proposal',
    description: '12% volume discount applied — confirm with Marcus by EOW',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-03',
    tags: ['Negotiation'],
    relatedTo: { type: 'deal', name: 'GlobalRetail Inc.' },
    createdAt: '2026-07-31T16:00:00Z',
  },
  {
    id: 't7',
    title: 'Onboard NexGen Retail team',
    description: 'Coordinate with IT team, schedule training sessions',
    completed: false,
    priority: 'medium',
    dueDate: '2026-08-05',
    tags: ['Onboarding'],
    relatedTo: { type: 'deal', name: 'NexGen Retail' },
    createdAt: '2026-07-28T14:00:00Z',
  },
  {
    id: 't8',
    title: 'Send partnership proposal to FinEdge Capital',
    description: 'Finalize deck and pricing section before sending to Tom',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-04',
    tags: ['Partnership'],
    relatedTo: { type: 'lead', name: 'FinEdge Capital' },
    createdAt: '2026-08-01T15:00:00Z',
  },
  {
    id: 't9',
    title: 'Clean up CRM pipeline — remove stale deals',
    description: 'Archive deals with no activity in 60+ days',
    completed: false,
    priority: 'low',
    dueDate: '2026-08-14',
    tags: ['Internal'],
    createdAt: '2026-07-22T09:00:00Z',
  },
  {
    id: 't10',
    title: 'Book objection handling workshop',
    description: 'Internal training session for the sales team',
    completed: true,
    priority: 'medium',
    dueDate: '2026-08-06',
    tags: ['Internal'],
    createdAt: '2026-07-20T11:00:00Z',
  },
  {
    id: 't11',
    title: 'Confirm pricing with finance for Acme SLA addendum',
    description: 'Need sign-off before Thursday negotiation call',
    completed: false,
    priority: 'high',
    dueDate: '2026-08-03',
    tags: ['Enterprise'],
    relatedTo: { type: 'deal', name: 'Acme Corp Q3 Deal' },
    createdAt: '2026-08-02T11:00:00Z',
  },
  {
    id: 't12',
    title: 'Log call notes from Harbor Logistics demo',
    description: 'Capture objections and next-step owners in CRM',
    completed: false,
    priority: 'medium',
    dueDate: '2026-08-03',
    tags: ['Demo'],
    relatedTo: { type: 'lead', name: 'Harbor Logistics' },
    createdAt: '2026-08-03T08:00:00Z',
  },
];
