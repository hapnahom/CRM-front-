'use client';

import { useMemo } from 'react';
import {
  OpportunitySolutionsSection,
  type OpportunitySolutionsChangeMeta,
} from '@/modules/product-catalog/components/OpportunitySolutionsSection';
import type {
  OpportunityEntityType,
  OpportunitySolution,
} from '@/modules/product-catalog/types';
import {
  useCatalogProducts,
  useOpportunitySolutions,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import { usePrmCatalogPartners } from '@/store/server/features/partners/usePrmCatalogPartners';
import { useReplaceOpportunitySolutions } from '@/store/server/features/product-catalog/mutations';
import { catalogErrorMessage } from '@/modules/product-catalog/utils';
import { toast } from 'sonner';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';

export function BoundOpportunitySolutions({
  entityType,
  entityId,
  opportunityValue,
  currency = 'USD',
  readOnly,
  hideHeader,
  footerNote,
}: {
  entityType: OpportunityEntityType;
  entityId: string;
  opportunityValue: number;
  currency?: string;
  readOnly?: boolean;
  hideHeader?: boolean;
  footerNote?: string;
}) {
  const { data: families = [] } = useProductFamilies();
  const { data: products = [] } = useCatalogProducts();
  const { vendors, implementationPartners: partners } = usePrmCatalogPartners();
  const { data: solutions = [] } = useOpportunitySolutions(
    entityType,
    entityId,
  );
  const { data: platformUsersData } = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const users = platformUsersData?.data ?? [];
  const replaceSolutions = useReplaceOpportunitySolutions(entityType, entityId);

  const handleChange = async (
    next: OpportunitySolution[],
    meta?: OpportunitySolutionsChangeMeta,
  ) => {
    try {
      await replaceSolutions.mutateAsync(next);
      if (meta?.successMessage) toast.success(meta.successMessage);
    } catch (error) {
      const msg = catalogErrorMessage(error, 'Could not save solutions');
      if (msg) toast.error(msg);
      throw error;
    }
  };

  const displaySolutions = useMemo(() => solutions, [solutions]);

  return (
    <OpportunitySolutionsSection
      solutions={displaySolutions}
      onChange={handleChange}
      products={products}
      families={families}
      vendors={vendors}
      partners={partners}
      users={users}
      opportunityValue={opportunityValue}
      currency={currency}
      readOnly={readOnly}
      deferSuccessToast
      hideHeader={hideHeader}
      footerNote={footerNote}
    />
  );
}
