'use client';
import React, { ReactNode, useEffect, useState } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';

interface AccessGuardProps {
  roles?: string[];
  permissions?: string[];
  id?: string;
  selfShouldAccess?: boolean;
  children?: ReactNode;
}

const AccessGuard: React.FC<AccessGuardProps> & {
  checkAccess: (props: AccessGuardProps) => boolean;
  checkAnyAccess: (props: AccessGuardProps) => boolean;
} = ({ roles, permissions, id, selfShouldAccess = false, children }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <></>;
  }

  const hasAccess = AccessGuard.checkAccess({
    roles,
    permissions,
    id,
    selfShouldAccess,
  });

  if (hasAccess) {
    return <>{children}</>;
  }

  return <></>;
};

// Static method for programmatic access checks
AccessGuard.checkAccess = ({
  roles,
  permissions,
  id,
  selfShouldAccess = false,
}: AccessGuardProps): boolean => {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    return true;
  }
  const { userData, userId } = useAuthenticationStore.getState();

  const role = userData?.role?.slug || '';
  const userPermissions = userData?.userPermissions || [];

  const isOwner = role === 'owner';

  const hasRole = roles ? roles.includes(role) : true;

  const hasPermission = permissions
    ? permissions.every((permission) =>
        userPermissions.some(
          (userPermission: { permission: { slug: string } }) =>
            userPermission.permission?.slug === permission,
        ),
      )
    : true;

  const hasSelfAccess = selfShouldAccess && id === userId;

  return isOwner || (hasRole && (hasPermission || hasSelfAccess));
};

AccessGuard.checkAnyAccess = ({
  roles,
  permissions,
  id,
  selfShouldAccess = false,
}: AccessGuardProps): boolean => {
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    return true;
  }
  const { userData, userId } = useAuthenticationStore.getState();

  const role = userData?.role?.slug || '';
  const userPermissions = userData?.userPermissions || [];

  const isOwner = role === 'owner';

  const hasRole = roles ? roles.includes(role) : true;

  const hasPermission = permissions?.length
    ? permissions.some((permission) =>
        userPermissions.some(
          (userPermission: { permission: { slug: string } }) =>
            userPermission.permission?.slug === permission,
        ),
      )
    : true;

  const hasSelfAccess = selfShouldAccess && id === userId;

  return isOwner || (hasRole && (hasPermission || hasSelfAccess));
};

export default AccessGuard;
