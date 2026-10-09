import { UUID } from 'crypto';
import { Dayjs } from 'dayjs';

export interface ClosedDates {
  id: UUID;
  name: string;
  type: string;
  description?: string;
  date: Dayjs | string;
}

export type Month = {
  id: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  deletedAt: string | null; // Nullable ISO 8601 date string
  createdBy: string | null; // Nullable string
  updatedBy: string | null; // Nullable string
  name: string;
  description: string | null; // Nullable string
  sessionId: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  active: boolean;
  tenantId: string;
};

export type Session = {
  id: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  deletedAt: string | null; // Nullable ISO 8601 date string
  createdBy: string | null;
  updatedBy: string | null;
  name: string;
  description: string | null;
  calendarId: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  active: boolean;
  tenantId: string;
  months?: Month[]; // Adjust based on the structure of "months"
};

export interface FiscalYear {
  id?: string;
  name: string;
  description: string;
  startDate: Dayjs | null;
  endDate: string | number | Date;
  sessions?: Session[]; // Use the Session type here
  closedDates?: ClosedDates[];
  isActive?: boolean;
}

export interface FiscalYearResponse {
  items: FiscalYear[];
  meta: any;
}
