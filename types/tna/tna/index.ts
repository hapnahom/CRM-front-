import { DateInfo } from '@/types/commons/dateInfo';
import { StatusBadgeTheme } from '@/components/common/statusBadge';
// import { Meta } from '@/store/server/features/okrPlanningAndReporting/interface';

// Fallback interface for Meta
export interface Meta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export enum TrainingNeedAssessmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export const TrainingNeedAssessmentStatusBadgeTheme: Record<
  TrainingNeedAssessmentStatus,
  StatusBadgeTheme
> = {
  [TrainingNeedAssessmentStatus.PENDING]: StatusBadgeTheme.secondary,
  [TrainingNeedAssessmentStatus.APPROVED]: StatusBadgeTheme.warning,
  [TrainingNeedAssessmentStatus.REJECTED]: StatusBadgeTheme.danger,
  [TrainingNeedAssessmentStatus.COMPLETED]: StatusBadgeTheme.success,
};

export enum TrainingNeedAssessmentCertStatus {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  NOT_COMPLETED = 'not-completed',
}

export const TrainingNeedAssessmentCertStatusBadgeTheme: Record<
  TrainingNeedAssessmentCertStatus,
  StatusBadgeTheme
> = {
  [TrainingNeedAssessmentCertStatus.IN_PROGRESS]: StatusBadgeTheme.secondary,
  [TrainingNeedAssessmentCertStatus.COMPLETED]: StatusBadgeTheme.success,
  [TrainingNeedAssessmentCertStatus.NOT_COMPLETED]: StatusBadgeTheme.danger,
};

export const trainingNeedAssessmentCertStatusOptions: {
  label: string;
  value: TrainingNeedAssessmentCertStatus;
}[] = [
  {
    value: TrainingNeedAssessmentCertStatus.IN_PROGRESS,
    label: 'In Progress',
  },
  {
    value: TrainingNeedAssessmentCertStatus.NOT_COMPLETED,
    label: 'Not Completed',
  },
  {
    value: TrainingNeedAssessmentCertStatus.COMPLETED,
    label: 'Completed',
  },
];

export interface TrainingNeedCategory extends DateInfo {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
}

export interface TrainingNeedAssessment extends DateInfo {
  id: string;
  title: string;
  trainingPrice: number;
  assignedUserId: string;
  approvalWorkflowId: string;
  trainingNeedCategoryId: string;
  currencyId: string;
  trainingNeedCategory: TrainingNeedCategory;
  trainingProofs: TrainingProof[];
  reason: string | null;
  detail: string;
  status: TrainingNeedAssessmentStatus;
  certStatus: TrainingNeedAssessmentCertStatus;
  tenantId: string;
  completedAt: string;
  commitmentPeriod: string;
  sessionId?: string;
  yearId?: string;
  monthId?: string;
  departmentId?: string;
}
export interface TrainingNeedAssessmentRecord extends DateInfo {
  items: TrainingNeedAssessment[];
  meta: Meta;
}
export interface TrainingProof extends DateInfo {
  id: string;
  trainingNeedAssessmentId: string;
  link: string | null;
  attachmentFile: string | null;
  tenantId: string;
}

export interface CommitmentRule extends DateInfo {
  id: string;
  name: string;
  description: string;
  amountMin: number;
  amountMax: number;
  commitmentPeriodDays: number;
  tenantId: string;
}
