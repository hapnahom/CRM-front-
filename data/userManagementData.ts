export type UserStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';
export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Sales Manager'
  | 'Sales Rep'
  | 'Viewer'
  | 'Support Agent';
export type SelamnewProduct = 'CRM' | 'HRM' | 'Payroll' | 'Procurement';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type ApprovalAssigneeType = 'Role' | 'Hierarchy' | 'User';

export interface CRMUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  branch: string;
  team: string;
  manager: string;
  status: UserStatus;
  avatar?: string;
  joinedAt: string;
  lastActive: string;
  customPermissions?: Record<string, Record<string, boolean>>;
  organizationId?: string;
  isOrganizationOwner?: boolean;
}

export interface ProductRoleAssignment {
  product: SelamnewProduct;
  role: string;
}

export interface UserProductAccess {
  userId: string;
  products: SelamnewProduct[];
  productRoles: ProductRoleAssignment[];
}

export interface OrganizationProfile {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
  branchesCount: number;
  departmentsCount: number;
}

export interface ProductSubscription {
  product: SelamnewProduct;
  status: 'Subscribed' | 'Not Subscribed';
}

export interface Invitation {
  id: string;
  email: string;
  fullName: string;
  invitedBy: string;
  invitedAt: string;
  status: 'Pending' | 'Accepted' | 'Expired';
  assignedProducts: SelamnewProduct[];
  assignedRoles: ProductRoleAssignment[];
  approvalResponsibilities: ApprovalAssigneeType[];
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  scope: 'Organization' | 'Product';
  product?: SelamnewProduct;
  mode: 'Single-step' | 'Multi-step' | 'Manager-based';
  assigneeType: ApprovalAssigneeType;
  steps: number;
  isReusableAcrossProducts: boolean;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  requester: string;
  subject: string;
  currentApprover: string;
  status: ApprovalStatus;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  isSystem: boolean;
  permissions: Record<string, Record<string, boolean>>;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  department: string;
  branch: string;
  manager: string;
  membersCount: number;
  members: string[];
  description: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  email: string;
  departmentsCount: number;
  usersCount: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  branch: string;
  head: string;
  description: string;
  usersCount: number;
  teamsCount: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export type PermissionActionDef = {
  action: string;
  slug: string;
};

export type PermissionModuleDef = {
  module: string;
  actions: PermissionActionDef[];
};

/** Unified permission matrix — every module and action maps to a catalog slug. */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  {
    module: 'Sales Hub',
    actions: [{ action: 'View', slug: 'view-sales-hub' }],
  },
  {
    module: 'Leads',
    actions: [
      { action: 'View', slug: 'view-leads' },
      { action: 'Create', slug: 'create-leads' },
      { action: 'Edit', slug: 'edit-leads' },
      { action: 'Delete', slug: 'delete-leads' },
      { action: 'Export', slug: 'export-leads' },
    ],
  },
  {
    module: 'Deals',
    actions: [
      { action: 'View', slug: 'view-deals' },
      { action: 'Create', slug: 'create-deals' },
      { action: 'Edit', slug: 'edit-deals' },
      { action: 'Delete', slug: 'delete-deals' },
      { action: 'Export', slug: 'export-deals' },
    ],
  },
  {
    module: 'Lead Fields',
    actions: [
      { action: 'View Core', slug: 'view-lead-core-fields' },
      { action: 'Edit Core', slug: 'edit-lead-core-fields' },
      { action: 'View Customer', slug: 'view-lead-customer-fields' },
      { action: 'Edit Customer', slug: 'edit-lead-customer-fields' },
      { action: 'View Value', slug: 'view-lead-value-fields' },
      { action: 'Edit Value', slug: 'edit-lead-value-fields' },
      { action: 'View Solutions', slug: 'view-lead-solutions' },
      { action: 'Edit Solutions', slug: 'edit-lead-solutions' },
      { action: 'View Assignment', slug: 'view-lead-assignment' },
      { action: 'Edit Assignment', slug: 'edit-lead-assignment' },
      { action: 'View Custom Fields', slug: 'view-lead-custom-fields' },
      { action: 'Edit Custom Fields', slug: 'edit-lead-custom-fields' },
      { action: 'View Activities', slug: 'view-lead-activities' },
      { action: 'Create Activities', slug: 'create-lead-activities' },
      { action: 'Edit Activities', slug: 'edit-lead-activities' },
      { action: 'View Comments', slug: 'view-lead-comments' },
      { action: 'Create Comments', slug: 'create-lead-comments' },
      { action: 'Edit Comments', slug: 'edit-lead-comments' },
    ],
  },
  {
    module: 'Deal Fields',
    actions: [
      { action: 'View Core', slug: 'view-deal-core-fields' },
      { action: 'Edit Core', slug: 'edit-deal-core-fields' },
      { action: 'View Customer', slug: 'view-deal-customer-fields' },
      { action: 'Edit Customer', slug: 'edit-deal-customer-fields' },
      { action: 'View Value', slug: 'view-deal-value-fields' },
      { action: 'Edit Value', slug: 'edit-deal-value-fields' },
      { action: 'View Solutions', slug: 'view-deal-solutions' },
      { action: 'Edit Solutions', slug: 'edit-deal-solutions' },
      { action: 'View Assignment', slug: 'view-deal-assignment' },
      { action: 'Edit Assignment', slug: 'edit-deal-assignment' },
      {
        action: 'View Opportunity Custom Fields',
        slug: 'view-deal-custom-fields',
      },
      {
        action: 'Edit Opportunity Custom Fields',
        slug: 'edit-deal-custom-fields',
      },
      { action: 'View Activities', slug: 'view-deal-activities' },
      { action: 'Create Activities', slug: 'create-deal-activities' },
      { action: 'Edit Activities', slug: 'edit-deal-activities' },
      { action: 'View Comments', slug: 'view-deal-comments' },
      { action: 'Create Comments', slug: 'create-deal-comments' },
      { action: 'Edit Comments', slug: 'edit-deal-comments' },
    ],
  },
  {
    module: 'Customers',
    actions: [
      { action: 'View', slug: 'view-customers' },
      {
        action: 'See all',
        slug: 'view-all-customers',
      },
      { action: 'Create', slug: 'create-customers' },
      { action: 'Edit', slug: 'edit-customers' },
      { action: 'Delete', slug: 'delete-customers' },
      { action: 'Export', slug: 'export-customers' },
    ],
  },
  {
    module: 'Contacts',
    actions: [
      { action: 'View', slug: 'view-contacts' },
      { action: 'Create', slug: 'create-contacts' },
      { action: 'Edit', slug: 'edit-contacts' },
      { action: 'Delete', slug: 'delete-contacts' },
      { action: 'Export', slug: 'export-contacts' },
    ],
  },
  {
    module: 'Activities',
    actions: [
      { action: 'View', slug: 'view-activities' },
      { action: 'Create', slug: 'create-activities' },
      { action: 'Edit', slug: 'edit-activities' },
      { action: 'Delete', slug: 'delete-activities' },
      { action: 'Export', slug: 'export-activities' },
    ],
  },
  {
    module: 'Reports',
    actions: [
      { action: 'View', slug: 'view-reports' },
      { action: 'Create', slug: 'create-reports' },
      { action: 'Edit', slug: 'edit-reports' },
      { action: 'Delete', slug: 'delete-reports' },
      { action: 'Export', slug: 'export-reports' },
    ],
  },
  {
    module: 'Dashboard',
    actions: [
      { action: 'Executive', slug: 'view-executive-dashboard' },
      { action: 'Department', slug: 'view-department-dashboard' },
      { action: 'Team', slug: 'view-team-dashboard' },
    ],
  },
  {
    module: 'Targets',
    actions: [
      { action: 'View Company', slug: 'view-company-targets' },
      { action: 'Edit Company', slug: 'edit-company-targets' },
      { action: 'View Department', slug: 'view-department-targets' },
      { action: 'Edit Department', slug: 'edit-department-targets' },
      { action: 'View Team', slug: 'view-team-targets' },
      { action: 'Edit Team', slug: 'edit-team-targets' },
      { action: 'View My', slug: 'view-targets' },
      { action: 'Edit My', slug: 'edit-targets' },
    ],
  },
  {
    module: 'Settings',
    actions: [
      { action: 'View', slug: 'view-settings' },
      { action: 'Edit', slug: 'edit-settings' },
    ],
  },
  {
    module: 'Custom Fields',
    actions: [
      { action: 'View', slug: 'view-custom-fields' },
      { action: 'Edit', slug: 'edit-custom-fields' },
    ],
  },
  {
    module: 'Users',
    actions: [
      { action: 'View', slug: 'view-users' },
      { action: 'Create', slug: 'create-users' },
      { action: 'Edit', slug: 'edit-users' },
      { action: 'Delete', slug: 'delete-users' },
      { action: 'Export', slug: 'export-users' },
    ],
  },
  {
    module: 'Roles',
    actions: [
      { action: 'View', slug: 'view-roles' },
      { action: 'Create', slug: 'create-roles' },
      { action: 'Edit', slug: 'edit-roles' },
      { action: 'Delete', slug: 'delete-roles' },
    ],
  },
  {
    module: 'Teams',
    actions: [
      { action: 'View', slug: 'view-teams' },
      { action: 'Create', slug: 'create-teams' },
      { action: 'Edit', slug: 'edit-teams' },
      { action: 'Delete', slug: 'delete-teams' },
    ],
  },
  {
    module: 'Forecast',
    actions: [
      { action: 'View', slug: 'view-forecast' },
      { action: 'Edit', slug: 'edit-forecast' },
      { action: 'Create', slug: 'create-forecast' },
      { action: 'Delete', slug: 'delete-forecast' },
    ],
  },
  {
    module: 'Product Families',
    actions: [
      { action: 'View', slug: 'view-product-families' },
      { action: 'Create', slug: 'create-product-families' },
      { action: 'Edit', slug: 'edit-product-families' },
      { action: 'Delete', slug: 'delete-product-families' },
    ],
  },
  {
    module: 'Products',
    actions: [
      { action: 'View', slug: 'view-products' },
      { action: 'Create', slug: 'create-products' },
      { action: 'Edit', slug: 'edit-products' },
      { action: 'Delete', slug: 'delete-products' },
    ],
  },
  {
    module: 'Partners',
    actions: [
      { action: 'View', slug: 'view-partners' },
      { action: 'View All', slug: 'view-all-partners' },
      { action: 'Create', slug: 'create-partners' },
      { action: 'Edit', slug: 'edit-partners' },
      { action: 'Delete', slug: 'delete-partners' },
      { action: 'Export', slug: 'export-partners' },
    ],
  },
  {
    module: 'Campaigns',
    actions: [
      { action: 'View', slug: 'view-campaigns' },
      { action: 'Create', slug: 'create-campaigns' },
      { action: 'Edit', slug: 'edit-campaigns' },
      { action: 'Delete', slug: 'delete-campaigns' },
    ],
  },
  {
    module: 'Marketing Activities',
    actions: [
      { action: 'View', slug: 'view-marketing-activities' },
      { action: 'Create', slug: 'create-marketing-activities' },
      { action: 'Edit', slug: 'edit-marketing-activities' },
      { action: 'Delete', slug: 'delete-marketing-activities' },
      { action: 'Send Email', slug: 'send-marketing-email' },
    ],
  },
  {
    module: 'Marketing Events',
    actions: [
      { action: 'View', slug: 'view-marketing-events' },
      { action: 'Create', slug: 'create-marketing-events' },
      { action: 'Edit', slug: 'edit-marketing-events' },
      { action: 'Delete', slug: 'delete-marketing-events' },
    ],
  },
  {
    module: 'Productivity',
    actions: [{ action: 'View', slug: 'view-communication' }],
  },
];

