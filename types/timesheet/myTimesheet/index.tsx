import { LeaveRequest, LeaveType } from '@/types/timesheet/settings';
import { DateInfo } from '@/types/commons/dateInfo';

export interface LeaveBalance extends DateInfo {
  id: string;
  userId: string;
  tenantId: string;
  leaveType: LeaveType;
  leaveTypeIdL: string;
  totalBalance: number;
  balance: number;
  accrued: number;
  carriedOver: number;
  utilizedLeave: number;
  activatedAt: string;
  accrualPeriodStartAt: string;
  accrualPeriodEndAt: string;
  isClosed: boolean;
}

export interface LeaveBalanceHistory extends DateInfo {
  id: string;
  tenantId: string;
  userId: string;
  leaveRequest: LeaveRequest;
  leaveRequestId: string;
  leaveBalance: LeaveBalance;
  leaveBalanceId: string;
  type: 'approved_request' | 'canceled_request' | 'carry_over';
  amount: number;
}
