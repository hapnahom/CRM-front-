import dayjs, { Dayjs } from 'dayjs';
import { create } from 'zustand';

interface DateRangeState {
  type: number;
  dateRange: {
    start: string | '';
    end: string | '';
  };
  setType: (type: number) => void;
  setDateRange: (start: string | '', end: string | '') => void;
  selectedDate: Dayjs;
  setSelectedDate: (selectDate: Dayjs) => void;
}

// Create the Zustand store
export const useDelegationState = create<DateRangeState>((set) => ({
  type: 1,
  dateRange: {
    start: '',
    end: '',
  },
  setDateRange: (start, end) =>
    set(() => ({
      dateRange: { start, end },
    })),
  setType: (type: number) => set({ type }),

  selectedDate: dayjs(), // ✅ default to today
  setSelectedDate: (selectedDate: Dayjs) => set({ selectedDate }),
}));
