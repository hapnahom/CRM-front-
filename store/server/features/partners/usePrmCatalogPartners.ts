'use client';

import { useMemo } from 'react';
import { usePartners } from '@/store/server/features/partners/queries';
import type {
  Vendor,
  ImplementationPartner,
} from '@/modules/product-catalog/types';

/** PRM partners mapped to catalog selector item shapes for opportunity solutions. */
export function usePrmCatalogPartners() {
  const query = usePartners({ pageSize: 1000 });

  const vendors = useMemo<Vendor[]>(() => {
    return (query.data?.partners ?? []).map((partner) => ({
      id: partner.id,
      name: partner.name,
      description: '',
      status: partner.status === 'Active' ? 'active' : 'inactive',
      productFamilyIds: [],
      targets: [],
      createdAt: '',
      updatedAt: '',
    }));
  }, [query.data?.partners]);

  const implementationPartners = useMemo<ImplementationPartner[]>(() => {
    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      status: v.status,
      productFamilyIds: [],
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  }, [vendors]);

  return {
    vendors,
    implementationPartners,
    isLoading: query.isLoading,
  };
}
