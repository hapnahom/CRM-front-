'use client';

import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalStateStore } from '@/store/uistate/features/global';

export function AppearanceSection() {
  const theme = GlobalStateStore((state) => state.theme);
  const setTheme = GlobalStateStore((state) => state.setTheme);
  const [selected, setSelected] = useState<'light' | 'dark' | 'system'>(
    theme === 'dark' ? 'dark' : 'light',
  );

  const applyTheme = (key: 'light' | 'dark' | 'system') => {
    setSelected(key);
    if (key === 'system') {
      setTheme(
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
      );
      return;
    }
    setTheme(key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Theme</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {[
          { key: 'light' as const, icon: Sun, label: 'Light' },
          { key: 'dark' as const, icon: Moon, label: 'Dark' },
          { key: 'system' as const, icon: Monitor, label: 'System' },
        ].map(({ key, icon, label }) => {
          const IconComponent = icon;
          return (
            <Button
              key={key}
              variant={selected === key ? 'secondary' : 'outline'}
              className={
                selected === key
                  ? 'h-auto flex-col gap-2 border-brand/30 bg-brand-muted py-4 text-brand hover:bg-brand-muted hover:text-brand'
                  : 'h-auto flex-col gap-2 py-4'
              }
              onClick={() => applyTheme(key)}
            >
              <IconComponent />
              {label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
