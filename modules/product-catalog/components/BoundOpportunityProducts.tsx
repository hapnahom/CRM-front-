'use client';

import { useMemo } from 'react';
import { OpportunityProductsSection } from '@/modules/product-catalog/components/OpportunityProductsSection';
import type {
  OpportunityEntityType,
  OpportunityProductLine,
} from '@/modules/product-catalog/types';
import {
  useCatalogProducts,
  useOpportunityProducts,
  useProductFamilies,
} from '@/store/server/features/product-catalog/queries';
import { usePrmCatalogPartners } from '@/store/server/features/partners/usePrmCatalogPartners';
import { useReplaceOpportunityProducts } from '@/store/server/features/product-catalog/mutations';
import { catalogErrorMessage } from '@/modules/product-catalog/utils';
import { toast } from 'sonner';

export function BoundOpportunityProducts({
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
  const { data: lines = [] } = useOpportunityProducts(entityType, entityId);
  const replaceProducts = useReplaceOpportunityProducts(entityType, entityId);

  const handleChange = (next: OpportunityProductLine[]) => {
    replaceProducts.mutate(next, {
      onError: (error) => {
        const msg = catalogErrorMessage(error, 'Could not save products');
        if (msg) toast.error(msg);
      },
    });
  };

  const displayLines = useMemo(() => lines, [lines]);

  return (
    <OpportunityProductsSection
      lines={displayLines}
      onChange={handleChange}
      products={products}
      families={families}
      vendors={vendors}
      partners={partners}
      opportunityValue={opportunityValue}
      currency={currency}
      readOnly={readOnly}
      hideHeader={hideHeader}
      footerNote={footerNote}
    />
  );
}
