import { DateInfo } from '@/types/commons/dateInfo';
import { AccrualRule, CarryOverRule } from '@/types/timesheet/settings';
export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
}
export interface LeaveType extends DateInfo {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  isPaid: boolean;
  accrualRule: AccrualRule | string;
  carryOverRule: CarryOverRule | string;
  maximumAllowedConsecutiveDays: number;
  minimumNotifyingDays: number;
  entitledDaysPerYear: number;
  isDeductible: boolean;
  isActive: boolean;
}

export interface BranchRequest extends DateInfo {
  id: string;
  approvalType: string;
  approvalWorkflowId: string;
  currentBranchId: string;
  requestBranchId: string;
  status: RequestStatus;
  tenantId: string;
  userId: string;
}
