import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}
export const useDashboardStore = create<UserState>()(
  devtools((set) => ({
    isOpen: false,
    setIsOpen: (isOpen: boolean) => set({ isOpen: isOpen }),
  })),
);
