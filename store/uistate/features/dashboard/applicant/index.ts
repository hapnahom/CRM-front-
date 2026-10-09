import { create } from 'zustand';

// Define the TypeScript interface for the state
interface ApplicantState {
  status: string | '';
  setStatus: (status: string | '') => void;
}

// Create the Zustand store
export const useApplicantStore = create<ApplicantState>((set) => ({
  status: '',
  setStatus: (value) =>
    set(() => ({
      status: value,
    })),
}));
