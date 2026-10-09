// useStore.ts
import { MetaData } from '@/types/dashboard/tenant/clientAdministration';
import { Dayjs } from 'dayjs';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
export interface CustomFieldsProps {
  customFormData: FormData;
  setCustomFormData: (customFormData: FormData) => void;
}

export interface FormField {
  fieldName: string;
  fieldType: 'input' | 'datePicker' | 'select' | 'toggle' | 'checkbox';
  isActive: boolean;
  id: string;
  options?: string[]; // Optional field for 'select' and 'checkbox' types
}

export interface Form {
  formTitle: string;
  form: FormField[];
}

export interface FormData {
  tenantId: string;
  forms: Form[];
}
export interface WorkScheduleDetail {
  id: string;
  dayOfWeek: string;
  startTime: string;
  breakStartTime: string;
  breakEndTime: string;
  endTime: string;
  hours: number;
  status: boolean;
  duration: number;
  workDay: boolean;
  day: string;
}

export interface WorkSchedule {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  detail: WorkScheduleDetail[];
  standardHours: number;
  tenantId: string;
}
export type EditState = {
  addresses: boolean;
  workSchedule: boolean;
  general: boolean;
  emergencyContact: boolean;
  bankInformation: boolean;
  rolePermission: boolean;
  additionalInformation: boolean;
};
export interface WorkScheduleData {
  items: WorkSchedule[];
  meta: MetaData;
}

interface SearchParams {
  employee_name: string;
  allOffices: string;
  allStatus: string | null;
  gender: string;
  joinedDate: string;
  joinedDateType: 'before' | 'after';
}
interface UserState {
  isBasicSalaryModalVisible: boolean;
  setIsBasicSalaryModalVisible: (isBasicSalaryModalVisible: boolean) => void;

