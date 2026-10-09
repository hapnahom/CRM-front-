/**
 * Permission slugs — keep in sync with CRM/src/core/authorization/permissions.constants.ts
 */
export const PERMISSIONS = {
  VIEW_LEADS: 'view-leads',
  CREATE_LEADS: 'create-leads',
  EDIT_LEADS: 'edit-leads',
  DELETE_LEADS: 'delete-leads',
  EXPORT_LEADS: 'export-leads',

  VIEW_DEALS: 'view-deals',
  CREATE_DEALS: 'create-deals',
  EDIT_DEALS: 'edit-deals',
  DELETE_DEALS: 'delete-deals',
  EXPORT_DEALS: 'export-deals',

  VIEW_SALES_HUB: 'view-sales-hub',

  VIEW_CUSTOMERS: 'view-customers',
  VIEW_ALL_CUSTOMERS: 'view-all-customers',
  CREATE_CUSTOMERS: 'create-customers',
  EDIT_CUSTOMERS: 'edit-customers',
  DELETE_CUSTOMERS: 'delete-customers',
  EXPORT_CUSTOMERS: 'export-customers',

  VIEW_CONTACTS: 'view-contacts',
  CREATE_CONTACTS: 'create-contacts',
  EDIT_CONTACTS: 'edit-contacts',
  DELETE_CONTACTS: 'delete-contacts',
  EXPORT_CONTACTS: 'export-contacts',

  VIEW_ACTIVITIES: 'view-activities',
  CREATE_ACTIVITIES: 'create-activities',
  EDIT_ACTIVITIES: 'edit-activities',
  DELETE_ACTIVITIES: 'delete-activities',
  EXPORT_ACTIVITIES: 'export-activities',

  VIEW_REPORTS: 'view-reports',
  CREATE_REPORTS: 'create-reports',
  EDIT_REPORTS: 'edit-reports',
  DELETE_REPORTS: 'delete-reports',
  EXPORT_REPORTS: 'export-reports',

  VIEW_SETTINGS: 'view-settings',
  EDIT_SETTINGS: 'edit-settings',

  VIEW_USERS: 'view-users',
  CREATE_USERS: 'create-users',
  EDIT_USERS: 'edit-users',
  DELETE_USERS: 'delete-users',
  EXPORT_USERS: 'export-users',

  VIEW_ROLES: 'view-roles',
  CREATE_ROLES: 'create-roles',
  EDIT_ROLES: 'edit-roles',
  DELETE_ROLES: 'delete-roles',

  VIEW_TEAMS: 'view-teams',
  CREATE_TEAMS: 'create-teams',
  EDIT_TEAMS: 'edit-teams',
  DELETE_TEAMS: 'delete-teams',

  VIEW_EXECUTIVE_DASHBOARD: 'view-executive-dashboard',
  VIEW_DEPARTMENT_DASHBOARD: 'view-department-dashboard',
  VIEW_TEAM_DASHBOARD: 'view-team-dashboard',

  VIEW_COMPANY_TARGETS: 'view-company-targets',
  EDIT_COMPANY_TARGETS: 'edit-company-targets',
  VIEW_DEPARTMENT_TARGETS: 'view-department-targets',
  EDIT_DEPARTMENT_TARGETS: 'edit-department-targets',
  VIEW_TEAM_TARGETS: 'view-team-targets',
  EDIT_TEAM_TARGETS: 'edit-team-targets',
  VIEW_TARGETS: 'view-targets',
  EDIT_TARGETS: 'edit-targets',

  SUBMIT_TEAM_TARGET_REQUEST: 'submit-team-target-request',
  REVIEW_DEPARTMENT_TARGET_REQUESTS: 'review-department-target-requests',
  REVIEW_COMPANY_TARGET_REQUESTS: 'review-company-target-requests',
  MODIFY_TARGET_REQUEST: 'modify-target-request',
  APPROVE_DEPARTMENT_TARGET_REQUEST: 'approve-department-target-request',
  APPROVE_COMPANY_TARGET_REQUEST: 'approve-company-target-request',
  REJECT_TARGET_REQUEST: 'reject-target-request',
  RECONCILE_TARGETS: 'reconcile-targets',

  VIEW_FORECAST: 'view-forecast',
  EDIT_FORECAST: 'edit-forecast',
  CREATE_FORECAST: 'create-forecast',
  DELETE_FORECAST: 'delete-forecast',

  VIEW_PRODUCT_FAMILIES: 'view-product-families',
  CREATE_PRODUCT_FAMILIES: 'create-product-families',
  EDIT_PRODUCT_FAMILIES: 'edit-product-families',
  DELETE_PRODUCT_FAMILIES: 'delete-product-families',
  VIEW_PRODUCTS: 'view-products',
  CREATE_PRODUCTS: 'create-products',
  EDIT_PRODUCTS: 'edit-products',
  DELETE_PRODUCTS: 'delete-products',

  VIEW_PARTNERS: 'view-partners',
  VIEW_ALL_PARTNERS: 'view-all-partners',
  CREATE_PARTNERS: 'create-partners',
  EDIT_PARTNERS: 'edit-partners',
  DELETE_PARTNERS: 'delete-partners',
  EXPORT_PARTNERS: 'export-partners',

  VIEW_CAMPAIGNS: 'view-campaigns',
  CREATE_CAMPAIGNS: 'create-campaigns',
  EDIT_CAMPAIGNS: 'edit-campaigns',
  DELETE_CAMPAIGNS: 'delete-campaigns',

  VIEW_MARKETING_ACTIVITIES: 'view-marketing-activities',
  CREATE_MARKETING_ACTIVITIES: 'create-marketing-activities',
  EDIT_MARKETING_ACTIVITIES: 'edit-marketing-activities',
  DELETE_MARKETING_ACTIVITIES: 'delete-marketing-activities',
  SEND_MARKETING_EMAIL: 'send-marketing-email',

  VIEW_MARKETING_EVENTS: 'view-marketing-events',
  CREATE_MARKETING_EVENTS: 'create-marketing-events',
  EDIT_MARKETING_EVENTS: 'edit-marketing-events',
  DELETE_MARKETING_EVENTS: 'delete-marketing-events',

  VIEW_COMMUNICATION: 'view-communication',

  VIEW_LEAD_CORE_FIELDS: 'view-lead-core-fields',
  EDIT_LEAD_CORE_FIELDS: 'edit-lead-core-fields',
  VIEW_LEAD_CUSTOMER_FIELDS: 'view-lead-customer-fields',
  EDIT_LEAD_CUSTOMER_FIELDS: 'edit-lead-customer-fields',
  VIEW_LEAD_VALUE_FIELDS: 'view-lead-value-fields',
  EDIT_LEAD_VALUE_FIELDS: 'edit-lead-value-fields',
  VIEW_LEAD_SOLUTIONS: 'view-lead-solutions',
  EDIT_LEAD_SOLUTIONS: 'edit-lead-solutions',
  VIEW_LEAD_ASSIGNMENT: 'view-lead-assignment',
  EDIT_LEAD_ASSIGNMENT: 'edit-lead-assignment',
  VIEW_LEAD_CUSTOM_FIELDS: 'view-lead-custom-fields',
  EDIT_LEAD_CUSTOM_FIELDS: 'edit-lead-custom-fields',
  VIEW_CUSTOM_FIELDS: 'view-custom-fields',
  EDIT_CUSTOM_FIELDS: 'edit-custom-fields',
  VIEW_LEAD_ACTIVITIES: 'view-lead-activities',
  CREATE_LEAD_ACTIVITIES: 'create-lead-activities',
  EDIT_LEAD_ACTIVITIES: 'edit-lead-activities',
  VIEW_LEAD_COMMENTS: 'view-lead-comments',
  CREATE_LEAD_COMMENTS: 'create-lead-comments',
  EDIT_LEAD_COMMENTS: 'edit-lead-comments',

  VIEW_DEAL_CORE_FIELDS: 'view-deal-core-fields',
  EDIT_DEAL_CORE_FIELDS: 'edit-deal-core-fields',
  VIEW_DEAL_CUSTOMER_FIELDS: 'view-deal-customer-fields',
  EDIT_DEAL_CUSTOMER_FIELDS: 'edit-deal-customer-fields',
  VIEW_DEAL_VALUE_FIELDS: 'view-deal-value-fields',
  EDIT_DEAL_VALUE_FIELDS: 'edit-deal-value-fields',
  VIEW_DEAL_SOLUTIONS: 'view-deal-solutions',
  EDIT_DEAL_SOLUTIONS: 'edit-deal-solutions',
  VIEW_DEAL_ASSIGNMENT: 'view-deal-assignment',
  EDIT_DEAL_ASSIGNMENT: 'edit-deal-assignment',
  VIEW_DEAL_CUSTOM_FIELDS: 'view-deal-custom-fields',
  EDIT_DEAL_CUSTOM_FIELDS: 'edit-deal-custom-fields',
  VIEW_DEAL_ACTIVITIES: 'view-deal-activities',
  CREATE_DEAL_ACTIVITIES: 'create-deal-activities',
  EDIT_DEAL_ACTIVITIES: 'edit-deal-activities',
  VIEW_DEAL_COMMENTS: 'view-deal-comments',
  CREATE_DEAL_COMMENTS: 'create-deal-comments',
  EDIT_DEAL_COMMENTS: 'edit-deal-comments',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Matches backend DashboardView / HomeDashboardView values. */
export enum DashboardView {
  Executive = 'executive',
  Department = 'department',
  TeamLeader = 'team_leader',
  TeamMember = 'team_member',
}

export const TARGET_MODULE_ACCESS_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.VIEW_COMPANY_TARGETS,
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.VIEW_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  PERMISSIONS.VIEW_TEAM_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
  PERMISSIONS.VIEW_TARGETS,
  PERMISSIONS.EDIT_TARGETS,
];

