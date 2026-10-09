'use client';

import { useCallback, useMemo } from 'react';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import {
  buildPipelineFieldAccessMap,
  canEditFieldGroup,
  canViewFieldGroup,
  type PipelineFieldAccessMap,
  type PipelineFieldEntity,
  type PipelineFieldGroup,
} from '@/lib/pipeline/field-access';

const EMPTY_USER_PERMISSIONS: Array<{ permission?: { slug?: string } }> = [];

export function usePipelineFieldAccess(entity: PipelineFieldEntity): {
  access: PipelineFieldAccessMap;
  canView: (group: PipelineFieldGroup) => boolean;
  canEdit: (group: PipelineFieldGroup) => boolean;
} {
  const userPermissions = useAuthenticationStore(
    (s) => s.userData?.userPermissions ?? EMPTY_USER_PERMISSIONS,
  );

  const granted = useMemo(() => {
    const slugs: string[] = [];
    for (const entry of userPermissions as Array<{
      permission?: { slug?: string };
    }>) {
      const slug = entry.permission?.slug;
      if (slug) slugs.push(slug);
    }
    return new Set<string>(slugs);
  }, [userPermissions]);

  const access = useMemo(
    () => buildPipelineFieldAccessMap(granted, entity),
    [granted, entity],
  );

  const canView = useCallback(
    (group: PipelineFieldGroup) => canViewFieldGroup(granted, entity, group),
    [granted, entity],
  );

  const canEdit = useCallback(
    (group: PipelineFieldGroup) => canEditFieldGroup(granted, entity, group),
    [granted, entity],
  );

  return {
    access,
    canView,
    canEdit,
  };
}
