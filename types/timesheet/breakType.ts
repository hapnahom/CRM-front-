import { DateInfo } from '@/types/commons/dateInfo';

export interface BreakType extends DateInfo {
  id?: string;
  tenantId?: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
}
export interface BreakTypeList {
  item: BreakType;
}
