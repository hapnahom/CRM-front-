import { AttendanceRecord } from '@/types/timesheet/attendance';

export const timeToHour = (time: number): string => {
  return String(Math.floor(time / (1000 * 60 * 60))).padStart(2, '0');
};

export const timeToLastMinute = (time: number): string => {
  return String(Math.floor((time % (1000 * 60 * 60)) / (1000 * 60))).padStart(
    2,
    '0',
  );
};

export const minuteToHour = (minute: number): string => {
  return String(Math.floor(minute / 60)).padStart(2, '0');
};

export const minuteToLastMinute = (minute: number): string => {
  return String(Math.floor(minute % 60)).padStart(2, '0');
};

export const calculateAttendanceRecordToTotalWorkTime = (
  item: AttendanceRecord,
): number => {
  const startAt = new Date(item.startAt);
  const endAt = new Date(item.endAt ?? Date.now());

  if (item.startAt && endAt) {
    const fullTime = endAt.getTime() - startAt.getTime();

    const breakTime = item.attendanceBreaks.reduce((acc, itemBreak) => {
      const startAt = new Date(itemBreak.startAt);
      const endAt = new Date(itemBreak.endAt ?? Date.now());

      acc = acc + (endAt.getTime() - startAt.getTime());

      return acc;
    }, 0);

    const calcTime = fullTime - breakTime;

    return calcTime < 0 ? 0 : calcTime;
  } else {
    return 0;
  }
};
