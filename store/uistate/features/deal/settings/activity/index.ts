import { ActivityIcon, getDefaultIcon } from '@/utils/activityIcons';
import { create } from 'zustand';
// import { ActivityIcon, getDefaultIcon } from '@/utils/activityIcons';

interface DealSettingsActivityState {
  // Sidebar state
  openActivitySidebar: boolean;
  setOpenActivitySidebar: (openActivitySidebar: boolean) => void;

  // Edit modal state
  editModalOpen: boolean;
  setEditModalOpen: (open: boolean) => void;

  // Current activity being edited
  currentActivity: any;
  setCurrentActivity: (activity: any) => void;

  // Delete confirmation modal state
  confirmDeleteModal: boolean;
  setConfirmDeleteModal: (open: boolean) => void;

  // Activity to delete
  activityToDelete: string | null;
  setActivityToDelete: (id: string | null) => void;

  // Selected icon for activity
  selectedIcon: ActivityIcon;
  setSelectedIcon: (icon: ActivityIcon) => void;

  // Icon dropdown state
  iconDropdownOpen: boolean;
  setIconDropdownOpen: (open: boolean) => void;
}

const dealSettingsActivityStore = create<DealSettingsActivityState>((set) => ({
  // Sidebar state
  openActivitySidebar: false,
  setOpenActivitySidebar: (openActivitySidebar: boolean) => {
    set({ openActivitySidebar });
  },

  // Edit modal state
  editModalOpen: false,
  setEditModalOpen: (open: boolean) => set({ editModalOpen: open }),

  // Current activity being edited
  currentActivity: null,
  setCurrentActivity: (activity: any) => set({ currentActivity: activity }),

  // Delete confirmation modal state
  confirmDeleteModal: false,
  setConfirmDeleteModal: (open: boolean) => set({ confirmDeleteModal: open }),

  // Activity to delete
  activityToDelete: null,
  setActivityToDelete: (id: string | null) => set({ activityToDelete: id }),

  // Selected icon for activity
  selectedIcon: getDefaultIcon(),
  setSelectedIcon: (icon: ActivityIcon) => set({ selectedIcon: icon }),

  // Icon dropdown state
  iconDropdownOpen: false,
  setIconDropdownOpen: (open: boolean) => set({ iconDropdownOpen: open }),
}));

export default dealSettingsActivityStore;
