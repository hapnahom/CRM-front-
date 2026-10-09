// --- Calendar Month Interface ---

export interface Month {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string; // "Month 1", "Month 2", "Month 3"
  description?: string | null;
  sessionId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  tenantId: string;
}

// --- Calendar Session Interface ---

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string; // "FY-2018 Q2"
  description?: string | null;
  calendarId: string; // Reference to parent calendar
  startDate: string;
  endDate: string;
  active: boolean;
  tenantId: string;
  months?: Month[]; // Array of months in this session
  [key: string]: any;
}

// --- Calendar Interface ---

export interface Calendar {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string; // "FY-2018"
  startDate: string;
  endDate: string;
  closedDates?: ClosedDate[];
  description?: string;
  tenantId: string;
  isActive: boolean;
  sessions?: Session[]; // Array of sessions in this calendar
  [key: string]: any;
}

// --- Closed Date Interface ---

export interface ClosedDate {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
}
