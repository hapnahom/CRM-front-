'use client';

import { lazy, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { NavChromeSkeleton } from '@/components/navBar/NavChromeSkeleton';
import { CollaborationProvider } from '@/components/collaboration/collaboration-context';

/**
 * Lazy Nav is module-scoped so the chunk promise is cached across navigations.
 * Suspense fallback keeps the same chrome geometry and still renders `children`,
 * avoiding a blank page and CLS when the Nav chunk arrives.
 */
const Nav = lazy(() => import('@/components/navBar'));

const EXCLUDE_NAV_PATHS = new Set([
  '/authentication/login',
  '/signup',
  '/not-found',
  '/surveys/[id]',
  '/job/[tenantID]/[jobId]',
  '/invitations/decision',
  '/privacy',
  '/terms',
]);

export default function ConditionalNav({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNav = !EXCLUDE_NAV_PATHS.has(pathname);

  if (!showNav) {
    return <>{children}</>;
  }

  // Collaboration rides along with the nav chrome: the same routes that get the
  // app shell are the authenticated ones where an embed makes sense. The dock
  // itself is mounted inside Nav's flex row so it sits beside the page content
  // rather than over it — see components/navBar.
  return (
    <CollaborationProvider>
      <Suspense fallback={<NavChromeSkeleton>{children}</NavChromeSkeleton>}>
        <Nav>{children}</Nav>
      </Suspense>
    </CollaborationProvider>
  );
}
