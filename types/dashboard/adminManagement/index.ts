export interface Permission {
  id: string;
  name: string;
  slug: string;
}
export interface RolePermission {
  id: string;
  permission: Permission;
}
export interface PermissionSelect {
  id: string;
  name: string;
  value: string;
}
export interface GroupPermissionkey {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  permission?: Permission[];
  permissionIds?: string[];
  items: any[];
  tenantId?: string;
}
export interface RolePermissionkey {
  id: string;
  name: string;
  description: string;
  permissions?: Permission[];
  rolePermissions?: Permission;
}
export interface Deleteditem {
  key?: string;
  id?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  tenantId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Future permission fields (not implemented in backend yet)
  permission?: string[];
  permissionsId?: string[];
  GroupPermissionkey?: string[];
}
export interface User {
  id?: string;
  name: string;
  email: string;
  p_no: string[];
  user_type: string[];
}
export interface PermissionDataType {
  id: string;
  name: string;
}
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export type ModalType =
  | 'editModal'
  | 'deleteModal'
  | 'createModal'
  | 'roleModal'
  | 'editRoleModal'
  | null;

export interface CreateRoleKey {
  values: Role;
  setCurrentModal: (val: ModalType) => void;
  setIsLoading?: (val: boolean) => void;
  roleCurrentPage?: number;
  pageSize?: number;
}

export interface CreateUserKey {
  values: User;
  setOpen: (val: boolean) => void;
  userCurrentPage?: number;
  pageSize?: number;
  setIsLoading?: (val: boolean) => void;
}
export interface DeletedId {
  key: string;
  id: string;
}
export interface DeleteGroupPermissionProps {
  roleCurrentPage?: number;
  permissonGroupCurrentPage?: number;
  permissonCurrentPage?: number;
  pageSize: number;
  deletedId: DeletedId | null;
  setCurrentModal: (val: ModalType) => void;
  setDeletedId: (val: { key: string; id: string } | null) => void;
  setIsLoading?: (loading: boolean) => void;
  isLoading?: boolean;
}

export interface DeletedUserProps {
  userCurrentPage?: number;
  pageSize: number;
  deletedItem: string | null;
  setDeleteModal: (val: boolean) => void;
  setDeletedItem: (val: string | null) => void;
  setIsLoading?: (val: boolean) => void;
}

export interface CreateTenantProps {
  onClose: () => void;
  open: boolean;
  userCurrentPage?: number;
  pageSize?: number;
  setOpen: (val: boolean) => void;
  submitAction?: (values: any) => void;
  setModalType: (val: any) => void;
  modalType?: string | null;
  setSelectedItem: (val: { key?: string; id?: string } | null) => void;
  selectedItem?: { key?: string; id?: string } | null;
  onEditAction?: (values: any) => void;
}

export interface UserData {
  user: string;
  p_no: string;
  user_type: string;
  account_status: string;
  action: string;
}
export interface EmployeeData {
  key?: string;
  id: string;
  employee_name: string;
  employee_attendance_id: number;
  job_title: string;
  department: string;
  office: string;
  employee_status: string;
  account: string;
  role: string;
  action: string;
  avatar: string;
  deletedAt: string;
}
export interface TableEmployeeData {
  key: string;
  employee_name: React.ReactNode;
  job_title: string;
  department: string;
  office: string;
  employee_status: React.ReactNode;
  account: React.ReactNode;
  role: string;
  action: React.ReactNode;
}

export interface GroupPermissionPropsUpdated {
  groupPermissionData: any;
}

export type RolePermissionCardProps = {
  item: RolePermissionkey;
  handleButtonClick: (id: string) => void;
  visibleEditCardId: string | null;
};
