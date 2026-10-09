'use client';

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseConfig';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { setCookie } from '@/helpers/storageHelper';
import {
  useBusinessSessionBootstrap,
  decodeUidFromToken,
} from '@/providers/useBusinessSessionBootstrap';
import { appPath, IS_CORE } from '@/utils/constants';
import { performLogout } from '@/utils/logout';
import { removeCookie } from '@/helpers/storageHelper';
import {
  clearLogoutInProgress,
  isLogoutInProgress,
} from '@/utils/authSessionCleanup';

type SessionStatus = 'pending' | 'authed' | 'anon' | 'error';

function isPublicPath(pathname: string): boolean {
  const prefixes = [
    '/authentication/login',
    '/invitations/decision',
    '/privacy',
    '/terms',
  ];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Hand off to the login page. When embedded in Core, this is Core's login at
 * the origin root (/login). When standalone, it's the app's own login page.
 */
function redirectToCoreLogin(): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname;
  if (current === '/login' || current.startsWith('/login?')) return;
  if (current.includes('/authentication/login')) return;
  const here = current + window.location.search;
  if (IS_CORE) {
    window.location.assign(`/login?redirect=${encodeURIComponent(here)}`);
  } else {
    window.location.assign(appPath('/authentication/login'));
  }
}

/** The Firebase ID token Core set on this shared origin, if any. */
function readTokenCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/** True when zustand persist already has a usable business session. */
function hasPersistedSession(): boolean {
  const { token, tenantId, userId, localId } =
    useAuthenticationStore.getState();
  return Boolean(token?.trim() && tenantId?.trim() && (userId || localId));
}

function subscribeNoop() {
  return () => {};
}

// ── DEV AUTH BYPASS ──────────────────────────────────────────────────────────
// When NEXT_PUBLIC_DEV_AUTH_BYPASS=true (set in .env.local) skip all auth
// checks so the app is reachable locally without a real Firebase session.
// Isolated in its own component so React hook rules are never violated.
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

