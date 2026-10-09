import { create } from 'zustand';

interface DealSettingsTargetState {
  openTargetSidebar: boolean;
  setOpenTargetSidebar: (openTargetSidebar: boolean) => void;
}

const dealSettingsTargetStore = create<DealSettingsTargetState>((set) => ({
  openTargetSidebar: false,
  setOpenTargetSidebar: (openTargetSidebar: boolean) => {
    set({ openTargetSidebar });
  },
}));

export default dealSettingsTargetStore;
