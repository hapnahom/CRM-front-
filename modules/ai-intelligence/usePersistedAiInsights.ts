'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import type { AiInsightsResponse } from '@/store/server/features/ai-intelligence/types';
import {
  loadPersistedAiInsights,
  savePersistedAiInsights,
  type AiInsightsSurface,
} from './persistAiInsights';

/**
 * Keeps the last generated insights in localStorage (no Redis).
 * Restores on page load; only replaced when Generate succeeds again.
 */
export function usePersistedAiInsights(surface: AiInsightsSurface) {
  const tenantId = useAuthenticationStore((s) => s.tenantId);
  const userId = useAuthenticationStore((s) => s.userId);
  const [result, setResult] = useState<AiInsightsResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPersistedAiInsights(surface, tenantId, userId);
    setResult(stored);
    setHydrated(true);
  }, [surface, tenantId, userId]);

  const persistResult = useCallback(
    (data: AiInsightsResponse) => {
      setResult(data);
      savePersistedAiInsights(surface, tenantId, userId, data);
    },
    [surface, tenantId, userId],
  );

  return { result, persistResult, hydrated };
}
