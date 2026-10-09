export interface JobSummaryDashboard {
  id?: string;
  status: string;
  count: number;
}
export interface JobSummaryDashboardState {
  status: string;
  setStatus: (status: string) => void;
}
