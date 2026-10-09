'use client';
import { message, Modal, Input } from 'antd';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  linkWithCredential,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  microsoftProvider,
} from '@/utils/firebaseConfig';
import { useGetAuthMe } from '@/store/server/features/authentication/queries';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { handleFirebaseSignInError } from '@/utils/showErrorResponse';
import { useGetActiveFiscalYearsData } from '@/store/server/features/organizationStructure/fiscalYear/queries';
import { useEffect } from 'react';
import { FirebaseError } from 'firebase/app';

export const useHandleSignIn = () => {
  const {
    setError,
    setLoading,
    setToken,
    setUserId,
    token,
    tenantId,
    setLocalId,
    setTenantId,
    setUserData,
    setActiveCalendar,
    setLoggedUserRole,
    clearAuth,
  } = useAuthenticationStore();

  const { refetch: fetchAuthMe } = useGetAuthMe();
  const { refetch: refetchFiscalYear } = useGetActiveFiscalYearsData();
  const router = useRouter();

  const normalizeAuthMeUser = (payload: any) => {
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
  };

  const failBootstrap = async (messageText: string) => {
    message.error(messageText);
    try {
      await signOut(auth);
    } finally {
      clearAuth();
    }
  };

  const getAuthBootstrapErrorMessage = (error: any): string | null => {
    const data = error?.response?.data;
    const code = typeof data?.code === 'string' ? data.code : null;
    const msg = typeof data?.message === 'string' ? data.message : null;

    if (code === 'AUTH_ACCOUNT_SUSPENDED') {
      return msg ?? 'Your account has been suspended.';
    }
    if (code === 'AUTH_INVITATION_PENDING') {
      return (
        msg ??
        'Your invitation has not been accepted yet. Please open your invitation link to activate your account.'
      );
    }
    if (code === 'AUTH_INVITATION_DECLINED') {
      return (
        msg ??
        'Your invitation was declined. Ask an administrator to send a new invitation.'
      );
    }
    if (code === 'AUTH_INVITATION_EXPIRED') {
      return (
        msg ??
        'Your invitation has expired. Ask an administrator to send a new invitation.'
      );
    }
    if (code === 'AUTH_ACCOUNT_INACTIVE') {
      return msg ?? 'Your account is not active. Contact an administrator.';
    }

    if (error?.response?.status === 401 && msg) {
      return msg;
    }

    return null;
  };

  useEffect(() => {
    if (token.length > 0 && tenantId.length > 0) {
      refetchFiscalYear();
    }
  }, [token, tenantId, refetchFiscalYear]);

  const handleAccountLinking = async (
    err: any,
    attemptedProviderId?: string,
  ) => {
    try {
      let email = err.customData?.email;
      const requestEmailViaModal = (): Promise<string> =>
        new Promise((resolve) => {
          let inputValue = '';
          Modal.confirm({
            title: 'Link accounts',
            content: (
              <div>
                <p>Please enter your account email to continue linking:</p>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  onChange={(e) => {
                    inputValue = e.target.value;
                  }}
                />
              </div>
            ),
            okText: 'Continue',
            cancelText: 'Cancel',
            onOk: () => {
              if (!inputValue) {
                message.error('Please enter your email');
                return Promise.reject();
              }
              resolve(inputValue.toLowerCase());
            },
            onCancel: () => resolve(''),
          });
        });

      const requestPasswordViaModal = (
        emailAddress: string,
        providerLabel: string,
      ): Promise<string> =>
        new Promise((resolve) => {
          let passwordValue = '';
          Modal.confirm({
            title: 'Link accounts',
            content: (
              <div>
                <p>
                  An account already exists with {emailAddress}. Please enter
                  your password to link your {providerLabel} account:
                </p>
                <Input.Password
                  placeholder="Password"
                  onChange={(e) => {
                    passwordValue = e.target.value;
                  }}
                />
              </div>
            ),
            okText: 'Link',
            cancelText: 'Cancel',
            onOk: () => {
              if (!passwordValue) {
                message.error('Please enter your password');
                return Promise.reject();
              }
              resolve(passwordValue);
            },
            onCancel: () => resolve(''),
          });
        });

      const getPendingCredential = () => {
        try {
          if (attemptedProviderId === 'google.com') {
            return GoogleAuthProvider.credentialFromError(err);
          }
          if (attemptedProviderId === 'microsoft.com') {
            return OAuthProvider.credentialFromError(err);
          }
        } catch {
          // ignore and try fallback
        }
        try {
          const g = GoogleAuthProvider.credentialFromError(err);
          if (g) return g;
        } catch {}
        try {
          const m = OAuthProvider.credentialFromError(err);
          if (m) return m;
        } catch {}
        return null;
      };

      const pendingCred = getPendingCredential();

      if (!email && pendingCred?.idToken) {
        try {
          const decoded = JSON.parse(atob(pendingCred.idToken.split('.')[1]));
          email = decoded?.email?.toLowerCase();
        } catch {
          message.error('Could not get email from credential');
        }
      }

      if (!email) {
        email = await requestEmailViaModal();
      }

      if (!email) {
        message.error('Unable to proceed without an email address.');
        return;
      }

      let methods: string[] = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, email.toLowerCase());
      } catch {
        message.warning('fetchSignInMethodsForEmail failed');
      }

      if (!methods || methods.length === 0) {
        message.warning(
          'We could not detect your previous sign-in method. Please log in with your email and password, then try linking again.',
        );
        return;
      }

      if (methods.includes('password')) {
        const password = await requestPasswordViaModal(
          email,
          pendingCred?.providerId || 'social',
        );

        if (password) {
          const emailUser = await signInWithEmailAndPassword(
            auth,
            email.toLowerCase(),
            password,
          );
          if (pendingCred) {
            await linkWithCredential(emailUser.user, pendingCred);
            message.success(
              'Your accounts are now linked. Please sign in again.',
            );
          } else {
            message.warning(
              'We could not retrieve the pending credential to complete linking. Please try your social login again to finish linking.',
            );
          }
        }
      } else if (methods.includes('google.com')) {
        const googleResult = await signInWithPopup(auth, googleProvider);
        if (pendingCred) {
          await linkWithCredential(googleResult.user, pendingCred);
          message.success('Linked Microsoft account to Google successfully.');
        } else {
          message.warning(
            'We could not retrieve the pending credential. Please try the original social login again after signing in with Google.',
          );
        }
      } else if (methods.includes('microsoft.com')) {
        const msResult = await signInWithPopup(auth, microsoftProvider);
        if (pendingCred) {
          await linkWithCredential(msResult.user, pendingCred);
          message.success('Linked Google account to Microsoft successfully.');
        } else {
          message.warning(
            'We could not retrieve the pending credential. Please try the original social login again after signing in with Microsoft.',
          );
        }
      } else {
        message.warning(
          'We detected an unknown login method. Please sign in with your original account.',
        );
      }
    } catch (linkErr) {
      message.error('Account linking failed');
      handleFirebaseSignInError(linkErr as FirebaseError);
    }
  };

  const handleSignIn = async (
    signInMethod: () => Promise<any>,
    attemptedProviderId?: 'google.com' | 'microsoft.com',
  ) => {
    setLoading(true);
    setError('');
    try {
      const userCredentials = await signInMethod();
      const user = userCredentials.user;
      const token = await user.getIdToken();
      const uid = user.uid;

      message.loading({
        content: 'Signing in...',
        key: 'redirect',
        duration: 0,
      });

      const fetchedData = await fetchAuthMe(token);
      if (fetchedData.isError) {
        message.destroy('redirect');
        const specificMessage = getAuthBootstrapErrorMessage(fetchedData.error);
        await failBootstrap(
          specificMessage ??
            'Failed to initialize your session. Please try again.',
        );
        return;
      }

      const userData = normalizeAuthMeUser(fetchedData?.data);
      const accountStatus =
        typeof userData?.status === 'string'
          ? userData.status.trim().toLowerCase()
          : '';

      // Defense in depth: backend must already enforce this; refuse non-active locally too.
      if (accountStatus !== 'active') {
        message.destroy('redirect');
        await failBootstrap(
          accountStatus === 'suspended'
            ? 'Your account has been suspended.'
            : accountStatus === 'invited'
              ? 'Your invitation has not been accepted yet. Please open your invitation link to activate your account.'
              : 'Your account is not active. Contact an administrator.',
        );
        return;
      }

      if (!userData.tenantId) {
        message.destroy('redirect');
        await failBootstrap(
          'Unable to resolve your workspace. Please contact support.',
        );
        return;
      }

      setToken(token);
      setLocalId(uid);
      setTenantId(userData.tenantId);
      setUserId(userData.id);
      setUserData(userData);
      setLoggedUserRole(userData?.role?.slug || '');

      const fiscalYearData = await refetchFiscalYear();
      const fiscalYearEndDate = fiscalYearData?.data?.endDate;

      if (fiscalYearEndDate) {
        setActiveCalendar(fiscalYearEndDate);
      }

      message.destroy('redirect');
      message.success({
        content: 'Welcome!',
        key: 'welcome',
        duration: 1.2,
      });
      router.push('/dashboard');
    } catch (err: any) {
      message.destroy('redirect');
      message.error('Sign-in error');

      if (err.code === 'auth/account-exists-with-different-credential') {
        await handleAccountLinking(err, attemptedProviderId);
      } else {
        handleFirebaseSignInError(err);
        setError(err);
      }
    } finally {
      message.destroy('redirect');
      setLoading(false);
    }
  };

  return { handleSignIn };
};