export const FORECAST_VIEW_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.VIEW_FORECAST,
  ...TARGET_MODULE_ACCESS_PERMISSIONS,
];

export const FORECAST_EDIT_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.EDIT_FORECAST,
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
  PERMISSIONS.EDIT_TARGETS,
];

export const FORECAST_CREATE_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.CREATE_FORECAST,
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
  PERMISSIONS.EDIT_TARGETS,
];

export const FORECAST_DELETE_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.DELETE_FORECAST,
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
  PERMISSIONS.EDIT_TARGETS,
];

export const MARKETING_MODULE_VIEW_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.VIEW_CAMPAIGNS,
  PERMISSIONS.VIEW_MARKETING_ACTIVITIES,
  PERMISSIONS.VIEW_MARKETING_EVENTS,
];

export const PARTNERS_MODULE_VIEW_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.VIEW_PARTNERS,
];

export const TARGET_VIEW_COMPANY_SLUGS = [
  PERMISSIONS.VIEW_COMPANY_TARGETS,
  PERMISSIONS.EDIT_COMPANY_TARGETS,
] as const;

export const TARGET_EDIT_COMPANY_SLUGS = [
  PERMISSIONS.EDIT_COMPANY_TARGETS,
] as const;

export const TARGET_EDIT_DEPARTMENT_SLUGS = [
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
] as const;

export const TARGET_EDIT_TEAM_SLUGS = [
  PERMISSIONS.EDIT_COMPANY_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
] as const;

export const TARGET_VIEW_DEPARTMENT_SLUGS = [
  ...TARGET_VIEW_COMPANY_SLUGS,
  PERMISSIONS.VIEW_DEPARTMENT_TARGETS,
  PERMISSIONS.EDIT_DEPARTMENT_TARGETS,
] as const;

export const TARGET_VIEW_TEAM_SLUGS = [
  ...TARGET_VIEW_DEPARTMENT_SLUGS,
  PERMISSIONS.VIEW_TEAM_TARGETS,
  PERMISSIONS.EDIT_TEAM_TARGETS,
] as const;

export const TARGET_VIEW_ALL_SLUGS = [
  ...TARGET_VIEW_TEAM_SLUGS,
  PERMISSIONS.VIEW_TARGETS,
  PERMISSIONS.EDIT_TARGETS,
] as const;
