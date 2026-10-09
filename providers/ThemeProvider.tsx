'use client';

import { useEffect } from 'react';
import { GlobalStateStore } from '@/store/uistate/features/global';

const THEME_STORAGE_KEY = 'crm-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = GlobalStateStore((state) => state.theme);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as
      | 'light'
      | 'dark'
      | null;
    if (stored) {
      GlobalStateStore.getState().setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return <>{children}</>;
}

export default ThemeProvider;