/** @deprecated Use PERMISSION_MODULES — kept for legacy mock role data */
export const CRM_MODULES = PERMISSION_MODULES.filter((m) =>
  [
    'Leads',
    'Deals',
    'Customers',
    'Contacts',
    'Activities',
    'Reports',
    'Settings',
    'Users',
    'Roles',
    'Teams',
  ].includes(m.module),
).map((m) => m.module);

/** @deprecated Use PERMISSION_MODULES */
export const MODULE_ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Export'];

/** @deprecated Use PERMISSION_MODULES */
export type CustomPermissionAction = PermissionActionDef;

/** @deprecated Use PERMISSION_MODULES */
export const CUSTOM_PERMISSION_MODULES: Record<
  string,
  CustomPermissionAction[]
> = Object.fromEntries(
  PERMISSION_MODULES.filter((m) =>
    [
      'Dashboard',
      'Targets',
      'Forecast',
      'Product Families',
      'Products',
      'Partners',
      'Campaigns',
      'Marketing Activities',
      'Marketing Events',
      'Productivity',
    ].includes(m.module),
  ).map((m) => [m.module, m.actions]),
);
export const SELAMNEW_PRODUCTS: SelamnewProduct[] = [
  'CRM',
  'HRM',
  'Payroll',
  'Procurement',
];

