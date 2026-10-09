import { formatUserName } from '@/lib/format-user-name';
import type { CustomerOwnerSummary } from '@/store/server/features/customers/types';

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatRelativeDay(value?: string | Date | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

export function withAlpha(hex: string, alpha: number): string {
  const raw = hex.trim().replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => char + char)
          .join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatDueLabel(value?: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEmployeesLabel(size?: string | null): string {
  const value = size?.trim();
  if (!value) return '—';
  if (/employees?$/i.test(value)) {
    return value.replace(/employees?$/i, 'Employees');
  }
  return `${value} Employees`;
}

export function formatOwnerLabel(
  ownerUserId: string | null | undefined,
  owner: CustomerOwnerSummary | null | undefined,
  users: Array<{
    id: string;
    selamnewId?: string | null;
    name?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
  }>,
): string {
  const fromOwner = formatUserName(owner, '');
  if (fromOwner) return fromOwner;

  const keys = [ownerUserId, owner?.id, owner?.selamnewId].filter(
    (value): value is string => Boolean(value),
  );
  if (keys.length === 0) return '—';

  const user = users.find(
    (item) =>
      keys.includes(item.id) ||
      (item.selamnewId != null && keys.includes(item.selamnewId)),
  );
  return user ? formatUserName(user) : '—';
}
