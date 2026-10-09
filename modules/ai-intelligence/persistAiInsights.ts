import type { AiInsightsResponse } from '@/store/server/features/ai-intelligence/types';

export type AiInsightsSurface = 'dashboard' | 'pipeline' | 'customers';

const STORAGE_PREFIX = 'crm.ai-insights.v1';

function storageKey(
  surface: AiInsightsSurface,
  tenantId: string,
  userId: string,
): string {
  return `${STORAGE_PREFIX}:${tenantId}:${userId}:${surface}`;
}

function isValidResponse(value: unknown): value is AiInsightsResponse {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    Array.isArray(row.insights) &&
    typeof row.generatedAt === 'string' &&
    row.scope != null &&
    typeof row.scope === 'object'
  );
}

export function loadPersistedAiInsights(
  surface: AiInsightsSurface,
  tenantId: string,
  userId: string,
): AiInsightsResponse | null {
  if (typeof window === 'undefined') return null;
  if (!tenantId || !userId) return null;

  try {
    const raw = window.localStorage.getItem(
      storageKey(surface, tenantId, userId),
    );
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePersistedAiInsights(
  surface: AiInsightsSurface,
  tenantId: string,
  userId: string,
  data: AiInsightsResponse,
): void {
  if (typeof window === 'undefined') return;
  if (!tenantId || !userId) return;

  try {
    window.localStorage.setItem(
      storageKey(surface, tenantId, userId),
      JSON.stringify(data),
    );
  } catch {
    // Quota / private mode — ignore; in-memory state still works for the session.
  }
}
