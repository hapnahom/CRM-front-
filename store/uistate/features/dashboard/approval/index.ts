import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  approverType: string | null;
  setApproverType: (approverType: string | null) => void;
}
export const useDashboardApprovalStore = create<UserState>()(
  devtools((set) => ({
    approverType: 'Leave',
    setApproverType: (approverType: string | null) =>
      set({ approverType: approverType }),
  })),
);
