import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import { formatUserName } from '@/lib/format-user-name';
import { useGetPlatformUsers } from '@/store/server/features/userManagement/queries';
import type {
  CatalogProduct,
  CatalogUser,
  ImplementationPartner,
  OpportunityEntityType,
  OpportunityProductLine,
  OpportunitySolution,
  ProductFamily,
  Vendor,
} from '@/modules/product-catalog/types';
import {
  catalogAuthHeaders,
  PARTNERS_URL,
  PRODUCT_FAMILIES_URL,
  PRODUCTS_URL,
  retryUnlessUnauthorized,
  unwrapCatalogList,
  VENDORS_URL,
  LEADS_URL,
  DEALS_URL,
} from './api';
import type { ProductPerformanceResponse } from './types';
import type { CatalogProductListFilters } from './types';

export const productCatalogKeys = {
  families: ['product-families'] as const,
  products: ['catalog-products'] as const,
  productsList: (filters: CatalogProductListFilters) =>
    ['catalog-products', 'list', filters] as const,
  vendors: ['catalog-vendors'] as const,
  partners: ['implementation-partners'] as const,
  opportunity: (entityType: OpportunityEntityType, entityId: string) =>
    ['opportunity-products', entityType, entityId] as const,
  solutions: (entityType: OpportunityEntityType, entityId: string) =>
    ['opportunity-solutions', entityType, entityId] as const,
  performance: (sessionId?: string, sessionIds?: string, currency?: string) =>
    [
      'product-performance',
      sessionId ?? sessionIds ?? 'all-sessions',
      currency ?? 'ALL',
    ] as const,
};

async function fetchList<T>(url: string): Promise<T[]> {
  const headers = await catalogAuthHeaders();
  const raw = await crudRequest({ url, method: 'GET', headers });
  return unwrapCatalogList<T>(raw);
}

function asIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && 'id' in item
          ? String((item as { id?: unknown }).id ?? '')
          : '',
    )
    .filter(Boolean);
}

function normalizeCatalogProduct(row: CatalogProduct): CatalogProduct {
  const raw = row as CatalogProduct & {
    vendors?: unknown;
    implementationPartners?: unknown;
  };
  return {
    ...row,
    vendorIds: asIdArray(raw.vendorIds ?? raw.vendors),
    implementationPartnerIds: asIdArray(
      raw.implementationPartnerIds ?? raw.implementationPartners,
    ),
    productPartners: Array.isArray(raw.productPartners)
      ? raw.productPartners
      : [],
  };
}

function normalizeProductFamily(row: ProductFamily): ProductFamily {
  const raw = row as ProductFamily & {
    responsibleUsers?: unknown;
    responsibleTeams?: unknown;
  };
  return {
    ...row,
    responsibleUserIds: asIdArray(
      raw.responsibleUserIds ?? raw.responsibleUsers,
    ),
    responsibleTeamIds: asIdArray(
      raw.responsibleTeamIds ?? raw.responsibleTeams,
    ),
    familyPartners: Array.isArray(raw.familyPartners) ? raw.familyPartners : [],
  };
}

function normalizeVendor(row: Vendor): Vendor {
  const raw = row as Vendor & { productFamilies?: unknown };
  return {
    ...row,
    productFamilyIds: asIdArray(raw.productFamilyIds ?? raw.productFamilies),
    targets: Array.isArray(raw.targets) ? raw.targets : [],
  };
}

function normalizePartner(row: ImplementationPartner): ImplementationPartner {
  const raw = row as ImplementationPartner & { productFamilies?: unknown };
  return {
    ...row,
    productFamilyIds: asIdArray(raw.productFamilyIds ?? raw.productFamilies),
  };
}

