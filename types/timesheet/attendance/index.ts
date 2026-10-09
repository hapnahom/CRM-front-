import { BreakType } from '@/types/timesheet/breakType';
import { StatusBadgeTheme } from '@/components/common/statusBadge';
import { Geolocation } from '@/types/timesheet/geolocation';
import { DateInfo } from '@/types/commons/dateInfo';
// import { Meta } from '@/store/server/features/okrPlanningAndReporting/interface';

// Fallback interface for Meta
export interface Meta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export enum AttendanceRecordType {
  LATE = 'late',
  EARLY = 'early',
  ABSENT = 'absent',
  PRESENT = 'present',
}

export const AttendanceRecordTypeBadgeTheme: Record<
  AttendanceRecordType,
  StatusBadgeTheme
> = {
  [AttendanceRecordType.LATE]: StatusBadgeTheme.warning,
  [AttendanceRecordType.EARLY]: StatusBadgeTheme.warning,
  [AttendanceRecordType.ABSENT]: StatusBadgeTheme.danger,
  [AttendanceRecordType.PRESENT]: StatusBadgeTheme.success,
};

export const attendanceRecordTypeOption: {
  label: string;
  value: AttendanceRecordType;
  id: string;
}[] = [
  { label: 'Late', id: 'late', value: AttendanceRecordType.LATE },
  { label: 'Early', id: 'Early', value: AttendanceRecordType.EARLY },
  { label: 'Present', id: 'Present', value: AttendanceRecordType.PRESENT },
  { label: 'Absent', id: 'Absent', value: AttendanceRecordType.ABSENT },
];

export interface AttendanceRecord extends DateInfo {
  id: string;
  userId: string;
  tenantId: string;
  startAt: string;
  endAt: string;
  lateByMinutes: number;
  geolocations: Geolocation[];
  attendanceBreaks: AttendanceBreak[];
  earlyByMinutes: number;
  isAbsent: boolean;
  isOnGoing: boolean;
  overTimeMinutes: number;
  attendanceImportId: string | null;
  import: AttendanceImport;
}
export interface PaginateAttendanceRecord extends DateInfo {
  items: AttendanceRecord[];
  meta: Meta;
}
export interface AttendanceBreak extends DateInfo {
  id: string;
  tenantId: string;
  breakType: BreakType;
  breakTypeId: string | null;
  isOnGoing: boolean;
  startAt: string;
  endAt: string | null;
  attendanceRecordId: string;
  geolocations: Geolocation[];
  earlyByMinutes: number;
  lateByMinutes: number;
}

export interface AttendanceImport extends DateInfo {
  id: string;
  tenantId: string;
  fileName: string;
  filePath: string;
  AttendanceRecordId: string;
}

export enum AttendanceTypeUnit {
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  QUARTALS = 'quartals',
  YEARS = 'years',
}

export interface AttendanceNotificationType extends DateInfo {
  id: string;
  title: string;
  unit: AttendanceTypeUnit;
  attendanceNotificationRules: AttendanceNotificationRule[];
  isActive: boolean;
}

export interface AttendanceNotificationRule extends DateInfo {
  id: string;
  title: string;
  description: string;
  attendanceNotificationType: string;
  attendanceNotificationTypeId: string;
  value: number;
}
