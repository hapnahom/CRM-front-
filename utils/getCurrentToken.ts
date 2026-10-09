import { auth } from '@/utils/firebaseConfig';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/** True when a JWT still has usable life left (default 60s skew). */
export function isTokenFresh(token: string, skewSeconds = 60): boolean {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return false;
    const payload = JSON.parse(
      atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return (
      typeof payload.exp === 'number' &&
      payload.exp * 1000 > Date.now() + skewSeconds * 1000
    );
  } catch {
    return false;
  }
}

/**
 * Returns the current Firebase ID token and syncs it to the store.
 * Pass forceRefresh=true to force Firebase to contact its servers for a fresh token
 * (use when the current token is known or suspected to be expired).
 *
 * Uses the store token when it is still fresh so every API call does not wait
 * on Firebase `getIdToken()`. When a refresh is needed, waits for
 * `auth.authStateReady()` so a brief null `currentUser` during persistence
 * restore does not return a stale JWT.
 */
export const getCurrentToken = async (
  forceRefresh = false,
): Promise<string> => {
  try {
    const storeToken = useAuthenticationStore.getState().token;

    if (!forceRefresh && storeToken && isTokenFresh(storeToken)) {
      return storeToken;
    }

    // IndexedDB restore can leave currentUser null briefly after reload/idle.
    await auth.authStateReady();

    if (auth.currentUser) {
      // getIdToken() already refreshes when expired; force only when asked.
      const shouldForce =
        forceRefresh || !storeToken || !isTokenFresh(storeToken, 0);
      const token = await auth.currentUser.getIdToken(shouldForce);
      useAuthenticationStore.getState().setToken(token);
      return token;
    }

    return storeToken;
  } catch {
    return useAuthenticationStore.getState().token;
  }
};
