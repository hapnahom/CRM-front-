export type CatalogStatus = 'active' | 'inactive';

export type ProductQuarterKey = 'q1' | 'q2' | 'q3' | 'q4';

export type ProductPeriodId = 'annual' | ProductQuarterKey;

export interface ProductQuarterAmounts {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

/** Annual target plus the quarterly distribution of that annual amount. */
export interface ProductTarget {
  annualAmount: number;
  quarters: ProductQuarterAmounts;
}

export interface VendorCurrencyTarget {
  currencyId: string;
  currencyCode: string;
  annualAmount: number;
  quarters: ProductQuarterAmounts;
}

export interface CatalogTimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface ProductFamily extends CatalogTimestamps {
  id: string;
  name: string;
  description: string;
  status: CatalogStatus;
  responsibleUserIds: string[];
  responsibleTeamIds: string[];
  /** PRM partners (by partner role) linked to this family. */
  familyPartners: ProductPartnerLink[];
}

export interface ProductPartnerLink {
  partnerId: string;
  partnerName: string;
  partnerRoleId: string;
  partnerRoleName: string;
  partnerRoleCode?: string | null;
}

export interface CatalogProduct extends CatalogTimestamps {
  id: string;
  name: string;
  description: string;
  status: CatalogStatus;
  vendorIds: string[];
  implementationPartnerIds: string[];
  /** PRM partners (by partner role) linked to this product. */
  productPartners: ProductPartnerLink[];
}

export interface Vendor extends CatalogTimestamps {
  id: string;
  name: string;
  description: string;
  status: CatalogStatus;
  productFamilyIds: string[];
  targets: VendorCurrencyTarget[];
}

export interface ImplementationPartner extends CatalogTimestamps {
  id: string;
  name: string;
  description: string;
  status: CatalogStatus;
  productFamilyIds: string[];
}

export interface CatalogUser {
  id: string;
  name: string;
  email: string;
}

/** Transaction-level product line on a Lead or Deal */
export type DealRegistrationStatus =
  | 'not_required'
  | 'not_registered'
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'declined'
  | 'expired';

export interface OpportunityProductRegistration {
  status: DealRegistrationStatus;
  /** ISO date (YYYY-MM-DD) or null */
  registrationDate: string | null;
  /** ISO date (YYYY-MM-DD) or null */
  expirationDate: string | null;
  registrationNumber: string | null;
}

export interface OpportunityProductLine {
  id: string;
  productId: string;
  /** Present on list/detail payloads when the catalog product is loaded. */
  productName?: string;
  /** Optional until configured — PRM partner id (legacy column name). */
  vendorId: string | null;
  /** Partner display name when returned from solutions flatten. */
  vendorName?: string;
  /** Optional until configured — Implementation Partner */
  implementationPartnerId: string | null;
  /** 0 means not specified */
  amount: number;
  registration: OpportunityProductRegistration;
}

/** Product line under a Solution (optionally under a Solution Vendor). */
export interface OpportunitySolutionProduct {
  id: string;
  productId: string;
  productName?: string;
  implementationPartnerId: string | null;
  amount: number;
  /** ISO currency code for amount; empty inherits opportunity currency in UI. */
  currency: string;
}

/** Before-product partner line on a solution (deal registration + nested products). */
export interface OpportunitySolutionVendor {
  id: string;
  /** Configured before-product partner role id. */
  partnerRoleId: string;
  partnerRoleName?: string;
  partnerRoleCode?: string | null;
  /** PRM partner id for the selected role. */
  vendorId: string;
  vendorName?: string;
  amount: number;
  /** ISO currency code for amount; empty inherits opportunity currency in UI. */
  currency: string;
  registration: OpportunityProductRegistration;
  products: OpportunitySolutionProduct[];
}

/**
 * Opportunity-specific association of a Product Family.
 * One Product Family per Lead/Deal. Vendors optional; products always under a vendor.
 */
export interface OpportunitySolution {
  id: string;
  productFamilyId: string;
  productFamilyName?: string;
  /** Backend may also send familyName */
  familyName?: string;
  amount: number;
  /** ISO currency code for amount; empty inherits opportunity currency in UI. */
  currency: string;
  exactAmount?: number | null;
  /** Tenant-configured role assignments when solution roles exist. */
  roleAssignments?: Array<{
    roleId: string;
    roleName?: string;
    userIds: string[];
    users?: Array<{
      id: string;
      selamnewId?: string | null;
      name?: string | null;
    }>;
  }>;
  /** Generic assignees when tenant has no solution roles configured. */
  assigneeUserIds: string[];
  /**
   * Optional manual product achievement per assignee.
   * Assignees not listed (or without amount) use the full solution amount.
   */
  assigneeContributions?: Array<{ userId: string; amount: number }>;
  /** Vendors with nested products and deal registration. */
  vendors: OpportunitySolutionVendor[];
  /**
   * @deprecated Products belong under vendors. Kept empty for API compatibility.
   */
  products: OpportunitySolutionProduct[];
}

export type OpportunityEntityType = 'lead' | 'deal';

export interface OpportunityProductsKey {
  entityType: OpportunityEntityType;
  entityId: string;
}

export type CatalogUiState = 'idle' | 'loading' | 'saving' | 'error';
