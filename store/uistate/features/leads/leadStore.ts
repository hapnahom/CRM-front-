import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Clean up any existing selectedRows from localStorage on module load
if (typeof window !== 'undefined') {
  try {
    const storedData = localStorage.getItem('lead-store');
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.state && parsed.state.selectedRows) {
        // Remove selectedRows from persisted state
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { selectedRows, ...restState } = parsed.state;
        localStorage.setItem(
          'lead-store',
          JSON.stringify({
            ...parsed,
            state: restState,
          }),
        );
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
    // console.warn('Failed to clean up persisted selectedRows:', error);
  }
}

interface LeadStore {
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  clearSelection: () => void;
}

export const useLeadStore = create<LeadStore>()(
  persist(
    (set) => ({
      selectedRows: [],
      setSelectedRows: (rows) => set({ selectedRows: rows }),
      currentPage: 1,
      setCurrentPage: (page) => {
        set({ currentPage: page });
      },
      clearSelection: () => set({ selectedRows: [] }),
    }),
    {
      name: 'lead-store', // unique name for localStorage key
      partialize: (state) => ({
        currentPage: state.currentPage,
        // selectedRows removed from persistence - checkbox selections should reset on reload
      }), // only persist currentPage, not selectedRows
    },
  ),
);
