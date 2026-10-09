export interface PartnerTierDefinition {
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

export interface CreatePartnerTierInput {
  name: string;
  description?: string;
  color?: string;
  borderColor?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface UpdatePartnerTierInput {
  name?: string;
  description?: string;
  color?: string | null;
  borderColor?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
}
