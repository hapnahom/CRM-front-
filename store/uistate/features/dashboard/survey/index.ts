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
export const useSurveyState = create<DateRangeState>((set) => ({
  type: 1,
  dateRange: {
    start: '',
    end: '',
  },
  setDateRange: (start, end) =>
    set(() => ({
      dateRange: { start, end },
    })),
}));