export const users: CRMUser[] = [
  {
    id: 'u1',
    name: 'Nahom Esrael',
    email: 'nahom@company.com',
    phone: '0912345678',
    role: 'Super Admin',
    department: 'Management',
    branch: 'Addis Ababa HQ',
    team: 'Executive',
    manager: '—',
    status: 'Active',
    joinedAt: '2024-01-15',
    lastActive: '2025-04-21',
    organizationId: 'org-1',
    isOrganizationOwner: true,
  },
  {
    id: 'u2',
    name: 'Sara Tesfaye',
    email: 'sara@company.com',
    phone: '0911234567',
    role: 'Sales Manager',
    department: 'Sales',
    branch: 'Addis Ababa HQ',
    team: 'Sales Team A',
    manager: 'Nahom Esrael',
    status: 'Active',
    joinedAt: '2024-02-10',
    lastActive: '2025-04-20',
    organizationId: 'org-1',
  },
  {
    id: 'u3',
    name: 'Abel Girma',
    email: 'abel@company.com',
    phone: '0913456789',
    role: 'Sales Rep',
    department: 'Sales',
    branch: 'Addis Ababa HQ',
    team: 'Sales Team A',
    manager: 'Sara Tesfaye',
    status: 'Active',
    joinedAt: '2024-03-05',
    lastActive: '2025-04-19',
    organizationId: 'org-1',
  },
  {
    id: 'u4',
    name: 'Meron Haile',
    email: 'meron@company.com',
    phone: '0914567890',
    role: 'Sales Rep',
    department: 'Sales',
    branch: 'Dire Dawa Branch',
    team: 'Sales Team B',
    manager: 'Sara Tesfaye',
    status: 'Active',
    joinedAt: '2024-03-12',
    lastActive: '2025-04-18',
    organizationId: 'org-1',
  },
  {
    id: 'u5',
    name: 'Daniel Bekele',
    email: 'daniel@company.com',
    phone: '0915678901',
    role: 'Admin',
    department: 'IT',
    branch: 'Addis Ababa HQ',
    team: 'IT Team',
    manager: 'Nahom Esrael',
    status: 'Active',
    joinedAt: '2024-01-20',
    lastActive: '2025-04-21',
    organizationId: 'org-1',
  },
  {
    id: 'u6',
    name: 'Tigist Alemu',
    email: 'tigist@company.com',
    phone: '0916789012',
    role: 'Viewer',
    department: 'Finance',
    branch: 'Addis Ababa HQ',
    team: 'Finance Team',
    manager: 'Daniel Bekele',
    status: 'Inactive',
    joinedAt: '2024-04-01',
    lastActive: '2025-03-15',
    organizationId: 'org-1',
  },
  {
    id: 'u7',
    name: 'Yonas Tadesse',
    email: 'yonas@company.com',
    phone: '0917890123',
    role: 'Sales Rep',
    department: 'Sales',
    branch: 'Hawassa Branch',
    team: 'Sales Team C',
    manager: 'Sara Tesfaye',
    status: 'Pending',
    joinedAt: '2025-04-10',
    lastActive: '—',
    organizationId: 'org-1',
  },
  {
    id: 'u8',
    name: 'Hana Worku',
    email: 'hana@company.com',
    phone: '0918901234',
    role: 'Support Agent',
    department: 'Customer Support',
    branch: 'Addis Ababa HQ',
    team: 'Support Team',
    manager: 'Daniel Bekele',
    status: 'Active',
    joinedAt: '2024-05-15',
    lastActive: '2025-04-20',
    organizationId: 'org-1',
  },
  {
    id: 'u9',
    name: 'Biruk Mekonnen',
    email: 'biruk@company.com',
    phone: '0919012345',
    role: 'Sales Manager',
    department: 'Sales',
    branch: 'Bahir Dar Branch',
    team: 'Sales Team D',
    manager: 'Nahom Esrael',
    status: 'Active',
    joinedAt: '2024-02-28',
    lastActive: '2025-04-17',
    organizationId: 'org-1',
  },
  {
    id: 'u10',
    name: 'Liya Solomon',
    email: 'liya@company.com',
    phone: '0910123456',
    role: 'Sales Rep',
    department: 'Sales',
    branch: 'Bahir Dar Branch',
    team: 'Sales Team D',
    manager: 'Biruk Mekonnen',
    status: 'Suspended',
    joinedAt: '2024-06-01',
    lastActive: '2025-02-10',
    organizationId: 'org-1',
  },
];

