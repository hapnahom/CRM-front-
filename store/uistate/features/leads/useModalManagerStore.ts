import { create } from 'zustand';

interface ModalManagerState {
  // Modal states
  isFilterModalOpen: boolean;
  isCreateLeadDrawerOpen: boolean;

  // Actions for filter modal
  openFilterModal: () => void;
  closeFilterModal: () => void;

  // Actions for create lead drawer
  openCreateLeadDrawer: () => void;
  closeCreateLeadDrawer: () => void;

  // Force close all modals
  closeAllModals: () => void;
}

export const useModalManagerStore = create<ModalManagerState>((set, get) => ({
  // Initial state
  isFilterModalOpen: false,
  isCreateLeadDrawerOpen: false,

  // Filter modal actions with mutual exclusion
  openFilterModal: () => {
    const state = get();
    if (state.isCreateLeadDrawerOpen) {
      // Close create lead drawer first, then open filter modal
      set({ isCreateLeadDrawerOpen: false });
      setTimeout(() => {
        set({ isFilterModalOpen: true });
      }, 100);
    } else {
      set({ isFilterModalOpen: true });
    }
  },

  closeFilterModal: () => set({ isFilterModalOpen: false }),

  // Create lead drawer actions with mutual exclusion
  openCreateLeadDrawer: () => {
    const state = get();
    if (state.isFilterModalOpen) {
      // Close filter modal first, then open create lead drawer
      set({ isFilterModalOpen: false });
      setTimeout(() => {
        set({ isCreateLeadDrawerOpen: true });
      }, 100);
    } else {
      set({ isCreateLeadDrawerOpen: true });
    }
  },

  closeCreateLeadDrawer: () => set({ isCreateLeadDrawerOpen: false }),

  // Force close all modals
  closeAllModals: () =>
    set({
      isFilterModalOpen: false,
      isCreateLeadDrawerOpen: false,
    }),
}));
