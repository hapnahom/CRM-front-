export type SalesHubTabId = 'leads' | 'deals' | 'sales-pipeline';

export type LeadsTabFilters = {
  search: string;
  viewMode: 'kanban' | 'list';
};

export type DealsTabFilters = {
  search: string;
  stageFilter: string;
  viewMode: 'kanban' | 'list';
};

export type PipelineTabFilters = {
  tableSearch: string;
  tableStageFilter: string;
};

export type TabFiltersByTab = {
  leads: LeadsTabFilters;
  deals: DealsTabFilters;
  'sales-pipeline': PipelineTabFilters;
};

const STORAGE_PREFIX = 'sales-hub-tab-filters';
const PREFS_VERSION = 1;

type StoredTabFilters = {
  version: number;
  tabs: Partial<TabFiltersByTab>;
};

function storageKey(tenantId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${tenantId}:${userId}`;
}

function parseViewMode(raw: unknown): 'kanban' | 'list' | null {
  return raw === 'kanban' || raw === 'list' ? raw : null;
}

function parseString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

function parseLeadsTabFilters(raw: unknown): LeadsTabFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LeadsTabFilters>;
  const viewMode = parseViewMode(value.viewMode);
  if (!viewMode) return null;
  return {
    search: parseString(value.search) ?? '',
    viewMode,
  };
}

function parseDealsTabFilters(raw: unknown): DealsTabFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<DealsTabFilters>;
  const viewMode = parseViewMode(value.viewMode);
  if (!viewMode) return null;
  return {
    search: parseString(value.search) ?? '',
    stageFilter: parseString(value.stageFilter) ?? 'all',
    viewMode,
  };
}

function parsePipelineTabFilters(raw: unknown): PipelineTabFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<PipelineTabFilters>;
  return {
    tableSearch: parseString(value.tableSearch) ?? '',
    tableStageFilter: parseString(value.tableStageFilter) ?? 'all',
  };
}

function parseStored(raw: unknown): StoredTabFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<StoredTabFilters>;
  const tabs = value.tabs;
  if (!tabs || typeof tabs !== 'object') return null;

  const parsed: Partial<TabFiltersByTab> = {};
  if (tabs.leads) {
    const leads = parseLeadsTabFilters(tabs.leads);
    if (leads) parsed.leads = leads;
  }
  if (tabs.deals) {
    const deals = parseDealsTabFilters(tabs.deals);
    if (deals) parsed.deals = deals;
  }
  if (tabs['sales-pipeline']) {
    const pipeline = parsePipelineTabFilters(tabs['sales-pipeline']);
    if (pipeline) parsed['sales-pipeline'] = pipeline;
  }

  return { version: PREFS_VERSION, tabs: parsed };
}

function loadStored(tenantId: string, userId: string): StoredTabFilters | null {
  if (typeof window === 'undefined' || !tenantId || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId, userId));
    if (!raw) return null;
    return parseStored(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadTabFilters<T extends SalesHubTabId>(
  tenantId: string,
  userId: string,
  tab: T,
): Partial<TabFiltersByTab[T]> | null {
  const stored = loadStored(tenantId, userId);
  const tabPrefs = stored?.tabs[tab];
  return tabPrefs ? { ...tabPrefs } : null;
}

export function saveTabFilters<T extends SalesHubTabId>(
  tenantId: string,
  userId: string,
  tab: T,
  filters: TabFiltersByTab[T],
): void {
  if (typeof window === 'undefined' || !tenantId || !userId) return;
  try {
    const existing = loadStored(tenantId, userId);
    const payload: StoredTabFilters = {
      version: PREFS_VERSION,
      tabs: {
        ...(existing?.tabs ?? {}),
        [tab]: filters,
      },
    };
    window.localStorage.setItem(
      storageKey(tenantId, userId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}
