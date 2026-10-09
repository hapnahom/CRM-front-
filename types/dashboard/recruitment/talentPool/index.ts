// Interface for talent pool data as a whole
export interface TalentPool {
  candidates: Candidate[];
  totalCandidates: number;
  pagination: Pagination;
}

// Pagination interface to handle paging through the candidate list
export interface Pagination {
  currentPage: number;
  pageSize: number;
}

// Interface for filters applied to the talent pool
export interface Filters {
  job: string;
  department: string;
  stage: string;
  dateRange: [string, string];
}

export interface Candidate {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  appliedFor: string;
  cgpa: number;
  cv: string;
  movedIndDte: string;
  stage: string;
}

export interface AddCandidateValue {
  candidateId: string;
  talentPoolId: string;
  reason: string;
}

interface SearchParams {
  date_range: string;
  department: string;
  job: string;
  stages: string | null;
  talentPoolCategory: string;
  search: string;
}

export interface TalentPoolState {
  candidates: Candidate[];
  addedCandidate: AddCandidateValue;
  filters: Filters;
  visibleOnboard: boolean;
  page: number;
  setCurrentPage(currentPage: number): void;
  setPage: (page: number) => void;
  setVisibleOnboardState: (visible: boolean) => void;
  setCandidates: (candidates: Candidate[]) => void;
  setFilters: (filters: Partial<Filters>) => void;
  currentPage: number;
  pageSize: number;
  setCurrentPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setStage: (id: string, stage: string) => void;
  setAddCandidate: (value: AddCandidateValue) => void;
  searchParams: SearchParams;
  setSearchParams: (key: keyof SearchParams, value: string | boolean) => void;
  showMobileFilter: boolean;
  setShowMobileFilter: (value: boolean) => void;
}

export interface TalentPoolCategory {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  title: string;
  description: string;
  tenantId: string;
}

export interface JobCandidate {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  additionalInformation: string | null;
  tenantId: string;
  jobInformation: JobInformation;
  jobCandidateInformation: JobCandidateInformation;
  applicantStatusStage: ApplicantStatusStage;
}

export interface JobInformation {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  jobTitle: string;
  description: string;
  jobDeadline: string;
  employmentType: string;
  jobStatus: string;
  compensation: string;
  jobLocation: string;
  yearOfExperience: number;
  quantity: number;
  tenantId: string;
}

export interface JobCandidateInformation {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  resumeUrl: string;
  tenantId: string;
}

export interface ApplicantStatusStage {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  title: string;
  description: string;
  tenantId: string | null;
}

export interface TalentPoolCategoryResponse {
  items: TalentPoolCategoryItem[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface TalentPoolCategoryItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  title: string;
  talentPoolCategoryId: string;
  reason: string;
  jobCandidateId: string;
  tenantId: string;
  jobCandidate: JobCandidate;
  talentPoolCategory: TalentPoolCategory;
}

export interface TalentPoolResponse {
  items: Candidate[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface Item {
  id: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  deletedAt: string | null; // ISO 8601 date string or null
  createdBy: string | null; // string or null
  updatedBy: string | null; // string or null
  title: string;
  description: string;
  tenantId: string;
}

export interface Meta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number; // Adjust based on your requirements
  totalPages: number;
  currentPage: number;
}

export interface ApplicantStatusResponse {
  items: Item[];
  meta: Meta;
}
