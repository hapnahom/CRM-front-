'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IntegrationsPage,
  IntegrationDetailView,
} from '@/modules/marketing/SettingsPage';
import { settingsIntegrationsPath } from '@/lib/routes/settings';

/**
 * Embeds marketing integrations list + detail inside Enterprise Settings.
 * Provider deep-links use `?section=integrations&provider=…`.
 */
export function IntegrationsSettingsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');

  const setProvider = useCallback(
    (next: string | null) => {
      router.replace(settingsIntegrationsPath(next), { scroll: false });
    },
    [router],
  );

  if (provider) {
    return (
      <IntegrationDetailView
        provider={provider}
        onBack={() => setProvider(null)}
        embedded
      />
    );
  }

  return (
    <IntegrationsPage embedded onSelectProvider={(next) => setProvider(next)} />
  );
}
