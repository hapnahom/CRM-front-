import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  type: string | null;
  setType: (type: string | null) => void;
  displayData: any[];
  setDisplayData: (displayData: any[]) => void;
}
export const useDashboardVPStore = create<UserState>()(
  devtools((set) => ({
    type: 'Quarterly',
    setType: (type: string | null) => set({ type: type }),
    displayData: [],
    setDisplayData: (displayData: any[]) => set({ displayData: displayData }),
  })),
);
