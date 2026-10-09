import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookie } from './helpers/storageHelper';

const IS_CORE =
  (process.env.NEXT_PUBLIC_IS_CORE ?? '').trim().toLowerCase() === 'true';

/**
 * Core owns the single login page at the origin root (outside this app's
 * basePath when IS_CORE). Send unauthenticated users there with a `redirect`
 * back to where they were headed. The shared `token` cookie means a user
 * already signed in on Core never reaches this redirect.
 */
function coreLoginUrl(req: NextRequest): URL {
  const here = `${req.nextUrl.basePath}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const url = new URL('/login', req.url);
  url.searchParams.set('redirect', here);
  return url;
}

/**
 * Redirect to one of this app's own routes, preserving Next's configured
 * basePath (`/business` when IS_CORE, empty when standalone).
 * `new URL('/dashboard', req.url)` would drop the prefix; cloning keeps it.
 */
function appUrl(req: NextRequest, pathname: string): URL {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return url;
}

function loginUrl(req: NextRequest): URL {
  if (IS_CORE) {
    return coreLoginUrl(req);
  }
  // Standalone: redirect to the app's own login page (no /business prefix).
  return appUrl(req, '/authentication/login');
}

export function middleware(req: NextRequest) {
  // ── DEV AUTH BYPASS ────────────────────────────────────────────────────
  // When NEXT_PUBLIC_DEV_AUTH_BYPASS=true (set in .env.local) the middleware
  // skips all token / redirect logic so the app can be previewed locally
  // without a real login session. Remove this block (or unset the env var)
  // before deploying to any real environment.
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    return NextResponse.next();
  }
  // ── END DEV AUTH BYPASS ────────────────────────────────────────────────

  try {
    const url = req.nextUrl;
    const pathname = url.pathname;

    const token = getCookie('token', req);

    const excludedPath = [
      '/authentication/login',
      '/authentication/login/forgot-password',
      '/invitations/decision',
      '/login',
      '/unauthorized',
      '/privacy',
      '/terms',
    ];
    const isExcludedPath = excludedPath.some((path) =>
      pathname.startsWith(path),
    );
    const isRootPath = pathname === '/';
    if (!isExcludedPath && !token) {
      return NextResponse.redirect(loginUrl(req));
    }

    if (!isExcludedPath && isRootPath) {
      if (token) {
        return NextResponse.redirect(appUrl(req, '/dashboard'));
      } else {
        return NextResponse.redirect(loginUrl(req));
      }
    }

    // Redirect any employees paths to dashboard (employees feature removed)
    if (pathname.startsWith('/employees')) {
      return NextResponse.redirect(appUrl(req, '/dashboard'));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|firebase-messaging-sw.js|login-background.png|manifest.json|manifest.webmanifest|sw.js|workbox|icons/192.png|icons/512.png).*)',
  ],
};
