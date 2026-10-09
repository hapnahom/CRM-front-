export interface PartnerPartnershipTypeDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string | null;
  borderColor: string | null;
  isSystem: boolean;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerPartnershipTypeInput {
  name: string;
  description?: string;
  color?: string;
  borderColor?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface UpdatePartnerPartnershipTypeInput {
  name?: string;
  description?: string;
  color?: string | null;
  borderColor?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}
