// --- Activity Document Interfaces ---

export interface ActivityDocument {
  id: string;
  activityId: string;
  filePath: string;
  fileName: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityDocumentResponse {
  id: string;
  activityId: string;
  filePath: string;
  fileName: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface UploadActivityDocumentInput {
  file: File;
  activityId?: string;
  documentName?: string;
  [key: string]: any;
}

export interface ActivityDocumentPayload {
  activityId: string;
  filePath: string;
  fileName: string;
  tenantId: string;
}

export interface UpdateActivityDocumentInput {
  fileName?: string;
  filePath?: string;
  [key: string]: any;
}
