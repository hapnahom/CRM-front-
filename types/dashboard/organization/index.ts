export interface BranchType {
  id: string;
  name: string;
  location?: string;
}

export interface DepartmentType {
  id?: string;
  name: string;
  branchId: string;
  description?: string;
}

export interface DepartmentFormProps {
  onClose: () => void;
  open: boolean;
  submitAction: (values: any) => void;
  departmentData?: Department | null | undefined;
  title: string;
}

export interface OrgData {
  name: string;
  description: string;
  branchId?: string | null;
  department: Department[];
  [key: string]: any;
}

export interface Department {
  id: string;
  branchId?: string | null;
  name: string;
  description: string;
  department: Department[];
  collapsed?: boolean;
}

export interface OrganizationState {
  orgData: OrgData;
  isFormVisible: boolean;
  isDeleteConfirmVisible: boolean;
  selectedDepartment: Department | null;
  parentId: string | null;
  departmentTobeDeletedId: string;
  departmentTobeShiftedId: string;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  setOrgData: (orgData: OrgData) => void;
  setBranchId: (branchId: string) => void;
  addDepartment: (parentId: string, department: Omit<Department, 'id'>) => void;
  updateDepartment: (updatedDepartment: Department) => void;
  deleteDepartment: (departmentId: string) => void;
  setIsFormVisible: (isFormVisible: boolean) => void;
  setSelectedDepartment: (department: Department | null) => void;
  setParentId: (parentId: string | null) => void;
  setIsDeleteConfirmVisible: (isDeleteConfirmVisible: boolean) => void;
  chartDownlaodLoading: boolean;
  setChartDonwnloadLoading: (chartDownlaodLoading: boolean) => void;
  drawerVisible: boolean;
  setDrawerVisible: (visible: boolean) => void;
  drawerContent: string;
  setDrawerContent: (content: string) => void;
  footerButtonText: string;
  setFooterButtonText: (text: string) => void;
  drawTitle: string;
  setDrawTitle: (title: string) => void;
  setDepartmentTobeDeletedId: (departmentTobeDeletedId: string) => void;
  setShiftDepartmentId: (departmentTobeShiftedId: string) => void;
}
