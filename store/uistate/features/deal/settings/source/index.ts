import { create } from 'zustand';

interface DealSettingsSourceState {
  // Sidebar state
  openSourceSidebar: boolean;
  setOpenSourceSidebar: (openSourceSidebar: boolean) => void;

  // Edit modal state
  editModalOpen: boolean;
  setEditModalOpen: (open: boolean) => void;

  // Current source being edited
  currentSource: any;
  setCurrentSource: (source: any) => void;

  // Delete confirmation modal state
  confirmDeleteModal: boolean;
  setConfirmDeleteModal: (open: boolean) => void;

  // Source to delete
  sourceToDelete: string | null;
  setSourceToDelete: (id: string | null) => void;
}

const dealSettingsSourceStore = create<DealSettingsSourceState>((set) => ({
  // Sidebar state
  openSourceSidebar: false,
  setOpenSourceSidebar: (openSourceSidebar: boolean) => {
    set({ openSourceSidebar });
  },

  // Edit modal state
  editModalOpen: false,
  setEditModalOpen: (open: boolean) => set({ editModalOpen: open }),

  // Current source being edited
  currentSource: null,
  setCurrentSource: (source: any) => set({ currentSource: source }),

  // Delete confirmation modal state
  confirmDeleteModal: false,
  setConfirmDeleteModal: (open: boolean) => set({ confirmDeleteModal: open }),

  // Source to delete
  sourceToDelete: null,
  setSourceToDelete: (id: string | null) => set({ sourceToDelete: id }),
}));

export default dealSettingsSourceStore;
