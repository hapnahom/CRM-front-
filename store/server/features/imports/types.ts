export type ImportEntityType =
  | 'customer'
  | 'contact'
  | 'lead'
  | 'deal'
  | 'catalog_product';
export type ImportTemplateKind =
  | 'customer'
  | 'contact'
  | 'lead'
  | 'deal'
  | 'catalog_product';

export type ImportRowStatus =
  | 'valid'
  | 'duplicate'
  | 'ambiguous'
  | 'missing'
  | 'error'
  | 'skipped'
  | 'created'
  | 'failed';

export type ImportJobStatus = 'preview' | 'confirmed' | 'expired' | 'failed';

export type ImportCandidate = {
  id: string;
  label: string;
  subtitle?: string | null;
};

export type ImportIssue = {
  code:
    | 'REQUIRED'
    | 'INVALID'
    | 'DUPLICATE'
    | 'AMBIGUOUS'
    | 'MISSING'
    | 'PERMISSION'
    | 'WILL_CREATE';
  field?: string;
  message: string;
  candidates?: ImportCandidate[];
};

export type ImportRawValues = Record<string, string | undefined>;

export type ImportResolved = {
  ownerUserId?: string | null;
  vectorId?: string | null;
  journeyStageId?: string | null;
  importAnyway?: boolean;
  customerId?: string | null;
  createCustomer?: boolean;
  contactId?: string | null;
  createContact?: boolean;
  stageId?: string | null;
  typeId?: string | null;
  sessionId?: string | null;
  currency?: string | null;
  value?: number | null;
  responsibleUserId?: string | null;
};

export type ImportPreviewRow = {
  id: string;
  entityType: ImportEntityType;
  rowNumber: number;
  status: ImportRowStatus;
  raw: ImportRawValues;
  resolved: ImportResolved | null;
  issues: ImportIssue[];
  createdEntityId: string | null;
  label: string;
};

export type ImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  failures: Array<{
    rowId: string;
    rowNumber: number;
    message: string;
  }>;
};

export type ImportPreview = {
  id: string;
  status: ImportJobStatus;
  kind?: ImportTemplateKind;
  sourceFilename: string;
  expiresAt: string;
  summary: ImportSummary | null;
  counts: {
    total: number;
    valid: number;
    duplicate: number;
    ambiguous: number;
    missing: number;
    error: number;
    skipped: number;
    created: number;
    failed: number;
  };
  rows: ImportPreviewRow[];
};

export type ResolveImportRowInput = {
  action: 'select' | 'importAnyway';
  field?: string;
  entityId?: string;
};