export function useProductFamilies() {
  return useQuery(
    productCatalogKeys.families,
    async () => {
      const rows = await fetchList<ProductFamily>(PRODUCT_FAMILIES_URL);
      return rows.map(normalizeProductFamily);
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useCatalogProducts(enabled = true) {
  return useQuery(
    productCatalogKeys.products,
    async () => {
      const rows = await fetchList<CatalogProduct>(PRODUCTS_URL);
      return rows.map(normalizeCatalogProduct);
    },
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePaginatedCatalogProducts(
  filters: CatalogProductListFilters = {},
  enabled = true,
) {
  return useQuery(
    productCatalogKeys.productsList(filters),
    async () => {
      const headers = await catalogAuthHeaders();
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.pageSize) params.pageSize = String(filters.pageSize);
      if (filters.search?.trim()) params.search = filters.search.trim();
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }

      const raw = await crudRequest({
        url: PRODUCTS_URL,
        method: 'GET',
        headers,
        params,
      });

      const paginated = raw as {
        data?: CatalogProduct[];
        pagination?: {
          totalItems: number;
          currentPage: number;
          itemsPerPage: number;
          totalPages: number;
        };
      };

      const rows = Array.isArray(paginated?.data)
        ? paginated.data
        : unwrapCatalogList<CatalogProduct>(raw);

      return {
        products: rows.map(normalizeCatalogProduct),
        pagination: paginated?.pagination,
      };
    },
    {
      enabled,
      staleTime: 15_000,
      keepPreviousData: true,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useCatalogVendors(enabled = true) {
  return useQuery(
    productCatalogKeys.vendors,
    async () => {
      const rows = await fetchList<Vendor>(VENDORS_URL);
      return rows.map(normalizeVendor);
    },
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useImplementationPartners() {
  return useQuery(
    productCatalogKeys.partners,
    async () => {
      const rows = await fetchList<ImplementationPartner>(PARTNERS_URL);
      return rows.map(normalizePartner);
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useOpportunityProducts(
  entityType: OpportunityEntityType,
  entityId: string | undefined,
) {
  return useQuery(
    productCatalogKeys.opportunity(entityType, entityId ?? ''),
    async () => {
      const headers = await catalogAuthHeaders();
      const base = entityType === 'lead' ? LEADS_URL : DEALS_URL;
      const raw = await crudRequest({
        url: `${base}/${entityId}/products`,
        method: 'GET',
        headers,
      });
      return Array.isArray(raw) ? (raw as OpportunityProductLine[]) : [];
    },
    {
      enabled: Boolean(entityId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useOpportunitySolutions(
  entityType: OpportunityEntityType,
  entityId: string | undefined,
) {
  return useQuery(
    productCatalogKeys.solutions(entityType, entityId ?? ''),
    async () => {
      const headers = await catalogAuthHeaders();
      const base = entityType === 'lead' ? LEADS_URL : DEALS_URL;
      const raw = await crudRequest({
        url: `${base}/${entityId}/solutions`,
        method: 'GET',
        headers,
      });
      const rows = Array.isArray(raw) ? (raw as OpportunitySolution[]) : [];
      return rows.map((row) => ({
        ...row,
        currency: row.currency ?? '',
        roleAssignments: row.roleAssignments ?? [],
        assigneeUserIds: row.assigneeUserIds ?? [],
        assigneeContributions: row.assigneeContributions ?? [],
        productFamilyName: row.productFamilyName ?? row.familyName,
        vendors: (row.vendors ?? []).map((vendor) => ({
          ...vendor,
          currency: vendor.currency ?? '',
          products: (vendor.products ?? []).map((product) => ({
            ...product,
            currency: product.currency ?? '',
          })),
        })),
        products: (row.products ?? []).map((product) => ({
          ...product,
          currency: product.currency ?? '',
        })),
      }));
    },
    {
      enabled: Boolean(entityId),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useProductPerformance(
  sessionId?: string,
  sessionIds?: string,
  currency?: string,
) {
  return useQuery(
    productCatalogKeys.performance(sessionId, sessionIds, currency),
    async () => {
      const headers = await catalogAuthHeaders();
      const params: Record<string, string> = {};
      if (sessionId) params.sessionId = sessionId;
      if (!sessionId && sessionIds) params.sessionIds = sessionIds;
      if (currency) params.currency = currency;
      return crudRequest({
        url: `${PRODUCTS_URL}/performance`,
        method: 'GET',
        headers,
        params,
      }) as Promise<ProductPerformanceResponse>;
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useCatalogUsers() {
  const query = useGetPlatformUsers({
    page: 1,
    pageSize: 1000,
  });
  const users: CatalogUser[] = (query.data?.data ?? []).map((user) => ({
    id: user.id,
    name: formatUserName(user),
    email: user.email ?? '',
  }));
  return { ...query, users };
}
