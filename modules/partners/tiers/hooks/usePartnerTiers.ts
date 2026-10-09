'use client';

import { useCallback, useMemo, type CSSProperties } from 'react';
import { useQueryClient } from 'react-query';
import {
  usePartnerTiersQuery,
  partnerKeys,
} from '@/store/server/features/partners/queries';
import {
  useCreatePartnerTier,
  useUpdatePartnerTier,
  useDeletePartnerTier,
  useActivatePartnerTier,
  useDeactivatePartnerTier,
} from '@/store/server/features/partners/mutations';
import type {
  CreatePartnerTierInput,
  PartnerTierDefinition,
  UpdatePartnerTierInput,
} from '../types';

export function usePartnerTiers() {
  const queryClient = useQueryClient();
  const tiersQuery = usePartnerTiersQuery();
  const createMutation = useCreatePartnerTier();
  const updateMutation = useUpdatePartnerTier();
  const deleteMutation = useDeletePartnerTier();
  const activateMutation = useActivatePartnerTier();
  const deactivateMutation = useDeactivatePartnerTier();

  const tiers = useMemo(() => tiersQuery.data ?? [], [tiersQuery.data]);

  const activeTiers = useMemo(
    () =>
      [...tiers]
        .filter((tier) => tier.isActive)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
        ),
    [tiers],
  );

  const getTierById = useCallback(
    (id: string | undefined) =>
      id ? tiers.find((tier) => tier.id === id) : undefined,
    [tiers],
  );

  const getTierByName = useCallback(
    (name: string | undefined) =>
      name ? tiers.find((tier) => tier.name === name) : undefined,
    [tiers],
  );

  const createTier = useCallback(
    (input: CreatePartnerTierInput) => {
      return createMutation.mutateAsync({
        name: input.name,
        description: input.description,
        color: input.color,
        borderColor: input.borderColor,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder,
      });
    },
    [createMutation],
  );

  const updateTier = useCallback(
    (id: string, input: UpdatePartnerTierInput) => {
      return updateMutation.mutateAsync({ id, payload: input });
    },
    [updateMutation],
  );

  const deleteTier = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  const setTierActive = useCallback(
    (id: string, isActive: boolean) => {
      if (isActive) return activateMutation.mutateAsync(id);
      return deactivateMutation.mutateAsync(id);
    },
    [activateMutation, deactivateMutation],
  );

  return {
    tiers,
    activeTiers,
    isLoading: tiersQuery.isLoading,
    createTier,
    updateTier,
    deleteTier,
    setTierActive,
    getTierById,
    getTierByName,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers }),
  };
}

export function partnerTierBadgeStyle(
  tier?: Pick<PartnerTierDefinition, 'color' | 'borderColor'> | null,
): CSSProperties {
  if (!tier) return {};
  return {
    backgroundColor: tier.color || undefined,
    borderColor: tier.borderColor || undefined,
    color: undefined,
  };
}