export const roles: Role[] = [
  {
    id: 'r1',
    name: 'Super Admin',
    description: 'Full access to all CRM modules and system settings',
    usersCount: 1,
    isSystem: true,
    createdAt: '2024-01-01',
    permissions: Object.fromEntries(
      CRM_MODULES.map((mod) => [
        mod,
        Object.fromEntries(MODULE_ACTIONS.map((a) => [a, true])),
      ]),
    ),
  },
  {
    id: 'r2',
    name: 'Admin',
    description: 'Manage users, roles, and most CRM settings',
    usersCount: 1,
    isSystem: true,
    createdAt: '2024-01-01',
    permissions: {
      Leads: {
        View: true,
        Create: true,
        Edit: true,
        Delete: true,
        Export: true,
      },
      Deals: {
        View: true,
        Create: true,
        Edit: true,
        Delete: true,
        Export: true,
      },
      Contacts: {
        View: true,
        Create: true,
        Edit: true,
        Delete: true,
        Export: true,
      },
      Activities: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Reports: {
        View: true,
        Create: true,
        Edit: false,
        Delete: false,
        Export: true,
      },
      Settings: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Users: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: true,
      },
    },
  },
  {
    id: 'r3',
    name: 'Sales Manager',
    description: 'Manage sales team, leads, deals and view reports',
    usersCount: 2,
    isSystem: false,
    createdAt: '2024-01-15',
    permissions: {
      Leads: {
        View: true,
        Create: true,
        Edit: true,
        Delete: true,
        Export: true,
      },
      Deals: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: true,
      },
      Contacts: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: true,
      },
      Activities: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Reports: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: true,
      },
      Settings: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Users: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
    },
  },
  {
    id: 'r4',
    name: 'Sales Rep',
    description: 'Create and manage own leads and deals',
    usersCount: 4,
    isSystem: false,
    createdAt: '2024-01-15',
    permissions: {
      Leads: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Deals: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Contacts: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Activities: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Reports: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Settings: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Users: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
    },
  },
  {
    id: 'r5',
    name: 'Viewer',
    description: 'Read-only access to leads, deals and contacts',
    usersCount: 1,
    isSystem: false,
    createdAt: '2024-02-01',
    permissions: {
      Leads: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Deals: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Contacts: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Activities: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Reports: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Settings: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Users: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
    },
  },
  {
    id: 'r6',
    name: 'Support Agent',
    description: 'Handle customer support tickets and contacts',
    usersCount: 1,
    isSystem: false,
    createdAt: '2024-03-01',
    permissions: {
      Leads: {
        View: true,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Deals: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Contacts: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Activities: {
        View: true,
        Create: true,
        Edit: true,
        Delete: false,
        Export: false,
      },
      Reports: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Settings: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
      Users: {
        View: false,
        Create: false,
        Edit: false,
        Delete: false,
        Export: false,
      },
    },
  },
];

