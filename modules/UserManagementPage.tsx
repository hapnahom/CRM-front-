'use client';

import { useEffect, useState } from 'react';
import { Users, Shield, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccessGuard from '@/utils/permissionGuard';
import { lazyNamed } from '@/utils/lazyNamed';
import { useIsClient } from '@/hooks/useIsClient';
import {
  UserManagementTableSkeleton,
  RolesPermissionsSkeleton,
  OrgStructureSkeleton,
} from '@/components/loading/skeleton-screens';

const UsersTab = lazyNamed(
  () => import('@/components/user-management/UsersTab'),
  'UsersTab',
  { ssr: false, loading: () => <UserManagementTableSkeleton /> },
);
const RolesTab = lazyNamed(
  () => import('@/components/user-management/RolesTab'),
  'RolesTab',
  { ssr: false, loading: () => <RolesPermissionsSkeleton /> },
);
const TeamsTab = lazyNamed(
  () => import('@/components/user-management/TeamsTab'),
  'TeamsTab',
  { ssr: false, loading: () => <OrgStructureSkeleton /> },
);

type Tab = 'users' | 'roles' | 'teams';

const getTabPermissions = (tabId: Tab): string[] => {
  switch (tabId) {
    case 'users':
      return ['view-users'];
    case 'roles':
      return ['view-roles'];
    case 'teams':
      return ['view-teams'];
    default:
      return [];
  }
};

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'users',
    label: 'Users',
    icon: <Users size={15} />,
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: <Shield size={15} />,
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: <UsersRound size={15} />,
  },
];

export function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [isViewingUser, setIsViewingUser] = useState(false);
  const isClient = useIsClient();

  useEffect(() => {
    if (!isClient) return;
    const hasAccessToActive = AccessGuard.checkAccess({
      permissions: getTabPermissions(activeTab),
    });
    if (!hasAccessToActive) {
      const firstAccessible = tabs.find((tab) =>
        AccessGuard.checkAccess({ permissions: getTabPermissions(tab.id) }),
      );
      if (firstAccessible) {
        setActiveTab(firstAccessible.id);
      }
    }
  }, [isClient, activeTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-card">
      {!(activeTab === 'users' && isViewingUser) && (
        <div className="flex-shrink-0 border-b border-border bg-surface-card">
          <div className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:px-6">
            <h1 className="m-0 text-[20px] font-semibold leading-tight tracking-tight text-foreground">
              User Management
            </h1>
          </div>

          <div className="overflow-x-auto px-4 sm:px-6">
            <div className="flex min-w-max items-center gap-1">
              {tabs.map((tab) => (
                <AccessGuard
                  key={tab.id}
                  permissions={getTabPermissions(tab.id)}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-brand text-brand'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    <span
                      className={
                        activeTab === tab.id
                          ? 'text-brand'
                          : 'text-muted-foreground'
                      }
                    >
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                </AccessGuard>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-card p-3 sm:p-5">
        {activeTab === 'users' && (
          <AccessGuard permissions={getTabPermissions('users')}>
            <UsersTab onViewingChange={setIsViewingUser} />
          </AccessGuard>
        )}
        {activeTab === 'roles' && (
          <AccessGuard permissions={getTabPermissions('roles')}>
            <RolesTab />
          </AccessGuard>
        )}
        {activeTab === 'teams' && (
          <AccessGuard permissions={getTabPermissions('teams')}>
            <TeamsTab />
          </AccessGuard>
        )}
      </div>
    </div>
  );
}
