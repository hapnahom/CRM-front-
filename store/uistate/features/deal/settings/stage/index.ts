import { tokens } from '@/lib/design-tokens';
import { create } from 'zustand';

interface DealSettingsStageState {
  // Sidebar state
  openStageSidebar: boolean;
  setOpenStageSidebar: (openStageSidebar: boolean) => void;

  // Edit modal state
  editModalOpen: boolean;
  setEditModalOpen: (open: boolean) => void;

  // Current stage being edited
  currentStage: any;
  setCurrentStage: (stage: any) => void;

  // Delete confirmation modal state
  confirmDeleteModal: boolean;
  setConfirmDeleteModal: (open: boolean) => void;

  // Stage to delete
  stageToDelete: string | null;
  setStageToDelete: (id: string | null) => void;

  // Selected color for stage
  selectedColor: string;
  setSelectedColor: (color: string) => void;
}

const dealSettingsStageStore = create<DealSettingsStageState>((set) => ({
  // Sidebar state
  openStageSidebar: false,
  setOpenStageSidebar: (openStageSidebar: boolean) => {
    set({ openStageSidebar });
  },

  // Edit modal state
  editModalOpen: false,
  setEditModalOpen: (open: boolean) => set({ editModalOpen: open }),

  // Current stage being edited
  currentStage: null,
  setCurrentStage: (stage: any) => set({ currentStage: stage }),

  // Delete confirmation modal state
  confirmDeleteModal: false,
  setConfirmDeleteModal: (open: boolean) => set({ confirmDeleteModal: open }),

  // Stage to delete
  stageToDelete: null,
  setStageToDelete: (id: string | null) => set({ stageToDelete: id }),

  // Selected color for stage
  selectedColor: tokens.color.blue,
  setSelectedColor: (color: string) => set({ selectedColor: color }),
}));

export default dealSettingsStageStore;
