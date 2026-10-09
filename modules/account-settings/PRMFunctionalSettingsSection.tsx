'use client';

import { PRMSettingsTab } from '@/modules/partners/components/tabs/PRMSettingsTab';

export function PRMFunctionalSettingsSection() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <PRMSettingsTab embedded />
    </div>
  );
}
