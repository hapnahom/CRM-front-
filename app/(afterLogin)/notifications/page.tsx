'use client';

import { Suspense } from 'react';
import { NotificationsInboxPage } from '@/modules/notifications/NotificationsInboxPage';

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsInboxPage />
    </Suspense>
  );
}
