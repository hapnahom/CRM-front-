'use client';

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import '../../app/globals.css';
import { usePathname, useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Users,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  Target,
  UserCog,
  Zap,
  Megaphone,
  PieChart,
  Handshake,
} from 'lucide-react';
import NavBar from './topNavBar';
import BottomNav from './BottomNav';
import { CollaborationDock } from '@/components/collaboration/collaboration-dock';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { GlobalStateStore } from '@/store/uistate/features/global';
import { performLogout } from '@/utils/logout';
import AccessGuard from '@/utils/permissionGuard';
import { cn } from '@/lib/utils';
import { isSettingsPath, SETTINGS_PATH } from '@/lib/routes/settings';
import { IS_CORE } from '@/utils/constants';
import {
  isModuleEnabled,
  isModulePathEnabled,
  type ModuleId,
} from '@/config/modules';
import { useGetClientById } from '@/store/server/features/tenant-management/clients/queries';
import {
  PERMISSIONS,
  TARGET_MODULE_ACCESS_PERMISSIONS,
  MARKETING_MODULE_VIEW_PERMISSIONS,
} from '@/constants/permissions';

interface CustomMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  className?: string;
  permissions?: string[];
  anyPermissions?: string[];
  children?: CustomMenuItem[];
  disabled?: boolean;
  hiddenFromNav?: boolean;
  flatInNav?: boolean;
  module?: ModuleId;
}

interface NavGroup {
  label: string;
  keys: string[];
}

type RoutePermissionConfig = {
  key: string;
  permissions?: string[];
  anyPermissions?: string[];
};

function checkRouteAccess(config: {
  permissions?: string[];
  anyPermissions?: string[];
}): boolean {
  if (config.anyPermissions?.length) {
    return AccessGuard.checkAnyAccess({ permissions: config.anyPermissions });
  }
  return AccessGuard.checkAccess({ permissions: config.permissions });
}

interface MyComponentProps {
  children: ReactNode;
}

const SETTINGS_VIEW_PERMISSIONS = [
  PERMISSIONS.VIEW_SETTINGS,
  PERMISSIONS.EDIT_SETTINGS,
] as const;

const hiddenRoutes: RoutePermissionConfig[] = [
  // Personal home — all licensed users (no permission required).
  {
    key: '/dashboard',
  },
  {
    key: '/',
  },
  {
    key: '/sales-hub',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/opportunities',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/leads',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/leads/manage-leads',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/leads/[id]',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/deals',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/deals/[id]',
    permissions: ['view-sales-hub'],
  },
  {
    key: SETTINGS_PATH,
    anyPermissions: [...SETTINGS_VIEW_PERMISSIONS],
  },
  {
    key: '/reports',
    permissions: ['view-reports'],
  },
  {
    key: '/analytics',
    permissions: ['view-reports'],
  },
  {
    key: '/customers',
    permissions: ['view-customers'],
  },
  {
    key: '/customers-new',
    permissions: ['view-customers'],
  },
  {
    key: '/communication',
    permissions: ['view-communication'],
  },
  {
    key: '/user-management',
    permissions: ['view-users'],
  },
  {
    key: '/sales-targeting',
    anyPermissions: [...TARGET_MODULE_ACCESS_PERMISSIONS],
  },
  {
    key: '/partners',
    permissions: ['view-partners'],
  },
  {
    key: '/sales-pipeline',
    permissions: ['view-sales-hub'],
  },
  {
    key: '/marketing',
    anyPermissions: [...MARKETING_MODULE_VIEW_PERMISSIONS],
  },
];

const treeData: CustomMenuItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} />,
    key: '/dashboard',
    // Always visible — only menu that works with no permissions.
  },
  {
    label: 'Customers',
    icon: <Users size={16} />,
    key: '/customers',
    permissions: ['view-customers'],
    flatInNav: true,
  },
  {
    label: 'Sales Hub',
    icon: <BriefcaseBusiness size={16} />,
    key: '/sales-hub',
    permissions: ['view-sales-hub'],
    flatInNav: true,
  },
  {
    label: 'Targets',
    icon: <Target size={16} />,
    key: '/sales-targeting',
    anyPermissions: [...TARGET_MODULE_ACCESS_PERMISSIONS],
    flatInNav: true,
  },
  {
    label: 'Partners',
    icon: <Handshake size={16} />,
    key: '/partners',
    permissions: ['view-partners'],
    flatInNav: true,
  },
  {
    label: 'Productivity',
    icon: <Zap size={16} />,
    key: '/communication',
    permissions: ['view-communication'],
    flatInNav: true,
  },
  {
    label: 'Marketing',
    icon: <Megaphone size={16} />,
    key: '/marketing',
    anyPermissions: [...MARKETING_MODULE_VIEW_PERMISSIONS],
    flatInNav: true,
    module: 'marketing',
  },
  {
    label: 'Reports',
    icon: <PieChart size={16} />,
    key: '/reports',
    permissions: ['view-reports'],
    flatInNav: true,
    module: 'reports',
  },
  {
    label: 'Settings',
    icon: <Settings size={16} />,
    key: SETTINGS_PATH,
    anyPermissions: [...SETTINGS_VIEW_PERMISSIONS],
  },
];

