export interface VectorTeamSummary {
  id: string;
  name: string;
}

export interface Vector {
  id: string;
  name: string;
  description?: string | null;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customerCount?: number;
  teams?: VectorTeamSummary[];
  teamIds?: string[];
}

export interface PaginatedVectorsResponse {
  data: Vector[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface CreateVectorDto {
  name: string;
  description?: string;
  teamIds?: string[];
}

export type UpdateVectorDto = Partial<CreateVectorDto>;
