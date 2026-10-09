export interface ActivityDocument {
  id: string;
  activityId: string;
  filePath: string;
  fileName: string;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityDocumentPayload {
  activityId: string;
  filePath: string;
  fileName: string;
  tenantId: string;
}

export interface UploadActivityDocumentInput {
  activityId: string;
  file: File;
  documentName?: string;
}

export interface UpdateActivityDocumentInput {
  fileName?: string;
  filePath?: string;
}

export interface ActivityDocumentResponse extends ActivityDocument {
  message?: string;
}
