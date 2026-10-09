/** Zustand persist key for business auth (shared origin — do not reuse across products). */
export const AUTH_PERSIST_STORAGE_KEY = 'business-auth';

/** Blocks AuthGate from re-bootstrapping while logout is in flight (same tab). */
export const LOGOUT_IN_PROGRESS_KEY = 'crm-logout-in-progress';

const AUTH_COOKIE_KEYS = [
  'token',
  'tenantId',
  'activeCalendar',
  'loggedUserRole',
] as const;

export function isLogoutInProgress(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLogoutInProgress(active: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (active) {
      sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, '1');
    } else {
      sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
    }
  } catch {
    // Private mode / disabled storage — non-fatal.
  }
}

export function clearLogoutInProgress(): void {
  setLogoutInProgress(false);
}

/** Expire auth cookies across path/domain variants (Safari / embedded iframe quirks). */
export function expireAuthCookies(): void {
  if (typeof document === 'undefined') return;
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const domainVariants: string[] = [''];
  if (hostname) {
    domainVariants.push(hostname);
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      domainVariants.push(`.${parts.slice(-2).join('.')}`);
    }
  }

  for (const name of AUTH_COOKIE_KEYS) {
    for (const path of ['/', '']) {
      const pathValue = path || '/';
      document.cookie = `${name}=; expires=${expired}; path=${pathValue};`;
      for (const domain of domainVariants) {
        if (!domain) continue;
        document.cookie = `${name}=; expires=${expired}; path=${pathValue}; domain=${domain};`;
      }
    }
  }
}

/** Remove Firebase Auth persistence keys from localStorage. */
export function clearFirebaseAuthPersistence(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('firebase:') || key.includes('firebaseLocalStorageDb'))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Quota / private mode — non-fatal.
  }
}

export function clearPersistedAuthStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_PERSIST_STORAGE_KEY);
  } catch {
    // non-fatal
  }
  clearFirebaseAuthPersistence();
}
