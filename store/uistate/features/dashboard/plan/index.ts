import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  planType: string | null;
  setPlanType: (planType: string | null) => void;
}
export const useDashboardPlanStore = create<UserState>()(
  devtools((set) => ({
    planType: 'Daily',
    setPlanType: (planType: string | null) => set({ planType: planType }),
  })),
);
