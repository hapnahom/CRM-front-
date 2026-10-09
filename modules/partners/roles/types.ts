/**
 * Partner Role domain types.
 *
 * Role-scoped fields reuse the Entity Fields / CustomFieldConfig shape.
 * `stageId` on CustomFieldConfig maps to the Partner Role id.
 */

import type {
  CustomFieldConfig,
  FieldType,
  ListOption,
} from '@/modules/custom-fields';

/** @deprecated Use PARTNER_ROLE_CODES from hooks */
export const SYSTEM_PARTNER_ROLE_IDS = {
  vendor: 'vendor',
  implementationPartner: 'implementer',
  distributor: 'distributor',
} as const;

export type SolutionPlacement =
  | 'before_product'
  | 'after_product'
  | 'with_product';

export type SolutionCardinality = 'one' | 'many';

export type SolutionFieldSet = 'none' | 'deal_registration';

export interface PartnerRole {
  id: string;
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: number;
  useInSolutions: boolean;
  solutionOrder: number;
  solutionPlacement: SolutionPlacement;
  solutionRequired: boolean;
  solutionCardinality: SolutionCardinality;
  filterByProductLink: boolean;
  solutionFieldSet: SolutionFieldSet;
  createdAt: string;
  updatedAt: string;
}

/** Conceptual role-scoped field; stored as CustomFieldConfig with stageId = roleId. */
export type PartnerRoleField = CustomFieldConfig & {
  /** Alias for stageId — partner role scope */
  roleId?: string;
};

export interface PartnerFieldValue {
  partnerId: string;
  fieldId: string;
  value: unknown;
}

export interface PartnerRoleFieldGroup {
  role: PartnerRole;
  fields: PartnerRoleField[];
}

export interface CreatePartnerRoleInput {
  name: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  useInSolutions?: boolean;
  solutionOrder?: number;
  solutionPlacement?: SolutionPlacement;
  solutionRequired?: boolean;
  solutionCardinality?: SolutionCardinality;
  filterByProductLink?: boolean;
  solutionFieldSet?: SolutionFieldSet;
}

export interface UpdatePartnerRoleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  displayOrder?: number;
  useInSolutions?: boolean;
  solutionOrder?: number;
  solutionPlacement?: SolutionPlacement;
  solutionRequired?: boolean;
  solutionCardinality?: SolutionCardinality;
  filterByProductLink?: boolean;
  solutionFieldSet?: SolutionFieldSet;
}

export type { FieldType, ListOption, CustomFieldConfig };
