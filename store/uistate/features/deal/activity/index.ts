import { create } from 'zustand';

interface SearchParams {
  priority: string;
  activityDate: string;
  dealId: string;
  activityType: string;
}
interface DealActivityState {
  openActivitySidebar: boolean;
  setOpenActivitySidebar: (openActivitySidebar: boolean) => void;
  openActivityFilter: boolean;
  setOpenActivityFilter: (openActivityFilter: boolean) => void;
  removeActivityFilter: () => void;
  searchParams: SearchParams;
  setSearchParams: (
    key: keyof SearchParams,
    value: string | boolean | any,
  ) => void;
}

const dealActivityStore = create<DealActivityState>((set) => ({
  openActivitySidebar: false,
  setOpenActivitySidebar: (openActivitySidebar: boolean) => {
    set({ openActivitySidebar });
  },
  openActivityFilter: false,
  setOpenActivityFilter: (openActivityFilter: boolean) => {
    set({ openActivityFilter });
  },
  removeActivityFilter: () => {
    set({ openActivityFilter: false });
  },
  searchParams: {
    priority: '',
    activityDate: '',
    dealId: '',
    activityType: '',
  },
  setSearchParams: (key: keyof SearchParams, value: string | boolean) => {
    set((state) => ({ searchParams: { ...state.searchParams, [key]: value } }));
  },
}));

export default dealActivityStore;
