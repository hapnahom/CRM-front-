import { create } from 'zustand';

interface DealSettingsTypeState {
  openTypeSidebar: boolean;
  setOpenTypeSidebar: (openTypeSidebar: boolean) => void;
}

const dealSettingsTypeStore = create<DealSettingsTypeState>((set) => ({
  openTypeSidebar: false,
  setOpenTypeSidebar: (openTypeSidebar: boolean) => {
    set({ openTypeSidebar });
  },
}));

export default dealSettingsTypeStore;
