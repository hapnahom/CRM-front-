import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import type {
  CatalogProduct,
  ImplementationPartner,
  OpportunityEntityType,
  OpportunityProductLine,
  OpportunitySolution,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  catalogAuthHeaders,
  DEALS_URL,
  LEADS_URL,
  PARTNERS_URL,
  PRODUCT_FAMILIES_URL,
  PRODUCTS_URL,
  VENDORS_URL,
} from './api';
import { productCatalogKeys } from './queries';
import { invalidateSalesTargetProgressQueries } from '@/store/server/features/salesTargeting/invalidateProgress';
import type {
  FamilyInput,
  NamedEntityInput,
  ProductInput,
  VendorInput,
} from './types';

function invalidateCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: productCatalogKeys.families });
  queryClient.invalidateQueries({ queryKey: productCatalogKeys.products });
  queryClient.invalidateQueries({ queryKey: productCatalogKeys.vendors });
  queryClient.invalidateQueries({ queryKey: productCatalogKeys.partners });
  queryClient.invalidateQueries({ queryKey: ['product-performance'] });
}

export function useCreateProductFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FamilyInput): Promise<ProductFamily> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: PRODUCT_FAMILIES_URL,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateProductFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<FamilyInput>;
    }): Promise<ProductFamily> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: `${PRODUCT_FAMILIES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useCreateCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductInput): Promise<CatalogProduct> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: PRODUCTS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ProductInput>;
    }): Promise<CatalogProduct> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: `${PRODUCTS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useDeleteCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ message: string }> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: `${PRODUCTS_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VendorInput): Promise<Vendor> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: VENDORS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<VendorInput>;
    }): Promise<Vendor> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: `${VENDORS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: NamedEntityInput,
    ): Promise<ImplementationPartner> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: PARTNERS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<NamedEntityInput>;
    }): Promise<ImplementationPartner> => {
      const headers = await catalogAuthHeaders();
      return crudRequest({
        url: `${PARTNERS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function toOpportunityProductPayload(lines: OpportunityProductLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    vendorId: line.vendorId,
    implementationPartnerId: line.implementationPartnerId,
    amount: line.amount,
    registration: line.registration,
  }));
}

export function toOpportunitySolutionPayload(solutions: OpportunitySolution[]) {
  return solutions.map((solution) => ({
    id: solution.id?.startsWith('sol-') ? undefined : solution.id,
    productFamilyId: solution.productFamilyId,
    amount: solution.amount,
    exactAmount: solution.exactAmount ?? undefined,
    currency: solution.currency || undefined,
    roleAssignments: (solution.roleAssignments ?? []).map((entry) => ({
      roleId: entry.roleId,
      userIds: entry.userIds ?? [],
    })),
    assigneeUserIds: solution.assigneeUserIds ?? [],
    assigneeContributions: (solution.assigneeContributions ?? [])
      .filter((entry) => entry?.userId)
      .map((entry) => ({
        userId: entry.userId,
        amount: entry.amount,
      })),
    vendors: solution.vendors.map((vendor) => ({
      id: vendor.id?.startsWith('sov-') ? undefined : vendor.id,
      partnerRoleId: vendor.partnerRoleId,
      vendorId: vendor.vendorId,
      amount: vendor.amount,
      currency: vendor.currency || undefined,
      registration: vendor.registration,
      products: vendor.products.map((product) => ({
        id: product.id?.startsWith('sop-') ? undefined : product.id,
        productId: product.productId,
        amount: product.amount,
        currency: product.currency || undefined,
        implementationPartnerId: product.implementationPartnerId,
      })),
    })),
    products: [],
  }));
}

export function useReplaceOpportunityProducts(
  entityType: OpportunityEntityType,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      lines: OpportunityProductLine[],
    ): Promise<OpportunityProductLine[]> => {
      if (!entityId) return lines;
      const headers = await catalogAuthHeaders();
      const base = entityType === 'lead' ? LEADS_URL : DEALS_URL;
      return crudRequest({
        url: `${base}/${entityId}/products`,
        method: 'PUT',
        headers,
        data: { products: toOpportunityProductPayload(lines) },
      });
    },
    onSuccess: (saved) => {
      if (!entityId) return;
      queryClient.setQueryData(
        productCatalogKeys.opportunity(entityType, entityId),
        saved,
      );
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      queryClient.invalidateQueries({
        queryKey: productCatalogKeys.solutions(entityType, entityId),
      });
    },
  });
}

export function useReplaceOpportunitySolutions(
  entityType: OpportunityEntityType,
  entityId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      solutions: OpportunitySolution[],
    ): Promise<OpportunitySolution[]> => {
      if (!entityId) return solutions;
      const headers = await catalogAuthHeaders();
      const base = entityType === 'lead' ? LEADS_URL : DEALS_URL;
      return crudRequest({
        url: `${base}/${entityId}/solutions`,
        method: 'PUT',
        headers,
        data: { solutions: toOpportunitySolutionPayload(solutions) },
      });
    },
    onSuccess: (saved) => {
      if (!entityId) return;
      queryClient.setQueryData(
        productCatalogKeys.solutions(entityType, entityId),
        saved,
      );
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
      queryClient.invalidateQueries({
        queryKey: productCatalogKeys.opportunity(entityType, entityId),
      });
      if (entityType === 'deal') {
        invalidateSalesTargetProgressQueries(queryClient);
      }
    },
  });
}
