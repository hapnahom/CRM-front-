/**
 * Display name for platform / org users.
 * Prefers first + middle + last (or first + middle when last is absent).
 */
export function formatUserName(
  user:
    | {
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
        name?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
  fallback = 'Unknown',
): string {
  if (!user) return fallback;
  const parts = [user.firstName, user.middleName, user.lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  const composed = user.name?.trim();
  if (composed) return composed;
  const email = user.email?.trim();
  if (email) return email;
  return fallback;
}
