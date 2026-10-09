import { DateInfo } from '@/types/commons/dateInfo';

export interface EmployeeAttendance extends DateInfo {
  tenantId: string;
  attendanceImportId: string;
  id: string;
  userId: string;
  startAt: string;
  endAt: string;
  isAbsent: boolean;
  isOnGoing: boolean;
  earlyByMinutes: number;
  lateByMinutes: number;
  attendanceBreaks: any;
  geolocations: any;
}
