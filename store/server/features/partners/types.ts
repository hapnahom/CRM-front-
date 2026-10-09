import type {
  Partner,
  PartnerStatus,
  PartnerTier,
  PartnerContact,
} from '@/modules/partners/types';

export interface PartnerRoleApi {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: number;
  useInSolutions: boolean;
  solutionOrder: number;
  solutionPlacement: 'before_product' | 'after_product' | 'with_product';
  solutionRequired: boolean;
  solutionCardinality: 'one' | 'many';
  filterByProductLink: boolean;
  solutionFieldSet: 'none' | 'deal_registration';
  createdAt: string;
  updatedAt: string;
}

export interface PartnerTierApi {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  borderColor: string | null;
  isSystem: boolean;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type PartnerPartnershipTypeApi = PartnerTierApi;

export interface PartnerRoleFieldOptionApi {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  active: boolean;
}

export interface PartnerRoleFieldApi {
  id: string;
  label: string;
  internalName: string;
  description: string | null;
  fieldType: string;
  required: boolean;
  active: boolean;
  displayOrder: number;
  value?: unknown;
  options?: PartnerRoleFieldOptionApi[];
}

export interface PartnerRoleFieldGroupApi {
  role: PartnerRoleApi;
  fields: PartnerRoleFieldApi[];
}

export interface PartnerContactApi {
  id?: string;
  name?: string;
  position?: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface PartnerActivityApi {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  actor?: string;
  timestamp?: string;
}

export interface PartnerApi {
  id: string;
  tenantId: string;
  name: string;
  legalName: string | null;
  tier: PartnerTierApi | PartnerTier | null;
  partnershipType?: PartnerPartnershipTypeApi | string | null;
  status: PartnerStatus;
  primaryContact: {
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
  } | null;
  contacts?: PartnerContactApi[];
  activities?: PartnerActivityApi[];
  accountManager: string | null;
  partnershipStartDate: string | null;
  website: string | null;
  address: string | null;
  registrationNumber: string | null;
  annualTarget: number | null;
  currencyTargets?: Array<{
    id: string;
    currencyId: string;
    currency: string;
    annualAmount: number;
    sessionTargets?: Array<{ sessionId: string; amount: number }>;
  }>;
  targetAccountsFocus: string | null;
  solutionFocus: string | null;
  productsAndSolutions: string[];
  geographicCoverage: string[];
  industryExpertise: string[];
  roles: PartnerRoleApi[];
  fieldGroups?: PartnerRoleFieldGroupApi[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPartnersApi {
  data: PartnerApi[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface EntityFieldValueItem {
  entityFieldId: string;
  value: unknown;
}

export interface CreatePartnerPayload {
  name: string;
  legalName?: string;
  roleIds: string[];
  tierId?: string | null;
  partnershipTypeId?: string | null;
  status?: PartnerStatus;
  primaryContact?: PartnerApi['primaryContact'];
  contacts?: PartnerContactApi[];
  activities?: PartnerActivityApi[];
  accountManager?: string;
  partnershipStartDate?: string;
  website?: string;
  address?: string;
  registrationNumber?: string;
  annualTarget?: number;
  currencyTargets?: Array<{
    currencyId: string;
    annualAmount: number;
    sessionTargets?: Array<{ sessionId: string; amount: number }>;
  }>;
  targetAccountsFocus?: string;
  solutionFocus?: string;
  productsAndSolutions?: string[];
  geographicCoverage?: string[];
  industryExpertise?: string[];
  fieldValues?: EntityFieldValueItem[];
}

export type UpdatePartnerPayload = Partial<
  Omit<CreatePartnerPayload, 'roleIds'>
> & {
  roleIds?: string[];
};

export interface CreatePartnerRolePayload {
  name: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  useInSolutions?: boolean;
  solutionOrder?: number;
  solutionPlacement?: PartnerRoleApi['solutionPlacement'];
  solutionRequired?: boolean;
  solutionCardinality?: PartnerRoleApi['solutionCardinality'];
  filterByProductLink?: boolean;
  solutionFieldSet?: PartnerRoleApi['solutionFieldSet'];
}

export interface UpdatePartnerRolePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
  useInSolutions?: boolean;
  solutionOrder?: number;
  solutionPlacement?: PartnerRoleApi['solutionPlacement'];
  solutionRequired?: boolean;
  solutionCardinality?: PartnerRoleApi['solutionCardinality'];
  filterByProductLink?: boolean;
  solutionFieldSet?: PartnerRoleApi['solutionFieldSet'];
}

export interface CreatePartnerTierPayload {
  name: string;
  description?: string;
  color?: string;
  borderColor?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

export type CreatePartnerPartnershipTypePayload = CreatePartnerTierPayload;

export interface UpdatePartnerTierPayload {
  name?: string;
  description?: string;
  color?: string | null;
  borderColor?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

export type UpdatePartnerPartnershipTypePayload = UpdatePartnerTierPayload;

export interface PartnerListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  tier?: string;
}

export type { Partner, PartnerContact };
