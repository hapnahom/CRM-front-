// ─── Backend enum values (must match NestJS EntityField entity) ───────────────

export type BackendEntityType = 'LEAD' | 'DEAL' | 'PARTNER';

export type BackendFieldAppliesTo = 'LEAD' | 'DEAL' | 'BOTH';

export type BackendFieldType =
  | 'STRING'
  | 'INTEGER'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'MONEY'
  | 'LINK'
  | 'ADDRESS'
  | 'LIST'
  | 'FILE'
  | 'USER'
  | 'TEAM'
  | 'DEPARTMENT'
  | 'COMPOSITE';

export type BackendBindingType = 'USER' | 'TEAM' | 'DEPARTMENT';

// ─── Backend response shapes ───────────────────────────────────────────────────

export interface EntityFieldOption {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  active: boolean;
}

export interface EntityFieldBinding {
  id: string;
  bindingType: BackendBindingType;
  bindingId: string;
  sortOrder: number;
}

export interface EntityFieldResponse {
  id: string;
  tenantId: string;
  entityType: BackendEntityType;
  appliesTo?: BackendFieldAppliesTo | null;
  stageId?: string | null;
  leadStageId?: string | null;
  dealStageId?: string | null;
  label: string;
  internalName: string;
  description: string | null;
  placeholder: string | null;
  fieldType: BackendFieldType;
  defaultValue: string | null;
  required: boolean;
  active: boolean;
  readOnly: boolean;
  multiSelect: boolean;
  searchable: boolean;
  visibleInLists: boolean;
  visibleInDetail: boolean;
  showInFilters: boolean;
  showInGlobalSearch: boolean;
  showInReports: boolean;
  displayOrder: number;
  settings: Record<string, any> | null;
  notes: string | null;
  options: EntityFieldOption[];
  bindings: EntityFieldBinding[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEntityFieldResponse {
  data: EntityFieldResponse[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

// ─── Backend request shapes ────────────────────────────────────────────────────

export interface CreateEntityFieldRequest {
  entityType?: BackendEntityType;
  appliesTo?: BackendFieldAppliesTo;
  leadStageId?: string;
  dealStageId?: string;
  stageId?: string;
  label: string;
  internalName?: string;
  description?: string;
  placeholder?: string;
  fieldType: BackendFieldType;
  defaultValue?: string;
  required?: boolean;
  active?: boolean;
  readOnly?: boolean;
  multiSelect?: boolean;
  searchable?: boolean;
  visibleInLists?: boolean;
  visibleInDetail?: boolean;
  showInFilters?: boolean;
  showInGlobalSearch?: boolean;
  showInReports?: boolean;
  displayOrder?: number;
  settings?: Record<string, any>;
  notes?: string;
  options?: Array<{
    label: string;
    value: string;
    sortOrder?: number;
    active?: boolean;
  }>;
  bindings?: Array<{
    bindingType: BackendBindingType;
    bindingId: string;
    sortOrder?: number;
  }>;
}

export type UpdateEntityFieldRequest = Partial<CreateEntityFieldRequest>;

export interface QueryEntityFieldParams {
  entityType?: BackendEntityType;
  appliesTo?: BackendFieldAppliesTo;
  pipelineOnly?: boolean;
  stageId?: string;
  leadStageId?: string;
  dealStageId?: string;
  search?: string;
  fieldType?: BackendFieldType;
  required?: boolean;
  active?: boolean;
  page?: number;
  pageSize?: number;
}
