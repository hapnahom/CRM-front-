// --- Dashboard Core Interfaces ---

export interface DashboardSummary {
  kpis: KPIData;
  pipeline: PipelineData;
  conversionFunnel: ConversionFunnelData;
  leadSources: LeadSourcesData;
  activities: ActivitiesData;
  generatedAt: Date;
  dateRange: DateRange;
}

export interface DateRange {
  from: Date;
  to: Date;
}

// --- KPI Interfaces ---

export interface KPIData {
  totalRevenue: RevenueKPI;
  activeDeals: CountKPI;
  conversionRate: PercentageKPI;
  newLeads: CountKPI;
}

export interface RevenueKPI {
  value: number;
  changePercent: number;
  primaryCurrency: string;
  primaryCurrencyId: string;
  breakdown: CurrencyBreakdown[];
}

export interface CountKPI {
  count: number;
  changeFromLastMonth?: number;
  changePercent?: number;
}

export interface PercentageKPI {
  rate: number;
  changePercent: number;
}

export interface CurrencyBreakdown {
  currencyId: string;
  currency: string;
  amount: number;
}

// --- Pipeline Interfaces ---

export interface PipelineData {
  pipeline: PipelineInfo;
}

export interface PipelineInfo {
  stages: PipelineStage[];
  type: 'leads' | 'deals';
  year: number;
}

export interface PipelineStage {
  name: string;
  count: number;
}

// --- Conversion Funnel Interfaces ---

export interface ConversionFunnelData {
  data: ConversionFunnelPeriod[];
}

export interface ConversionFunnelPeriod {
  period: string;
  deals: number;
  leads: number;
}

// --- Lead Sources Interfaces ---

export interface LeadSourcesData {
  sources: LeadSource[];
  totalLeads: number;
}

export interface LeadSource {
  name: string;
  count: number;
  percentage: number;
  percentageFormatted: string;
  color: string;
  sourceId: string;
}

// --- Activities Interfaces ---

export interface ActivitiesData {
  activities: DashboardActivity[];
  viewAllUrl: string;
  totalCount: number;
}

export interface DashboardActivity {
  id: string;
  user: string;
  description: string;
  target: string;
  timestamp: Date;
  relativeTime: string;
}

// --- Stagnant Deals Interfaces ---

export interface StagnantDeal {
  id: string;
  dealName: string;
  companyName: string;
  supplierName: string;
  engagementStageName: string;
  stagnationDays: number;
  stagnationLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  stageAge: Date;
  submissionDate: Date;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhoneNumber: string;
  additionalInformation?: string;
}

export interface StagnantDealsResponse {
  data: StagnantDeal[];
  pagination: PaginationMeta;
  totalValueAtRisk: number;
}

export interface StagnantDealsStats {
  totalStagnant: number;
  criticalStagnant: number; // 90+ days
  highStagnant: number; // 60-90 days
  mediumStagnant: number; // 30-60 days
}

// --- Query Parameters Interfaces ---

export interface DashboardQueryParams {
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  calendarId?: string; // Filter by calendar (year)
  sessionId?: string; // Filter by session (quarter)
  monthId?: string; // Filter by month
  currency?: string; // Support any ISO currency code (USD, EUR, ETB, AUD, GBP, etc.)
  currencyId?: string; // Filter by currency ID (UUID)
  stagnantDaysThreshold?: number;
  activitiesLimit?: number;
}

export interface KPISQueryParams extends DashboardQueryParams {}

export interface PipelineQueryParams extends DashboardQueryParams {
  pipelineType?: 'leads' | 'deals';
}

export interface ConversionFunnelQueryParams extends DashboardQueryParams {}

export interface LeadSourcesQueryParams extends DashboardQueryParams {}

export interface ActivitiesQueryParams extends DashboardQueryParams {}

export interface StagnantDealsQueryParams {
  page?: number;
  limit?: number;
  companyId?: string;
  engagementStageId?: string;
  ownerId?: string;
  date?: string; // YYYY-MM-DD format for specific date filtering
  currency?: string; // Currency filter (e.g., USD, AUD, EUR)
}

// --- Export Interfaces ---

export interface StagnantDealsExportFilters {
  companyId?: string;
  engagementStageId?: string;
  ownerId?: string;
  date?: string; // YYYY-MM-DD format for specific date filtering
  currency?: string; // Currency filter (e.g., USD, AUD, EUR)
}

export interface ExportStagnantDealsRequest {
  exportType?: 'EXCEL' | 'CSV'; // Optional, defaults to EXCEL
  filename?: string;
  worksheetName?: string;
  filters?: StagnantDealsExportFilters; // Optional filters
}

export interface ExportStagnantDealsResponse {
  success: boolean;
  message: string;
  xlsxData?: ArrayBuffer | Blob; // Raw binary data from backend
  fileName?: string;
  downloadUrl?: string;
}

// --- Utility Interfaces ---

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface StagnantDealFilters {
  companyId?: string;
  engagementStageId?: string;
  ownerId?: string;
  date?: string; // YYYY-MM-DD format for specific date filtering
  currency?: string; // Currency filter (e.g., USD, AUD, EUR)
}

// --- Reference Data Interfaces ---

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  [key: string]: any;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface DealStage {
  id: string;
  name: string;
  description: string;
  level: number;
  colorCode: string;
  tenantId: string;
  [key: string]: any;
}