export const teams: Team[] = [
  {
    id: 't1',
    name: 'Sales Team A',
    department: 'Sales',
    branch: 'Addis Ababa HQ',
    manager: 'Sara Tesfaye',
    membersCount: 3,
    members: ['Abel Girma', 'Hana Worku', 'Tigist Alemu'],
    description: 'Core sales team covering Addis Ababa region',
    createdAt: '2024-01-20',
  },
  {
    id: 't2',
    name: 'Sales Team B',
    department: 'Sales',
    branch: 'Dire Dawa Branch',
    manager: 'Meron Haile',
    membersCount: 2,
    members: ['Meron Haile', 'Yonas Tadesse'],
    description: 'Sales team for Dire Dawa and Eastern region',
    createdAt: '2024-02-05',
  },
  {
    id: 't3',
    name: 'Sales Team C',
    department: 'Sales',
    branch: 'Hawassa Branch',
    manager: 'Sara Tesfaye',
    membersCount: 2,
    members: ['Yonas Tadesse', 'Liya Solomon'],
    description: 'Sales coverage for Southern Ethiopia',
    createdAt: '2024-02-15',
  },
  {
    id: 't4',
    name: 'Sales Team D',
    department: 'Sales',
    branch: 'Bahir Dar Branch',
    manager: 'Biruk Mekonnen',
    membersCount: 2,
    members: ['Biruk Mekonnen', 'Liya Solomon'],
    description: 'Sales team for Northern Ethiopia',
    createdAt: '2024-03-01',
  },
  {
    id: 't5',
    name: 'IT Team',
    department: 'IT',
    branch: 'Addis Ababa HQ',
    manager: 'Daniel Bekele',
    membersCount: 1,
    members: ['Daniel Bekele'],
    description: 'System administration and technical support',
    createdAt: '2024-01-20',
  },
  {
    id: 't6',
    name: 'Support Team',
    department: 'Customer Support',
    branch: 'Addis Ababa HQ',
    manager: 'Hana Worku',
    membersCount: 1,
    members: ['Hana Worku'],
    description: 'Customer support and after-sales service',
    createdAt: '2024-05-20',
  },
];

