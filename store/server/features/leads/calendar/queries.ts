import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { requestHeader } from '@/helpers/requestHeader';

export interface ClosedDate {
  id: string;
  name: string;
  date: string;
  type: string;
  description?: string;
}

export interface Month {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string;
  description?: string | null;
  sessionId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  tenantId: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string;
  description?: string | null;
  calendarId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  tenantId: string;
  months?: Month[];
  [key: string]: any;
}

export interface Calendar {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  name: string;
  startDate: string;
  endDate: string;
  closedDates?: ClosedDate[];
  description?: string;
  tenantId: string;
  isActive: boolean;
  sessions?: Session[];
  [key: string]: any;
}

function normalizeCalendarList(response: unknown): Calendar[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as Calendar[];
  const r = response as { items?: Calendar[]; data?: Calendar[] };
  if (Array.isArray(r.items)) return r.items;
  if (Array.isArray(r.data)) return r.data;
  return [response as Calendar];
}

const getCalendars = async (): Promise<Calendar[]> => {
  const headers = await requestHeader();
  const response = await crudRequest({
    url: `${CRM_URL}/org-structure/calendars`,
    method: 'GET',
    headers,
  });
  return normalizeCalendarList(response);
};

export const useGetCalendars = () =>
  useQuery<Calendar[]>(['calendars'], getCalendars, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
