import {
  AttendanceBreak,
  AttendanceRecord,
} from '@/types/timesheet/attendance';
import { AllowedArea } from '@/types/timesheet/settings';
import { DateInfo } from '@/types/commons/dateInfo';

export interface Geolocation extends DateInfo {
  id: string;
  tenantId: string;
  attendanceRecord: AttendanceRecord;
  attendanceRecordId: string | null;
  attendanceBreak: AttendanceBreak;
  attendanceBreakId: string | null;
  isSignIn: boolean;
  imagePath: string | null;
  latitude: number;
  longitude: number;
  allowedArea: AllowedArea;
  allowedAreaId: string;
}
