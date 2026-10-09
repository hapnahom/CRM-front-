import {
  ALL_CURRENCIES,
  type PipelineCurrency,
  type PipelineFilterSelection,
  type PipelinePeriodSelection,
} from './pipeline-filter';

const STORAGE_PREFIX = 'sales-hub-workspace-filters';
const PREFS_VERSION = 1;

export type WorkspaceFilterPreferences = {
  version: number;
  filter: PipelineFilterSelection;
  currency: PipelineCurrency;
  period: PipelinePeriodSelection;
};

function storageKey(tenantId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${tenantId}:${userId}`;
}

function parseFilter(raw: unknown): PipelineFilterSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;

  if (type === 'all') return { type: 'all' };

  if (type === 'department' && typeof value.departmentId === 'string') {
    return {
      type: 'department',
      departmentId: value.departmentId,
      departmentName:
        typeof value.departmentName === 'string'
          ? value.departmentName
          : 'Department',
    };
  }

  if (type === 'team' && typeof value.teamId === 'string') {
    return {
      type: 'team',
      teamId: value.teamId,
      teamName: typeof value.teamName === 'string' ? value.teamName : 'Team',
      ...(typeof value.departmentId === 'string'
        ? { departmentId: value.departmentId }
        : {}),
      ...(typeof value.departmentName === 'string'
        ? { departmentName: value.departmentName }
        : {}),
    };
  }

  if (type === 'member' && typeof value.memberId === 'string') {
    return {
      type: 'member',
      memberId: value.memberId,
      memberName:
        typeof value.memberName === 'string' ? value.memberName : 'Member',
      ...(typeof value.teamId === 'string' ? { teamId: value.teamId } : {}),
      ...(typeof value.teamName === 'string'
        ? { teamName: value.teamName }
        : {}),
      ...(typeof value.departmentId === 'string'
        ? { departmentId: value.departmentId }
        : {}),
      ...(typeof value.departmentName === 'string'
        ? { departmentName: value.departmentName }
        : {}),
    };
  }

  return null;
}

function parsePeriod(raw: unknown): PipelinePeriodSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;

  if (type === 'all') return { type: 'all' };

  if (type === 'annual') {
    return {
      type: 'annual',
      ...(typeof value.calendarId === 'string'
        ? { calendarId: value.calendarId }
        : {}),
    };
  }

  if (type === 'session' && typeof value.sessionId === 'string') {
    return { type: 'session', sessionId: value.sessionId };
  }

  return null;
}

function parseCurrency(raw: unknown): PipelineCurrency | null {
  if (raw === ALL_CURRENCIES || raw === 'all') return ALL_CURRENCIES;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return null;
}

export function loadWorkspaceFilterPreferences(
  tenantId: string,
  userId: string,
): WorkspaceFilterPreferences | null {
  if (typeof window === 'undefined' || !tenantId || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceFilterPreferences>;
    const filter = parseFilter(parsed.filter);
    const period = parsePeriod(parsed.period);
    const currency = parseCurrency(parsed.currency);
    if (!filter || !period || !currency) return null;
    return {
      version: PREFS_VERSION,
      filter,
      currency,
      period,
    };
  } catch {
    return null;
  }
}

export function saveWorkspaceFilterPreferences(
  tenantId: string,
  userId: string,
  prefs: Omit<WorkspaceFilterPreferences, 'version'>,
): void {
  if (typeof window === 'undefined' || !tenantId || !userId) return;
  try {
    const payload: WorkspaceFilterPreferences = {
      version: PREFS_VERSION,
      filter: prefs.filter,
      currency: prefs.currency,
      period: prefs.period,
    };
    window.localStorage.setItem(
      storageKey(tenantId, userId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}
