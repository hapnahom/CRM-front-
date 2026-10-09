import { StatusBadgeTheme } from '@/components/common/statusBadge';
// import { EmployeeData } from '@/store/server/features/employees/employeeDetail/interface';
import { DateInfo } from '@/types/commons/dateInfo';

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
}

export const LeaveRequestStatusBadgeTheme: Record<
  LeaveRequestStatus,
  StatusBadgeTheme
> = {
  [LeaveRequestStatus.PENDING]: StatusBadgeTheme.secondary,
  [LeaveRequestStatus.APPROVED]: StatusBadgeTheme.success,
  [LeaveRequestStatus.DECLINED]: StatusBadgeTheme.danger,
};

export const LeaveRequestStatusOption: {
  label: string;
  value: LeaveRequestStatus;
}[] = [
  { label: 'Pending', value: LeaveRequestStatus.PENDING },
  { label: 'Approved', value: LeaveRequestStatus.APPROVED },
  { label: 'Declined', value: LeaveRequestStatus.DECLINED },
];

export enum CarryOverPeriod {
  MONTH = 'month',
  YEARS = 'years',
  DAYS = 'days',
}

export enum AccrualRulePeriod {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  YEAR = 'year',
  QUARTER = 'quarter',
}

type AllowedUserAccess = {
  allowedAreaId: string;
  userId: string;
};
export interface AllowedArea extends DateInfo {
  id: string;
  title: string;
  tenantId: string;
  distance: number;
  latitude: number;
  longitude: number;
  isGlobal: boolean;
  allowedUserAccesses?: AllowedUserAccess[];
}

export interface CarryOverRule extends DateInfo {
  id: string;
  title: string;
  tenantId: string;
  limit: number;
  expiration: number;
  expirationPeriod: CarryOverPeriod;
  isActive: boolean;
}

export interface LeaveRequest extends DateInfo {
  id: string;
  tenantId: string;
  userId: string;
  leaveType: LeaveType;
  startAt: string;
  endAt: string;
  isHalfday: boolean;
  justificationNote: string | null;
  justificationDocument: string | null;
  managedBy: string | null;
  status: LeaveRequestStatus;
  days: number;
  comment: string | null;
  approvalType: string | null;
  approvalWorkflowId: string | null;
  commentAttachments: string[];
  delegatee?: any | string;
}
export interface SingleLeaveRequest extends DateInfo {
  id: string;
  tenantId: string;
  user: string;
  userId?: string;
  leaveType: LeaveType;
  startAt: string;
  endAt: string;
  isHalfday: boolean;
  justificationNote: string | null;
  justificationDocument: string | null;
  managedBy: string | null;
  status: LeaveRequestStatus;
  days: number;
  comment: string | null;
  approvalType: string | null;
  approvalWorkflowId: string | null;
  commentAttachments: string[];
  delegatee?: any | string;
}
export interface ApprovalLog extends DateInfo {
  approvalLogId: string;
  comment: string;
  commentedBy: string;
  id: string;
  tenantId: string;
}
export interface SingleLogRequest extends DateInfo {
  action: string;
  approvalWorkflowId: string;
  approvalComments?: ApprovalLog[];
  approvedUserId: string;
  approverRoleId: string;
  id: string;
  requestId: string;
  stepOrder: number;
  tenantId: string;
}

export interface LeaveType extends DateInfo {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  isPaid: boolean;
  accrualRule: AccrualRule | string;
  carryOverRule: CarryOverRule | string;
  accrualRuleId?: string;
  carryOverRuleId?: string;
  maximumAllowedConsecutiveDays: number;
  minimumNotifyingDays: number;
  entitledDaysPerYear: number;
  isDeductible: boolean;
  isFixed: boolean;
  isIncremental: boolean;
  isActive: boolean;
  incrementalYear?: number;
  incrementAmount?: number;
  leaveBalance?: any;
  convertableToCash?: boolean;
}

export interface AccrualRule extends DateInfo {
  id: string;
  tenantId: string;
  title: string;
  period: AccrualRulePeriod;
  isActive: boolean;
}