  basicSalaryData: any | null;
  setBasicSalaryData: (basicSalaryData: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  userCurrentPage: number;
  setUserCurrentPage: (userCurrentPage: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  totalCount: number;
  setTotalCount: (pageSize: number) => void;
  modalType: string | null;
  setModalType: (modalType: string | null) => void;
  searchTerm: string | null;
  setSearchTerm: (searchTerm: string | null) => void;
  termKey: string | null;
  setTermKey: (termKey: string | null) => void;
  selectedItem: { key: string | null; id: string | null };
  setSelectedItem: (selectedItem: any) => void;
  deletedItem: string | null;
  setDeletedItem: (deletedItem: string | null) => void;
  setDeleteModal: (deleteModal: boolean) => void;
  deleteModal: boolean;
  prefix: string;
  setPrefix: (prefix: string) => void;
  current: number;
  setCurrent: (current: number) => void;
  // customFormData: FormData | null;
  customFormData: any;
  setCustomFormData: (customFormData: FormData) => void;

  workSchedule: string | null;
  setWorkSchedule: (WorkSchedule: string | null) => void;

  selectedWorkSchedule: WorkSchedule | null;
  setSelectedWorkSchedule: (selectedWorkSchedule: WorkSchedule | null) => void;

  profileFileList: any;
  setProfileFileList: (profileFileList: any) => void;

  bankInfoForm: any;
  setBankInfoForm: (bankInfoForm: any) => void;

  emergencyContact: any;
  setEmergencyContact: (emergencyContact: any) => void;

  addressForm: any;
  setAddressForm: (address: any) => void;

  additionalInformation: any;
  setAdditionalInformation: (additionalInformation: any) => void;

  selectedPermissions: string[] | [];
  setSelectedPermissions: (selectedPermissions: string[] | []) => void;
  setSelectedUniquePermissions: (newPermissions: string[] | []) => void;

  selectedGroupPermissions: string[] | [];
  setSelectedGroupPermissions: (
    selectedGroupPermissions: string[] | [],
  ) => void;
  setSelectedUniqueGroupPermissions: (
    selectedGroupPermissions: string[] | [],
  ) => void;

  selectedBasicPermissions: string[] | [];
  setSelectedBasicPermissions: (
    selectedBasicPermissions: string[] | [],
  ) => void;
  setSelectedUniqueBasicPermissions: (
    selectedBasicPermissions: string[] | [],
  ) => void;

  selectedBasicGroupPermissions: string[] | [];
  setSelectedBasicGroupPermissions: (
    selectedBasicGroupPermissions: string[] | [],
  ) => void;
  setSelectedUniqueBasicGroupPermissions: (
    selectedBasicGroupPermissions: string[] | [],
  ) => void;

  documentFileList: any[];
  setDocumentFileList: (fileList: any[]) => void;
  removeDocument: (uid: string) => void;

  birthDate: Dayjs | null;
  setBirthDate: (birthDate: Dayjs | null) => void;

  edit: EditState;
  setEdit: (key: keyof EditState) => void;
  selectionType: 'checkbox' | 'radio';
  setSelectionType: (selectionType: 'checkbox' | 'radio') => void;

  searchValue: string | null;
  setSearchValue: (searchValue: string | null) => void;

  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  searchParams: SearchParams;
  setSearchParams: (key: keyof SearchParams, value: string | boolean) => void;
  reHireModal: boolean;
  setReHireModalVisible: (reHireModal: boolean) => void;
  userToRehire: any;
  setUserToRehire: (userToRehire: any) => void;

  isAddEmployeeJobInfoModalVisible: boolean;
  setIsAddEmployeeJobInfoModalVisible: (
    isAddEmployeeJobInfoModalVisible: boolean,
  ) => void;
  employeeJobInfoModalWidth: string | null;
  setEmployeeJobInfoModalWidth: (
    employeeJobInfoModalWidth: string | null,
  ) => void;

  isNavBarJobInfoModalVisible: boolean;
  setIsNavBarJobInfoModalVisible: (
    isNavBarJobInfoModalVisible: boolean,
  ) => void;
  navBarJobInfoModalWidth: string | null;
  setNavBarJobInfoModalWidth: (navBarJobInfoModalWidth: string | null) => void;

  isMobileFilterVisible: boolean;
  setIsMobileFilterVisible: (isMobileFilterVisible: boolean) => void;

  setJoinedDateType: (type: 'before' | 'after') => void;
}

export const useEmployeeManagementStore = create<UserState>()(
  devtools((set) => ({
    isModalOpen: false,
    setIsModalOpen: (isModalOpen: boolean) => set({ isModalOpen }),
    isAddEmployeeJobInfoModalVisible: false,
    setIsAddEmployeeJobInfoModalVisible: (
      isAddEmployeeJobInfoModalVisible: boolean,
    ) => set({ isAddEmployeeJobInfoModalVisible }),
    isBasicSalaryModalVisible: false,
    setIsBasicSalaryModalVisible: (isBasicSalaryModalVisible: boolean) =>
      set({ isBasicSalaryModalVisible }),
    setBasicSalaryData: (basicSalaryData: any) => set({ basicSalaryData }),
    basicSalaryData: null,
    birthDate: null,
    setBirthDate: (birthDate: Dayjs | null) => set({ birthDate }),
    searchValue: null,
    setSearchValue: (searchValue: string | null) => set({ searchValue }),

    open: false,
    deleteModal: false,
    current: 0,
    edit: {
      addresses: false,
      workSchedule: false,
      general: false,
      emergencyContact: false,
      bankInformation: false,
      rolePermission: false,
      additionalInformation: false,
    },
    setEdit: (key: keyof EditState) =>
      set((state) => ({
        edit: {
          ...state.edit,
          [key]: !state.edit[key],
        },
      })),

    customFormData: null,
    reHireModal: false,
    setReHireModalVisible: (reHireModal: boolean) => set({ reHireModal }),
    setCustomFormData: (customFormData: FormData) => set({ customFormData }),

    selectedWorkSchedule: null,
    setSelectedWorkSchedule: (selectedWorkSchedule: WorkSchedule | null) =>
      set({ selectedWorkSchedule }),

    workSchedule: null,
    setWorkSchedule: (workSchedule: string | null) => set({ workSchedule }),

    prefix: '251',
    setPrefix: (prefix: string) => set({ prefix }),
    deletedItem: null,
    setOpen: (open: boolean) => set({ open }),
    setDeletedItem: (deletedItem: string | null) => set({ deletedItem }),
    userCurrentPage: 1,
    setDeleteModal: (deleteModal: boolean) => set({ deleteModal }),
    setUserCurrentPage: (userCurrentPage: number) => set({ userCurrentPage }),
    pageSize: 10,
    totalCount: 0,
    setTotalCount: (totalCount: number) => set({ totalCount }),
    selectedItem: { key: null, id: null },
    setSelectedItem: (selectedItem: any) => set({ selectedItem }),
    setPageSize: (pageSize: number) => set({ pageSize }),
    modalType: null,
    setModalType: (modalType: string | null) => set({ modalType }),
    searchTerm: null,
    setSearchTerm: (searchTerm: string | null) => set({ searchTerm }),
    termKey: null,
    setTermKey: (termKey: string | null) => set({ termKey }),
    setCurrent: (current: number) => set({ current }),
    userToRehire: {},
    setUserToRehire: (userToRehire: any) => set({ userToRehire }),

    profileFileList: [],
    setProfileFileList: (profileFileList: any) => set({ profileFileList }),

    bankInfoForm: {},
    setBankInfoForm: (bankInfoForm: any) => ({ bankInfoForm }),

    emergencyContact: {},
    setEmergencyContact: (emergencyContact: any) => ({ emergencyContact }),

    addressForm: {},
    setAddressForm: (addressForm: any) => set({ addressForm }),

    additionalInformation: {},
    setAdditionalInformation: (additionalInformation: any) => ({
      additionalInformation,
    }),

    selectedPermissions: [],
    setSelectedPermissions: (selectedPermissions: string[] | []) =>
      set({ selectedPermissions }),
    setSelectedUniquePermissions: (newPermissions: string[] | []) =>
      set((state) => ({
        selectedPermissions: Array.from(
          new Set([...state.selectedPermissions, ...newPermissions]),
        ),
      })),

    selectedGroupPermissions: [],
    setSelectedGroupPermissions: (selectedGroupPermissions: string[] | []) =>
      set({ selectedGroupPermissions }),

    setSelectedUniqueGroupPermissions: (newGroupPermissions: string[] | []) =>
      set((state) => ({
        selectedGroupPermissions: Array.from(
          new Set([...state.selectedGroupPermissions, ...newGroupPermissions]),
        ),
      })),

    selectedBasicPermissions: [],
    setSelectedBasicPermissions: (selectedBasicPermissions: string[] | []) =>
      set({ selectedBasicPermissions }),
    setSelectedUniqueBasicPermissions: (newPermissions: string[] | []) =>
      set((state) => ({
        selectedBasicPermissions: Array.from(
          new Set([...state.selectedBasicPermissions, ...newPermissions]),
        ),
      })),

    selectedBasicGroupPermissions: [],
    setSelectedBasicGroupPermissions: (
      selectedBasicGroupPermissions: string[] | [],
    ) => set({ selectedBasicGroupPermissions }),
    setSelectedUniqueBasicGroupPermissions: (
      newGroupPermissions: string[] | [],
    ) =>
      set((state) => ({
        selectedBasicPermissions: Array.from(
          new Set([...state.selectedBasicPermissions, ...newGroupPermissions]),
        ),
      })),

    documentFileList: [],
    setDocumentFileList: (fileList) => set({ documentFileList: fileList }),
    removeDocument: (uid) =>
      set((state) => ({
        documentFileList: state.documentFileList.filter(
          (file) => file.uid !== uid,
        ),
      })),
    selectionType: 'checkbox',
    setSelectionType: (selectionType) => set({ selectionType }),
    searchParams: {
      employee_name: '',
      allOffices: '',
      allStatus: '',
      gender: '',
      joinedDate: '',
      joinedDateType: 'after',
    },
    setSearchParams: (key, value) =>
      set((state) => ({
        searchParams: { ...state.searchParams, [key]: value },
      })),
    employeeJobInfoModalWidth: null,
    setEmployeeJobInfoModalWidth: (employeeJobInfoModalWidth: string | null) =>
      set({ employeeJobInfoModalWidth }),
    isNavBarJobInfoModalVisible: false,
    setIsNavBarJobInfoModalVisible: (isNavBarJobInfoModalVisible: boolean) =>
      set({ isNavBarJobInfoModalVisible }),
    navBarJobInfoModalWidth: null,
    setNavBarJobInfoModalWidth: (navBarJobInfoModalWidth: string | null) =>
      set({ navBarJobInfoModalWidth }),
    isMobileFilterVisible: false,
    setIsMobileFilterVisible: (isMobileFilterVisible: boolean) =>
      set({ isMobileFilterVisible }),
    setJoinedDateType: (type: 'before' | 'after') =>
      set((state) => ({
        searchParams: { ...state.searchParams, joinedDateType: type },
      })),
  })),
);
