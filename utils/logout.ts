import { signOut } from 'firebase/auth';
import { auth } from '@/utils/firebaseConfig';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { appPath, IS_CORE } from '@/utils/constants';
import {
  clearPersistedAuthStorage,
  expireAuthCookies,
  setLogoutInProgress,
} from '@/utils/authSessionCleanup';

/**
 * Central logout handler. Clears Firebase session, Zustand auth state, and all
 * auth cookies, then redirects to the login page.
 *
 * Use sessionExpired=true when the user did not explicitly click "Log out" —
 * it shows a toast informing them their session has expired.
 */
export async function performLogout(sessionExpired = false): Promise<void> {
  if (typeof window !== 'undefined') {
    setLogoutInProgress(true);
  }

  // Clear local session before Firebase signOut so onIdTokenChanged cannot
  // resurrect the user from cookies / localStorage (browser-dependent races).
  useAuthenticationStore.getState().clearAuth();
  try {
    await useAuthenticationStore.persist?.clearStorage?.();
  } catch {
    // non-fatal
  }
  expireAuthCookies();
  clearPersistedAuthStorage();

  try {
    await signOut(auth);
  } catch {
    // Firebase signOut errors are non-fatal; proceed with local cleanup.
  }

  clearPersistedAuthStorage();
  expireAuthCookies();

  if (sessionExpired && typeof window !== 'undefined') {
    // Dynamically import to avoid bundling antd notification in every path.
    const { notification } = await import('antd');
    notification.warning({
      message: 'Session expired',
      description: 'Your session has expired. Please sign in again.',
      duration: 0,
      key: 'session-expired',
    });
  }

  if (typeof window !== 'undefined') {
    // When embedded in core, hand off to Core's login page at the origin root.
    // When standalone, use the app login route (no /business prefix).
    const loginUrl = IS_CORE ? '/login' : appPath('/authentication/login');
    window.location.replace(loginUrl);
  }
}
