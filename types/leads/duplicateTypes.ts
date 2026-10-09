// Types for duplicate lead handling
export interface DuplicateInfo {
  exists: boolean;
  message: string;
}

export interface DuplicateResponse {
  statusCode: 422;
  message: string;
  duplicates: {
    email?: DuplicateInfo;
    name?: DuplicateInfo;
    company?: DuplicateInfo;
    phone?: DuplicateInfo;
  };
  requiresConfirmation: boolean;
  // Additional fields that might contain the actual duplicate lead data
  existingLead?: {
    id: string;
    name: string;
    company?: string;
    companyId?: string;
    contactPersonEmail?: string;
    contactPersonPhoneNumber?: string;
    createdDate?: string;
  };
}

export interface DuplicateLeadModalState {
  isOpen: boolean;
  duplicateInfo: DuplicateResponse | null;
  pendingLeadData: any | null;
  isLoading: boolean;
}
