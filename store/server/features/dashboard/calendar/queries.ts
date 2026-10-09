import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { CRM_URL } from '@/utils/constants';
import { requestHeader } from '@/helpers/requestHeader';
import { Calendar, Session } from './types';

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
  useQuery<Calendar[]>(['dashboard-calendars'], getCalendars, {
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

// Sessions are embedded in the calendar response — derive them client-side
// rather than making a separate network request.
export const useGetSessions = () =>
  useQuery<Session[]>(
    ['dashboard-sessions'],
    async () => {
      const calendars = await getCalendars();
      return calendars.flatMap((calendar) => calendar.sessions ?? []);
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  );

export const useGetCalendarSessions = (calendarId: string) =>
  useQuery<Session[]>(
    ['dashboard-calendar-sessions', calendarId],
    async () => {
      const calendars = await getCalendars();
      const match = calendars.find((c) => c.id === calendarId);
      return match?.sessions ?? [];
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      retry: 2,
      enabled: !!calendarId,
    },
  );
