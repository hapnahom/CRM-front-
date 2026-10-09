import { create } from 'zustand';

// Define the TypeScript interface for the state
interface DateRangeState {
  dateRange: {
    start: string | '';
    end: string | '';
  };
  setDateRange: (start: string | '', end: string | '') => void;
}

// Create the Zustand store
export const useSelfAttendance = create<DateRangeState>((set) => ({
  dateRange: {
    start: '',
    end: '',
  },
  setDateRange: (start, end) =>
    set(() => ({
      dateRange: { start, end },
    })),
}));
