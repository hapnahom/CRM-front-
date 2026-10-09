'use client';

import { Suspense } from 'react';
import { PartnersPage } from '@/modules/partners/PartnersPage';
import { TabbedModulePageSkeleton } from '@/components/loading/skeleton-screens';

export default function Page() {
  return (
    <Suspense fallback={<TabbedModulePageSkeleton />}>
      <PartnersPage />
    </Suspense>
  );
}
