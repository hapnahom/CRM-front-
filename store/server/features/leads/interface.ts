export interface Lead {
  id: string;
  name: string;
  contactPersonFName?: string | undefined;
  contactPersonLName?: string | undefined;
  contactPersonPosition?: string | undefined;
  contactPersonEmail?: string | undefined;
  contactPersonPhoneNumber?: string | undefined;
  companyId?: string | null;
  supplierId?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  solutionId?: string[] | null; // Solution Interest - array of solution IDs
  sectorId?: string | null;
  leadTypeId?: string | null;
  engagementStageId?: string | null;
  leadOwner?: string | null;
  tenantId?: string | null;
  additionalInformation?: string;
  leadRate: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  leadParticipants?: Array<{
    roleId: string;
    userId: string;
    role?: {
      id: string;
      name: string;
    };
    user?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  estimatedBudgets?: Array<{
    id: string;
    leadId: string;
    amount: number;
    currencyId: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface Leads {
  id: string;
  name: string;
  contactPersonFName?: string | undefined;
  contactPersonLName?: string | undefined;
  contactPersonPosition?: string | undefined;
  contactPersonEmail?: string | undefined;
  contactPersonPhoneNumber?: string | undefined;
  companyId?: string | null;
  supplierId?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  sectorId?: string | null;
  leadTypeId?: string | null;
  engagementStageId?: string | null;
  leadOwner?: string | null;
  tenantId?: string | null;
  additionalInformation?: string;
  leadRate: number | 0;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface LeadFilters {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  companyId?: string;
  campaignId?: string;
  stageId?: string;
  sectorId?: string;
  jobId?: string;
  revenue?: string;
  currency?: string;
  leadRate?: number;
  contactPersonEmail?: string;
  contactPersonPhoneNumber?: string;
  contactPersonFName?: string;
  contactPersonLName?: string;
  contactPersonPosition?: string;
  leadTypeId?: string;
}

export interface EngagementStage {
  id: string;
  name: string;
  description?: string;
  isLead?: boolean;
  isDeal?: boolean;
  level?: number;
  colorCode?: string;
  tenantId?: string | null;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
}

export interface Source {
  id: string;
  name: string;
  description?: string;
}

export interface LeadDocument {
  id: string;
  leadId: string;
  filePath: string;
  fileName: string;
}

export interface Solution {
  id: string;
  name: string;
  description?: string;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
}

export interface LeadAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  fileType?: string;
  leadId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol?: string;
  description?: string;
}

export interface Role {
  id: string; // Backend uses 'id', not 'roleId'
  name: string;
  description: string;
  tenantId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadRequest {
  name: string;
  email: string;
  phone?: string;
  companyId?: string;
  campaignId?: string;
  engagementStageId?: string;
}

export interface UpdateLeadStageRequest {
  leadId: string;
  stageId: string;
}

export interface UploadAttachmentRequest {
  leadId: string;
  fileData: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    firebasePath?: string;
  };
}

export interface DeleteAttachmentRequest {
  leadId: string;
  attachmentId: string;
}

// Utility function for formatting dates
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return '';
  }
};

// Utility function for formatting dates with time
export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return '';
  }
};
