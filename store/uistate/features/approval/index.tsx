import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
interface SearchParams {
  name: string;
  entityType: string;
}
interface SelectProps {
  SelectedItemType: Record<string, any> | null;
  id: string;
  name: string;
  description: string;
  entityType: string;
  entityId: string;
  approvers: Record<string, string>[];
}

interface SectionProps {
  SectionItemType: Array<Record<string, any>>;
}

interface UserState {
  level: number;
  setLevel: (level: number) => void;

  userCurrentPage: number;
  setUserCurrentPage: (userCurrentPage: number) => void;

  pageSize: number;
  setPageSize: (pageSize: number) => void;

  approverType: string | null;
  setApproverType: (approverType: string | null) => void;

  userId: string | null;
  setUserId: (userId: string | null) => void;

  workFlow: string | null;
  setWorkFlow: (workFlow: string | null) => void;

  entryWorkFlow: string | null;
  setEntryWorkFlow: (entryWorkFlow: string | null) => void;

  workflowApplies: string | null;
  setWorkflowApplies: (workflowApplies: string | null) => void;

  workflowUserId: string | null;
  setWorkflowUserId: (workflowUserId: string | null) => void;

  searchParams: SearchParams;
  setSearchParams: (key: keyof SearchParams, value: string) => void;

  selectedItem: SelectProps;
  setSelectedItem: (selectedItem: SelectProps) => void;

  selections: SectionProps;
  setSelections: (selections: SectionProps) => void;

  rejectComment: string;
  setRejectComment: (rejectComment: string) => void;

  editModal: boolean;
  setEditModal: (editModal: boolean) => void;

  addModal: boolean;
  setAddModal: (addModal: boolean) => void;

  deletedItem: string;
  setDeletedItem: (deletedItem: string) => void;

  deletedApprover: string;
  setDeletedApprover: (deletedApprover: string) => void;

  deleteModal: boolean;
  setDeleteModal: (deleteModal: boolean) => void;

  transferModal: boolean;
  setTransferModal: (transferModal: boolean) => void;

  departmentApproval: boolean;
  setDepartmentApproval: (departmentApproval: boolean) => void;

  addDepartmentApproval: boolean;
  setAddDepartmentApproval: (addDepartmentApproval: boolean) => void;
}

export const useApprovalStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        level: 1,
        setLevel: (level: number) => {
          set({ level });
          set({
            selections: {
              SectionItemType: Array(level).fill({ user: null }),
            },
          });
        },

        transferModal: false,
        setTransferModal: (transferModal: boolean) => set({ transferModal }),

        userCurrentPage: 1,
        setUserCurrentPage: (userCurrentPage: number) =>
          set({ userCurrentPage }),
        pageSize: 10,
        setPageSize: (pageSize: number) => set({ pageSize }),

        approverType: null,
        setApproverType: (approverType: string | null) => set({ approverType }),

        userId: null,
        setUserId: (userId: string | null) => set({ userId }),

        workFlow: null,
        setWorkFlow: (workFlow: string | null) => set({ workFlow }),

        entryWorkFlow: null,
        setEntryWorkFlow: (entryWorkFlow: string | null) =>
          set({ entryWorkFlow }),

        workflowApplies: null,
        setWorkflowApplies: (workflowApplies: string | null) =>
          set({ workflowApplies }),

        workflowUserId: null,
        setWorkflowUserId: (workflowUserId: string | null) =>
          set({ workflowUserId }),

        searchParams: {
          name: '',
          entityType: '',
        },
        setSearchParams: (key, value) =>
          set((state) => ({
            searchParams: { ...state.searchParams, [key]: value },
          })),

        selectedItem: {
          SelectedItemType: null,
          id: '',
          name: '',
          description: '',
          entityType: '',
          entityId: '',
          approvers: [],
        },
        setSelectedItem: (selectedItem: SelectProps) => set({ selectedItem }),

        selections: { SectionItemType: Array(1).fill({ user: null }) },
        setSelections: (selections: SectionProps) => set({ selections }),

        rejectComment: '',
        setRejectComment: (value: string) => set({ rejectComment: value }),

        editModal: false,
        setEditModal: (editModal: boolean) => set({ editModal }),

        addModal: false,
        setAddModal: (addModal: boolean) => set({ addModal }),

        deletedItem: '',
        setDeletedItem: (deletedItem: string) => set({ deletedItem }),

        deletedApprover: '',
        setDeletedApprover: (deletedApprover: string) =>
          set({ deletedApprover }),

        deleteModal: false,
        setDeleteModal: (deleteModal: boolean) => set({ deleteModal }),

        departmentApproval: false,
        setDepartmentApproval: (departmentApproval: boolean) =>
          set({ departmentApproval }),

        addDepartmentApproval: false,
        setAddDepartmentApproval: (addDepartmentApproval: boolean) =>
          set({ addDepartmentApproval }),
      }),
      {
        name: 'approval-storage',
        partialize: (state) => ({ approverType: state.approverType }),
      },
    ),
  ),
);
