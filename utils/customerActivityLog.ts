export type CustomerActivityKind =
  | 'accountCreated'
  | 'customerUpdated'
  | 'contactCreated'
  | 'contactLinked'
  | 'primaryContact'
  | 'contactRemoved'
  | 'call'
  | 'meeting'
  | 'deal'
  | 'email'
  | 'message'
  | 'note';

export interface CustomerActivityLogEntry {
  id: string;
  accountId: string;
  tenantId: string;
  timestamp: string;
  date: string;
  text: string;
  kind: CustomerActivityKind;
}

const STORAGE_PREFIX = 'crm-customer-activity-log';
const SEED_PREFIX = 'crm-customer-activity-seeded';

function storageKey(tenantId: string) {
  return `${STORAGE_PREFIX}:${tenantId}`;
}

function seedKey(tenantId: string, accountId: string) {
  return `${SEED_PREFIX}:${tenantId}:${accountId}`;
}

function readAllForTenant(
  tenantId: string,
): Record<string, CustomerActivityLogEntry[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CustomerActivityLogEntry[]>;
  } catch {
    return {};
  }
}

function writeAllForTenant(
  tenantId: string,
  data: Record<string, CustomerActivityLogEntry[]>,
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(tenantId), JSON.stringify(data));
  } catch {
    // Quota exceeded or private mode — ignore
  }
}

export function readCustomerActivityLog(
  tenantId: string,
  accountId: string,
): CustomerActivityLogEntry[] {
  const all = readAllForTenant(tenantId);
  return all[accountId] ?? [];
}

export function appendCustomerActivityLog(
  tenantId: string,
  accountId: string,
  entry: Omit<CustomerActivityLogEntry, 'id' | 'accountId' | 'tenantId'> & {
    id?: string;
  },
): CustomerActivityLogEntry {
  const full: CustomerActivityLogEntry = {
    id:
      entry.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    accountId,
    tenantId,
    timestamp: entry.timestamp,
    date: entry.date,
    text: entry.text,
    kind: entry.kind,
  };

  const all = readAllForTenant(tenantId);
  const existing = all[accountId] ?? [];
  all[accountId] = [full, ...existing];
  writeAllForTenant(tenantId, all);
  return full;
}

export function createActivityLogEntry(
  text: string,
  kind: CustomerActivityKind,
  timestamp = new Date(),
): Omit<CustomerActivityLogEntry, 'id' | 'accountId' | 'tenantId'> {
  return {
    text,
    kind,
    timestamp: timestamp.toISOString(),
    date: timestamp.toISOString().split('T')[0],
  };
}

export function hasSeededCustomerActivity(
  tenantId: string,
  accountId: string,
): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(seedKey(tenantId, accountId)) === '1';
}

export function markCustomerActivitySeeded(
  tenantId: string,
  accountId: string,
) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(seedKey(tenantId, accountId), '1');
}

/** Format activity timestamp for display: date + time (e.g. "18 May 2026 · 2:34 PM"). */
export function formatActivityDateTime(
  timestamp: string,
  fallbackDate?: string,
): string {
  const parsed = timestamp
    ? new Date(timestamp)
    : fallbackDate
      ? new Date(
          fallbackDate.includes('T')
            ? fallbackDate
            : `${fallbackDate}T12:00:00`,
        )
      : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return fallbackDate ?? '';
  }

  const datePart = parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timePart = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} · ${timePart}`;
}

export function activityTypeToKind(type: string): CustomerActivityKind {
  switch (type) {
    case 'Call':
      return 'call';
    case 'Meeting':
      return 'meeting';
    case 'Deal':
      return 'deal';
    case 'Email':
      return 'email';
    case 'Message':
      return 'message';
    case 'Note':
      return 'note';
    default:
      return 'note';
  }
}
