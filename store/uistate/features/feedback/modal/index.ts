// stores/useFilterStore.ts
import { create } from 'zustand';

interface FilterState {
  modalVisible: boolean;
  selectedDates: string[];
  setModalVisible: (visible: boolean) => void;
  setSelectedDates: (dates: string[]) => void;
  resetFilter: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  modalVisible: false,
  selectedDates: [],
  setModalVisible: (visible) => set({ modalVisible: visible }),
  setSelectedDates: (dates) => set({ selectedDates: dates }),
  resetFilter: () => set({ modalVisible: false, selectedDates: [] }),
}));
