import { create } from 'zustand';

interface StoreState {
  isClient: boolean;
  setIsClient: (value: boolean) => void;
  currentWidth: string;
  setCurrentWidth: (value: string) => void;
  placement: any;
  setPlacement?: (value: any) => void;
}

const useDrawerStore = create<StoreState>((set) => ({
  isClient: false,
  setIsClient: (value) => set({ isClient: value }),
  currentWidth: '60%',
  setCurrentWidth: (value) => set({ currentWidth: value }),
  placement: 'right',
  setPlacement: (value) => set({ placement: value }),
}));

export default useDrawerStore;
