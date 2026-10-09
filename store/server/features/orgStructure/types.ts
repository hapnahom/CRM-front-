export interface OrgDepartmentNode {
  id: string;
  name: string;
  description?: string;
  branchId?: string;
  level?: number;
  tenantId?: string;
  department?: OrgDepartmentNode[];
}

export type CommercialEmphasis =
  | 'sales-parent'
  | 'sales-team'
  | 'presales-parent'
  | 'presales-team'
  | 'neutral';
