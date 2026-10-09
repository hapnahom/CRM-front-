import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LeadSettingsState, LeadItem, SettingType } from './interface';

export const useLeadSettingsStore = create<LeadSettingsState>()(
  devtools(
    (set) => ({
      // Initial state
      isDrawerVisible: false,
      deleteModalVisible: false,
      isSubmitting: false,
      editingItem: null,
      itemToDelete: null,
      iconPickerOpen: false,
      colorPickerOpen: false,
      activeTab: 'status',

      // Actions
      openDrawer: () => set({ isDrawerVisible: true }),

      closeDrawer: () =>
        set({
          isDrawerVisible: false,
          editingItem: null,
          isSubmitting: false,
          iconPickerOpen: false,
          colorPickerOpen: false,
        }),

      setEditingItem: (item: LeadItem | null) => set({ editingItem: item }),

      openDeleteModal: (item: LeadItem) =>
        set({
          deleteModalVisible: true,
          itemToDelete: item,
        }),

      closeDeleteModal: () =>
        set({
          deleteModalVisible: false,
          itemToDelete: null,
        }),

      setSubmitting: (loading: boolean) => set({ isSubmitting: loading }),

      toggleIconPicker: () =>
        set((state) => ({
          iconPickerOpen: !state.iconPickerOpen,
          colorPickerOpen: false, // Close color picker when opening icon picker
        })),

      closeIconPicker: () => set({ iconPickerOpen: false }),

      toggleColorPicker: () =>
        set((state) => ({
          colorPickerOpen: !state.colorPickerOpen,
          iconPickerOpen: false, // Close icon picker when opening color picker
        })),

      closeColorPicker: () => set({ colorPickerOpen: false }),

      setActiveTab: (tab: SettingType) => set({ activeTab: tab }),

      resetAllStates: () =>
        set({
          isDrawerVisible: false,
          deleteModalVisible: false,
          isSubmitting: false,
          editingItem: null,
          itemToDelete: null,
          iconPickerOpen: false,
          colorPickerOpen: false,
          activeTab: 'status',
        }),
    }),
    {
      name: 'lead-settings-store', // unique name for devtools
    },
  ),
);
