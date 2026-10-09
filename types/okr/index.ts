export interface CommentsData {
  id: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
  commentedBy: string;
  comment: string;
  tenantId: string;
}
