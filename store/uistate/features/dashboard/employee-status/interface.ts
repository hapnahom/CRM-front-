export interface EmployeeStatusDashboard {
  id?: string;
  name: string;
  count: number;
}
export interface EmployeeStatusDashboardState {
  typeId: string;
  setTypeId: (typeId: string) => void;
}
