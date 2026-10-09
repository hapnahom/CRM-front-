import { create } from 'zustand';
import { ReportsFilterStore, ReportsFilterState } from './interface';

// Default filter state
const defaultFilterState = {
  dateRange: null,
  dealStages: [],
  leadSources: [],
  sectors: [],
  owners: [],
  minDealValue: null,
  maxDealValue: null,
  minDealAge: null,
  maxDealAge: null,
  minConversionRate: null,
  maxConversionRate: null,
  quickFilter: null,
  appliedFiltersCount: 0,
  isFilterOpen: false,
  currencyId: null,
};

// Create the Zustand store
export const useReportsFilterStore = create<ReportsFilterStore>((set, get) => ({
  ...defaultFilterState,

  // Date range actions
  setDateRange: (dateRange) => {
    set({ dateRange });
    get().updateAppliedFiltersCount();
  },

  // Deal stage actions
  setDealStages: (stages) => {
    set({ dealStages: stages });
    get().updateAppliedFiltersCount();
  },
  addDealStage: (stage) => {
    const currentStages = get().dealStages;
    if (!currentStages.includes(stage)) {
      set({ dealStages: [...currentStages, stage] });
      get().updateAppliedFiltersCount();
    }
  },
  removeDealStage: (stage) => {
    const currentStages = get().dealStages;
    set({ dealStages: currentStages.filter((s) => s !== stage) });
    get().updateAppliedFiltersCount();
  },

  // Lead source actions
  setLeadSources: (sources) => {
    set({ leadSources: sources });
    get().updateAppliedFiltersCount();
  },
  addLeadSource: (source) => {
    const currentSources = get().leadSources;
    if (!currentSources.includes(source)) {
      set({ leadSources: [...currentSources, source] });
      get().updateAppliedFiltersCount();
    }
  },
  removeLeadSource: (source) => {
    const currentSources = get().leadSources;
    set({ leadSources: currentSources.filter((s) => s !== source) });
    get().updateAppliedFiltersCount();
  },

  // Sector actions
  setSectors: (sectors) => {
    set({ sectors });
    get().updateAppliedFiltersCount();
  },
  addSector: (sector) => {
    const currentSectors = get().sectors;
    if (!currentSectors.includes(sector)) {
      set({ sectors: [...currentSectors, sector] });
      get().updateAppliedFiltersCount();
    }
  },
  removeSector: (sector) => {
    const currentSectors = get().sectors;
    set({ sectors: currentSectors.filter((s) => s !== sector) });
    get().updateAppliedFiltersCount();
  },

  // Owner actions
  setOwners: (owners) => {
    set({ owners });
    get().updateAppliedFiltersCount();
  },
  addOwner: (owner) => {
    const currentOwners = get().owners;
    if (!currentOwners.includes(owner)) {
      set({ owners: [...currentOwners, owner] });
      get().updateAppliedFiltersCount();
    }
  },
  removeOwner: (owner) => {
    const currentOwners = get().owners;
    set({ owners: currentOwners.filter((o) => o !== owner) });
    get().updateAppliedFiltersCount();
  },

  // Currency actions
  setCurrencyId: (currencyId) => {
    set({ currencyId });
    get().updateAppliedFiltersCount();
  },

  // Deal value actions
  setDealValueRange: (min, max) => {
    set({ minDealValue: min, maxDealValue: max });
    get().updateAppliedFiltersCount();
  },
  setMinDealValue: (value) => {
    set({ minDealValue: value });
    get().updateAppliedFiltersCount();
  },
  setMaxDealValue: (value) => {
    set({ maxDealValue: value });
    get().updateAppliedFiltersCount();
  },

  // Deal age actions
  setDealAgeRange: (min, max) => {
    set({ minDealAge: min, maxDealAge: max });
    get().updateAppliedFiltersCount();
  },
  setMinDealAge: (age) => {
    set({ minDealAge: age });
    get().updateAppliedFiltersCount();
  },
  setMaxDealAge: (age) => {
    set({ maxDealAge: age });
    get().updateAppliedFiltersCount();
  },

  // Conversion rate actions
  setConversionRateRange: (min, max) => {
    set({ minConversionRate: min, maxConversionRate: max });
    get().updateAppliedFiltersCount();
  },
  setMinConversionRate: (rate) => {
    set({ minConversionRate: rate });
    get().updateAppliedFiltersCount();
  },
  setMaxConversionRate: (rate) => {
    set({ maxConversionRate: rate });
    get().updateAppliedFiltersCount();
  },

  // Quick filter actions
  setQuickFilter: (filter) => {
    set({ quickFilter: filter });

    // Apply quick filter logic
  },

  // Filter management actions
  clearAllFilters: () => {
    set(defaultFilterState);
  },
  resetFilters: () => {
    set(defaultFilterState);
  },
  applyFilters: () => {
    // This method can be used to trigger API calls or other side effects
    // when filters are applied
  },

  // UI state actions
  setIsFilterOpen: (isOpen) => {
    set({ isFilterOpen: isOpen });
  },
  toggleFilter: () => {
    set((state) => ({ isFilterOpen: !state.isFilterOpen }));
  },

  // Utility actions
  updateAppliedFiltersCount: () => {
    const state = get();
    let count = 0;

    if (state.dateRange) count++;
    if (state.dealStages.length > 0) count++;
    if (state.leadSources.length > 0) count++;
    if (state.sectors.length > 0) count++;
    if (state.owners.length > 0) count++;
    if (state.minDealValue !== null || state.maxDealValue !== null) count++;
    if (state.minDealAge !== null || state.maxDealAge !== null) count++;
    if (state.minConversionRate !== null || state.maxConversionRate !== null)
      count++;
    if (state.quickFilter) count++;

    set({ appliedFiltersCount: count });
  },

  getActiveFilters: () => {
    const state = get();
    const activeFilters: Partial<ReportsFilterState> = {};

    if (state.dateRange) activeFilters.dateRange = state.dateRange;
    if (state.dealStages.length > 0)
      activeFilters.dealStages = state.dealStages;
    if (state.leadSources.length > 0)
      activeFilters.leadSources = state.leadSources;
    if (state.sectors.length > 0) activeFilters.sectors = state.sectors;
    if (state.owners.length > 0) activeFilters.owners = state.owners;
    if (state.minDealValue !== null)
      activeFilters.minDealValue = state.minDealValue;
    if (state.maxDealValue !== null)
      activeFilters.maxDealValue = state.maxDealValue;
    if (state.minDealAge !== null) activeFilters.minDealAge = state.minDealAge;
    if (state.maxDealAge !== null) activeFilters.maxDealAge = state.maxDealAge;
    if (state.minConversionRate !== null)
      activeFilters.minConversionRate = state.minConversionRate;
    if (state.maxConversionRate !== null)
      activeFilters.maxConversionRate = state.maxConversionRate;
    if (state.quickFilter) activeFilters.quickFilter = state.quickFilter;

    return activeFilters;
  },

  hasActiveFilters: () => {
    const state = get();
    return (
      state.dateRange !== null ||
      state.dealStages.length > 0 ||
      state.leadSources.length > 0 ||
      state.sectors.length > 0 ||
      state.owners.length > 0 ||
      state.minDealValue !== null ||
      state.maxDealValue !== null ||
      state.minDealAge !== null ||
      state.maxDealAge !== null ||
      state.minConversionRate !== null ||
      state.maxConversionRate !== null ||
      state.quickFilter !== null
    );
  },
}));