const navGroups: NavGroup[] = [
  {
    label: '',
    keys: ['/dashboard'],
  },
  {
    label: 'SALES',
    keys: ['/customers', '/sales-hub', '/sales-targeting', '/partners'],
  },
  {
    label: 'ENGAGEMENT',
    keys: ['/communication', '/marketing'],
  },
  {
    label: 'ANALYTICS',
    keys: ['/reports'],
  },
];

function getRoutesAndPermissions(
  menuItems: CustomMenuItem[],
): { route: string; permissions?: string[]; anyPermissions?: string[] }[] {
  const routes: {
    route: string;
    permissions?: string[];
    anyPermissions?: string[];
  }[] = [];

  const traverse = (items: CustomMenuItem[]) => {
    items.forEach((item) => {
      if (item.key) {
        routes.push({
          route: item.key,
          permissions: item.permissions,
          anyPermissions: item.anyPermissions,
        });
      }

      if (item.children) {
        traverse(item.children);
      }
    });
  };

  hiddenRoutes.forEach((route) => {
    if (route.key) {
      routes.push({
        route: route.key,
        permissions: route.permissions,
        anyPermissions: route.anyPermissions,
      });
    }
  });

  traverse(menuItems);
  return routes;
}

function isRouteMatch(routePattern: string, path: string) {
  if (routePattern.includes('[id]')) {
    const regexPattern = routePattern.replace('[id]', '[0-9a-fA-F-]{36}');
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(path);
  }
  if (routePattern.match(/\[.*?\]/g)) {
    const regexPattern = routePattern.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(path);
  }
  return routePattern === path;
}

function getActiveState(item: CustomMenuItem, pathname: string) {
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

  return pathname === item.key || pathname.startsWith(`${item.key}/`);
}

function tenantInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'W'
  );
}

const APP_BRAND_NAME = 'Selamnew CRM';

