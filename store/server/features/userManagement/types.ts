// ─── Backend status enum ─────────────────────────────────────────────────────
export type BackendUserStatus =
  | 'active'
  | 'invited'
  | 'suspended'
  | 'declined'
  | 'expired';

// ─── Display label mapping ────────────────────────────────────────────────────
export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'muted';

export const STATUS_DISPLAY: Record<
  BackendUserStatus,
  { label: string; variant: StatusBadgeVariant }
> = {
  active: {
    label: 'Active',
    variant: 'success',
  },
  invited: {
    label: 'Pending',
    variant: 'warning',
  },
  suspended: {
    label: 'Suspended',
    variant: 'danger',
  },
  declined: {
    label: 'Declined',
    variant: 'purple',
  },
  expired: {
    label: 'Invitation Expired',
    variant: 'danger',
  },
};

// ─── Platform user (matches UserResponseDto from the CRM backend) ─────────────
export interface PlatformUser {
  id: string;
  selamnewId: string | null;
  avatarUrl: string | null;
  name: string | null;
  firstName: string | null;
  middleName?: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: BackendUserStatus;
  roles: { id: string; name: string }[];
  team: {
    id: string;
    name: string;
    departmentId?: string | null;
    departmentName?: string | null;
    targetParentLevel?: 'company' | 'department';
  } | null;
  teamId: string | null;
  lastActive: string | null;
  createdAt: string;
}

// ─── Paginated response ───────────────────────────────────────────────────────
export interface PlatformUsersResponse {
  data: PlatformUser[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── Aggregate stats ─────────────────────────────────────────────────────────
export interface UserStats {
  total: number;
  active: number;
  invited: number;
  suspended: number;
}

// ─── Query filters (mirrors QueryUsersDto on the backend) ────────────────────
export interface UserFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BackendUserStatus;
  roleId?: string;
  teamId?: string;
}

// ─── PATCH payload (mirrors UpdateUserDto on the backend) ────────────────────
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: BackendUserStatus;
  roleIds?: string[];
  teamId?: string | null;
}

// ─── Lightweight option shapes for selectors ─────────────────────────────────
export interface RoleOption {
  id: string;
  name: string;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface RolePermission {
  id: string;
  slug: string;
  name: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export interface RoleDetail extends RoleSummary {
  permissions: RolePermission[];
  userCount: number;
}

export interface PaginatedRolesResponse {
  data: RoleSummary[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissionSlugs?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionSlugs?: string[];
}

// ─── External user (from GET /invitations/external-users proxy to org service)
export interface ExternalUser {
  id: string;
  selamnewId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}
