import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface RecognitionState {
  currentIndex: number;
  setCurrentIndex: (currentIndex: number) => void;
}
export const useDashboardRecognitionStore = create<RecognitionState>()(
  devtools((set) => ({
    currentIndex: 0,
    setCurrentIndex: (currentIndex: number) =>
      set({ currentIndex: currentIndex }),
  })),
);
