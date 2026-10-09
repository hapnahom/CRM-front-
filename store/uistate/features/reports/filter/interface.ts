import { Dayjs } from 'dayjs';

export interface ReportsFilterState {
  // Date range filters
  dateRange: [Dayjs | null, Dayjs | null] | null;

  // Deal stage filters
  dealStages: string[];

  // Lead source filters
  leadSources: string[];

  // Sector filters
  sectors: string[];

  // Owner filters
  owners: string[];

  // Deal value range
  minDealValue: number | null;
  maxDealValue: number | null;

  // Deal age filters
  minDealAge: number | null;
  maxDealAge: number | null;

  // Conversion rate filters
  minConversionRate: number | null;
  maxConversionRate: number | null;

  // Quick filter presets
  quickFilter:
    | 'all'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisQuarter'
    | 'lastQuarter'
    | 'thisYear'
    | 'lastYear'
    | null;

  // Applied filters count (for UI display)
  appliedFiltersCount: number;

  // Filter visibility state
  isFilterOpen: boolean;
  currencyId: string | null;
}

export interface ReportsFilterActions {
  // Date range actions
  setDateRange: (dateRange: [Dayjs | null, Dayjs | null] | null) => void;

  // Deal stage actions
  setDealStages: (stages: string[]) => void;
  addDealStage: (stage: string) => void;
  removeDealStage: (stage: string) => void;

  // Lead source actions
  setLeadSources: (sources: string[]) => void;
  addLeadSource: (source: string) => void;
  removeLeadSource: (source: string) => void;

  // Sector actions
  setSectors: (sectors: string[]) => void;
  addSector: (sector: string) => void;
  removeSector: (sector: string) => void;

  // Owner actions
  setOwners: (owners: string[]) => void;
  addOwner: (owner: string) => void;
  removeOwner: (owner: string) => void;

  // Currency actions
  setCurrencyId: (currencyId: string | null) => void;

  // Deal value actions
  setDealValueRange: (min: number | null, max: number | null) => void;
  setMinDealValue: (value: number | null) => void;
  setMaxDealValue: (value: number | null) => void;

  // Deal age actions
  setDealAgeRange: (min: number | null, max: number | null) => void;
  setMinDealAge: (age: number | null) => void;
  setMaxDealAge: (age: number | null) => void;

  // Conversion rate actions
  setConversionRateRange: (min: number | null, max: number | null) => void;
  setMinConversionRate: (rate: number | null) => void;
  setMaxConversionRate: (rate: number | null) => void;

  // Quick filter actions
  setQuickFilter: (
    filter:
      | 'all'
      | 'thisMonth'
      | 'lastMonth'
      | 'thisQuarter'
      | 'lastQuarter'
      | 'thisYear'
      | 'lastYear'
      | null,
  ) => void;

  // Filter management actions
  clearAllFilters: () => void;
  resetFilters: () => void;
  applyFilters: () => void;

  // UI state actions
  setIsFilterOpen: (isOpen: boolean) => void;
  toggleFilter: () => void;

  // Utility actions
  updateAppliedFiltersCount: () => void;
  getActiveFilters: () => Partial<ReportsFilterState>;
  hasActiveFilters: () => boolean;
}

export type ReportsFilterStore = ReportsFilterState & ReportsFilterActions;
