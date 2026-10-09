import { Select, Button, Form } from 'antd';
import React, { useMemo } from 'react';
import {
  useGetCalendars,
  Session,
  Month,
} from '@/store/server/features/dashboard';

interface DashboardFilterProps {
  onFilter: (filters: {
    calendarId?: string;
    sessionId?: string;
    monthId?: string;
  }) => void;
  onReset: () => void;
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({
  onFilter,
  onReset,
}) => {
  const [form] = Form.useForm();

  // Fetch calendar data (includes sessions and months)
  const { data: calendars, isLoading: calendarsLoading } = useGetCalendars();

  // Watch form values to handle cascading dropdowns
  const selectedCalendar = Form.useWatch('calendar', form);
  const selectedSession = Form.useWatch('session', form);

  // Extract all sessions from calendars
  const allSessions = useMemo<Session[]>(() => {
    if (!calendars) return [];

    const sessions: Session[] = [];
    calendars.forEach((calendar) => {
      if (calendar.sessions && Array.isArray(calendar.sessions)) {
        sessions.push(...calendar.sessions);
      }
    });

    return sessions;
  }, [calendars]);

  // Filter sessions based on selected calendar
  const availableSessions = useMemo<Session[]>(() => {
    if (!selectedCalendar) return allSessions;
    return allSessions.filter(
      (session) => session.calendarId === selectedCalendar,
    );
  }, [allSessions, selectedCalendar]);

  // Get months from selected session
  const availableMonths = useMemo<Month[]>(() => {
    if (!selectedSession || !allSessions.length) return [];
    const session = allSessions.find((s) => s.id === selectedSession);
    return session?.months || [];
  }, [allSessions, selectedSession]);

  // Handle calendar change - reset dependent fields
  // eslint-disable-next-line
  const handleCalendarChange = (value: string) => {
    form.setFieldsValue({ session: undefined, month: undefined });
  };

  // Handle session change - reset month
  // eslint-disable-next-line
  const handleSessionChange = (value: string) => {
    form.setFieldsValue({ month: undefined });
  };

  // Handle filter submission
  const handleFilter = () => {
    form.validateFields().then((values) => {
      const filters: any = {};

      if (values.calendar) {
        filters.calendarId = values.calendar;
      }
      if (values.session) {
        filters.sessionId = values.session;
      }
      if (values.month) {
        filters.monthId = values.month;
      }

      onFilter(filters);
    });
  };

  // Handle reset
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  const dropdownContent = (
    <div className="bg-surface-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-lg font-semibold">Filter</h2>
          <p className="text-muted-foreground text-sm -mt-1">
            Filter dashboard data
          </p>
        </div>
        <Button type="link" onClick={handleReset} className="text-primary">
          Remove All
        </Button>
      </div>

      <Form layout="vertical" form={form} className="w-full">
        <h3 className="text-muted-foreground text-sm mb-2 mt-3">Filter</h3>

        <Form.Item name="calendar" label="Year">
          <Select
            placeholder="All Years"
            className="h-10 mt-1"
            loading={calendarsLoading}
            allowClear
            onChange={handleCalendarChange}
            options={calendars?.map((calendar) => ({
              label: calendar.name,
              value: calendar.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="session" label="Quarter">
          <Select
            placeholder="All Quarters"
            className="h-10 mt-1"
            disabled={!selectedCalendar}
            allowClear
            onChange={handleSessionChange}
            options={availableSessions.map((session) => ({
              label: session.name,
              value: session.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="month" label="Month">
          <Select
            placeholder="All Months"
            className="h-10 mt-1"
            disabled={!selectedSession}
            allowClear
            options={availableMonths.map((month) => ({
              label: month.name,
              value: month.id,
            }))}
          />
        </Form.Item>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-2 mt-6">
          <Button type="primary" className="px-6" onClick={handleFilter}>
            Filter
          </Button>
          <Button type="default" className="px-6" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </Form>
    </div>
  );

  return dropdownContent;
};

export default DashboardFilter;
