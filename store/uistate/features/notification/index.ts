import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  isNotificationDetailVisible: boolean;
  setIsNotificationDetailVisible: (
    isNotificationDetailVisible: boolean,
  ) => void;
  selectedNotificationId: string | null;
  setSelectedNotificationId: (selectedNotificationId: string | null) => void;
}

export const useNotificationDetailStore = create<UserState>()(
  devtools((set) => ({
    isNotificationDetailVisible: false,
    setIsNotificationDetailVisible: (isNotificationDetailVisible: boolean) =>
      set({ isNotificationDetailVisible }),

    selectedNotificationId: null,
    setSelectedNotificationId: (selectedNotificationId: string | null) =>
      set({ selectedNotificationId }),
  })),
);
