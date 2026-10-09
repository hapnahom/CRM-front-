// Generic interface for all lead settings items
export interface LeadItem {
  id: string;
  name: string;
  description?: string;
  // Activity-specific properties
  activityIcon?: string;
  icon?: string;
  isLead?: boolean;
  isDeal?: boolean;
  // Status-specific properties
  color?: string;
  colorCode?: string;
  level?: number;
  // Source-specific properties (inherits from base)
  // Type-specific properties (inherits from base)
}

// Union type for all possible setting types
export type SettingType = 'status' | 'activity';

// Main store interface
export interface LeadSettingsState {
  // Common UI States
  isDrawerVisible: boolean;
  deleteModalVisible: boolean;
  isSubmitting: boolean;

  // Item-specific states
  editingItem: LeadItem | null;
  itemToDelete: LeadItem | null;

  // Picker states (for components that need them)
  iconPickerOpen: boolean;
  colorPickerOpen: boolean;

  // Active tab state (for main settings component)
  activeTab: SettingType;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  setEditingItem: (item: LeadItem | null) => void;
  openDeleteModal: (item: LeadItem) => void;
  closeDeleteModal: () => void;
  setSubmitting: (loading: boolean) => void;
  toggleIconPicker: () => void;
  closeIconPicker: () => void;
  toggleColorPicker: () => void;
  closeColorPicker: () => void;
  setActiveTab: (tab: SettingType) => void;
  resetAllStates: () => void;
}
