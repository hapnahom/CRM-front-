import type { Department, Team, TeamMember } from './types';

// ─── Mock CRM users (mirrors PlatformUser shape used by the real API)
// When backend is ready, replace usages with useGetPlatformUsers() instead.
export const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 'u1',
    name: 'Alice Johnson',
    email: 'alice.johnson@company.com',
    jobTitle: 'Sales Manager',
    avatarUrl: undefined,
  },
  {
    id: 'u2',
    name: 'Bob Martinez',
    email: 'bob.martinez@company.com',
    jobTitle: 'Account Executive',
    avatarUrl: undefined,
  },
  {
    id: 'u3',
    name: 'Carol Smith',
    email: 'carol.smith@company.com',
    jobTitle: 'Business Development Rep',
    avatarUrl: undefined,
  },
  {
    id: 'u4',
    name: 'David Lee',
    email: 'david.lee@company.com',
    jobTitle: 'Pre-Sales Engineer',
    avatarUrl: undefined,
  },
  {
    id: 'u5',
    name: 'Eva Müller',
    email: 'eva.muller@company.com',
    jobTitle: 'Solutions Consultant',
    avatarUrl: undefined,
  },
  {
    id: 'u6',
    name: 'Frank Chen',
    email: 'frank.chen@company.com',
    jobTitle: 'SDR',
    avatarUrl: undefined,
  },
  {
    id: 'u7',
    name: 'Grace Kim',
    email: 'grace.kim@company.com',
    jobTitle: 'Account Manager',
    avatarUrl: undefined,
  },
  {
    id: 'u8',
    name: 'Henry Osei',
    email: 'henry.osei@company.com',
    jobTitle: 'Sales Engineer',
    avatarUrl: undefined,
  },
  {
    id: 'u9',
    name: 'Isla Brown',
    email: 'isla.brown@company.com',
    jobTitle: 'Customer Success Manager',
    avatarUrl: undefined,
  },
  {
    id: 'u10',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    jobTitle: 'Regional Sales Lead',
    avatarUrl: undefined,
  },
  {
    id: 'u11',
    name: 'Karen White',
    email: 'karen.white@company.com',
    jobTitle: 'Marketing Specialist',
    avatarUrl: undefined,
  },
  {
    id: 'u12',
    name: 'Leo Nguyen',
    email: 'leo.nguyen@company.com',
    jobTitle: 'Operations Analyst',
    avatarUrl: undefined,
  },
  {
    id: 'u13',
    name: 'Maya Patel',
    email: 'maya.patel@company.com',
    jobTitle: 'Sales Director',
    avatarUrl: undefined,
  },
  {
    id: 'u14',
    name: 'Noah Adams',
    email: 'noah.adams@company.com',
    jobTitle: 'Product Specialist',
    avatarUrl: undefined,
  },
  {
    id: 'u15',
    name: 'Olivia Turner',
    email: 'olivia.turner@company.com',
    jobTitle: 'Customer Success Lead',
    avatarUrl: undefined,
  },
];

// ─── Mock departments and teams ───────────────────────────────────────────────

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'd1',
    name: 'Sales',
    description: 'Responsible for new business acquisition and revenue growth.',
    createdAt: '2024-01-10T09:00:00Z',
    teams: [
      {
        id: 't1',
        name: 'Enterprise Sales',
        description: 'Focuses on large enterprise accounts.',
        departmentId: 'd1',
        members: [MOCK_MEMBERS[0], MOCK_MEMBERS[1], MOCK_MEMBERS[9]],
        createdAt: '2024-01-15T09:00:00Z',
      },
      {
        id: 't2',
        name: 'SMB Sales',
        description: 'Handles small and medium business segments.',
        departmentId: 'd1',
        members: [MOCK_MEMBERS[2], MOCK_MEMBERS[5]],
        createdAt: '2024-02-01T09:00:00Z',
      },
    ],
  },
  {
    id: 'd2',
    name: 'Pre-Sales',
    description: 'Technical sales support and solution demonstrations.',
    createdAt: '2024-01-12T09:00:00Z',
    teams: [
      {
        id: 't3',
        name: 'Solutions Engineering',
        description: 'Delivers technical demos and proof of concepts.',
        departmentId: 'd2',
        members: [MOCK_MEMBERS[3], MOCK_MEMBERS[4], MOCK_MEMBERS[7]],
        createdAt: '2024-01-20T09:00:00Z',
      },
    ],
  },
  {
    id: 'd3',
    name: 'Customer Success',
    description: 'Ensures customers achieve their desired outcomes.',
    createdAt: '2024-02-05T09:00:00Z',
    teams: [
      {
        id: 't4',
        name: 'Onboarding',
        description: 'Guides new customers through the onboarding process.',
        departmentId: 'd3',
        members: [MOCK_MEMBERS[8]],
        createdAt: '2024-02-10T09:00:00Z',
      },
      {
        id: 't5',
        name: 'Renewals',
        description: 'Manages contract renewals and expansion opportunities.',
        departmentId: 'd3',
        members: [MOCK_MEMBERS[6], MOCK_MEMBERS[9]],
        createdAt: '2024-03-01T09:00:00Z',
      },
    ],
  },
];

export const MOCK_STANDALONE_TEAMS: Team[] = [
  {
    id: 't6',
    name: 'Cross-Functional Task Force',
    description: 'Temporary team working on the Q3 growth initiative.',
    departmentId: 'd1',
    members: [
      MOCK_MEMBERS[0],
      MOCK_MEMBERS[3],
      MOCK_MEMBERS[10],
      MOCK_MEMBERS[11],
    ],
    createdAt: '2024-04-01T09:00:00Z',
  },
  {
    id: 't7',
    name: 'New Market Explorers',
    description: 'Investigating expansion into APAC and LATAM markets.',
    departmentId: 'd1',
    members: [MOCK_MEMBERS[1], MOCK_MEMBERS[4]],
    createdAt: '2024-05-15T09:00:00Z',
  },
];
