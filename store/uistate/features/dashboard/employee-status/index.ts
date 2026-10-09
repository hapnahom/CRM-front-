import { create } from 'zustand';
import { EmployeeStatusDashboardState } from './interface';

export const useEmployeeStatusDashboardStateStore =
  create<EmployeeStatusDashboardState>((set) => ({
    typeId: '',
    setTypeId: (value: string) => set({ typeId: value }),
  }));
