import { DateInfo } from '@/types/commons/dateInfo';

export interface Sessions extends DateInfo {
  id: string;
  name: string;
  description?: string | null;
  calendarId: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  tenantId: string;
}
