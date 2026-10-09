export interface CustomerPrimaryContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role?: string;
}

export interface CustomerVectorSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface CustomerJourneyStageSummary {
  id: string;
  name: string;
  color?: string | null;
  sortOrder: number;
  isTerminal: boolean;
  lifecycleGroup: string;
}

export interface CustomerOwnerSummary {
  id: string;
  selamnewId?: string | null;
  name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface CustomerListItem {
  id: string;
  accountName: string;
  city?: string;
  country: string;
  vectorId?: string | null;
  vector?: CustomerVectorSummary | null;
  organizationSize?: string;
  leadsCount: number;
  dealsCount: number;
  website?: string;
  primaryContact?: CustomerPrimaryContact | null;
  journeyStageId?: string | null;
  journeyStage?: CustomerJourneyStageSummary | null;
  ownerUserId?: string | null;
  owner?: CustomerOwnerSummary | null;
  logoUrl?: string | null;
  openPipelineByCurrency: Record<string, number>;
  openPipelineLabel: string;
  lastActivityAt?: string | null;
  daysInStage: number;
  createdAt?: string;
}

export interface PaginatedCustomersResponse {
  data: CustomerListItem[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface CustomerFilters {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  city?: string;
  country?: string;
  vectorId?: string;
  organizationSize?: string;
  journeyStageId?: string;
  ownerUserId?: string;
  currency?: string;
  sortBy?:
    | 'createdAt'
    | 'accountName'
    | 'daysInStage'
    | 'openPipeline'
    | 'lastActivityAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateCustomerDto {
  accountName: string;
  vectorId?: string | null;
  organizationSize?: string;
  city?: string;
  country?: string;
  website?: string;
  journeyStageId?: string | null;
  ownerUserId?: string | null;
  logoUrl?: string | null;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export interface CustomerContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role?: string;
  isPrimaryContact: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDetail {
  id: string;
  accountName: string;
  vectorId?: string | null;
  vector?: CustomerVectorSummary | null;
  organizationSize: string;
  city?: string;
  country: string;
  website?: string;
  journeyStageId?: string | null;
  journeyStage?: CustomerJourneyStageSummary | null;
  journeyStageEnteredAt?: string | null;
  ownerUserId?: string | null;
  owner?: CustomerOwnerSummary | null;
  logoUrl?: string | null;
  openPipelineByCurrency: Record<string, number>;
  openPipelineLabel: string;
  wonRevenueByCurrency: Record<string, number>;
  wonRevenueLabel: string;
  wonDealsCount: number;
  lostDealsCount: number;
  winRate: number | null;
  dealsCount: number;
  leadsCount: number;
  openDealsCount: number;
  daysInStage: number;
  lastActivityAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  leads: Record<string, unknown>[];
  deals: Record<string, unknown>[];
  contacts: CustomerContactDetail[];
}

export interface CustomerResponse {
  id: string;
  accountName: string;
  vectorId?: string | null;
  vector?: CustomerVectorSummary | null;
  organizationSize: string;
  city?: string;
  country: string;
  website?: string;
  journeyStageId?: string | null;
  ownerUserId?: string | null;
  logoUrl?: string | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDashboardKpis {
  totalCustomers: number;
  totalCustomersChangePercent: number;
  activeCustomers: number;
  activeCustomersChangePercent: number;
  newCustomers: number;
  newCustomersChangePercent: number;
  atRiskAndChurned: number;
  atRiskCount: number;
  churnedCount: number;
}

export interface CustomerDashboardVectorSlice {
  id: string;
  name: string;
  count: number;
  percent: number;
  openPipelineByCurrency: Record<string, number>;
  openPipelineLabel: string;
  color: string;
}

export interface CustomerDashboardPipelineDeal {
  id: string;
  name: string;
  value: number;
  currency: string;
  stageName?: string | null;
}

export interface CustomerDashboardTopItem {
  id: string;
  accountName: string;
  logoUrl?: string | null;
  openPipelineByCurrency: Record<string, number>;
  openPipelineLabel: string;
  vectorId?: string | null;
  vectorName?: string | null;
  ownerUserId?: string | null;
  stageName?: string | null;
  openDealsCount?: number;
  pipelines?: CustomerDashboardPipelineDeal[];
}

export interface CustomerDashboardResponse {
  kpis: CustomerDashboardKpis;
  vectors: CustomerDashboardVectorSlice[];
  topPipeline: CustomerDashboardTopItem[];
}

export interface CustomerJourneyStage {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  isTerminal: boolean;
  lifecycleGroup: string;
  customerCount: number;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJourneyStageDto {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  isTerminal?: boolean;
  lifecycleGroup?: CustomerJourneyStage['lifecycleGroup'];
}

export type UpdateJourneyStageDto = Partial<CreateJourneyStageDto>;

export interface CustomerNextAction {
  id: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  ownerUserId: string;
  assigneeUserIds: string[];
  status: string;
  priority: string;
}

export interface CustomerNameCheckResponse {
  exists: boolean;
  count: number;
}

export interface OrganizationSizeOption {
  value: string;
  label: string;
}

export interface OrganizationSizeListResponse {
  organizationSizes: OrganizationSizeOption[];
}

export interface CityListResponse {
  cities: string[];
}

export interface CountryOption {
  name: string;
  code?: string;
  flag?: string;
}

export interface CountryListResponse {
  defaultCountry: string;
  countries: CountryOption[];
}

export type ProjectHealth = 'OnTrack' | 'AtRisk' | 'Delayed' | 'Completed';
export type LicenseStatus = 'Active' | 'Expiring Soon' | 'Expired';

export interface DeliveryLicense {
  id: string;
  name: string;
  vendor: string | null;
  seats: string | null;
  expiryDate: string | null;
  renewalCost: number;
  currency: string;
  status: LicenseStatus;
}

export interface DeliveryNamedRef {
  id: string;
  name: string;
}

export interface DeliveryProductAssignment {
  id: string;
  name: string;
  category: string;
  vendors: DeliveryNamedRef[];
  families: DeliveryNamedRef[];
  partners: DeliveryNamedRef[];
  vendor: string;
  quantity: number;
  status: string;
  assignedAt: string;
  licenses: DeliveryLicense[];
}

export interface DeliveryProject {
  id: string;
  customerId: string;
  name: string;
  stage: string;
  health: ProjectHealth;
  healthLabel: string;
  managerUserId: string | null;
  managerName: string;
  startDate: string | null;
  targetEndDate: string | null;
  budget: number;
  currency: string;
  completionPercent: number;
  products: DeliveryProductAssignment[];
}

export interface CustomerDeliverySummary {
  projectCount: number;
  productCount: number;
  licenseCount: number;
  expiringSoonCount: number;
  totalBudget: number;
}

export interface CreateCustomerProjectDto {
  name: string;
  stage?: string;
  health?: ProjectHealth;
  managerUserId?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  budget?: number;
  currency?: string;
  completionPercent?: number;
}

export type UpdateCustomerProjectDto = Partial<CreateCustomerProjectDto>;

export interface CreateProjectProductDto {
  name: string;
  category?: string;
  quantity?: number;
  status?: string;
  vendorIds?: string[];
  familyIds?: string[];
  partnerIds?: string[];
}

export type UpdateProjectProductDto = Partial<CreateProjectProductDto>;

export interface CreateProjectLicenseDto {
  name: string;
  vendor?: string | null;
  seats?: string | null;
  expiryDate?: string | null;
  renewalCost?: number;
  currency?: string;
  status?: LicenseStatus;
}

export type UpdateProjectLicenseDto = Partial<CreateProjectLicenseDto>;

export interface CustomerAccountFormState {
  name: string;
  vectorId: string;
  size: string;
  city: string;
  country: string;
  website: string;
}
