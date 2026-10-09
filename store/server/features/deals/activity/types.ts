export interface Activity {
  id: string;
  leadId?: string;
  dealId: string;
  activityName: string;
  activityDate: Date;
  description: string;
  task?: string; // Made optional since it's not essential
  isCompleted: boolean;
  failed: boolean;
  reason?: string; // Reason for failure
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  activityTypeId: string;
  responsiblePersons: { userId: string; role?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityRequest {
  leadId?: string;
  dealId?: string;
  activityName: string;
  activityDate: Date;
  description: string;
  task?: string; // Made optional since it's not needed
  isCompleted?: boolean;
  failed?: boolean;
  reason?: string; // Reason for failure
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  activityTypeId: string;
  responsiblePersons: { userId: string; role?: string }[];
}

export interface UpdateActivityRequest extends Partial<CreateActivityRequest> {
  id: string;
}

export interface ActivityFilters {
  leadId?: string;
  dealId?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  activityTypeId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  name?: string; // Deal name field for backend
}

export interface ActivityQueryParams extends ActivityFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityResponse {
  data: Activity[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface SingleActivityResponse {
  data: Activity;
  message: string;
}

// Export-related types
export interface ExportActivityRequest {
  filters?: ActivityFilters;
  format?: 'csv' | 'xlsx' | 'pdf';
  includeDocuments?: boolean;
}

export interface ExportActivityResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  fileName?: string;
}