export default function AuthGate({ children }: { children: ReactNode }) {
  if (DEV_BYPASS) return <>{children}</>;
  return <AuthGateInner>{children}</AuthGateInner>;
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const token = useAuthenticationStore((s) => s.token);
  const authLoading = useAuthenticationStore((s) => s.loading);
  const [hydrated, setHydrated] = useState(() =>
    typeof useAuthenticationStore.persist?.hasHydrated === 'function'
      ? useAuthenticationStore.persist.hasHydrated()
      : false,
  );
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('pending');
  const [errorReason, setErrorReason] = useState('');
  const bootstrapSession = useBusinessSessionBootstrap();
  const bootstrappingRef = useRef(false);
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;

  // Sync cookie read for first client paint without SSR mismatch (server = false).
  // Middleware already required this cookie for protected routes.
  const hasCookieSession = useSyncExternalStore(
    subscribeNoop,
    () => Boolean(readTokenCookie()),
    () => false,
  );

  const runBootstrap = useCallback(
    async (idToken: string, uid: string) => {
      if (isLogoutInProgress()) return;
      if (bootstrappingRef.current) return;
      bootstrappingRef.current = true;
      try {
        const result = await bootstrapSession(idToken, uid);
        if (result.ok) {
          setSessionStatus('authed');
          setErrorReason('');
        } else if (result.accountInactive) {
          // Non-active accounts must not keep a CRM session.
          removeCookie('token');
          await performLogout(false);
          setSessionStatus('anon');
          setErrorReason(result.reason);
        } else if (hasPersistedSession() || readTokenCookie()) {
          // Transient bootstrap failure — keep UI if we already have a session.
          setSessionStatus('authed');
          setErrorReason('');
        } else {
          setSessionStatus('error');
          setErrorReason(result.reason);
        }
      } finally {
        bootstrappingRef.current = false;
      }
    },
    [bootstrapSession],
  );

  // Unblock as soon as persist has a full session. Firebase restore continues
  // in the background — waiting on it caused first-load Loading hangs.
  useEffect(() => {
    if (!hydrated) return;
    if (isLogoutInProgress()) {
      setSessionStatus('anon');
      return;
    }
    if (hasPersistedSession() || readTokenCookie()) {
      setSessionStatus((prev) => (prev === 'error' ? prev : 'authed'));
      const authToken = useAuthenticationStore.getState().token?.trim();
      if (authToken) setCookie('token', authToken, 30);
    }
  }, [hydrated]);

  // Refresh session from Firebase / cookie. Never clear auth on a brief null
  // user before persist hydration — Firebase often emits null before restore.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const store = useAuthenticationStore.getState();

      if (isLogoutInProgress()) {
        setSessionStatus('anon');
        return;
      }

      if (user) {
        if (Boolean(store.tenantId) && store.localId === user.uid) {
          store.setToken(await user.getIdToken());
          setSessionStatus('authed');
          return;
        }
        await runBootstrap(await user.getIdToken(), user.uid);
        return;
      }

      if (!hydratedRef.current) {
        return;
      }

      if (hasPersistedSession()) {
        setSessionStatus('authed');
        const cookieToken = readTokenCookie();
        if (cookieToken) {
          void runBootstrap(cookieToken, decodeUidFromToken(cookieToken));
        }
        return;
      }

      const cookieToken = readTokenCookie();
      if (cookieToken) {
        await runBootstrap(cookieToken, decodeUidFromToken(cookieToken));
        return;
      }

      store.clearAuth();
      setSessionStatus('anon');
    });
    return () => unsubscribe();
  }, [runBootstrap]);

  useEffect(() => {
    const persistApi = useAuthenticationStore.persist;
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return () => {};
    }
    const unsub = persistApi.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (!hydrated) return;

    const authToken = useAuthenticationStore.getState().token?.trim();

    if (authToken && !isLogoutInProgress()) {
      setCookie('token', authToken, 30);
    }

    const pub = isPublicPath(pathname);

    if (pub) {
      if (
        pathname.startsWith('/authentication/login') &&
        sessionStatus === 'authed' &&
        !authLoading &&
        !isLogoutInProgress()
      ) {
        if (auth.currentUser || hasPersistedSession() || readTokenCookie()) {
          router.replace('/dashboard');
        }
      }
      if (
        isLogoutInProgress() &&
        !hasPersistedSession() &&
        !readTokenCookie() &&
        !auth.currentUser
      ) {
        clearLogoutInProgress();
      }
      return;
    }

    if (sessionStatus === 'anon') {
      redirectToCoreLogin();
    }
  }, [authLoading, hydrated, pathname, router, sessionStatus, token]);

  const retry = useCallback(() => {
    setSessionStatus('pending');
    setErrorReason('');
    const user = auth.currentUser;
    if (user) {
      user.getIdToken(true).then((t) => runBootstrap(t, user.uid));
      return;
    }
    const cookieToken = readTokenCookie();
    if (cookieToken) {
      runBootstrap(cookieToken, decodeUidFromToken(cookieToken));
      return;
    }
    if (hasPersistedSession()) {
      setSessionStatus('authed');
      return;
    }
    setSessionStatus('anon');
  }, [runBootstrap]);

  const protectedPath = pathname !== null && !isPublicPath(pathname);
  const sessionReady =
    sessionStatus === 'authed' ||
    hasCookieSession ||
    (hydrated && hasPersistedSession());

  // Block only when we have no cookie/persist hint and session is still resolving.
  if (protectedPath && !sessionReady && sessionStatus === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (protectedPath && sessionStatus === 'error' && !sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-6">
        <div className="max-w-md rounded-lg border border-[#e5e7eb] bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-[#111827]">
            Couldn’t load your business workspace
          </p>
          <p className="mt-2 text-sm text-[#6b7280]">
            You’re signed in, but we couldn’t initialize your business session.
          </p>
          <p className="mt-2 break-words text-xs text-[#9ca3af]">
            {errorReason}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-md bg-[#1890ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#1677d9]"
            >
              Retry
            </button>
            <button
              onClick={redirectToCoreLogin}
              className="rounded-md border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
