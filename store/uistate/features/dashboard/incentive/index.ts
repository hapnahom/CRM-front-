import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  recognitionType: string | '';
  setRecognitionType: (recognitionType: string | '') => void;
  status: boolean | null;
  setStatus: (status: boolean | null) => void;
  isShowMobileFilters: boolean;
  setIsShowMobileFilters: (isShowMobileFilters: boolean) => void;
}
export const useDashboardIncentiveStore = create<UserState>()(
  devtools((set) => ({
    recognitionType: '',
    setRecognitionType: (recognitionType: string | '') =>
      set({ recognitionType: recognitionType }),
    status: null,
    setStatus: (status: boolean | null) => set({ status: status }),
    isShowMobileFilters: false,
    setIsShowMobileFilters: (isShowMobileFilters: boolean) =>
      set({ isShowMobileFilters: isShowMobileFilters }),
  })),
);
