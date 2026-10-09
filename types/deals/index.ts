export interface Company {
  id: string;
  name: string;
  domainName?: string;
  businessSize?: string;
  industry?: string;
}

export interface DealType {
  id: string;
  name: string;
  description?: string;
}

export interface DealSource {
  id: string;
  name: string;
  description?: string;
}

export interface DealStage {
  id: string;
  name: string;
  description?: string;
  level?: number;
  colorCode?: string;
  highlighted?: boolean;
  order?: number;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
}

export interface Solution {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  jobTitle?: string;
}

export interface Deal {
  id?: string;
  dealName: string; // Changed from 'name' to match backend entity
  companyId: string;
  supplierId: string;
  contactPersonName: string; // Changed from 'contactName' to match backend
  contactPersonPosition?: string;
  contactPersonEmail: string; // Changed from 'email' to match backend
  contactPersonPhoneNumber: string; // Changed from 'contactPhone' to match backend
  solutionIds?: string[]; // Changed from 'solutionId' to match backend
  sectorId: string;
  leadId?: string;
  dealTypeId: string; // Changed from 'typeId' to match backend
  submissionDate?: string; // Changed from 'opening' to match backend
  engagementStageId: string; // Changed from 'stageId' to match backend
  additionalInformation?: string; // Changed from 'description' to match backend
  createdBy?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Comprehensive deal interface with related data for kanban board
export interface DealWithDetails {
  id: string;
  dealName: string;
  contactPersonName: string;
  contactPersonPosition?: string;
  contactPersonEmail: string;
  contactPersonPhoneNumber: string;
  submissionDate: string;
  additionalInformation?: string;
  leadId?: string;
  solutionIds?: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;

  company?: {
    id: string;
    name: string;
    description?: string;
  };

  supplier?: {
    id: string;
    name: string;
    description?: string;
  };

  solutions?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;

  engagementStage?: {
    id: string;
    name: string;
    level: number;
    colorCode: string;
  };

  participants?: Array<{
    id: string;
    dealId: string;
    userId: string;
    roleId: string;
  }>;

  budget?: {
    id: string;
    dealId: string;
    amount: string;
    currency: string;
  };

  dealDocuments?: Array<{
    id: string;
    name: string;
    fileName: string;
    filePath: string;
    createdAt?: string;
    dealId?: string;
  }>;
}

export interface CreateDealRequest {
  dealName: string;
  companyId: string;
  supplierId: string; // Required field in backend
  contactPersonName: string;
  contactPersonPosition?: string;
  contactPersonEmail: string; // Required field in backend
  contactPersonPhoneNumber: string; // Required field in backend
  solutionIds?: string[];
  sectorId: string; // Required field in backend
  leadId?: string; // Optional in backend DTO
  dealTypeId: string;
  submissionDate?: string; // Optional in backend
  dealDocument?: File; // File upload support
  engagementStageId: string; // Required field in backend
  additionalInformation?: string;
  tenantId?: string;
  createdBy?: string;
  createdAt?: string;
  amount?: number;
  currency?: string;
  roleId?: string;
  employees?: string[];
  dealOwner?: string; // Deal owner ID
  yearId?: string; // Calendar year ID
  quarterId?: string; // Calendar quarter/session ID
}

export interface DropdownOptionsResponse<T> {
  items: T[];
  total: number;
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD',
  CHF = 'CHF',
  CNY = 'CNY',
  INR = 'INR',
  BRL = 'BRL',
  MXN = 'MXN',
  KRW = 'KRW',
  SGD = 'SGD',
  HKD = 'HKD',
  SEK = 'SEK',
  NOK = 'NOK',
  DKK = 'DKK',
  PLN = 'PLN',
  CZK = 'CZK',
  HUF = 'HUF',
}
