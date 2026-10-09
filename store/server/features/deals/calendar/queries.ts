// Re-export calendar types and hooks from the leads module.
// Deals use the same org-structure calendars endpoint via the CRM backend.
export {
  type Calendar,
  type Session,
  type ClosedDate,
  type Month,
  useGetCalendars,
} from '../../leads/calendar/queries';
