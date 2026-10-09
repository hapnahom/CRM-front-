'use client';

import { useCallback } from 'react';
import { useGetAuthMe } from '@/store/server/features/authentication/queries';
import { useGetActiveFiscalYearsData } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

/**
 * Populates the business auth store from an already–signed-in Firebase user.
 */
export function decodeUidFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const uid = payload?.user_id || payload?.sub || payload?.uid;
    return typeof uid === 'string' ? uid : '';
  } catch {
    return '';
  }
}

function normalizeAuthMeUser(payload: any) {
  const user = payload?.user ?? {};
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const primaryRole = roles[0];
  const primaryRoleSlug =
    typeof primaryRole?.name === 'string'
      ? primaryRole.name.trim().toLowerCase()
      : '';
  const uniquePermissions = Array.from(
    new Set(
      roles.flatMap((role: any) =>
        Array.isArray(role?.permissions) ? role.permissions : [],
      ),
    ),
  );

  return {
    id: user?.id ?? '',
    tenantId: payload?.tenantId ?? '',
    role: {
      slug: primaryRoleSlug,
      name: primaryRole?.name ?? '',
    },
    userPermissions: uniquePermissions.map((slug) => ({
      permission: { slug },
    })),
    hasCompany: true,
    hasChangedPassword: true,
    ...user,
  };
}

export type BootstrapResult = {
  ok: boolean;
  reason: string;
  /** True when /auth/me rejected the account (suspended, invited, etc.). */
  accountInactive?: boolean;
};

function getAuthMeErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response
    ?.data;
  return typeof data?.code === 'string' ? data.code : null;
}

function isAccountInactiveAuthCode(code: string | null): boolean {
  return (
    code === 'AUTH_ACCOUNT_SUSPENDED' ||
    code === 'AUTH_INVITATION_PENDING' ||
    code === 'AUTH_INVITATION_DECLINED' ||
    code === 'AUTH_INVITATION_EXPIRED' ||
    code === 'AUTH_ACCOUNT_INACTIVE'
  );
}

export function useBusinessSessionBootstrap() {
  const { refetch: fetchAuthMe } = useGetAuthMe();
  const { refetch: refetchFiscalYear } = useGetActiveFiscalYearsData();

  return useCallback(
    async (token: string, uid: string): Promise<BootstrapResult> => {
      try {
        const fetchedData = await fetchAuthMe(token);
        if (fetchedData.isError) {
          const status = (fetchedData.error as any)?.response?.status;
          const code = getAuthMeErrorCode(fetchedData.error);
          return {
            ok: false,
            reason: `/auth/me HTTP ${status ?? '??'}`,
            accountInactive: isAccountInactiveAuthCode(code),
          };
        }

        const userData = normalizeAuthMeUser(fetchedData?.data);
        if (!userData.tenantId) {
          return { ok: false, reason: 'No tenantId returned from /auth/me' };
        }

        const accountStatus =
          typeof userData?.status === 'string'
            ? userData.status.trim().toLowerCase()
            : '';
        if (accountStatus !== 'active') {
          return {
            ok: false,
            reason: `Account status is ${accountStatus || 'unknown'}`,
            accountInactive: true,
          };
        }

        const store = useAuthenticationStore.getState();
        store.setToken(token);
        store.setLocalId(uid);
        store.setTenantId(userData.tenantId);
        store.setUserId(userData.id);
        store.setUserData(userData);
        store.setLoggedUserRole(userData?.role?.slug || '');

        const persistedCalendar = store.activeCalendar;
        if (persistedCalendar) {
          store.setActiveCalendarStatus('ready');
        } else {
          store.setActiveCalendarStatus('loading');
        }

        void refetchFiscalYear()
          .then((fiscalYearData) => {
            const fiscalYearEndDate = fiscalYearData?.data?.endDate;
            if (fiscalYearEndDate) {
              useAuthenticationStore
                .getState()
                .setActiveCalendar(fiscalYearEndDate);
            } else {
              useAuthenticationStore
                .getState()
                .setActiveCalendarStatus('unavailable');
            }
          })
          .catch(() => {
            useAuthenticationStore
              .getState()
              .setActiveCalendarStatus('unavailable');
          });

        return { ok: true, reason: '' };
      } catch (e) {
        return {
          ok: false,
          reason: `Bootstrap threw: ${(e as Error)?.message ?? e}`,
        };
      }
    },
    [fetchAuthMe, refetchFiscalYear],
  );
}
