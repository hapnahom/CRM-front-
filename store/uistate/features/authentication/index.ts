import { setCookie } from '@/helpers/storageHelper';
import {
  clearPersistedAuthStorage,
  expireAuthCookies,
} from '@/utils/authSessionCleanup';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface StoreState {
  token: string;
  setToken: (token: string) => void;
  clearAuth: () => void;
  tenantId: string;
  setTenantId: (tenantId: string) => void;
  userId: string;
  setUserId: (userId: string) => void;
  localId: string;
  setUserData: (userId: Record<string, any>) => void;
  userData: Record<string, any>;
  setLocalId: (localId: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  hostname: string | null;
  setHostName: (error: string | null) => void;
  activeCalendar: string | number | Date | undefined;
  setActiveCalendar: (
    activeCalendar: string | number | Date | undefined,
  ) => void;
  /**
   * Runtime-only readiness for fiscal calendar hydration.
   * Not persisted — consumers that need endDate should wait for `ready`.
   */
  activeCalendarStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
  setActiveCalendarStatus: (
    status: 'idle' | 'loading' | 'ready' | 'unavailable',
  ) => void;
  loggedUserRole: string;
  setLoggedUserRole: (loggedUserRole: string) => void;
  isCheckingPermissions: boolean;
  setIsCheckingPermissions: (isCheckingPermissions: boolean) => void;
}
export const useAuthenticationStore = create<StoreState>()(
  devtools(
    persist(
      (set) => ({
        token: '',
        setToken: (token: string) => {
          setCookie('token', token, 30);
          set({ token });
        },
        clearAuth: () => {
          expireAuthCookies();
          clearPersistedAuthStorage();
          set({
            token: '',
            tenantId: '',
            userId: '',
            localId: '',
            userData: {},
            activeCalendar: '',
            activeCalendarStatus: 'idle',
            loggedUserRole: '',
          });
        },
        tenantId: '',
        setTenantId: (tenantId: string) => {
          set({ tenantId });
        },
        userId: '',
        setUserId: (userId: string) => {
          set({ userId });
        },
        localId: '',
        setLocalId: (localId: string) => {
          set({ localId });
        },
        userData: {},
        setUserData: (userData: Record<string, any>) => {
          set({ userData });
        },
        loggedUserRole: '',
        setLoggedUserRole: (loggedUserRole: string) => {
          setCookie('loggedUserRole', loggedUserRole, 30);
          set({ loggedUserRole });
        },
        loading: false, // Non-persistent state
        setLoading: (loading: boolean) => set({ loading }),
        error: null, // Non-persistent state
        setError: (error: string | null) => set({ error }),

        hostname: null, // Non-persistent state
        setHostName: (hostname: string | null) => set({ hostname }),

        activeCalendar: '',
        setActiveCalendar: (
          activeCalendar: string | number | Date | undefined,
        ) => {
          setCookie('activeCalendar', activeCalendar, 30);
          set({
            activeCalendar,
            activeCalendarStatus: activeCalendar ? 'ready' : 'unavailable',
          });
        },
        activeCalendarStatus: 'idle',
        setActiveCalendarStatus: (activeCalendarStatus) =>
          set({ activeCalendarStatus }),
        isCheckingPermissions: true,
        setIsCheckingPermissions: (isCheckingPermissions: boolean) =>
          set({ isCheckingPermissions }),
      }),
      {
        name: 'business-auth', // Per-product key (shared origin) — do not reuse across products
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          token: state.token,
          tenantId: state.tenantId,
          localId: state.localId,
          userId: state.userId,
          userData: state.userData,
          activeCalendar: state.activeCalendar,
        }),
        // getStorage: () => ({
        //   getItem: async (key: string) => {
        //     const storedValue = await get(key); // Get item from IndexedDB
        //     return storedValue ?? null;
        //   },
        //   setItem: async (key: string, value: any) => {
        //     await set(key, value); // Set item in IndexedDB
        //   },
        //   removeItem: async (key: string) => {
        //     await del(key); // Remove item from IndexedDB
        //   },
        // }),
        // partialize: (state) => ({
        //   token: state.token,
        //   tenantId: state.tenantId,
        //   localId: state.localId,
        //   userId: state.userId,
        // }),
      },
    ),
  ),
);
