'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Zap,
  Megaphone,
  MoreHorizontal,
  X,
  BarChart2,
  Users,
  Target,
  Settings,
  UserCog,
  ChevronRight,
  Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AccessGuard from '@/utils/permissionGuard';
import {
  MARKETING_MODULE_VIEW_PERMISSIONS,
  TARGET_MODULE_ACCESS_PERMISSIONS,
} from '@/constants/permissions';
import { isSettingsPath, SETTINGS_PATH } from '@/lib/routes/settings';
import { isModuleEnabled, type ModuleId } from '@/config/modules';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

interface BottomNavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  permissions?: string[];
  anyPermissions?: string[];
  module?: ModuleId;
}

interface BottomNavProps {
  onNavigate?: () => void;
}

function checkRouteAccess(config: {
  permissions?: string[];
  anyPermissions?: string[];
}): boolean {
  if (config.anyPermissions?.length) {
    return AccessGuard.checkAnyAccess({ permissions: config.anyPermissions });
  }
  return AccessGuard.checkAccess({ permissions: config.permissions });
}

function getActiveState(item: BottomNavItem, pathname: string) {
  if (item.key === '/dashboard') {
    return pathname === '/' || pathname === '/dashboard';
  }

  if (item.key === '/customers') {
    return pathname === '/customers' || pathname.startsWith('/customers/');
  }

  if (item.key === '/sales-hub') {
    return (
      pathname.startsWith('/sales-hub') ||
      pathname.startsWith('/opportunities') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/deals') ||
      pathname.startsWith('/sales-pipeline')
    );
  }

  if (item.key === '/communication') {
    return pathname.startsWith('/communication');
  }

  if (item.key === '/marketing') {
    return pathname.startsWith('/marketing');
  }

  return pathname === item.key || pathname.startsWith(`${item.key}/`);
}

interface NavGroup {
  label: string;
  items: BottomNavItem[];
}

