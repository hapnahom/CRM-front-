import type {
  CatalogProduct,
  CatalogStatus,
  ImplementationPartner,
  OpportunityEntityType,
  OpportunityProductLine,
  ProductFamily,
  ProductTarget,
  Vendor,
  VendorCurrencyTarget,
} from '@/modules/product-catalog/types';

export type FamilyInput = {
  name: string;
  description: string;
  status: CatalogStatus;
  responsibleUserIds?: string[];
  responsibleTeamIds?: string[];
  familyPartners?: ProductPartnerLinkInput[];
};

export type ProductPartnerLinkInput = {
  partnerId: string;
  partnerRoleId: string;
};

export type ProductInput = {
  name: string;
  description: string;
  status: CatalogStatus;
  vendorIds?: string[];
  implementationPartnerIds?: string[];
  productPartners?: ProductPartnerLinkInput[];
};

export type NamedEntityInput = {
  name: string;
  description: string;
  status: CatalogStatus;
  productFamilyIds?: string[];
};

export type VendorInput = NamedEntityInput & {
  targets?: Array<{
    currencyId: string;
    annualAmount: number;
    quarters: ProductTarget['quarters'];
  }>;
};

export type CatalogListResponse<T> = { data: T[] };

export type CatalogProductListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CatalogStatus | 'all';
};

export type CatalogProductPagination = {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
};

export type PaginatedCatalogProductsApi = {
  data: CatalogProduct[];
  pagination: CatalogProductPagination;
};

export type ProductPerformanceResponse = {
  wonByProductId: Record<string, number>;
};

export type {
  CatalogProduct,
  ImplementationPartner,
  OpportunityEntityType,
  OpportunityProductLine,
  ProductFamily,
  Vendor,
  VendorCurrencyTarget,
};