export const branches: Branch[] = [
  {
    id: 'b1',
    name: 'Addis Ababa HQ',
    location: 'Bole, Addis Ababa',
    manager: 'Nahom Esrael',
    phone: '0111234567',
    email: 'hq@company.com',
    departmentsCount: 4,
    usersCount: 6,
    status: 'Active',
    createdAt: '2024-01-01',
  },
  {
    id: 'b2',
    name: 'Dire Dawa Branch',
    location: 'Dire Dawa City',
    manager: 'Meron Haile',
    phone: '0252345678',
    email: 'diredawa@company.com',
    departmentsCount: 1,
    usersCount: 1,
    status: 'Active',
    createdAt: '2024-02-01',
  },
  {
    id: 'b3',
    name: 'Hawassa Branch',
    location: 'Hawassa, SNNPR',
    manager: 'Yonas Tadesse',
    phone: '0462345678',
    email: 'hawassa@company.com',
    departmentsCount: 1,
    usersCount: 1,
    status: 'Active',
    createdAt: '2024-02-15',
  },
  {
    id: 'b4',
    name: 'Bahir Dar Branch',
    location: 'Bahir Dar, Amhara',
    manager: 'Biruk Mekonnen',
    phone: '0582345678',
    email: 'bahirdar@company.com',
    departmentsCount: 1,
    usersCount: 2,
    status: 'Active',
    createdAt: '2024-03-01',
  },
  {
    id: 'b5',
    name: 'Mekelle Branch',
    location: 'Mekelle, Tigray',
    manager: '—',
    phone: '0342345678',
    email: 'mekelle@company.com',
    departmentsCount: 0,
    usersCount: 0,
    status: 'Inactive',
    createdAt: '2024-06-01',
  },
];

export const departments: Department[] = [
  {
    id: 'd1',
    name: 'Sales',
    branch: 'Addis Ababa HQ',
    head: 'Sara Tesfaye',
    description: 'Responsible for all sales activities and revenue generation',
    usersCount: 5,
    teamsCount: 4,
    status: 'Active',
    createdAt: '2024-01-01',
  },
  {
    id: 'd2',
    name: 'Management',
    branch: 'Addis Ababa HQ',
    head: 'Nahom Esrael',
    description: 'Executive and top-level management',
    usersCount: 1,
    teamsCount: 1,
    status: 'Active',
    createdAt: '2024-01-01',
  },
  {
    id: 'd3',
    name: 'IT',
    branch: 'Addis Ababa HQ',
    head: 'Daniel Bekele',
    description: 'Information technology and system administration',
    usersCount: 1,
    teamsCount: 1,
    status: 'Active',
    createdAt: '2024-01-01',
  },
  {
    id: 'd4',
    name: 'Finance',
    branch: 'Addis Ababa HQ',
    head: 'Tigist Alemu',
    description: 'Financial management and accounting',
    usersCount: 1,
    teamsCount: 1,
    status: 'Active',
    createdAt: '2024-01-01',
  },
  {
    id: 'd5',
    name: 'Customer Support',
    branch: 'Addis Ababa HQ',
    head: 'Hana Worku',
    description: 'Customer service and after-sales support',
    usersCount: 1,
    teamsCount: 1,
    status: 'Active',
    createdAt: '2024-05-01',
  },
];