const Nav: React.FC<MyComponentProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<
    (string | number | bigint)[]
  >([]);
  const [logoFailed, setLogoFailed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { userData, tenantId, token } = useAuthenticationStore();
  const customHeader = GlobalStateStore((state) => state.customHeader);

  const { data: tenant, isLoading: isTenantLoading } =
    useGetClientById(tenantId);

  const companyLogo = tenant?.logo?.trim() || '';
  const isTenantResolving = Boolean(tenantId) && isTenantLoading;
  const showLogo = Boolean(companyLogo) && !logoFailed;
  const initials = tenantInitials(APP_BRAND_NAME);

  useEffect(() => {
    setLogoFailed(false);
  }, [companyLogo]);

  const refetch = () => {};

  useEffect(() => {
    refetch();
  }, [token]);

  const checkPathnamePermissions = useCallback(
    (pathname: string): boolean => {
      if (!isModulePathEnabled(pathname)) {
        return false;
      }

      const routesWithPermissions = getRoutesAndPermissions(treeData);
      const isOwner = userData?.role?.slug?.toLowerCase() === 'owner';
      if (isOwner) {
        return true;
      }

      const matchingRoute = routesWithPermissions.find((route) => {
        if (isRouteMatch(route.route, pathname)) {
          return true;
        }
        if (pathname.startsWith(route.route + '/')) {
          return true;
        }
        return false;
      });

      if (!matchingRoute) {
        const pathParts = pathname.split('/').filter(Boolean);

        for (let i = pathParts.length - 1; i > 0; i--) {
          const parentPath = '/' + pathParts.slice(0, i).join('/');
          const parentRoute = routesWithPermissions.find((route) =>
            isRouteMatch(route.route, parentPath),
          );

          if (parentRoute && checkRouteAccess(parentRoute)) {
            return true;
          }
        }

        return false;
      }

      if (
        (!matchingRoute.permissions ||
          matchingRoute.permissions.length === 0) &&
        (!matchingRoute.anyPermissions ||
          matchingRoute.anyPermissions.length === 0)
      ) {
        return true;
      }

      return checkRouteAccess(matchingRoute);
    },
    [userData],
  );

  useEffect(() => {
    const checkPermissions = async () => {
      if (!userData?.id) return;
      if (pathname === '/') {
        const home =
          treeData.find(
            (item) =>
              !item.hiddenFromNav &&
              item.key !== SETTINGS_PATH &&
              checkRouteAccess(item),
          )?.key ?? '/dashboard';
        router.push(home);
      } else if (!checkPathnamePermissions(pathname)) {
        // Soft-redirect to the first permitted menu (avoid permission error pages).
        const fallback =
          treeData.find(
            (item) =>
              !item.hiddenFromNav &&
              item.key !== SETTINGS_PATH &&
              checkRouteAccess(item),
          )?.key ?? null;
        if (fallback && fallback !== pathname) {
          router.push(fallback);
        }
      }
    };

    checkPermissions();
  }, [pathname, router, checkPathnamePermissions, userData]);

  const handleLogout = () => {
    void performLogout(false);
  };

  const filteredMenuItems = treeData
    .map((item) => {
      if (item.module && !isModuleEnabled(item.module)) return null;
      if (!checkRouteAccess(item)) return null;

      return {
        ...item,
        children: item.children
          ? item.children.filter(
              (child) =>
                !child.disabled &&
                checkRouteAccess(child) &&
                (!child.module || isModuleEnabled(child.module)),
            )
          : [],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  useEffect(() => {
    const activeParent = treeData.find(
      (item) =>
        !!item.children &&
        item.children.length > 0 &&
        getActiveState(item, pathname),
    );

    setExpandedKeys(activeParent ? [activeParent.key] : []);
  }, [pathname]);

  const navVisibleMenuItems = useMemo(
    () => filteredMenuItems.filter((item) => !item.hiddenFromNav),
    [filteredMenuItems],
  );

  const menuItemsByKey = useMemo(() => {
    return navVisibleMenuItems.reduce<Record<string, CustomMenuItem>>(
      (acc, item) => {
        acc[item.key] = item;
        return acc;
      },
      {},
    );
  }, [navVisibleMenuItems]);

  const groupedMenuItems = useMemo(() => {
    const groupedKeys = new Set(navGroups.flatMap((group) => group.keys));
    const groups = navGroups
      .map((group) => ({
        ...group,
        items: group.keys
          .map((key) => menuItemsByKey[key])
          .filter((item): item is CustomMenuItem => Boolean(item)),
      }))
      .filter((group) => group.items.length > 0);

    const remainingItems = navVisibleMenuItems.filter(
      (item) => item.key !== SETTINGS_PATH && !groupedKeys.has(item.key),
    );

    if (remainingItems.length > 0) {
      groups.push({
        label: 'More',
        keys: remainingItems.map((item) => item.key),
        items: remainingItems,
      });
    }

    return groups;
  }, [navVisibleMenuItems, menuItemsByKey]);

  const settingsItem = menuItemsByKey[SETTINGS_PATH];

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((itemKey) => itemKey !== key) : [key],
    );
  };

  const goToRoute = (route: string) => {
    router.push(route);
  };

  const navItemClass = (active: boolean, collapsed = false) =>
    cn(
      'group relative flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-all duration-100',
      collapsed && 'justify-center',
      active
        ? 'bg-surface-card text-brand'
        : 'text-foreground hover:bg-white/50 hover:text-foreground',
    );

  const navIconClass = (active: boolean) =>
    cn(
      'flex-shrink-0',
      active ? 'text-brand' : 'text-foreground group-hover:text-foreground',
    );

  const renderNavItem = (item: CustomMenuItem) => {
    const active = getActiveState(item, pathname);
    const hasChildren = !!item.children && item.children.length > 0;
    const showsChildrenInNav = hasChildren && !item.flatInNav;
    const isExpanded = expandedKeys.includes(item.key);
    const isDisabled = !!item.disabled;

    return (
      <div key={item.key}>
        <button
          type="button"
          aria-disabled={isDisabled}
          className={cn(
            navItemClass(active, sidebarCollapsed),
            'w-full text-left',
            isDisabled && 'cursor-not-allowed',
          )}
          onClick={() => {
            if (isDisabled) return;

            if (showsChildrenInNav) {
              toggleExpand(item.key);
              return;
            }

            goToRoute(item.key);
          }}
          title={sidebarCollapsed ? String(item.label) : undefined}
        >
          {active && !sidebarCollapsed && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
          )}
          <span className={navIconClass(active)}>{item.icon}</span>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 truncate text-[13px] font-medium">
                {item.label}
              </span>
              {showsChildrenInNav && (
                <span className="ml-auto flex-shrink-0 opacity-60">
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              )}
            </>
          )}
        </button>

        {showsChildrenInNav && isExpanded && !sidebarCollapsed && (
          <div className="ml-[28px] py-1 pl-3">
            {item.children?.map((child) => {
              const childActive = pathname === child.key;
              return (
                <button
                  key={child.key}
                  type="button"
                  onClick={() => goToRoute(child.key)}
                  className={cn(
                    'block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-100',
                    childActive
                      ? 'font-medium text-brand'
                      : 'text-muted-foreground hover:bg-white/50 hover:text-foreground',
                  )}
                >
                  {child.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const settingsActive = isSettingsPath(pathname) || pathname === '/settings';
  const userManagementActive =
    pathname === '/user-management' || pathname.startsWith('/user-management/');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-page">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex h-full flex-col bg-primary-muted text-foreground transition-all duration-200',
          sidebarCollapsed
            ? 'w-[60px] min-w-[60px]'
            : 'w-[220px] min-w-[220px]',
        )}
      >
        {/* Sidebar Header - Tenant (standalone only; Core shell owns branding) */}
        {!IS_CORE && (
          <div
            className={cn(
              'flex h-16 flex-shrink-0 items-center border-b border-primary-border',
              sidebarCollapsed ? 'justify-center px-2' : 'gap-0 px-3',
            )}
          >
            {isTenantResolving ? (
              <div
                className={cn(
                  'flex w-full items-center',
                  sidebarCollapsed ? 'justify-center' : 'gap-3',
                )}
              >
                <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-lg bg-primary/30" />
                {!sidebarCollapsed ? (
                  <div className="h-4 w-28 animate-pulse rounded bg-foreground/10" />
                ) : null}
              </div>
            ) : (
              <div
                className={cn(
                  'flex items-center',
                  sidebarCollapsed ? 'justify-center' : 'w-full gap-3',
                )}
                title={APP_BRAND_NAME}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg',
                    showLogo
                      ? 'bg-background p-1.5 ring-1 ring-primary-border/60'
                      : 'bg-primary',
                  )}
                >
                  {showLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companyLogo}
                      alt={APP_BRAND_NAME}
                      className="h-full w-full object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-brand-foreground">
                      {initials}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-normal leading-snug tracking-tight text-foreground">
                      {APP_BRAND_NAME}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Sidebar Navigation */}
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
          {groupedMenuItems.map((group) => (
            <div key={group.label || 'ungrouped'}>
              {!sidebarCollapsed && group.label ? (
                <div className="mb-1 px-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 border-t border-primary-border p-2">
          <AccessGuard permissions={['view-users']}>
            <button
              type="button"
              onClick={() => goToRoute('/user-management')}
              className={cn(
                navItemClass(userManagementActive, sidebarCollapsed),
                'w-full text-left',
              )}
              title={sidebarCollapsed ? 'User Management' : undefined}
            >
              {userManagementActive && !sidebarCollapsed && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
              )}
              <span className={navIconClass(userManagementActive)}>
                <UserCog size={16} />
              </span>
              {!sidebarCollapsed && (
                <span className="flex-1 text-[13px] font-medium">
                  User Management
                </span>
              )}
            </button>
          </AccessGuard>

          {settingsItem && (
            <button
              type="button"
              onClick={() => goToRoute(SETTINGS_PATH)}
              className={cn(
                navItemClass(settingsActive, sidebarCollapsed),
                'w-full text-left',
              )}
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              {settingsActive && !sidebarCollapsed && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary/40" />
              )}
              <span className={navIconClass(settingsActive)}>
                <Settings size={16} />
              </span>
              {!sidebarCollapsed && (
                <span className="flex-1 text-[13px] font-medium">Settings</span>
              )}
            </button>
          )}

          {/* Collapse/Expand Button - Always visible */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              navItemClass(false, sidebarCollapsed),
              'w-full text-left text-muted-foreground',
            )}
            aria-label={
              sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            title={sidebarCollapsed ? 'Expand sidebar' : undefined}
          >
            <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground">
              {sidebarCollapsed ? (
                <ChevronsRight size={16} />
              ) : (
                <ChevronsLeft size={16} />
              )}
            </span>
            {!sidebarCollapsed && (
              <span className="flex-1 text-[13px] font-medium">Collapse</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-page">
        {/* Desktop Header */}
        {!IS_CORE && (
          <div className="hidden md:block">
            <NavBar customHeader={customHeader} handleLogout={handleLogout} />
          </div>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0',
            userManagementActive && 'bg-surface-card',
          )}
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>

      {/* Inline collaboration panel — a flex sibling of the content above, so
          opening it narrows the page instead of covering it. */}
      <CollaborationDock embedded />
    </div>
  );
};

export default Nav;
