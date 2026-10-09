import { create } from 'zustand';
import { JobSummaryDashboardState } from './interface';

export const useJobSummaryDashboardStateStore =
  create<JobSummaryDashboardState>((set) => ({
    status: '',
    setStatus: (value: string) => set({ status: value }),
  }));
