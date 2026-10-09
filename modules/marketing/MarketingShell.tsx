'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Users,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { antdPageTheme } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/marketing',
    label: 'Overview',
    icon: LayoutDashboard,
    match: (path: string) => path === '/marketing',
  },
  {
    href: '/marketing/campaigns',
    label: 'Campaigns',
    icon: Megaphone,
    match: (path: string) => path.startsWith('/marketing/campaigns'),
  },
  {
    href: '/marketing/audiences',
    label: 'Audiences',
    icon: Users,
    match: (path: string) => path.startsWith('/marketing/audiences'),
  },
  {
    href: '/marketing/assets',
    label: 'Content & Assets',
    icon: FolderOpen,
    match: (path: string) => path.startsWith('/marketing/assets'),
  },
  {
    href: '/marketing/events',
    label: 'Events',
    icon: Calendar,
    match: (path: string) => path.startsWith('/marketing/events'),
  },
] as const;

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/marketing': {
    title: 'Marketing',
  },
  '/marketing/campaigns': {
    title: 'Campaigns',
  },
  '/marketing/audiences': {
    title: 'Audiences',
  },
  '/marketing/assets': {
    title: 'Content & Assets',
  },
  '/marketing/events': {
    title: 'Events',
  },
};

function isDetailRoute(pathname: string) {
  return /^\/marketing\/(campaigns|audiences|events)\/[^/]+$/.test(pathname);
}

function resolveMeta(pathname: string) {
  if (isDetailRoute(pathname)) return null;
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = Object.keys(PAGE_META)
    .filter((key) => key !== '/marketing')
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return PAGE_META[match ?? '/marketing'];
}

export function MarketingShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const meta = resolveMeta(pathname);

  return (
    <ConfigProvider theme={antdPageTheme}>
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {meta ? (
          <div className="flex-shrink-0 border-b border-border bg-white">
            <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h1 className="m-0 text-[20px] font-semibold text-foreground">
                  {meta.title}
                </h1>
                {meta.subtitle ? (
                  <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
                    {meta.subtitle}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>

            <div className="overflow-x-auto px-4 sm:px-6">
              <nav
                className="flex min-w-max items-center gap-1"
                aria-label="Marketing"
              >
                {NAV_ITEMS.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                        active
                          ? 'border-brand text-brand'
                          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      <Icon
                        size={14}
                        className={
                          active ? 'text-brand' : 'text-muted-foreground'
                        }
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto bg-white">{children}</div>
      </div>
    </ConfigProvider>
  );
}
