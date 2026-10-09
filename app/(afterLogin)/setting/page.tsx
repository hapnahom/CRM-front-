'use client';

import { Suspense } from 'react';
import { AccountSettingsPage } from '@/modules/account-settings/AccountSettingsPage';

export default function SettingPage() {
  return (
    <Suspense fallback={null}>
      <AccountSettingsPage />
    </Suspense>
  );
}
