import type { PipelinePeriodSelection } from '@/modules/sales-pipeline/pipeline-filter';
import type {
  DateRangePreset,
  ReportPeriodMode,
} from '@/modules/sales-pipeline/report/period-selection';

export type { DateRangePreset, ReportPeriodMode };
export type ParentCategoryId =
  | 'sales'
  | 'customers'
  | 'marketing'
  | 'partners-vendors'
  | 'targets-performance';

export type ReportTypeId =
  | 'summary-overview'
  | 'pipeline-opportunities'
  | 'leads-acquisition'
  | 'customer-account'
  | 'marketing-performance'
  | 'partner-vendor-performance'
  | 'target-vs-performance'
  | 'activity-engagement'
  | 'conversion-analysis'
  | 'sales-executive-dashboard'
  | 'sales-team-performance'
  | 'sales-rep-performance'
  | 'sales-customer-concentration'
  | 'sales-opportunity-registry'
  | 'sales-closed-won';

export type FilterFieldId =
  | 'dateRange'
  | 'fromTo'
  | 'fiscalYear'
  | 'quarter'
  | 'currency'
  | 'department'
  | 'team'
  | 'owner'
  | 'customer'
  | 'solution'
  | 'vendor'
  | 'implementationPartner'
  | 'vector'
  | 'dealStage'
  | 'dealStatus'
  | 'probability'
  | 'campaign'
  | 'marketingChannel'
  | 'campaignType'
  | 'status';

export type GroupByOptionId =
  | 'department'
  | 'team'
  | 'owner'
  | 'customer'
  | 'solution'
  | 'vendor'
  | 'implementationPartner'
  | 'dealStage'
  | 'status'
  | 'vector'
  | 'campaign'
  | 'user';

export type SortByOptionId =
  | 'pipelineValue'
  | 'revenue'
  | 'target'
  | 'forecast'
  | 'achievement'
  | 'dealCount'
  | 'leadCount'
  | 'customerCount'
  | 'activityCount'
  | 'conversionRate';

export type SortOrder = 'asc' | 'desc';

export type ColumnId = string;

export type FilterOption = {
  id: string;
  label: string;
  /** Present when this option is the tenant default currency (or similar). */
  isDefault?: boolean;
};

export type ParentCategory = {
  id: ParentCategoryId;
  name: string;
  shortName: string;
  description: string;
  iconColor: string;
  iconBg: string;
  children: string[];
  reportCount: number;
};

export type ReportTypeDefinition = {
  id: ReportTypeId;
  name: string;
  description: string;
  /** Categories that unlock this report type */
  categories: ParentCategoryId[];
  /** Always show when any category is selected */
  alwaysAvailable?: boolean;
  filters: FilterFieldId[];
  groupBy: GroupByOptionId[];
  sortBy: SortByOptionId[];
  columns: ColumnDefinition[];
  about: string;
};

export type ColumnDefinition = {
  id: ColumnId;
  label: string;
  defaultSelected?: boolean;
};

export type FilterFieldDefinition = {
  id: FilterFieldId;
  label: string;
  kind: 'select' | 'multi' | 'date-range' | 'text';
  placeholder?: string;
  options?: FilterOption[];
};

export type ReportCriteriaState = {
  periodMode: ReportPeriodMode;
  fiscalPeriod: PipelinePeriodSelection;
  dateRange: DateRangePreset;
  from?: string;
  to?: string;
  multi: Partial<Record<FilterFieldId, string[]>>;
};

export type GroupingState = {
  groupBy: GroupByOptionId[];
  sortBy: SortByOptionId;
  sortOrder: SortOrder;
  /** Ordered list of selected column ids (display order left → right). */
  selectedColumns: ColumnId[];
  /**
   * False until the user applies the Columns picker.
   * While false, category changes reset to defaultSelected columns.
   * After clear+apply, stays true with an empty selection.
   */
  columnsConfigured: boolean;
};

export type ReportBuilderState = {
  categories: ParentCategoryId[];
  criteria: ReportCriteriaState;
  grouping: GroupingState;
};

export type FavoriteReport = {
  id: string;
  categories: ParentCategoryId[];
};

export type ReportResultRow = {
  id: string;
  groupLabel: string;
  subGroupLabel?: string;
  cells: Record<string, string | number>;
  /** Optional per-column text colors (e.g. stage → pipeline stage hex). */
  cellColors?: Record<string, string>;
};

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  accentColor?: string;
  valueColor?: string;
};

export type ReportSection = {
  id: ReportTypeId;
  categoryId: ParentCategoryId;
  title: string;
  description: string;
  columns: ColumnDefinition[];
  rows: ReportResultRow[];
};

export type ReportChartSlice = {
  id: string;
  label: string;
  value: number;
  share: number;
  color: string;
  amount?: string;
};

export type ReportChart = {
  id: string;
  title: string;
  subtitle?: string;
  categoryId: ParentCategoryId;
  totalLabel: string;
  slices: ReportChartSlice[];
};

export type GeneratedReport = {
  name: string;
  categories: ParentCategoryId[];
  generatedAt: string;
  generatedBy: string;
  periodLabel: string;
  filterTags: string[];
  grouping: GroupingState;
  kpis: ReportKpi[];
  charts: ReportChart[];
  sections: ReportSection[];
  /** Sales-only Excel: permission Overview + Sales Registry (2 sheets). */
  excelLayout?: {
    mode: 'sales-two-sheet';
    overviewSheet: string;
    registrySheet: string;
  };
};
