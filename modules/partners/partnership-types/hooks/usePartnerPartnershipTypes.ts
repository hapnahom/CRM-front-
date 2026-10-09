'use client';

import { useCallback, useMemo, type CSSProperties } from 'react';
import { useQueryClient } from 'react-query';
import {
  usePartnerPartnershipTypesQuery,
  partnerKeys,
} from '@/store/server/features/partners/queries';
import {
  useCreatePartnerPartnershipType,
  useUpdatePartnerPartnershipType,
  useDeletePartnerPartnershipType,
  useActivatePartnerPartnershipType,
  useDeactivatePartnerPartnershipType,
} from '@/store/server/features/partners/mutations';
import type {
  CreatePartnerPartnershipTypeInput,
  PartnerPartnershipTypeDefinition,
  UpdatePartnerPartnershipTypeInput,
} from '../types';

export function usePartnerPartnershipTypes() {
  const queryClient = useQueryClient();
  const typesQuery = usePartnerPartnershipTypesQuery();
  const createMutation = useCreatePartnerPartnershipType();
  const updateMutation = useUpdatePartnerPartnershipType();
  const deleteMutation = useDeletePartnerPartnershipType();
  const activateMutation = useActivatePartnerPartnershipType();
  const deactivateMutation = useDeactivatePartnerPartnershipType();

  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data]);

  const activeTypes = useMemo(
    () =>
      [...types]
        .filter((type) => type.isActive)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
        ),
    [types],
  );

  const getTypeById = useCallback(
    (id: string | undefined) =>
      id ? types.find((type) => type.id === id) : undefined,
    [types],
  );

  const getTypeByName = useCallback(
    (name: string | undefined) =>
      name ? types.find((type) => type.name === name) : undefined,
    [types],
  );

  const getDefaultTypeId = useCallback(() => {
    return activeTypes.find((type) => type.isPrimary)?.id;
  }, [activeTypes]);

  const createType = useCallback(
    (input: CreatePartnerPartnershipTypeInput) => {
      return createMutation.mutateAsync({
        name: input.name,
        description: input.description,
        color: input.color,
        borderColor: input.borderColor,
        isActive: input.isActive ?? true,
        isPrimary: input.isPrimary,
        displayOrder: input.displayOrder,
      });
    },
    [createMutation],
  );

  const updateType = useCallback(
    (id: string, input: UpdatePartnerPartnershipTypeInput) => {
      return updateMutation.mutateAsync({ id, payload: input });
    },
    [updateMutation],
  );

  const deleteType = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  const setTypeActive = useCallback(
    (id: string, isActive: boolean) => {
      if (isActive) return activateMutation.mutateAsync(id);
      return deactivateMutation.mutateAsync(id);
    },
    [activateMutation, deactivateMutation],
  );

  return {
    types,
    activeTypes,
    isLoading: typesQuery.isLoading,
    createType,
    updateType,
    deleteType,
    setTypeActive,
    getTypeById,
    getTypeByName,
    getDefaultTypeId,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: partnerKeys.partnershipTypes,
      }),
  };
}

export function partnerPartnershipTypeBadgeStyle(
  type?: Pick<PartnerPartnershipTypeDefinition, 'color' | 'borderColor'> | null,
): CSSProperties {
  if (!type) return {};
  return {
    backgroundColor: type.color || undefined,
    borderColor: type.borderColor || undefined,
    color: undefined,
  };
}