export const organizationProfile: OrganizationProfile = {
  id: 'org-1',
  name: 'Selamnew Trading PLC',
  ownerUserId: 'u1',
  createdAt: '2024-01-01',
  branchesCount: branches.length,
  departmentsCount: departments.length,
};

export const productSubscriptions: ProductSubscription[] = [
  { product: 'CRM', status: 'Subscribed' },
  { product: 'HRM', status: 'Subscribed' },
  { product: 'Payroll', status: 'Not Subscribed' },
  { product: 'Procurement', status: 'Subscribed' },
];

export const userProductAccess: UserProductAccess[] = [
  {
    userId: 'u1',
    products: ['CRM', 'HRM', 'Procurement'],
    productRoles: [
      { product: 'CRM', role: 'Super Admin' },
      { product: 'HRM', role: 'Org Owner' },
      { product: 'Procurement', role: 'Approver' },
    ],
  },
  {
    userId: 'u2',
    products: ['CRM', 'Procurement'],
    productRoles: [
      { product: 'CRM', role: 'Sales Manager' },
      { product: 'Procurement', role: 'Manager Approver' },
    ],
  },
  {
    userId: 'u3',
    products: ['CRM'],
    productRoles: [{ product: 'CRM', role: 'Sales Rep' }],
  },
];

export const invitations: Invitation[] = [
  {
    id: 'inv-1',
    email: 'yonas@company.com',
    fullName: 'Yonas Tadesse',
    invitedBy: 'Nahom Esrael',
    invitedAt: '2025-04-10',
    status: 'Pending',
    assignedProducts: ['CRM'],
    assignedRoles: [{ product: 'CRM', role: 'Sales Rep' }],
    approvalResponsibilities: ['Hierarchy'],
  },
  {
    id: 'inv-2',
    email: 'new.manager@company.com',
    fullName: 'New Manager',
    invitedBy: 'Daniel Bekele',
    invitedAt: '2025-04-18',
    status: 'Accepted',
    assignedProducts: ['CRM', 'HRM'],
    assignedRoles: [
      { product: 'CRM', role: 'Sales Manager' },
      { product: 'HRM', role: 'Department Admin' },
    ],
    approvalResponsibilities: ['Role', 'User'],
  },
];

export const approvalWorkflows: ApprovalWorkflow[] = [
  {
    id: 'wf-1',
    name: 'Leave Request Approval',
    scope: 'Organization',
    mode: 'Manager-based',
    assigneeType: 'Hierarchy',
    steps: 1,
    isReusableAcrossProducts: true,
  },
  {
    id: 'wf-2',
    name: 'High Value Deal Discount',
    scope: 'Product',
    product: 'CRM',
    mode: 'Multi-step',
    assigneeType: 'Role',
    steps: 2,
    isReusableAcrossProducts: false,
  },
];

export const approvalRequests: ApprovalRequest[] = [
  {
    id: 'ar-1',
    workflowId: 'wf-1',
    requester: 'Abel Girma',
    subject: 'Annual leave request',
    currentApprover: 'Sara Tesfaye',
    status: 'Pending',
  },
  {
    id: 'ar-2',
    workflowId: 'wf-2',
    requester: 'Biruk Mekonnen',
    subject: 'Discount above approval threshold',
    currentApprover: 'Nahom Esrael',
    status: 'Approved',
  },
  {
    id: 'ar-3',
    workflowId: 'wf-2',
    requester: 'Liya Solomon',
    subject: 'Special pricing request',
    currentApprover: 'Biruk Mekonnen',
    status: 'Rejected',
  },
];