const BottomNav: React.FC<BottomNavProps> = ({ onNavigate }) => {
  const pathname = usePathname();
  const router = useRouter();
  const userData = useAuthenticationStore((s) => s.userData);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling for bottom sheet
  useEffect(() => {
    if (showMoreSheet && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMoreSheet) {
        setShowMoreSheet(false);
      }
    };

    if (showMoreSheet) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showMoreSheet]);

  const mainNavItems: BottomNavItem[] = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard size={22} />,
      label: 'Home',
      // Always visible — only menu that works with no permissions.
    },
    {
      key: '/sales-hub',
      icon: <BriefcaseBusiness size={22} />,
      label: 'Sales Hub',
      permissions: ['view-sales-hub'],
    },
    {
      key: '/communication',
      icon: <Zap size={22} />,
      label: 'Productivity',
      permissions: ['view-communication'],
    },
    {
      key: '/marketing',
      icon: <Megaphone size={22} />,
      label: 'Marketing',
      anyPermissions: [...MARKETING_MODULE_VIEW_PERMISSIONS],
      module: 'marketing',
    },
  ];

  // Only items NOT in the main bottom bar should appear in the More sheet
  const moreNavGroups: NavGroup[] = [
    {
      label: 'SALES',
      items: [
        {
          key: '/customers',
          icon: <Users size={20} />,
          label: 'Customers',
          permissions: ['view-customers'],
        },
        {
          key: '/sales-targeting',
          icon: <Target size={20} />,
          label: 'Targets',
          anyPermissions: [...TARGET_MODULE_ACCESS_PERMISSIONS],
        },
        {
          key: '/partners',
          icon: <Handshake size={20} />,
          label: 'Partners',
          permissions: ['view-partners'],
        },
      ],
    },
    {
      label: 'ANALYTICS',
      items: [
        {
          key: '/reports',
          icon: <BarChart2 size={20} />,
          label: 'Reports',
          permissions: ['view-reports'],
          module: 'reports',
        },
      ],
    },
  ];

  const isNavItemVisible = (item: BottomNavItem) => {
    if (item.module && !isModuleEnabled(item.module)) return false;
    return checkRouteAccess(item);
  };

  const visibleMainItems = useMemo(() => {
    return mainNavItems.filter(isNavItemVisible);
    // Recompute when auth permissions become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.userPermissions, userData?.role?.slug]);

  const visibleMoreNavGroups = useMemo(() => {
    return moreNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(isNavItemVisible),
      }))
      .filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.userPermissions, userData?.role?.slug]);

  const isMoreActive = useMemo(() => {
    const moreKeys = visibleMoreNavGroups.flatMap((g) =>
      g.items.map((i) => i.key),
    );
    return (
      moreKeys.some((key) => {
        if (key === '/dashboard') {
          return pathname === '/' || pathname === '/dashboard';
        }
        if (key === '/customers') {
          return (
            pathname === '/customers' || pathname.startsWith('/customers/')
          );
        }
        if (key === '/sales-hub') {
          return (
            pathname.startsWith('/sales-hub') ||
            pathname.startsWith('/opportunities') ||
            pathname.startsWith('/leads') ||
            pathname.startsWith('/deals') ||
            pathname.startsWith('/sales-pipeline')
          );
        }
        return pathname === key || pathname.startsWith(`${key}/`);
      }) && !visibleMainItems.some((item) => getActiveState(item, pathname))
    );
  }, [pathname, visibleMainItems, visibleMoreNavGroups]);

  const handleNavigation = (key: string) => {
    router.push(key);
    setShowMoreSheet(false);
    onNavigate?.();
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary-border bg-primary-muted md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around gap-1 px-1 py-1">
          {visibleMainItems.map((item) => {
            const active = getActiveState(item, pathname);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigation(item.key)}
                aria-label={`Navigate to ${item.label}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex min-w-0 flex-1 flex-col items-center rounded-md px-1.5 py-2 transition-all duration-100',
                  active ? '' : 'hover:bg-white/50',
                )}
              >
                <span
                  className={cn(
                    'flex max-w-full flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-all duration-100',
                    active ? 'bg-surface-card' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center transition-all duration-100',
                      active
                        ? 'text-brand [&_svg]:[stroke-width:2.5]'
                        : 'text-foreground group-hover:text-foreground [&_svg]:[stroke-width:1.5]',
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      'max-w-full truncate text-[10px] leading-none transition-all duration-100',
                      active
                        ? 'font-bold text-brand'
                        : 'font-normal text-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowMoreSheet(true)}
            aria-label="More options"
            className={cn(
              'group relative flex min-w-0 flex-1 flex-col items-center rounded-md px-1.5 py-2 transition-all duration-100',
              isMoreActive ? '' : 'hover:bg-white/50',
            )}
          >
            <span
              className={cn(
                'flex max-w-full flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-all duration-100',
                isMoreActive ? 'bg-surface-card' : '',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center transition-all duration-100',
                  isMoreActive
                    ? 'text-brand [&_svg]:[stroke-width:2.5]'
                    : 'text-foreground group-hover:text-foreground [&_svg]:[stroke-width:1.5]',
                )}
              >
                <MoreHorizontal size={22} />
              </span>
              <span
                className={cn(
                  'max-w-full truncate text-[10px] leading-none transition-all duration-100',
                  isMoreActive
                    ? 'font-bold text-brand'
                    : 'font-normal text-foreground',
                )}
              >
                More
              </span>
            </span>
          </button>
        </div>
        {/* Safe area padding for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Bottom Sheet for More Menu */}
      {showMoreSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setShowMoreSheet(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[70] md:hidden">
            <div className="animate-slide-up">
              <div
                ref={sheetRef}
                className="rounded-t-3xl bg-primary-muted shadow-2xl max-h-[85vh] overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="h-1 w-10 rounded-full bg-primary-border" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-4 border-b border-primary-border">
                  <h2 className="text-lg font-bold text-foreground">
                    Navigation
                  </h2>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setShowMoreSheet(false)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-white/50 hover:text-foreground transition-colors duration-100"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>
                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-120px)] pb-safe-area-bottom">
                  {visibleMoreNavGroups.map((group) => (
                    <div key={group.label} className="px-5 pt-5 pb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        {group.label}
                      </h3>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = getActiveState(item, pathname);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleNavigation(item.key)}
                              className={cn(
                                'group relative flex w-full items-center gap-3 rounded-md px-2 py-2 transition-all duration-100',
                                active
                                  ? 'bg-surface-card text-brand'
                                  : 'text-foreground hover:bg-white/50 hover:text-foreground',
                              )}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
                              )}
                              <span
                                className={cn(
                                  'flex-shrink-0',
                                  active
                                    ? 'text-brand'
                                    : 'text-foreground group-hover:text-foreground',
                                )}
                              >
                                {item.icon}
                              </span>
                              <span
                                className={cn(
                                  'flex-1 truncate text-[13px]',
                                  active ? 'font-medium' : 'font-normal',
                                )}
                              >
                                {item.label}
                              </span>
                              <ChevronRight
                                size={14}
                                className="ml-auto flex-shrink-0 opacity-60"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Standalone items */}
                  <div className="px-5 pt-3 pb-6">
                    <div className="h-px bg-primary-border/50 mb-4" />
                    <div className="space-y-1">
                      <AccessGuard permissions={['view-users']}>
                        <button
                          type="button"
                          onClick={() => handleNavigation('/user-management')}
                          className={cn(
                            'group relative flex w-full items-center gap-3 rounded-md px-2 py-2 transition-all duration-100',
                            pathname === '/user-management'
                              ? 'bg-surface-card text-brand'
                              : 'text-foreground hover:bg-white/50 hover:text-foreground',
                          )}
                        >
                          {pathname === '/user-management' && (
                            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
                          )}
                          <span
                            className={cn(
                              'flex-shrink-0',
                              pathname === '/user-management'
                                ? 'text-brand'
                                : 'text-foreground group-hover:text-foreground',
                            )}
                          >
                            <UserCog size={20} />
                          </span>
                          <span
                            className={cn(
                              'flex-1 truncate text-[13px]',
                              pathname === '/user-management'
                                ? 'font-medium'
                                : 'font-normal',
                            )}
                          >
                            User Management
                          </span>
                          <ChevronRight
                            size={14}
                            className="ml-auto flex-shrink-0 opacity-60"
                          />
                        </button>
                      </AccessGuard>
                      <AccessGuard permissions={['view-settings']}>
                        <button
                          type="button"
                          onClick={() => handleNavigation(SETTINGS_PATH)}
                          className={cn(
                            'group relative flex w-full items-center gap-3 rounded-md px-2 py-2 transition-all duration-100',
                            isSettingsPath(pathname)
                              ? 'bg-surface-card text-brand'
                              : 'text-foreground hover:bg-white/50 hover:text-foreground',
                          )}
                        >
                          {isSettingsPath(pathname) && (
                            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
                          )}
                          <span
                            className={cn(
                              'flex-shrink-0',
                              isSettingsPath(pathname)
                                ? 'text-brand'
                                : 'text-foreground group-hover:text-foreground',
                            )}
                          >
                            <Settings size={20} />
                          </span>
                          <span
                            className={cn(
                              'flex-1 truncate text-[13px]',
                              isSettingsPath(pathname)
                                ? 'font-medium'
                                : 'font-normal',
                            )}
                          >
                            Settings
                          </span>
                          <ChevronRight
                            size={14}
                            className="ml-auto flex-shrink-0 opacity-60"
                          />
                        </button>
                      </AccessGuard>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomNav;
