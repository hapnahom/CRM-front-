'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import {
  communicationAuthHeaders,
  communicationQueryKeys,
} from '@/store/server/features/communication/queries';
import type { EmailAccount } from '@/modules/communication/components/EmailAccountSettings';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/** Fallback poll intervals when server policy allows live polling. */
const PROVIDER_SYNC_MS: Record<EmailAccount['provider'], number> = {
  gmail: 30_000,
  outlook: 90_000,
  custom: 60_000,
};

/** Refresh CRM message queries between provider pulls (cheap DB read). */
const CRM_REFETCH_MS = 20_000;
const INITIAL_SYNC_DELAY_MS = 10_000;
/** While waiting for Gmail watch registration, re-check accounts. */
const WATCH_HEALTH_POLL_MS = 30_000;

async function runIncrementalSync(accountId: string): Promise<void> {
  const headers = await communicationAuthHeaders();
  await crudRequest({
    url: `${CRM_URL}/communication/accounts/${accountId}/sync`,
    method: 'POST',
    headers,
    data: { mode: 'incremental' },
  });
}

/**
 * Optional live polling while the Mail tab is open.
 *
 * - mailPollingEnabled must be explicitly true (undefined while settings load → off)
 * - Gmail: skip polling only when Pub/Sub watch is confirmed healthy for this account
 * - If Pub/Sub is enabled but watch is not active, fall back to polling when allowed
 * - Outlook: polling is a safety net when the server enables it
 */
export function useMailboxLiveSync(params: {
  enabled: boolean;
  /** undefined while settings are loading — treated as off */
  mailPollingEnabled?: boolean;
  gmailPubSubEnabled?: boolean;
  /** Per-account: users.watch registered + not expired */
  gmailPubSubWatchActive?: boolean;
  accountId: string | null;
  provider?: EmailAccount['provider'];
}) {
  const queryClient = useQueryClient();
  const userId = useAuthenticationStore((s) => s.userId);
  const syncInFlight = useRef(false);

  const provider = params.provider ?? 'outlook';
  const settingsReady = params.mailPollingEnabled !== undefined;
  const pollingAllowed = params.mailPollingEnabled === true;

  // Skip Gmail polling only when push is actually healthy for this mailbox.
  const gmailCoveredByPubSub =
    provider === 'gmail' &&
    params.gmailPubSubEnabled === true &&
    params.gmailPubSubWatchActive === true;

  const enabled =
    params.enabled &&
    settingsReady &&
    pollingAllowed &&
    !gmailCoveredByPubSub &&
    Boolean(params.accountId);
  const accountId = params.accountId;

  // Re-fetch accounts until Gmail watch becomes healthy (startup / reconnect).
  useEffect(() => {
    if (!params.enabled || !accountId || provider !== 'gmail') return;
    if (params.gmailPubSubEnabled !== true) return;
    if (params.gmailPubSubWatchActive === true) return;

    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries(
        communicationQueryKeys.accounts(userId),
      );
    }, WATCH_HEALTH_POLL_MS);

    return () => window.clearInterval(timer);
  }, [
    params.enabled,
    params.gmailPubSubEnabled,
    params.gmailPubSubWatchActive,
    accountId,
    provider,
    queryClient,
    userId,
  ]);

  useEffect(() => {
    if (!enabled || !accountId) return;

    const pollMs = PROVIDER_SYNC_MS[provider] ?? PROVIDER_SYNC_MS.custom;

    const pullFromProvider = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      try {
        await runIncrementalSync(accountId);
        await queryClient.invalidateQueries([
          'communication-messages',
          accountId,
        ]);
        await queryClient.invalidateQueries([
          'communication-message',
          accountId,
        ]);
      } catch {
        // Silent — header Refresh remains available.
      } finally {
        syncInFlight.current = false;
      }
    };

    const refetchCrmOnly = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void queryClient.refetchQueries(['communication-messages', accountId], {
        active: true,
      });
    };

    const initial = window.setTimeout(
      () => void pullFromProvider(),
      INITIAL_SYNC_DELAY_MS,
    );
    const syncTimer = window.setInterval(() => void pullFromProvider(), pollMs);
    const crmTimer = window.setInterval(refetchCrmOnly, CRM_REFETCH_MS);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(syncTimer);
      window.clearInterval(crmTimer);
    };
  }, [enabled, accountId, provider, queryClient]);
}
