'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import NotificationBar from './notificationBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { settingsPath } from '@/lib/routes/settings';
import { formatUserName } from '@/lib/format-user-name';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { IS_CORE } from '@/utils/constants';

interface NavBarProps {
  customHeader?: React.ReactNode;
  handleLogout: () => void;
}

const NavBar = ({ customHeader, handleLogout }: NavBarProps) => {
  const router = useRouter();
  const { userData } = useAuthenticationStore();
  const displayName: string = formatUserName(userData, 'User');
  const roleName: string =
    userData?.role?.name ||
    userData?.role?.slug ||
    userData?.roles?.[0]?.name ||
    'User';
  const isCoreShell = IS_CORE;
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <header
      className="hidden h-14 flex-shrink-0 items-center gap-4 border-b border-border bg-surface-card px-6 md:flex"
      style={{ height: customHeader ? 80 : undefined }}
    >
      {customHeader ? (
        <div className="flex flex-1 items-center gap-3">{customHeader}</div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-2">
        <NotificationBar />
        <div className="h-5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-auto items-center gap-2.5 rounded-xl px-2 py-1.5 outline-none transition-all duration-200 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-hover text-xs font-semibold text-brand-foreground shadow-sm">
                {userData?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userData.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <div className="max-w-[120px] truncate text-[13px] font-medium leading-tight text-foreground">
                  {displayName}
                </div>
                <div className="max-w-[120px] truncate text-xs leading-tight text-muted-foreground">
                  {roleName}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => router.push(settingsPath())}
              className="text-[13px] rounded-lg"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isCoreShell ? (
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-[13px] text-red-600 rounded-lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default NavBar;
