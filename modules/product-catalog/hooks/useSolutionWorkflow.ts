'use client';

import { useMemo } from 'react';
import { usePartnerRoles } from '@/modules/partners/roles';
import type { PartnerRole } from '@/modules/partners/roles/types';
import {
  useProductCatalogSettings,
  type ProductCatalogSettings,
} from '@/store/server/features/product-catalog/settings';

export type SolutionSlot = PartnerRole;

/** Fallback when no before-product roles are configured for solutions. */
export const DEFAULT_BEFORE_PRODUCT_SLOT: SolutionSlot = {
  id: '__default_partner__',
  name: 'Vendor',
  code: 'vendor',
  description: 'OEM / product vendor organization',
  isSystem: true,
  isActive: true,
  isPrimary: true,
  displayOrder: 1,
  useInSolutions: true,
  solutionOrder: 1,
  solutionPlacement: 'before_product',
  solutionRequired: false,
  solutionCardinality: 'one',
  filterByProductLink: true,
  solutionFieldSet: 'deal_registration',
  createdAt: '',
  updatedAt: '',
};

export function sortSolutionSlots(roles: PartnerRole[]): SolutionSlot[] {
  return roles
    .filter((role) => role.isActive && role.useInSolutions)
    .sort(
      (a, b) =>
        a.solutionOrder - b.solutionOrder || a.name.localeCompare(b.name),
    );
}

/**
 * Effective solutions workflow for the current tenant:
 * partner-role slots + require family/product toggles.
 */
export function useSolutionWorkflow() {
  const { roles, isLoading: rolesLoading } = usePartnerRoles();
  const settingsQuery = useProductCatalogSettings();

  const slots = useMemo(() => sortSolutionSlots(roles), [roles]);

  const beforeProductSlots = useMemo(
    () => slots.filter((s) => s.solutionPlacement === 'before_product'),
    [slots],
  );
  const effectiveBeforeProductSlots = useMemo(
    () =>
      beforeProductSlots.length
        ? beforeProductSlots
        : [DEFAULT_BEFORE_PRODUCT_SLOT],
    [beforeProductSlots],
  );
  const afterProductSlots = useMemo(
    () =>
      slots.filter(
        (s) =>
          s.solutionPlacement === 'after_product' ||
          s.solutionPlacement === 'with_product',
      ),
    [slots],
  );

  /** Role codes for before-product partner slots on a solution. */
  const beforeProductRoleCodes = useMemo(() => {
    const codes = beforeProductSlots.map((s) => s.code);
    return codes.length ? codes : ['vendor'];
  }, [beforeProductSlots]);

  /** Role codes used for the legacy implementation-partner field. */
  const afterProductRoleCodes = useMemo(() => {
    const codes = afterProductSlots.map((s) => s.code);
    return codes.length ? codes : ['implementation_partner'];
  }, [afterProductSlots]);

  const settings: ProductCatalogSettings | undefined = settingsQuery.data;

  return {
    slots,
    beforeProductSlots,
    effectiveBeforeProductSlots,
    afterProductSlots,
    beforeProductRoleCodes,
    afterProductRoleCodes,
    requireProductFamily: settings?.requireProductFamily ?? true,
    requireProduct: settings?.requireProduct ?? true,
    isLoading: rolesLoading || settingsQuery.isLoading,
  };
}
